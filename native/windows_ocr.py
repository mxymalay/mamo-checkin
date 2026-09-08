"""Local Tesseract adapter; preserve measured confidence and Vision coordinates."""
import csv
import io
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import sys


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


def recognize(image_path):
    data = Path(sys.executable).parent / 'tessdata' if getattr(sys, 'frozen', False) else Path(__file__).resolve().parents[1] / 'build' / 'windows' / 'host' / 'tessdata'
    if getattr(sys, 'frozen', False) and not (data / 'eng.traineddata').is_file():
        raise FileNotFoundError('Bundled English model is missing. Run the latest Install Windows OCR.exe again.')
    options = ['--tessdata-dir', str(data)] if (data / 'eng.traineddata').is_file() else []
    result = subprocess.run([binary(), str(image_path), 'stdout', *options, '-l', 'eng', '--psm', '11', '-c', 'tessedit_create_tsv=1'],
                            stdin=subprocess.DEVNULL, capture_output=True, timeout=30,
                            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    if result.returncode:
        raise ValueError(result.stderr.decode('utf-8', errors='replace')[:500] or 'Tesseract failed')
    if len(result.stdout) > 900_000:
        raise ValueError('OCR output is too large')
    return parse_tsv(result.stdout.decode('utf-8'))


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
