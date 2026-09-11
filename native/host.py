#!/usr/bin/env python3
"""Chrome Native Messaging host for local attendance OCR and archiving."""

import base64
import binascii
from contextlib import contextmanager
import sys
if sys.platform == "win32":
    import msvcrt
else:
    import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import struct
import subprocess
import sys
import tempfile
import time


MAX_REQUEST_BYTES = 16 * 1024 * 1024
MAX_RESPONSE_BYTES = 1024 * 1024
MAX_IMAGE_BYTES = 12 * 1024 * 1024
MAX_OCR_OUTPUT_BYTES = MAX_RESPONSE_BYTES - 64 * 1024
OCR_TIMEOUT_SECONDS = 30
OCR_CACHE_VERSION = 6 if sys.platform == "win32" else 1
OCR_LOG_MAX_BYTES = 5 * 1024 * 1024
PROTOCOL_VERSION = 1
IS_WINDOWS = sys.platform == "win32"
OCR_ENGINE = "Tesseract" if IS_WINDOWS else "Apple Vision"
COURSE_PATTERN = re.compile(r"[A-Z]{2,10}\d{3,6}\Z")
META_FIELDS = ("course", "messageId", "sourceUrl", "sentAt", "subject")
MIME_EXTENSIONS = {"image/png": ".png", "image/jpeg": ".jpg"}

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OCR_BINARY = PROJECT_ROOT / "build" / "attendance-ocr"


class RequestError(Exception):
    pass


def archive_directory():
    configured = os.environ.get("ATTENDANCE_ARCHIVE_DIR")
    if configured:
        path = Path(configured).expanduser()
    else:
        path = Path.home() / "Documents" / "签到助手归档"
    return path.resolve()


def ocr_log_path():
    return archive_directory() / "ocr.log"


def append_ocr_log(event):
    """Append one diagnostic JSON line without making OCR depend on logging."""
    path = ocr_log_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and path.stat().st_size >= OCR_LOG_MAX_BYTES:
            rotated = path.with_name("ocr.log.1")
            try:
                rotated.unlink()
            except FileNotFoundError:
                pass
            path.replace(rotated)
        with path.open("a", encoding="utf-8") as output:
            output.write(json.dumps(event, ensure_ascii=False, separators=(",", ":")))
            output.write("\n")
    except OSError:
        pass


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", prefix=f".{path.name}.", suffix=".tmp", dir=path.parent, delete=False
        ) as temporary:
            temporary_path = Path(temporary.name)
            temporary.write(data)
            temporary.flush()
            os.fsync(temporary.fileno())
        os.replace(temporary_path, path)
    finally:
        if temporary_path is not None:
            try:
                temporary_path.unlink()
            except FileNotFoundError:
                pass


def atomic_write_once(path, data):
    """Publish immutable bytes atomically, leaving an existing file untouched."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", prefix=f".{path.name}.", suffix=".tmp", dir=path.parent, delete=False
        ) as temporary:
            temporary_path = Path(temporary.name)
            temporary.write(data)
            temporary.flush()
            os.fsync(temporary.fileno())
        try:
            os.link(temporary_path, path)
        except FileExistsError:
            pass
    finally:
        if temporary_path is not None:
            try:
                temporary_path.unlink()
            except FileNotFoundError:
                pass


@contextmanager
def image_lock(images_directory, image_id):
    """Serialize one image's immutable original, provenance, and OCR cache."""
    images_directory.mkdir(parents=True, exist_ok=True)
    lock_path = images_directory / f".{image_id}.lock"
    descriptor = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        if IS_WINDOWS:
            os.write(descriptor, b"0")
            os.lseek(descriptor, 0, os.SEEK_SET)
            msvcrt.locking(descriptor, msvcrt.LK_LOCK, 1)
        else:
            fcntl.flock(descriptor, fcntl.LOCK_EX)
        yield
    finally:
        if IS_WINDOWS:
            os.lseek(descriptor, 0, os.SEEK_SET)
            msvcrt.locking(descriptor, msvcrt.LK_UNLCK, 1)
        else:
            fcntl.flock(descriptor, fcntl.LOCK_UN)
        os.close(descriptor)


