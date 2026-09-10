# Mamo OCR companion / 马莫本机识别服务

## English

This package installs the local OCR helper only. Use it when the browser extension is already installed. Do not enable Developer mode or load another copy of the extension just to install OCR.

### macOS 12+

1. Extract the ZIP. Do not run a file from inside the archive.
2. Run `Install Mac Recognition.command`. macOS must have Python 3 available; install Apple's command-line tools if prompted.
3. If macOS blocks the installer or `attendance-ocr`, verify the source, then use System Settings > Privacy & Security > Open Anyway for that file. Do not disable system security.
4. Return to the extension and click the installation check, then Refresh and continue when ready.

### Windows 10/11 x64

1. Install Tesseract OCR using the button in the extension's setup guide. Keep its default location and English language data.
2. Extract the ZIP and run `Install Windows OCR.exe`. Keep it beside the `host` folder. No Python installation is required.
3. If SmartScreen blocks it, verify the source before using More info > Run anyway. Contact your administrator on managed computers. Do not disable Windows Security.
4. Return to the extension, check installation and refresh when ready.

Downloads must come from the [latest GitHub release](https://github.com/mxymalay/mamo-checkin/releases/latest). A download click does not prove installation succeeded; rely on the helper's self-test in the extension.

## 中文

此包仅安装本机 OCR 配套程序。扩展已经安装时可以使用此包，不要为了安装 OCR 而开启开发者模式或重复加载扩展。

### macOS 12+

1. 完整解压 ZIP，不要直接运行压缩包内的文件。
2. 运行 `Install Mac Recognition.command`。需要系统可用的 Python 3；若提示安装 Apple 命令行工具，请先完成安装。
3. 安装命令或 `attendance-ocr` 被拦截时，确认文件来源后到“系统设置 → 隐私与安全性 → 仍要打开”允许对应文件，不要关闭系统安全保护。
4. 返回扩展点击检测，通过后点击“刷新并继续”。

### Windows 10/11 x64

1. 使用扩展引导中的按钮安装 Tesseract，保留默认位置和 English 语言数据。
2. 完整解压 ZIP，运行 `Install Windows OCR.exe`，保持它与 `host` 文件夹在同一目录。无需安装 Python。
3. SmartScreen 拦截时确认来源再选择“更多信息 → 仍要运行”；学校管理的电脑请联系管理员，不要关闭 Windows 安全保护。
4. 返回扩展检测安装，通过后刷新页面。

请从[最新 GitHub Release](https://github.com/mxymalay/mamo-checkin/releases/latest)下载。点击下载不代表安装成功，请以扩展内识别服务自检结果为准。
