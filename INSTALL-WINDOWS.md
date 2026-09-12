# Windows installation

## English

Windows 10/11 x64 and Google Chrome are required. Download these two files from the [latest GitHub Release](https://github.com/mxymalay/mamo-checkin/releases/latest):

- [Chrome extension](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-checkin-extension.zip)
- [Windows OCR helper](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-windows.zip)

1. Extract the extension ZIP into a permanent folder.
2. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the extracted extension folder whose root contains `manifest.json`.
3. Install Tesseract OCR from the link in the extension guide. Keep the default installation folder and English language data.
4. Extract `mamo-ocr-windows.zip`, then run `Install Windows OCR.exe`.
5. Open the extension and follow the guide. Enter your school identity, sign in to Attendance, detect courses, choose Gmail or Moodle sources, and save.

If SmartScreen blocks the helper, verify that it came from this project, then choose **More info > Run anyway**. Do not disable Windows Security. Return to the extension and wait for the recognition check to pass.

The OCR helper runs locally. Images and records remain on this computer. Low-confidence results stay available for review.

## 中文

# 马莫签到助手 Windows 安装指南

支持 **Windows 10/11 x64 和 Chrome**。请从[最新 GitHub Release](https://github.com/mxymalay/mamo-checkin/releases/latest)下载以下两个文件：

- [Chrome 扩展包](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-checkin-extension.zip)
- [Windows OCR 配套包](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-windows.zip)

1. 解压扩展包，并将文件夹放在固定位置。
2. 打开 `chrome://extensions`，开启开发者模式，点击“加载已解压的扩展程序”，选择根目录直接包含 `manifest.json` 的扩展文件夹。
3. 按扩展引导中的链接安装 Tesseract OCR，保留默认路径和 English 语言数据。
4. 解压 `mamo-ocr-windows.zip`，运行 `安装 Windows OCR.cmd`。
5. 打开扩展，按引导填写学校身份，登录 Attendance，检测课程，选择邮件/Moodle 来源并保存。

如果 SmartScreen 阻止配套程序，确认文件来自本项目后选择“更多信息 → 仍要运行”，不要关闭 Windows 安全保护。返回扩展等待识别服务检测通过。

OCR 配套程序在本机运行，原图和记录保存在本机。置信度较低的结果会保留给用户核对。