def json_bytes(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode(
        "utf-8"
    )


def validate_meta(meta):
    if not isinstance(meta, dict):
        raise RequestError("meta must be an object")
    for field in META_FIELDS:
        if not isinstance(meta.get(field), str) or not meta[field]:
            raise RequestError(f"meta.{field} must be a non-empty string")
    if COURSE_PATTERN.fullmatch(meta["course"]) is None:
        raise RequestError("meta.course must match [A-Z]{2,10} followed by 3-6 digits")


def valid_observations(observations):
    if not isinstance(observations, list):
        return False
    for observation in observations:
        if not isinstance(observation, dict) or not isinstance(observation.get("text"), str):
            return False
        for field in ("confidence", "x", "y", "width", "height"):
            value = observation.get(field)
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                return False
            if value < 0 or value > 1:
                return False
        if observation["x"] + observation["width"] > 1.000001:
            return False
        if observation["y"] + observation["height"] > 1.000001:
            return False
    return True


def run_ocr(image_path):
    if IS_WINDOWS:
        from windows_ocr import recognize
        try:
            return recognize(image_path)
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            raise RequestError(str(error)) from error
    if not OCR_BINARY.is_file() or not os.access(OCR_BINARY, os.X_OK):
        raise RequestError("OCR binary is not ready")
    try:
        completed = subprocess.run(
            [str(OCR_BINARY), str(image_path)],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=OCR_TIMEOUT_SECONDS,
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise RequestError("OCR timed out") from error
    if completed.returncode != 0:
        detail = completed.stderr.decode("utf-8", errors="replace").strip()
        raise RequestError(detail[:500] or "OCR failed")
    if len(completed.stdout) > MAX_OCR_OUTPUT_BYTES:
        raise RequestError("OCR output is too large")
    try:
        observations = json.loads(completed.stdout.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RequestError("OCR returned invalid JSON") from error
    if not valid_observations(observations):
        raise RequestError("OCR returned an invalid observation list")
    return observations


def ocr_software_version():
    if not IS_WINDOWS:
        return None
    try:
        from windows_ocr import software_version
        return software_version()
    except (OSError, subprocess.SubprocessError):
        return None


def load_sidecar(path, image_id):
    if not path.exists():
        return {"imageId": image_id, "sources": []}
    try:
        sidecar = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RequestError("image metadata sidecar is invalid") from error
    if not isinstance(sidecar, dict) or sidecar.get("imageId") != image_id:
        raise RequestError("image metadata sidecar does not match the image")
    sources = sidecar.get("sources")
    if not isinstance(sources, list) or not all(isinstance(source, dict) for source in sources):
        sources = []
    legacy_meta = sidecar.get("meta")
    if isinstance(legacy_meta, dict):
        sources.insert(0, legacy_meta)
    sidecar["sources"] = deduplicate_sources(sources)
    return sidecar


def deduplicate_sources(sources):
    result = []
    seen = set()
    for source in sources:
        key = json_bytes(source)
        if key not in seen:
            seen.add(key)
            result.append(source)
    return result


def existing_image_path(images_directory, image_id, preferred_extension, sidecar):
    image_file = sidecar.get("imageFile")
    if isinstance(image_file, str) and image_file in {
        f"{image_id}.png",
        f"{image_id}.jpg",
    }:
        candidate = images_directory / image_file
        if candidate.exists():
            return candidate
    for extension in (preferred_extension, ".png", ".jpg"):
        candidate = images_directory / f"{image_id}{extension}"
        if candidate.exists():
            return candidate
    return images_directory / f"{image_id}{preferred_extension}"


def verify_original(path, expected_image_id):
    digest = hashlib.sha256()
    try:
        with path.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(chunk)
    except OSError as error:
        raise RequestError("archived original image cannot be read") from error
    if digest.hexdigest() != expected_image_id:
        raise RequestError("archived original image does not match its hash")


def handle_ocr(request):
    started = time.monotonic()
    mime_type = request.get("mimeType")
    if mime_type not in MIME_EXTENSIONS:
        raise RequestError("mimeType must be image/png or image/jpeg")
    meta = request.get("meta")
    validate_meta(meta)
    encoded_image = request.get("imageBase64")
    if not isinstance(encoded_image, str) or not encoded_image:
        raise RequestError("imageBase64 must be a non-empty string")
    try:
        image_data = base64.b64decode(encoded_image, validate=True)
    except (binascii.Error, ValueError) as error:
        raise RequestError("imageBase64 is invalid") from error
    if not image_data:
        raise RequestError("image is empty")
    if len(image_data) > MAX_IMAGE_BYTES:
        raise RequestError("image is too large")

    image_id = hashlib.sha256(image_data).hexdigest()
    software_version = ocr_software_version()
    images_directory = archive_directory() / "images"
    sidecar_path = images_directory / f"{image_id}.json"
    with image_lock(images_directory, image_id):
        sidecar = load_sidecar(sidecar_path, image_id)
        image_path = existing_image_path(
            images_directory, image_id, MIME_EXTENSIONS[mime_type], sidecar
        )
        atomic_write_once(image_path, image_data)
        verify_original(image_path, image_id)

        sources = deduplicate_sources([*sidecar.get("sources", []), meta])
        old_mime_types = sidecar.get("mimeTypes")
        if not isinstance(old_mime_types, list) or not all(
            isinstance(value, str) for value in old_mime_types
        ):
            old_mime_types = []
        original_mime_type = sidecar.get("mimeType")
        if original_mime_type not in MIME_EXTENSIONS:
            original_mime_type = mime_type
        sidecar.update(
            {
                "imageId": image_id,
                "imageFile": image_path.name,
                "mimeType": original_mime_type,
                "mimeTypes": list(dict.fromkeys([*old_mime_types, mime_type])),
                "meta": sources[0],
                "sources": sources,
            }
        )
        cached_ocr = sidecar.get("ocr")
        cached = bool(
            isinstance(cached_ocr, dict)
            and cached_ocr.get("version") == OCR_CACHE_VERSION
            and cached_ocr.get("engine") == OCR_ENGINE
            and (not IS_WINDOWS or cached_ocr.get("softwareVersion") == software_version)
            and valid_observations(cached_ocr.get("observations"))
        )
        if cached:
            observations = cached_ocr["observations"]
        else:
            # Save source provenance even when Vision later fails or times out.
            atomic_write(sidecar_path, json_bytes(sidecar) + b"\n")
            try:
                observations = run_ocr(image_path)
            except Exception as error:
                append_ocr_log(
                    {
                        "timestamp": time.time(),
                        "event": "ocr-error",
                        "engine": OCR_ENGINE,
                        "ocrRevision": OCR_CACHE_VERSION,
                        **({"ocrSoftwareVersion": software_version} if software_version else {}),
                        "course": meta["course"],
                        "imageId": image_id,
                        "durationMs": round((time.monotonic() - started) * 1000),
                        "error": str(error)[:500],
                    }
                )
                raise
            sidecar["ocr"] = {
                "version": OCR_CACHE_VERSION,
                "engine": OCR_ENGINE,
                "observations": observations,
            }
            if software_version:
                sidecar["ocr"]["softwareVersion"] = software_version
        atomic_write(sidecar_path, json_bytes(sidecar) + b"\n")
        append_ocr_log(
            {
                "timestamp": time.time(),
                "event": "ocr",
                "engine": OCR_ENGINE,
                "ocrRevision": OCR_CACHE_VERSION,
                **({"ocrSoftwareVersion": software_version} if software_version else {}),
                "profile": "grayscale-autocontrast-upscale-multipass-consensus-fields" if IS_WINDOWS else "apple-vision",
                "course": meta["course"],
                "imageId": image_id,
                "cached": cached,
                "durationMs": round((time.monotonic() - started) * 1000),
                "observationCount": len(observations),
                "observations": observations,
            }
        )
    return {
        "ok": True,
        "imageId": image_id,
        "imagePath": str(image_path),
        "observations": observations,
        "cached": cached,
        "ocrLogPath": str(ocr_log_path()),
    }


def handle_archive(request):
    records = request.get("records")
    if not isinstance(records, list):
        raise RequestError("records must be an array")
    archive_path = archive_directory() / "records.json"
    atomic_write(archive_path, json_bytes(records) + b"\n")
    return {"ok": True, "archivePath": str(archive_path)}


def handle_request(request):
    if not isinstance(request, dict):
        raise RequestError("request must be a JSON object")
    operation = request.get("op")
    if operation == "ping":
        ready = False
        health_error = ""
        try:
            probe = subprocess.run([str(OCR_BINARY), "--self-test"], capture_output=True, timeout=6, check=False)
            payload = json.loads(probe.stdout.decode("utf-8")) if probe.returncode == 0 else None
            ready = isinstance(payload, dict) and payload.get("ok") is True
        except (OSError, ValueError, subprocess.TimeoutExpired):
            pass
        if IS_WINDOWS:
            from windows_ocr import self_test
            ready, health_error = self_test()
        if not ready and not IS_WINDOWS:
            health_error = "attendance-ocr 未通过启动自检。请安装新版识别服务；若 macOS 阻止此程序，请到系统设置 → 隐私与安全性 → 仍要打开，允许 attendance-ocr 后点击重新检测。"
        return {
            "ok": True,
            "binaryReady": ready,
            "nativeBlocked": not IS_WINDOWS and not ready and OCR_BINARY.is_file(),
            "healthError": health_error,
            "binaryPath": str(OCR_BINARY),
            "archiveDir": str(archive_directory()),
            "ocrLogPath": str(ocr_log_path()),
            "engine": OCR_ENGINE,
            "ocrRevision": OCR_CACHE_VERSION,
            "ocrSoftwareVersion": ocr_software_version(),
            "companionRevision": 1,
            "busy": False,
            "stage": ("Local OCR ready" if ready else "Local OCR self-test failed") if IS_WINDOWS else ("Mac 原生识别已就绪" if ready else "Mac 原生识别未通过启动自检"),
            "protocolVersion": PROTOCOL_VERSION,
        }
    if operation == "ocr":
        return handle_ocr(request)
    if operation == "archive":
        return handle_archive(request)
    raise RequestError("unsupported op")


def read_exact(stream, size):
    chunks = []
    remaining = size
    while remaining:
        chunk = stream.read(remaining)
        if not chunk:
            raise RequestError("truncated native message")
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)


def send_response(stream, response):
    encoded = json_bytes(response)
    if len(encoded) > MAX_RESPONSE_BYTES:
        encoded = json_bytes({"ok": False, "error": "response is too large"})
    stream.write(struct.pack("<I", len(encoded)))
    stream.write(encoded)
    stream.flush()


def main():
    os.umask(0o077)
    if IS_WINDOWS:
        msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    input_stream = sys.stdin.buffer
    output_stream = sys.stdout.buffer
    while True:
        header = input_stream.read(4)
        if not header:
            return 0
        if len(header) != 4:
            send_response(output_stream, {"ok": False, "error": "truncated native header"})
            return 0
        length = struct.unpack("<I", header)[0]
        if length > MAX_REQUEST_BYTES:
            send_response(output_stream, {"ok": False, "error": "native message is too large"})
            return 0
        try:
            body = read_exact(input_stream, length)
            try:
                request = json.loads(body.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as error:
                raise RequestError("request is not valid UTF-8 JSON") from error
            response = handle_request(request)
        except RequestError as error:
            response = {"ok": False, "error": str(error)}
        except Exception:
            response = {"ok": False, "error": "internal native host error"}
        send_response(output_stream, response)


if __name__ == "__main__":
    raise SystemExit(main())
