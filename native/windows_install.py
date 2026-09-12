"""Install the bundled host for the current Windows user; no admin required."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import winreg

HOST = 'com.attendanceassistant.vision'
EXTENSION = 'nccgbccaamgcdcikjhljinefjbfcinfp'
STORE_EXTENSION = 'mneachaobiledakoicnkinfdpcjkbnmm'

def configure_output():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except AttributeError:
            pass


def bundled_language():
    return 'zh' if Path(sys.executable).stem == '安装 Windows OCR' else 'en'


def main(language='en'):
    source = Path(sys.executable).parent if getattr(sys, 'frozen', False) else Path(__file__).parent
    runtime = Path(os.environ['LOCALAPPDATA']) / 'Mamo Check-in' / 'native-runtime'
    runtime.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source / 'host', runtime, dirs_exist_ok=True)
    executable = runtime / 'mamo-host.exe'
    manifest = runtime / (HOST + '.json')
    manifest.write_text(json.dumps(dict(name=HOST, description='Mamo Check-in local OCR',
        path=str(executable), type='stdio', allowed_origins=[f'chrome-extension://{value}/' for value in [EXTENSION, STORE_EXTENSION]]), indent=2), encoding='utf-8')
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, rf'SOFTWARE\Google\Chrome\NativeMessagingHosts\{HOST}') as key:
        winreg.SetValueEx(key, '', 0, winreg.REG_SZ, str(manifest))
    import struct
    request = b'{"op":"ping"}'
    result = subprocess.run([str(executable)], input=struct.pack('<I', len(request))+request,
                            capture_output=True, timeout=40, creationflags=subprocess.CREATE_NO_WINDOW)
    if len(result.stdout) < 4:
        raise RuntimeError('Host could not start. Check Windows Security and reinstall the helper.' if language == 'en' else '识别服务无法启动，请检查 Windows 安全设置后重新安装。')
    length = struct.unpack('<I', result.stdout[:4])[0]
    reply = json.loads(result.stdout[4:4+length])
    if not reply.get('binaryReady'):
        raise RuntimeError((reply.get('healthError') or 'OCR self-test failed') if language == 'en' else '识别服务自检失败，请确认 Tesseract 和英文语言数据已安装。')
    if language == 'en':
        print('Installed successfully. Return to Mamo Check-in and click Refresh and continue.')
    else:
        print('安装成功。请返回马莫签到助手，点击“刷新并继续”。')


if __name__ == '__main__':
    configure_output()
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--language', choices=('en', 'zh'), default=bundled_language())
    args = parser.parse_args()
    try:
        main(args.language)
    except Exception as error:
        if args.language == 'en':
            print(f'Installation needs attention: {error}')
            input('Press Enter to close...')
        else:
            print('安装失败，请检查 Tesseract、英文语言数据和 Windows 安全设置后重试。')
            input('按 Enter 键关闭...')
        raise SystemExit(1)
    input('Press Enter to close...' if args.language == 'en' else '按 Enter 键关闭...')
