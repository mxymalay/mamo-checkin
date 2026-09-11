"""Local Tesseract adapter; preserve measured confidence and Vision coordinates."""
import csv
from collections import Counter
import io
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import sys

CODE = re.compile(r'^[A-Z0-9]{5}$')
WEEKDAY = re.compile(r'^(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b', re.I)
MONTH = re.compile(r'^(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b', re.I)
TIME = re.compile(r'^\d{1,2}\s*[:.]\s*\d{2}\s*(?:am|pm)$', re.I)
_VERSION_CACHE = None


def ocr_scale(size):
    """Use larger pixels for the small attendance rows without huge screenshots."""
    longest = max(int(size[0]), int(size[1]))
    if longest <= 1200:
        return 3
    if longest <= 2400:
        return 2
    return 1


def _enhance(image, scale):
    from PIL import Image, ImageOps

    image = ImageOps.autocontrast(ImageOps.grayscale(image), cutoff=1)
    if scale == 1:
        return image
    resampling = getattr(Image, 'Resampling', Image).LANCZOS
    return image.resize((image.width * scale, image.height * scale), resampling)


def _enhance_variants(image, scale=4):
    """Build independent inputs for small table cells instead of trusting one threshold."""
    from PIL import Image, ImageFilter, ImageOps

    gray=ImageOps.autocontrast(ImageOps.grayscale(image), cutoff=1)
    if scale != 1:
        resampling=getattr(Image, 'Resampling', Image).LANCZOS
        gray=gray.resize((gray.width*scale, gray.height*scale), resampling)
    sharpened=gray.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=2))
    return [
        gray,
        sharpened,
        gray.point(lambda value: 255 if value >= 170 else 0),
        gray.point(lambda value: 255 if value >= 210 else 0),
    ]


def preprocess_image(source_path, destination_path):
    """Create a high-quality OCR input while keeping the original coordinates proportional."""
    from PIL import Image

    with Image.open(source_path) as source:
        source.load()
        prepared = _enhance(source, ocr_scale(source.size))
        destination_path = Path(destination_path)
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        prepared.save(destination_path, format='PNG', optimize=False)
        prepared.close()
    return destination_path


def binary():
    for folder in (os.environ.get('ProgramFiles'), os.environ.get('LOCALAPPDATA')):
        if folder:
            candidate = Path(folder) / 'Tesseract-OCR' / 'tesseract.exe'
            if candidate.is_file():
                return str(candidate)
    found = shutil.which('tesseract')
    if found:
        return found
    raise FileNotFoundError('Install Tesseract OCR with English language data, then click Check service again.')


