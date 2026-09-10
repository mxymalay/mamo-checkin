# Mamo Check-in · 马莫签到助手

## English

Download the full package for your operating system. It already includes the Chrome extension, the local OCR service, and the installer.

| System | Download |
| --- | --- |
| macOS | [Mac full package](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-checkin-mac.zip) |
| Windows | [Windows full package](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-checkin-windows.zip) |

Already installed and passing the service check? No download is needed. Do not load another copy of the extension.

Collect attendance codes from Gmail and Monash Moodle, recognize text and images locally, and check in to matching school sessions. Supports Chrome on macOS 12+ and Windows 10/11 x64.

**[Download](https://github.com/mxymalay/mamo-checkin/releases/latest)** · **[Mac installation](INSTALL.md)** · **[Windows installation](INSTALL-WINDOWS.md)**

### Get started

1. Install the recognition service and follow the setup guide. Mac uses Apple Vision; Windows uses Tesseract.
2. Enter your school email and Attendance name, then configure your courses and code sources.
3. Use **Settings**, **Course sources and timetable**, and **Attendance records**. Click **Check in now** to run a check and open the records tab.

In Settings, **Sign in and verify** saves only the verified email or name. Save other settings separately. With multiple Gmail accounts, the assistant attempts to select your configured school email; passwords and school verification must still be completed by you.

School identity shows the Attendance name first, followed by Gmail and Moodle verification for the sources your courses use. Verified buttons turn white and read **Sign in and verify again**. Checks display a countdown; keep the opened browser pages available and complete any requested school sign-in there. The assistant page stays in place.

**Check in now** verifies the required accounts in one initial dialog, confirms that checks passed, then starts processing. A failed check reports the affected website and lets you retry. An already-attended session without a code has a question-mark explanation. Pending-session retries also include source details and run logs. The setup guide can import a saved personal configuration.

For Moodle, enter the `course_id` after `course/view.php?id=` or paste the full course URL. Courses are numbered; expand **More courses?** to add another. Timetables can be edited or detected again.

Supports English and Chinese, configuration import/export, copying codes, retrying pending courses, and CSV export. Records are grouped by course and source week, or by date range when no week is available. Saving settings and background completion do not switch tabs.

Login verification does not start a check-in. Closed pages, missing permissions, connection failures, timeouts, and storage errors show actionable messages. Unconfirmed submissions remain pending review instead of being automatically submitted again.

Only matching, open sessions from the last seven days are eligible. Uncertain results require review. Scheduled checks are optional; Chrome must remain running and the computer awake. Images and archives stay on your computer and are not sent to third-party AI services.

### Development and verification

Run `npm ci`, `npm test`, and `npm run build` on macOS with Xcode command-line tools. Windows packages are built with `scripts/build-windows.ps1`; GitHub Actions tests OCR, the packaged host, and Chrome registration.

Public tests use synthetic data. Real course text extraction has been verified, but multi-account login and full live submission have not been validated in every environment. Always verify the final status on the school's attendance website.

## 中文

请直接下载对应系统的完整包。完整包已经包含 Chrome 扩展、本机 OCR 识别服务和安装程序。

| 系统 | 下载 |
| --- | --- |
| macOS | [Mac 完整包](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-checkin-mac.zip) |
| Windows | [Windows 完整包](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-checkin-windows.zip) |

已安装且检测正常，无需重复下载，也不要再次加载一份扩展。

从 Gmail 和 Monash Moodle 识别签到码，自动匹配课程并签到。支持文字和图片，在本机识别（Mac：Apple Vision；Windows：Tesseract）。

**[下载安装包](https://github.com/mxymalay/mamo-checkin/releases/latest)** · **[Mac 安装](INSTALL.md)** · **[Windows 安装](INSTALL-WINDOWS.md)** · Chrome / macOS 12+ / Windows 10、11 x64

## 三步开始

1. **安装识别服务**：页面自动检查，安装后点击“刷新并继续”。
2. **填写身份**：保存学校邮箱和系统显示的姓名。
3. **配置课程**：登录签到系统、确认检测课程、选择邮件/Moodle 来源并保存。

完成后可使用三个分页：**设置、课程来源与课表、签到记录**。

- **设置**：邮箱和姓名的“登录并检测”在验证成功后分别保存，不影响其他未保存的设置。自动检查可独立保存。Gmail 有多个账号时，会尝试切换到填写的学校邮箱；需要密码或学校验证时，仍须本人完成登录。
- **课程来源与课表**：选择邮件、Moodle 或两者。Moodle 填写课程网址 `course/view.php?id=` 后的 `course_id`，也可粘贴完整课程网址自动提取。课程带序号，点击“还有更多课程？”可添加课程。课表支持修改和重新检测。
- **签到记录**：点击“立即签到”进入此页。记录按课程和 Week 分组，支持复制签到码、重试等待中的课程和导出 CSV。保存设置及后台运行结束不会切换分页。

右上角支持导入、导出个人配置（JSON）。界面支持 English / 中文，自动匹配浏览器语言，也可手动切换。Week 优先使用来源标注；没有标注时按日期范围分组。

学校身份先显示签到系统姓名，再按课程来源显示 Gmail、Moodle 登录检测。检测通过后按钮变为白底“重新登录并检测”。检测中显示倒计时，请保留打开的浏览器页面，并在对应网站完成学校登录；助手保持当前页面。

点击“立即签到”后，在同一个初始弹窗中逐项验证账号，提示初始化检测通过后开始执行。检测失败会明确显示对应网站和原因，支持重新尝试。已签到但没有签到码的记录带问号说明；重试待签到课程时也能查看来源和日志。初始化引导支持导入已有个人配置。

只处理最近 7 天内、网站仍开放且信息匹配的场次；不确定时提示核对。开启自动运行后可关闭助手页面，但 Chrome 需运行、电脑不能睡眠。

原图与记录保存在本机，不上传至第三方 AI。

登录验证不会启动签到。页面关闭、权限不足、连接失效、超时和存储失败会显示原因及处理建议。未确认的提交保留为待核对，不会自动重复提交。

## 开发

```sh
npm ci
npm test
npm run build
```

Mac 构建需要 Xcode 命令行工具；Windows 构建使用 `scripts/build-windows.ps1`，由 GitHub Actions 构建并测试本地识别服务和安装程序。

公开测试使用虚构数据。真实课程文字提取已验证，但多账号登录及完整自动提交尚未覆盖所有实际环境。请以学校签到系统的最终状态为准；无法可靠确认的结果保留为待核对，不会当作签到成功。
