# Windows installation / Windows 安装

Windows 10/11 x64 · Google Chrome. This is the first Windows preview; real school-account submission still needs validation.

1. **Extract `mamo-checkin-windows.zip`** into a permanent folder.
2. **[Install Tesseract OCR](https://github.com/tesseract-ocr/tesseract/releases/download/5.5.0/tesseract-ocr-w64-setup-5.5.0.20241111.exe)**. Keep the default installation folder and English language data.
3. **Run `Install Windows OCR.exe`** from the extracted folder. No Python installation is needed. Wait for “Installed successfully”.
4. **Load the extension**: open `chrome://extensions`, enable Developer mode, click Load unpacked, and select `extension`.
5. **Follow the guide**: after recognition is ready click Refresh and continue, save your school identity, sign in to Attendance, detect courses, and choose Gmail / Moodle sources.

If Windows SmartScreen blocks the helper, verify that you downloaded it from this repository, then select **More info → Run anyway**. On a managed computer, contact your administrator if this option is unavailable. Do not disable Windows Security.

OCR runs locally. Low-confidence results require review. Scheduled check-in is optional; Chrome must stay running. Native runtime is installed under `%LOCALAPPDATA%\Mamo Check-in\native-runtime`; uninstalling the extension does not delete your archive.

---

Windows 10/11 x64 · Google Chrome。首个 Windows 预览版，真实学校账号的自动提交仍待验证。

1. **解压安装包**，放到固定文件夹。
2. **安装上方链接的 Tesseract OCR**，保留默认路径和 English 语言数据。
3. **双击 `Install Windows OCR.exe`**，等待安装成功，无需安装 Python。
4. **打开 `chrome://extensions`**，开启开发者模式，点击“加载已解压的扩展程序”，选择 `extension` 文件夹。
5. **按页面引导完成配置**：识别就绪后点击“刷新并继续”，保存学校身份，登录 Attendance、检测课程并选择邮件 / Moodle 来源。

如被 SmartScreen 阻止，确认来自本仓库后选择 **更多信息 → 仍要运行**。学校管理的电脑若不允许，请联系管理员，不要关闭系统安全保护。
