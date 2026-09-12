"""Remove this app's Windows native host; keep extension settings and records."""
import argparse
import os
from pathlib import Path
import shutil
import sys
import winreg


HOST = 'com.attendanceassistant.vision'

def bundled_language():
    return 'zh' if Path(sys.executable).stem == '卸载 Windows OCR' else 'en'


def uninstall(local_app_data):
    runtime = Path(local_app_data) / 'Mamo Check-in' / 'native-runtime'
    keyname = rf'SOFTWARE\Google\Chrome\NativeMessagingHosts\{HOST}'
    try:
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, keyname)
    except FileNotFoundError:
        pass
    if runtime.exists():
        shutil.rmtree(runtime)
    return keyname, runtime


def main(language):
    if os.name != 'nt':
        raise SystemExit('This uninstaller supports Windows only.' if language == 'en' else '本卸载程序仅支持 Windows。')
    try:
        keyname, runtime = uninstall(os.environ['LOCALAPPDATA'])
    except Exception as error:
        if language == 'en':
            print(f'Removal needs attention: {error}')
            raise SystemExit('Close Mamo Check-in and Chrome, then run the uninstaller again.')
        print(f'清除失败：{error}')
        raise SystemExit('请关闭马莫签到助手和 Chrome，然后重新运行卸载程序。')
    if language == 'en':
        print('Windows local recognition service removed.')
        print('Chrome Native Messaging registration and local OCR files were removed.')
        print('Extension settings, courses, and attendance records were not changed.')
    else:
        print('Windows 本机识别服务已清除。')
        print('Chrome Native Messaging 注册和本机 OCR 文件已清除。')
        print('扩展配置、课程和签到记录没有改变。')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--language', choices=('en', 'zh'), default=bundled_language())
    args = parser.parse_args()
    try:
        main(args.language)
    except SystemExit:
        raise
    except Exception as error:
        print(f'Removal needs attention: {error}' if args.language == 'en' else f'清除失败：{error}')
        raise SystemExit(1)
    input('Press Enter to close...' if args.language == 'en' else '按 Enter 关闭...')
