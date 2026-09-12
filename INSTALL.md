# Mamo Check-in installation

## English

macOS 12+ and Google Chrome are required. Download these two files from the [latest GitHub Release](https://github.com/mxymalay/mamo-checkin/releases/latest):

- [Chrome extension](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-checkin-extension.zip)
- [macOS OCR helper](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-mac.zip)

1. Extract the extension ZIP into a permanent folder.
2. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the extracted extension folder whose root contains `manifest.json`.
3. Extract `mamo-ocr-mac.zip`, then run `Install Mac Recognition.command`.
4. Open the extension and follow the guide. Enter your school identity, sign in to Attendance, detect courses, choose Gmail or Moodle sources, and save.

If macOS blocks the installer or `attendance-ocr`, verify the source, then use **System Settings > Privacy & Security > Open Anyway** for that file. Do not disable system security. Return to the extension and wait for the recognition check to pass.

The OCR helper runs locally. Images and records remain on this computer. Low-confidence results stay available for review.

## 中文

# 马莫签到助手安装指南

仅支持 **macOS 12+ 和 Chrome**。请从[最新 GitHub Release](https://github.com/mxymalay/mamo-checkin/releases/latest)下载以下两个文件：

- [Chrome 扩展包](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-checkin-extension.zip)
- [Mac OCR 配套包](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-mac.zip)

1. 解压扩展包，并将文件夹放在固定位置。
2. 打开 `chrome://extensions`，开启开发者模式，点击“加载已解压的扩展程序”，选择根目录直接包含 `manifest.json` 的扩展文件夹。
3. 解压 `mamo-ocr-mac.zip`，运行 `安装 Mac 识别服务.command`。
4. 打开扩展，按引导填写学校身份，登录 Attendance，检测课程，选择邮件/Moodle 来源并保存。

如果 macOS 阻止安装命令或 `attendance-ocr`，确认文件来源后，到“系统设置 → 隐私与安全性 → 仍要打开”允许对应文件，不要关闭系统安全保护。返回扩展等待识别服务检测通过。

OCR 配套程序在本机运行，原图和记录保存在本机。置信度较低的结果会保留给用户核对。
