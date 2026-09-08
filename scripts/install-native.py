#!/usr/bin/env python3
"""Install only this app's native host; never read Chrome profiles or sessions."""
import argparse
import hashlib
import base64
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys

def install(bundle, home):
    manifest = json.loads((bundle / 'extension' / 'manifest.json').read_text())
    digest = hashlib.sha256(base64.b64decode(manifest['key'])).hexdigest()[:32]
    extension_id = ''.join(chr(ord('a') + int(char, 16)) for char in digest)
    destination = home / 'Library' / 'Application Support' / '签到助手' / 'native-runtime'
    (destination / 'native').mkdir(parents=True, exist_ok=True)
    (destination / 'build').mkdir(exist_ok=True)
    shutil.copy2(bundle / 'native' / 'host.py', destination / 'native' / 'host.py')
    shutil.copy2(bundle / 'build' / 'attendance-ocr', destination / 'build' / 'attendance-ocr')
    os.chmod(destination / 'build' / 'attendance-ocr', 0o755)
    launcher = destination / 'native' / 'launch.sh'
    launcher.write_text('#!/bin/sh\nexec ' + shlex.quote(sys.executable) + ' ' + shlex.quote(str(destination / 'native' / 'host.py')) + '\n')
    os.chmod(launcher, 0o755)
    registry = home / 'Library' / 'Application Support' / 'Google' / 'Chrome' / 'NativeMessagingHosts'
    registry.mkdir(parents=True, exist_ok=True)
    target = registry / 'com.attendanceassistant.vision.json'
    target.write_text(json.dumps({'name':'com.attendanceassistant.vision','description':'马莫签到 Mac 本地图片识别','path':str(launcher),'type':'stdio','allowed_origins':['chrome-extension://' + extension_id + '/']}, ensure_ascii=False, indent=2)+'\n')
    os.chmod(target, 0o600)
    return launcher, target, extension_id

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--bundle', type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    if sys.platform != 'darwin':
        raise SystemExit('本版本仅支持 macOS。')
    launcher, target, extension_id = install(args.bundle.resolve(), Path.home())
    # Test exactly the installed launcher and framed protocol, without operating Chrome.
    body = b'{"op":"ping"}'
    import struct
    response = subprocess.run([str(launcher)], input=struct.pack('<I',len(body))+body, capture_output=True, timeout=10, check=True).stdout
    size = struct.unpack('<I',response[:4])[0]
    health = json.loads(response[4:4+size])
    if not health.get('ok') or not health.get('binaryReady'):
        raise SystemExit('安装后的本机通信自检未通过。')
    print('Mac 原生识别服务已安装，自检通过。')
    print('请在 Chrome 中重新加载马莫签到，然后重新打开设置页。')
    print('扩展 ID：' + extension_id)
