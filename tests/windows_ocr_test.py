import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'native'))
import windows_ocr

HEADER = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'
class AdapterTest(unittest.TestCase):
    def test_coordinates_and_low_confidence_are_preserved(self):
        rows = windows_ocr.parse_tsv(HEADER+'1\t1\t0\t0\t0\t0\t0\t0\t1000\t500\t-1\t\n5\t1\t1\t1\t1\t1\t100\t100\t200\t50\t82.5\tAB123\n')
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0], dict(text='AB123', confidence=.825, x=.1, y=.7, width=.2, height=.1))
        self.assertNotIn('codeVerified', rows[0])
    def test_tsv_format_does_not_depend_on_external_config_files(self):
        from unittest.mock import patch
        import subprocess
        result=subprocess.CompletedProcess([],0,(HEADER+'1\t1\t0\t0\t0\t0\t0\t0\t64\t64\t-1\t\n').encode(),b'')
        with patch.object(windows_ocr,'binary',return_value='tesseract'), patch.object(windows_ocr,'preprocess_image',return_value=Path('prepared.png')) as prepare, patch.object(windows_ocr.Path,'is_file',return_value=True), patch.object(windows_ocr.subprocess,'run',return_value=result) as run:
            self.assertEqual(windows_ocr.recognize('test.png'),[])
            prepare.assert_called_once()
            self.assertIn('tessedit_create_tsv=1',run.call_args.args[0])
            self.assertIn('--oem',run.call_args.args[0])
            self.assertIn('--dpi',run.call_args.args[0])
            self.assertNotIn('tsv',run.call_args.args[0])
            args=run.call_args.args[0]
            self.assertEqual(args[args.index('--tessdata-dir')+1],'tessdata')
            self.assertTrue(run.call_args.kwargs['cwd'])
    def test_tiny_attendance_rows_use_a_three_times_quality_profile(self):
        self.assertEqual(windows_ocr.ocr_scale((1000,43)),3)
        self.assertEqual(windows_ocr.ocr_scale((4000,200)),1)
    def test_tesseract_version_is_read_for_diagnostics(self):
        from unittest.mock import patch
        import subprocess
        windows_ocr._VERSION_CACHE=None
        result=subprocess.CompletedProcess([],0,b'tesseract 5.5.0\n leptonica-1.85.0\n',b'')
        with patch.object(windows_ocr,'binary',return_value='tesseract'), patch.object(windows_ocr.subprocess,'run',return_value=result) as run:
            self.assertEqual(windows_ocr.software_version(),'tesseract 5.5.0')
            run.assert_called_once()
    def test_code_consensus_requires_independent_agreement(self):
        self.assertEqual(windows_ocr.consensus_code([
            ('F59V7', .82), ('F59V7', .74), ('F59V7', .69), ('F59VV7', .91),
        ])['text'], 'F59V7')
        self.assertIsNone(windows_ocr.consensus_code([('F59V7', .82), ('F59W7', .8)]))
    def test_ocr_diagnostics_are_written_as_rotatable_json_lines(self):
        import json
        import tempfile
        from unittest.mock import patch
        import host
        with tempfile.TemporaryDirectory() as folder, patch.object(host, 'archive_directory', return_value=Path(folder)):
            host.append_ocr_log({'event':'ocr', 'engine':'Tesseract', 'confidence':.82})
            line=(Path(folder) / 'ocr.log').read_text(encoding='utf-8').strip()
            self.assertEqual(json.loads(line)['confidence'], .82)
    def test_malformed_output_is_rejected(self):
        with self.assertRaises(ValueError): windows_ocr.parse_tsv(HEADER)
    @unittest.skipUnless(sys.platform == 'win32', 'Windows integration test')
    def test_real_engine(self):
        from PIL import Image, ImageDraw, ImageFont
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            image=Image.new('RGB',(1200,180),'white')
            ImageDraw.Draw(image).text((30,35),'ATTENDANCE AB123',font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',64),fill='black')
            file=Path(folder)/'test image.png'; image.save(file)
            result=windows_ocr.recognize(file)
            self.assertIn('AB123',' '.join(o['text'] for o in result))
            self.assertEqual(windows_ocr.self_test(), (True,''))

if __name__ == '__main__': unittest.main()
