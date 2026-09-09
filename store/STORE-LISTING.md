# Chrome Web Store form text

## English listing

Name: Mamo Check-in

Summary: Collect Gmail and Moodle attendance codes locally and check in to matching Monash Malaysia sessions on Mac or Windows.

Description:

Mamo Check-in helps Monash Malaysia students organize attendance codes from their own Gmail and Moodle course sources and submit codes to matching attendance sessions.

- Verify and save your school email and Attendance name.
- Choose Gmail, Moodle or both for each course; paste a Moodle course URL or enter its course_id.
- Recognize text and images locally using Apple Vision on Mac or Tesseract on Windows.
- Review course schedules, attendance records and results; copy codes or export CSV.
- Start checks manually or enable optional scheduled checks.
- Use English or Chinese.

Requires Chrome 120+, macOS 12+ or Windows 10/11 x64, and installation of a separate local OCR helper. Windows also requires Tesseract OCR. Download and installation instructions: https://github.com/mxymalay/mamo-checkin/releases/latest

You need your own authorized school account. Sign-in verification does not start attendance submission. Scheduled checks require Chrome to be running and the computer awake. Only matching open sessions from the last seven days are eligible; uncertain submissions require review. Always confirm the final result on the school website. This tool does not establish physical attendance and must only be used where permitted by your institution.

Independent project; not affiliated with or endorsed by Monash University or Google. Data processing and OCR take place locally except for the necessary interactions with Gmail and school websites. See the privacy policy for details.

## 中文介绍

名称：马莫签到助手

简介：在 Mac 或 Windows 本机识别 Gmail 和 Moodle 签到码，并提交到匹配的 Monash Malaysia 签到场次。

马莫签到助手帮助 Monash Malaysia 学生整理本人 Gmail 和 Moodle 课程来源中的签到码，并提交至匹配的学校签到场次。

- 验证并保存学校邮箱和 Attendance 姓名。
- 每门课可选择邮件、Moodle 或两者；Moodle 支持课程网址或 course_id。
- Mac 使用 Apple Vision、Windows 使用 Tesseract 在本机识别文字和图片。
- 查看课表和签到结果，复制签到码、导出 CSV。
- 支持手动运行、可选定时检查及中英文界面。

需要 Chrome 120+、macOS 12+ 或 Windows 10/11 x64，并额外安装本机 OCR 程序；Windows 还需安装 Tesseract。安装说明：https://github.com/mxymalay/mamo-checkin/releases/latest

需要本人获授权的学校账号。登录检测不启动签到。定时检查要求 Chrome 保持运行、电脑保持唤醒。仅处理最近 7 天内仍开放且匹配的场次，不确定结果需核对，请以学校网站为准。工具不能证明实际到场，只能在学校允许的范围内使用。

本项目与 Monash University、Google 无隶属或背书关系。除必要的网站交互外，数据处理及 OCR 在本机完成，详情见隐私政策。

## Shared fields

Homepage: https://github.com/mxymalay/mamo-checkin

Support URL: https://github.com/mxymalay/mamo-checkin/issues

Privacy policy URL (publish PRIVACY.md to main before submitting): https://github.com/mxymalay/mamo-checkin/blob/main/PRIVACY.md

Suggested category: Productivity, if available in the dashboard.

## Single purpose

Help users collect attendance codes from their own Gmail and Monash Moodle course sources and submit them to matching Monash Malaysia attendance sessions.

## Permission justifications (English)

tabs: Inspect source-tab URLs and loading state to find the configured signed-in Gmail account, track source pages, and detect login redirects. The extension does not collect general browsing history.

alarms: Run attendance checks at the interval explicitly enabled by the user.

storage: Keep account settings, course sources, schedules, processed-message identifiers, run diagnostics and attendance records locally.

scripting: Read account identity, relevant course/email content and attendance forms on permitted sites and enter matching attendance data.

nativeMessaging: Communicate with the separately installed local OCR/archiving helper. Images and associated metadata are processed on the user's computer.

https://accounts.google.com/*: Select the user's configured email in Google's account chooser during a requested account verification/recovery. Does not read passwords or authentication tokens.

https://mail.google.com/*: Verify the signed-in mailbox and search/read course attendance messages matching the configured sources.

https://*.googleusercontent.com/*: Retrieve Gmail-hosted attendance images for local OCR.

https://attendance.monash.edu.my/*: Read the user's displayed name, courses and attendance status and submit matching attendance codes.

https://learning.monash.edu/*: Read configured Moodle course content and attendance images/codes.

## Privacy declarations: review before checking boxes

Disclose personally identifiable information (school name/email identity), personal communications (relevant email content), and website content (Moodle and attendance content). Source URLs and run diagnostics are also processed locally. Assess the dashboard's current browsing-history definition against this limited source-URL processing; do not claim the extension never handles URLs. Do not select "no user data" merely because processing is local.

No password, authentication token, financial, health or location data is intentionally collected by the implementation. Do not claim collection of those categories without a corresponding feature. No analytics, ads, data sales or unrelated use. Read each certification and confirm it matches your intended operation before agreeing.

Remote code: extension JavaScript is bundled; it does not download or execute remote JavaScript. Explicitly disclose the separate native OCR helper and its source/installation links in the explanation; do not conceal it as a bundled browser library.
