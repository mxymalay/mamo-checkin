import base64
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("host", Path(__file__).resolve().parents[1] / "native/host.py")
host = importlib.util.module_from_spec(spec)
spec.loader.exec_module(host)


class NativePreviewTests(unittest.TestCase):
    def test_preview_never_opens_archive_and_removes_temporary_image(self):
        paths = []

        def recognize(path):
            paths.append(path)
            self.assertEqual(path.read_bytes(), b"synthetic-image")
            return []

        with patch.object(host, "run_ocr", side_effect=recognize), patch.object(host, "archive_directory", side_effect=AssertionError("preview touched archive")):
            result = host.handle_request({"op": "ocr-preview", "mimeType": "image/png", "imageBase64": base64.b64encode(b"synthetic-image").decode()})
        self.assertFalse(result["cached"])
        self.assertTrue(paths)
        self.assertTrue(all(not path.exists() for path in paths))


if __name__ == "__main__":
    unittest.main()
