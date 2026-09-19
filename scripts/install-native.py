#!/usr/bin/env python3
"""Install only this app's native host; never read Chrome profiles or sessions."""
import argparse
import json
import os
from pathlib import Path
import shlex
import shutil
import struct
import subprocess
import sys
import time

def install(bundle, home, language='zh'):
    extension_id = 'nccgbccaamgcdcikjhljinefjbfcinfp'
    store_id = 'mneachaobiledakoicnkinfdpcjkbnmm'
    english = language == 'en'
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
    description = 'Mamo Check-in Mac local image recognition' if english else '马莫签到助手 Mac 本地图片识别'
    target.write_text(json.dumps({'name':'com.attendanceassistant.vision','description':description,'path':str(launcher),'type':'stdio','allowed_origins':['chrome-extension://' + value + '/' for value in [extension_id, store_id]]}, ensure_ascii=False, indent=2)+'\n')
    os.chmod(target, 0o600)
    return launcher, target, extension_id

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--bundle', type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--language', choices=('en', 'zh'), default=os.environ.get('MAMO_INSTALL_LANGUAGE', 'zh'))
    args = parser.parse_args()
    if sys.platform != 'darwin':
        raise SystemExit('This installer supports macOS only.' if args.language == 'en' else '本版本仅支持 macOS。')
    launcher, target, extension_id = install(args.bundle.resolve(), Path.home(), args.language)
    # Test exactly the installed launcher and framed protocol, without operating Chrome.
    # macOS inspects a newly written binary once before its first execution; that first
    # self-test can take about half a minute even though every later run is instant.
    body = b'{"op":"ping"}'
    english = args.language == 'en'
    print('Running the self-test; macOS may take about half a minute the first time it inspects a new program...'
          if english else '正在进行自检；macOS 首次检查新程序可能需要约半分钟，请稍候……')
    health = None
    for attempt in (1, 2):
        try:
            response = subprocess.run([str(launcher)], input=struct.pack('<I', len(body)) + body, capture_output=True, timeout=75, check=True).stdout
            size = struct.unpack('<I', response[:4])[0]
            health = json.loads(response[4:4 + size])
        except subprocess.TimeoutExpired:
            health = None
        if health and health.get('ok') and health.get('binaryReady'):
            break
        if attempt == 1:
            print('首次自检尚未完成，自动重试一次……' if not english else 'Self-test not finished yet; retrying once...')
            time.sleep(5)
    if not health or not health.get('ok') or not health.get('binaryReady'):
        if english:
            print('The recognition service was installed, but attendance-ocr still did not pass its startup self-test.')
            print('Run this installer once more; the first inspection of a new program can take about half a minute. If macOS actually reports attendance-ocr as blocked, allow it under System Settings → Privacy & Security → Open Anyway and retry.')
            print('Recognition executable: ' + str((health or {}).get('binaryPath', '')))
            raise SystemExit('Return to Mamo Check-in and choose “Allowed in System Settings — check again”. Do not skip this step.')
        print('识别服务文件已安装，但 attendance-ocr 自检仍未通过。')
        print('请重新运行本安装命令再试一次；macOS 首次检查新程序可能需要约半分钟。若 macOS 确实提示 attendance-ocr 被阻止，请到 系统设置 → 隐私与安全性 → 仍要打开 允许后重试。')
        print('识别程序位置：' + str((health or {}).get('binaryPath', '')))
        raise SystemExit('完成后回到助手页面，点击“已在系统设置允许，重新检测”。不要跳过这一步。')
    if args.language == 'en':
        print('Mac native recognition service installed; self-test passed.')
        print('Reload Mamo Check-in in Chrome, then reopen the settings page.')
        print('Extension ID: ' + extension_id)
    else:
        print('Mac 原生识别服务已安装，自检通过。')
        print('请在 Chrome 中重新加载马莫签到助手，然后重新打开设置页。')
        print('扩展 ID：' + extension_id)
