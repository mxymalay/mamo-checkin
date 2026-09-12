# Mamo OCR companion / 马莫本机识别服务

## English

This package installs the local OCR helper required for both the GitHub extension and the Chrome Web Store edition. Download the package for your operating system, extract it completely, and follow the steps below. Do not enable Developer mode or load another copy of the extension to install OCR.

### macOS 12+

1. Extract `mamo-ocr-mac.zip`. Do not run a file from inside the archive.
2. Run `Install Mac Recognition.command`. macOS must have Python 3 available; install Apple's command-line tools if prompted.
3. If macOS blocks the installer or `attendance-ocr`, verify the source, then use **System Settings > Privacy & Security > Open Anyway** for that file. Do not disable system security.
4. Return to the extension and wait for the recognition check to pass.
5. To remove the helper later, run `Uninstall Mac Recognition.command`. It removes only the local OCR helper and Chrome registration.

### Windows 10/11 x64

1. Install Tesseract OCR using the link in the extension guide. Keep its default location and English language data.
2. Extract `mamo-ocr-windows.zip` and run `Install Windows OCR.exe`. No Python installation is required.
3. If SmartScreen blocks it, verify the source before using **More info > Run anyway**. Contact your administrator on managed computers. Do not disable Windows Security.
4. Return to the extension and wait for the recognition check to pass.
5. To remove the helper later, run `Uninstall Windows OCR.exe` or `Uninstall Windows OCR.cmd`. It removes only the local OCR helper and Chrome registration.

Downloads must come from the [latest GitHub release](https://github.com/mxymalay/mamo-checkin/releases/latest). A download click does not prove installation succeeded; rely on the helper's self-test in the extension.

## 中文

此包安装本机 OCR 配套程序，GitHub 扩展和商店版都需要下载对应系统的 OCR 包。请完整解压后按下方步骤操作。安装 OCR 不需要开启开发者模式，也不要重复加载扩展。

### macOS 12+

1. 解压 `mamo-ocr-mac.zip`，不要直接运行压缩包内的文件。
2. 运行 `安装 Mac 识别服务.command`。需要系统可用的 Python 3；若提示安装 Apple 命令行工具，请先完成安装。
3. 安装命令或 `attendance-ocr` 被拦截时，确认文件来源后到“系统设置 → 隐私与安全性 → 仍要打开”允许对应文件，不要关闭系统安全保护。
4. 返回扩展，等待识别服务检测通过。
5. 以后如需清除配套程序，运行 `卸载 Mac 识别服务.command`。只清除本机 OCR 服务和 Chrome 注册，不会删除扩展配置、课程或签到记录。

### Windows 10/11 x64

1. 按扩展引导中的链接安装 Tesseract，保留默认位置和 English 语言数据。
2. 解压 `mamo-ocr-windows.zip`，运行 `安装 Windows OCR.cmd`。无需安装 Python。
3. SmartScreen 拦截时确认来源，再选择“更多信息 → 仍要运行”；学校管理的电脑请联系管理员，不要关闭 Windows 安全保护。
4. 返回扩展，等待识别服务检测通过。
5. 以后如需清除配套程序，运行 `卸载 Windows OCR.cmd`。只清除本机 OCR 服务和 Chrome 注册，不会删除扩展配置、课程或签到记录。

请从[最新 GitHub Release](https://github.com/mxymalay/mamo-checkin/releases/latest)下载。点击下载不代表安装成功，请以扩展内识别服务自检结果为准。
