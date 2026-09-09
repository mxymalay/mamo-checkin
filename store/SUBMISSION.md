# Submission checklist / 上架操作单

## 现在可以做

1. 上传 `build/mamo-checkin-webstore.zip` 到 Chrome 开发者后台的 New item。此包只用于商店草稿，不是 Mac/Windows 安装包。
2. 把后台分配的扩展 ID 发给维护者。当前本机安装程序绑定 `nccgbccaamgcdcikjhljinefjbfcinfp`；若不同，必须调整 Mac/Windows 原生安装程序并重新验证后再提交审核。包内 key 不保证保留商店 ID。
3. 将 STORE-LISTING.md 的英文、中文分别填入商店本地化介绍。权限理由、单一用途、支持链接也已给出。
4. 公开发布根目录 PRIVACY.md，并验证隐私链接无需登录可访问；如不使用 GitHub，可放到自己的静态网站。
5. 上传图标、至少一张真实脱敏截图和小型宣传图。现有图标为 extension/icons/icon-128.png；截图要求 1280x800 或 640x400，宣传图 440x280。尚未提供经过验证的商店截图和宣传图，不要用包含真实学生信息的聊天截图代替。
6. 填写下方审核说明，补齐合法测试方式、商店 ID 匹配结果和联系邮箱。没有测试账号/测试环境时，不要假装已经提供。
7. 使用商店 ID 在 Mac 和 Windows 重新验证安装、登录、识别及记录核对；确认学校允许此工具的使用。
8. 完成后台必填信息，提交审核，建议选择通过后手动发布。

## Test instructions draft (English)

This extension is an independent tool for Monash Malaysia course attendance. It requires a separately installed local OCR helper and access to Google and Monash services. It does not bypass SSO or MFA.

Installation: download the appropriate helper from https://github.com/mxymalay/mamo-checkin/releases/latest and follow the included Mac or Windows guide. Windows requires Tesseract; no separate Python installation is needed on Windows.

Use an institution-authorized test account and authorized test course. Complete the setup guide, enter the account identity, and select Gmail/Moodle sources. Verify the displayed account. Enter a Moodle course URL or course_id, inspect course sources and records, and test language switching. Only test actual submission in an institution-authorized test session; do not submit attendance for a real student as a review test.

The Sign in and verify action verifies/saves identity only. Check in now starts the attendance workflow. Scheduled checks are optional and disabled by default. Ambiguous or unconfirmed results require review and are not treated as successful attendance.

REQUIRED BEFORE SUBMISSION: provide an authorized review account or accessible test environment, exact course/source details, expected results, and any permitted SSO/MFA arrangement in the private dashboard test-instructions field. These have not been supplied in this kit. A video can supplement instructions but is not a promise of an acceptable substitute for reviewer access.

REQUIRED BEFORE SUBMISSION: verify that the native host allowed_origins includes the store-assigned extension ID. Record the exact helper release tested on each operating system. Supply the publisher's monitored contact email in the dashboard.

Never place credentials, recovery codes, student records or private course material in this public repository or store listing.

## 官方依据

- ZIP 根目录直接放 manifest.json：https://developer.chrome.com/docs/webstore/prepare
- 发布表单：https://developer.chrome.com/docs/webstore/publish
- 图片要求：https://developer.chrome.com/docs/webstore/images
- 隐私申报：https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- 测试说明：https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions
- 原生消息及 allowed_origins：https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
