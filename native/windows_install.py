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


def main():
    source = Path(sys.executable).parent if getattr(sys, 'frozen', False) else Path(__file__).parent
    runtime = Path(os.environ['LOCALAPPDATA']) / 'Mamo Check-in' / 'native-runtime'
    runtime.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source / 'host', runtime, dirs_exist_ok=True)
    executable = runtime / 'mamo-host.exe'
    manifest = runtime / (HOST + '.json')
    manifest.write_text(json.dumps(dict(name=HOST, description='Mamo Check-in local OCR',
        path=str(executable), type='stdio', allowed_origins=[f'chrome-extension://{EXTENSION}/']), indent=2), encoding='utf-8')
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, rf'SOFTWARE\Google\Chrome\NativeMessagingHosts\{HOST}') as key:
        winreg.SetValueEx(key, '', 0, winreg.REG_SZ, str(manifest))
    import struct
    request = b'{"op":"ping"}'
    result = subprocess.run([str(executable)], input=struct.pack('<I', len(request))+request,
                            capture_output=True, timeout=40, creationflags=subprocess.CREATE_NO_WINDOW)
    if len(result.stdout) < 4:
        raise RuntimeError('Host could not start. Check Windows Security and reinstall the helper.')
    length = struct.unpack('<I', result.stdout[:4])[0]
    reply = json.loads(result.stdout[4:4+length])
    if not reply.get('binaryReady'):
        raise RuntimeError(reply.get('healthError') or 'OCR self-test failed')
    print('Installed successfully. Return to Mamo Check-in and click Refresh and continue.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Installation needs attention: {error}')
        input('Press Enter to close...')
        raise SystemExit(1)
    input('Press Enter to close...')
