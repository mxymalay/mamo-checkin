# Mamo macOS OCR companion / 马莫 macOS 本机识别服务

## English

This package installs the optional local Mac OCR helper for both the GitHub extension and the Chrome Web Store edition. Windows uses built-in browser OCR and does not need an OCR package. Extract the package completely and follow the steps below. Do not enable Developer mode or load another copy of the extension to install OCR.

### macOS 12+

1. Extract `mamo-ocr-mac.zip`. Do not run a file from inside the archive.
2. Open the `English` folder and run `Install Mac Recognition.command`. macOS must have Python 3 available; install Apple's command-line tools if prompted.
3. The first self-check can take about half a minute while macOS inspects the new helper once; every later check is instant. Only if macOS actually reports the installer or `attendance-ocr` as blocked, verify the source, then use **System Settings > Privacy & Security > Open Anyway** for that file. Do not disable system security.
4. Return to the extension and wait for the recognition check to pass.
5. To remove the helper later, run `English/Uninstall Mac Recognition.command`. It removes only the local OCR helper and Chrome registration.

### Windows 10/11 x64

No OCR package is required. Windows uses the built-in browser OCR locally; open the extension and follow its setup guide.

Downloads must come from the [latest GitHub release](https://github.com/mxymalay/mamo-checkin/releases/latest). A download click does not prove installation succeeded; rely on the extension's recognition status.

## 中文

此包安装可选的 macOS 本机 OCR 配套程序，GitHub 扩展和商店版均可使用。Windows 使用浏览器内置 OCR，不需要下载 OCR 包。请完整解压后按下方步骤操作。安装 OCR 不需要开启开发者模式，也不要重复加载扩展。

### macOS 12+

1. 解压 `mamo-ocr-mac.zip`，不要直接运行压缩包内的文件。
2. 打开 `中文` 文件夹，运行 `安装 Mac 识别服务.command`。需要系统可用的 Python 3；若提示安装 Apple 命令行工具，请先完成安装。
3. 首次自检时 macOS 会对新程序做一次性检查，可能需要约半分钟，属正常现象。只有当 macOS 确实提示安装命令或 `attendance-ocr` 被拦截时，才确认文件来源后到“系统设置 → 隐私与安全性 → 仍要打开”允许对应文件；不要关闭系统安全保护。
4. 返回扩展，等待识别服务检测通过。
5. 以后如需清除配套程序，运行 `中文/卸载 Mac 识别服务.command`。只清除本机 OCR 服务和 Chrome 注册，不会删除扩展配置、课程或签到记录。

### Windows 10/11 x64

无需下载 OCR 包。Windows 使用本机浏览器内置 OCR，打开扩展并按引导继续即可。

请从[最新 GitHub Release](https://github.com/mxymalay/mamo-checkin/releases/latest)下载。请以扩展内识别状态为准。
