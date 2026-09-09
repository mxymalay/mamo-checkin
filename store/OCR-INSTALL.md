# Mamo OCR companion / 马莫本机识别服务

## English

This package installs the local OCR helper only. Install the browser extension from the Chrome Web Store separately. Do not enable Developer mode or load another extension.

### macOS 12+

1. Extract the ZIP. Do not run a file from inside the archive.
2. Run `安装Mac识别服务.command`. macOS must have Python 3 available; install Apple's command-line tools if prompted.
3. If macOS blocks the installer or `attendance-ocr`, verify the source, then use System Settings > Privacy & Security > Open Anyway for that file. Do not disable system security.
4. Return to the extension and click the installation check, then Refresh and continue when ready.

### Windows 10/11 x64

1. Install Tesseract OCR using the button in the extension's setup guide. Keep its default location and English language data.
2. Extract the ZIP and run `Install Windows OCR.exe`. Keep it beside the `host` folder. No Python installation is required.
3. If SmartScreen blocks it, verify the source before using More info > Run anyway. Contact your administrator on managed computers. Do not disable Windows Security.
4. Return to the extension, check installation and refresh when ready.

The installer authorizes only the Mamo store ID `mneachaobiledakoicnkinfdpcjkbnmm` and the project's development ID. It does not read browser profiles or credentials. Existing extension settings and archives are not cleared.

Downloads must come from https://github.com/mxymalay/mamo-checkin/releases . If the browser reports a failed download, retry using the setup link. A download click does not prove installation succeeded; rely on the helper's self-test in the extension.

## 中文

此包仅安装本机 OCR 配套程序。浏览器扩展从 Chrome 商店安装，不要开启开发者模式或重复加载扩展。

### macOS 12+

1. 完整解压 ZIP。
2. 运行 `安装Mac识别服务.command`。需要系统可用的 Python 3；若提示安装 Apple 命令行工具，请先完成安装。
3. 安装命令或 attendance-ocr 被拦截时，确认文件来源后到“系统设置 → 隐私与安全性 → 仍要打开”允许对应文件，不要关闭系统安全保护。
4. 返回扩展点击检测，通过后“刷新并继续”。

### Windows 10/11 x64

1. 使用扩展引导中的按钮安装 Tesseract，保留默认位置和 English 语言数据。
2. 完整解压 ZIP，运行 `Install Windows OCR.exe`，保持它与 host 文件夹在同一目录。无需安装 Python。
3. SmartScreen 拦截时确认来源再选择“更多信息 → 仍要运行”；学校管理的电脑请联系管理员，不要关闭系统安全保护。
4. 返回扩展检测安装，通过后刷新。

安装程序仅授权本项目的商店 ID 与开发版 ID，不读取浏览器配置或账号凭据，不清空已有扩展设置或归档。

浏览器提示下载失败时，从引导页重试。点击下载不代表安装成功，请以扩展内识别服务自检结果为准。
