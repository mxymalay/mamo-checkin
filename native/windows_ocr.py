"""Local Tesseract adapter; preserve measured confidence and Vision coordinates."""
import csv
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


def _crop_path(source, observation, destination, scale=4):
    from PIL import Image

    width, height = source.size
    left = max(0, int(observation['x'] * width) - max(4, int(width * .005)))
    top = max(0, int((1 - observation['y'] - observation['height']) * height) - max(3, int(height * .08)))
    right = min(width, int((observation['x'] + observation['width']) * width) + max(4, int(width * .005)))
    bottom = min(height, int((1 - observation['y']) * height) + max(3, int(height * .08)))
    if right <= left or bottom <= top:
        return None
    cropped = _enhance(source.crop((left, top, right, bottom)), scale)
    cropped.save(destination, format='PNG', optimize=False)
    cropped.close()
    return destination


def _verify_uncertain_cells(image_path, observations, data, folder):
    """Confirm independent crop agreement for candidate attendance rows."""
    candidates = []
    for cells in _rows(observations):
        has_code = any(CODE.fullmatch(cell['text'].strip().upper()) for cell in cells)
        has_weekday = any(WEEKDAY.match(cell['text'].strip()) for cell in cells)
        has_time = any(TIME.fullmatch(cell['text'].strip()) for cell in cells)
        if has_code and has_weekday and has_time:
            candidates.extend(cells)
    if not candidates:
        return

    from PIL import Image

    with Image.open(image_path) as source:
        source.load()
        for index, cell in enumerate(candidates):
            text = cell['text'].strip()
            is_code = bool(CODE.fullmatch(text.upper()))
            if not is_code and cell['confidence'] >= .96:
                continue
            crop = _crop_path(source, cell, Path(folder) / f'verify-{index}.png')
            if crop is None:
                continue
            second = _run_tesseract(crop, data, psm=7 if is_code else 8,
                                    whitelist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' if is_code else '')
            recognized = ''.join(item['text'] for item in sorted(second, key=lambda item: item['x'])).strip()
            agrees = (recognized.upper() == text.upper()) if is_code else (_normalize_text(recognized) == _normalize_text(text))
            confidence = max((item['confidence'] for item in second), default=0)
            if is_code:
                cell['codeVerified'] = agrees
                cell['verificationConfidence'] = confidence
            else:
                cell['fieldVerified'] = agrees
                cell['fieldVerificationConfidence'] = confidence


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
