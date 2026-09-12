#!/usr/bin/env python3
"""Remove only this app's native host; never touch extension settings or records."""
import argparse
import json
import os
from pathlib import Path
import shutil


HOST = 'com.attendanceassistant.vision'


def uninstall(home):
    runtime = home / 'Library' / 'Application Support' / '签到助手' / 'native-runtime'
    registry = home / 'Library' / 'Application Support' / 'Google' / 'Chrome' / 'NativeMessagingHosts'
    manifest = registry / (HOST + '.json')
    if manifest.exists():
        manifest.unlink()
    if runtime.exists():
        shutil.rmtree(runtime)
    return manifest, runtime


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--language', choices=('en', 'zh'), default=os.environ.get('MAMO_INSTALL_LANGUAGE', 'zh'))
    args = parser.parse_args()
    if os.uname().sysname != 'Darwin':
        raise SystemExit('This uninstaller supports macOS only.' if args.language == 'en' else '本卸载程序仅支持 macOS。')
    try:
        manifest, runtime = uninstall(Path.home())
    except Exception as error:
        if args.language == 'en':
            print(f'Removal needs attention: {error}')
            raise SystemExit('Close Mamo Check-in and Chrome, then run the uninstaller again.')
        print(f'清除失败：{error}')
        raise SystemExit('请关闭马莫签到助手和 Chrome，然后重新运行卸载程序。')
    if args.language == 'en':
        print('Mac local recognition service removed.')
        print('Chrome Native Messaging registration and local OCR files were removed.')
        print('Extension settings, courses, and attendance records were not changed.')
    else:
        print('Mac 本机识别服务已清除。')
        print('Chrome Native Messaging 注册和本机 OCR 文件已清除。')
        print('扩展配置、课程和签到记录没有改变。')
