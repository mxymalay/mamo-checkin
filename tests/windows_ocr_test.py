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