def software_version():
    global _VERSION_CACHE
    if _VERSION_CACHE is not None:
        return _VERSION_CACHE
    try:
        result = subprocess.run([binary(), '--version'], stdin=subprocess.DEVNULL,
                                capture_output=True, timeout=6,
                                creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        output=(result.stdout or result.stderr).decode('utf-8', errors='replace')
        _VERSION_CACHE=next((line.strip() for line in output.splitlines() if line.strip()), '')
    except (OSError, subprocess.SubprocessError):
        _VERSION_CACHE=''
    return _VERSION_CACHE or None


def parse_tsv(value):
    rows = list(csv.DictReader(io.StringIO(value), delimiter='\t', quoting=csv.QUOTE_NONE))
    page = next((r for r in rows if r['level'] == '1'), None)
    if page is None:
        raise ValueError('Tesseract returned no image dimensions')
    width, height = float(page['width']), float(page['height'])
    if width <= 0 or height <= 0:
        raise ValueError('Invalid image dimensions')
    observations = []
    for r in rows:
        if r['level'] != '5' or not r.get('text', '').strip():
            continue
        confidence = float(r['conf']) / 100
        if not 0 <= confidence <= 1:
            raise ValueError('Invalid OCR confidence')
        left, top = max(0, float(r['left'])), max(0, float(r['top']))
        right = min(width, left + max(0, float(r['width'])))
        bottom = min(height, top + max(0, float(r['height'])))
        if left > right or top > bottom:
            raise ValueError('Invalid OCR bounds')
        observations.append(dict(text=r['text'].strip(), confidence=confidence,
                                 x=left/width, y=1-bottom/height,
                                 width=(right-left)/width, height=(bottom-top)/height))
    return observations


def _ocr_data_path():
    data = Path(sys.executable).parent / 'tessdata' if getattr(sys, 'frozen', False) else Path(__file__).resolve().parents[1] / 'build' / 'windows' / 'host' / 'tessdata'
    if getattr(sys, 'frozen', False) and not (data / 'eng.traineddata').is_file():
        raise FileNotFoundError('Bundled English model is missing. Run the latest Install Windows OCR.exe again.')
    return data


def _run_tesseract(image_path, data, psm=11, whitelist=''):
    bundled = (data / 'eng.traineddata').is_file()
    # Tesseract's data loader uses narrow paths on Windows. CreateProcessW can
    # enter a Unicode working directory; keep the model argument ASCII.
    options = ['--tessdata-dir', 'tessdata'] if bundled else []
    args = [binary(), str(Path(image_path).resolve()), 'stdout', *options, '-l', 'eng', '--oem', '1', '--psm', str(psm), '--dpi', '300', '-c', 'tessedit_create_tsv=1']
    if whitelist:
        args.extend(['-c', f'tessedit_char_whitelist={whitelist}'])
    result = subprocess.run(args,
                            stdin=subprocess.DEVNULL, capture_output=True, timeout=30,
                            cwd=str(data.parent) if bundled else None,
                            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    if result.returncode:
        raise ValueError(result.stderr.decode('utf-8', errors='replace')[:500] or 'Tesseract failed')
    if len(result.stdout) > 900_000:
        raise ValueError('OCR output is too large')
    return parse_tsv(result.stdout.decode('utf-8'))


def _normalize_text(value):
    return re.sub(r'[^a-z0-9]+', '', str(value).lower())


def _rows(observations):
    result = []
    for observation in sorted(observations, key=lambda item: -(item['y'] + item['height'] / 2)):
        center = observation['y'] + observation['height'] / 2
        row = next((candidate for candidate in result if abs(candidate['center'] - center) < max(.012, min(candidate['height'], observation['height']) * .48)), None)
        if row is None:
            row = {'center': center, 'height': observation['height'], 'cells': []}
            result.append(row)
        row['cells'].append(observation)
    return [sorted(row['cells'], key=lambda item: item['x']) for row in result]


def _observation_bounds(source, observation, x_ratio=.01, y_ratio=.1, min_x=8, min_y=5):
    width, height = source.size
    x_padding=max(min_x, int(width*x_ratio))
    y_padding=max(min_y, int(height*y_ratio))
    items=observation if isinstance(observation,(list,tuple)) else [observation]
    left=max(0, min(int(item['x']*width) for item in items)-x_padding)
    top=max(0, min(int((1-item['y']-item['height'])*height) for item in items)-y_padding)
    right=min(width, max(int((item['x']+item['width'])*width) for item in items)+x_padding)
    bottom=min(height, max(int((1-item['y'])*height) for item in items)+y_padding)
    return (left,top,right,bottom) if right>left and bottom>top else None


def _crop_samples(source, observation, data, folder, prefix, psms, whitelist='', variant_count=4, joiner=''):
    bounds=_observation_bounds(source, observation)
    if not bounds:
        return []
    crop=source.crop(bounds)
    samples=[];variant_paths=[]
    try:
        for variant_index,variant in enumerate(_enhance_variants(crop)[:variant_count]):
            variant_path=Path(folder)/f'{prefix}-{variant_index}.png'
            variant.save(variant_path, format='PNG', optimize=False)
            variant_paths.append(variant_path)
            variant.close()
        for variant_path in variant_paths:
            for psm in psms:
                result=_run_tesseract(variant_path, data, psm=psm, whitelist=whitelist)
                ordered=sorted(result, key=lambda item:item['x'])
                recognized=joiner.join(item['text'] for item in ordered).strip()
                samples.append((recognized, max((item['confidence'] for item in result), default=0)))
    finally:
        crop.close()
    return samples


def _code_candidate(value):
    compact=re.sub(r'[^A-Z0-9]', '', str(value).upper())
    return compact if CODE.fullmatch(compact) else None


def _field_spans(cells):
    """Keep date text together so a small day digit is verified in context."""
    spans=[]
    weekday_index=next((index for index,cell in enumerate(cells)
                        if WEEKDAY.match(cell['text'].strip())),None)
    if weekday_index is not None:
        type_cells=[cell for cell in cells[:weekday_index] if not CODE.fullmatch(cell['text'].strip())]
        if type_cells:
            spans.append(type_cells)
        month_index=next((index for index in range(weekday_index+1,min(len(cells),weekday_index+4))
                          if MONTH.match(cells[index]['text'].strip())),None)
        spans.append(cells[weekday_index:(month_index+1 if month_index is not None else weekday_index+1)])
    for cell in cells:
        if TIME.fullmatch(cell['text'].strip()) or re.fullmatch(r'\d{2}(?:-P\d+)?',cell['text'].strip(),re.I):
            spans.append([cell])
    return spans


def consensus_code(samples):
    """Return a code only when independent OCR passes agree on the same five characters."""
    votes=Counter()
    confidence={}
    for text,score in samples:
        candidate=_code_candidate(text)
        if not candidate:
            continue
        votes[candidate]+=1
        confidence.setdefault(candidate,[]).append(float(score))
    if not votes:
        return None
    ordered=votes.most_common()
    best,count=ordered[0]
    second=ordered[1][1] if len(ordered)>1 else 0
    if count<2 or count==second:
        return None
    scores=confidence[best]
    return {'text':best,'votes':count,'total':sum(votes.values()),'confidence':sum(scores)/len(scores),'candidates':dict(ordered)}


def _verify_uncertain_cells(image_path, observations, data, folder):
    """Confirm independent crop agreement for candidate attendance rows."""
    candidates = []
    for cells in _rows(observations):
        has_weekday = any(WEEKDAY.match(cell['text'].strip()) for cell in cells)
        has_time = any(TIME.fullmatch(cell['text'].strip()) for cell in cells)
        rightmost = max(cells, key=lambda cell: cell['x'], default=None)
        raw_code = re.sub(r'[^A-Z0-9]', '', str(rightmost.get('text', '')).upper()) if rightmost else ''
        uncertain_fields=[cell for cell in cells if cell is not rightmost and cell['confidence']<.96]
        needs_code_review=rightmost and (rightmost['confidence']<.96 or not CODE.fullmatch(raw_code))
        if has_weekday and has_time and (needs_code_review or uncertain_fields):
            candidates.append((cells,rightmost,uncertain_fields,needs_code_review))
    if not candidates:
        return

    from PIL import Image

    with Image.open(image_path) as source:
        source.load()
        for index,(cells,cell,uncertain_fields,needs_code_review) in enumerate(candidates):
            if needs_code_review:
                samples=_crop_samples(source,cell,data,folder,f'code-{index}',(7,8,13),
                                      whitelist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',variant_count=4)
                candidate_votes=Counter();candidate_confidences={}
                for text,score in samples:
                    candidate=_code_candidate(text)
                    if candidate:
                        candidate_votes[candidate]+=1
                        candidate_confidences.setdefault(candidate,[]).append(float(score))
                cell['verificationAttempted']=True
                cell['verificationSamples']=len(samples)
                cell['verificationCandidates']=dict(candidate_votes)
                cell['verificationBestConfidence']=max((max(scores) for scores in candidate_confidences.values()), default=0)
                consensus=consensus_code(samples)
                if consensus:
                    cell['verifiedText']=consensus['text']
                    cell['verificationVotes']=consensus['votes']
                    cell['codeVerified']=consensus['votes']>=3
                    cell['verificationConfidence']=consensus['confidence']
            verified_field_ids=set()
            for field_index,span in enumerate(_field_spans(cells)):
                fields=[field for field in span if field in uncertain_fields and id(field) not in verified_field_ids]
                if not fields:
                    continue
                try:
                    samples=_crop_samples(source,span,data,folder,f'field-{index}-{field_index}',(7,8),variant_count=2,joiner=' ')
                except (OSError, ValueError, subprocess.SubprocessError):
                    for field in fields:
                        field['fieldVerificationAttempted']=True
                        field['fieldVerificationSamples']=0
                        field['fieldVerificationVotes']=0
                    continue
                expected=_normalize_text(' '.join(field['text'] for field in span))
                matches=[score for text,score in samples if _normalize_text(text)==expected]
                for field in fields:
                    field['fieldVerificationAttempted']=True
                    field['fieldVerificationSamples']=len(samples)
                    field['fieldVerificationVotes']=len(matches)
                    if len(matches)>=2:
                        field['fieldVerified']=True
                        field['fieldVerificationConfidence']=sum(matches)/len(matches)
                        verified_field_ids.add(id(field))


def recognize(image_path):
    data = _ocr_data_path()
    with tempfile.TemporaryDirectory() as folder:
        prepared = preprocess_image(Path(image_path), Path(folder) / 'prepared.png')
        observations = _run_tesseract(prepared, data)
        _verify_uncertain_cells(image_path, observations, data, folder)
        return observations


def self_test():
    try:
        # Exercise language data and image decoding, not just --version.
        with tempfile.TemporaryDirectory() as folder:
            image = Path(folder) / 'probe.pgm'
            image.write_bytes(b'P5\n64 64\n255\n' + bytes([255])*4096)
            recognize(image)
        return True, ''
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        return False, str(error)
