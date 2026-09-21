# Mamo Check-in · 马莫签到助手

## English

**The Chrome Web Store edition is live: [install Mamo Check-in](https://chromewebstore.google.com/detail/mamo-check-in/mneachaobiledakoicnkinfdpcjkbnmm) and follow the in-extension guide.**

Both platforms can use built-in browser OCR. Mac users can optionally install the Apple Vision helper from the OCR package in the setup guide for higher accuracy.

| Item | Download |
| --- | --- |
| Chrome extension | [mamo-checkin-extension.zip](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-checkin-extension.zip) |
| macOS OCR helper | [mamo-ocr-mac.zip](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-mac.zip) |

Extract the extension ZIP, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the extracted folder whose root contains `manifest.json`. Follow the in-extension guide. Recognized code candidates are tried automatically for matching sessions, including low-confidence codes; if all candidates fail, review is required.

Collect attendance codes from Gmail, Monash Moodle and Ed Discussion, recognize text and images locally, and check in to matching school sessions. Supports Chrome on macOS 12+ and Windows 10/11 x64.

### Get started

1. Load the extension. Built-in browser OCR is available on both platforms; the Mac Apple Vision helper is optional.
2. Enter your school email and Attendance name, then configure your courses and code sources.
3. Use **Settings**, **Course sources and timetable**, and **Attendance records**. Click **Check in now** to run a check and open the records tab.

The extension verifies Gmail, Attendance, and Moodle only when the configured courses need those sources. Checks show a countdown; keep the opened browser pages available and complete any requested sign-in there.

For Moodle, enter the `course_id` after `course/view.php?id=` or paste the full course URL. Courses are numbered; expand **More courses?** to add another. Timetables can be edited or detected again.

Recognition stays on this computer and is not sent to third-party AI services. Incomplete session details require review; low code confidence alone does not block automatic attempts.

### Diagnostics and history

In Attendance records, use **Download log** for recent run events and up to 500 local diagnostic entries (OCR passes, timing, candidates and source selection). Logs can contain course codes and source URLs; review them before sharing. Browser OCR rescans the code column even when only some rows were recognized.

**Semester history export** accepts a date range of up to one year. It combines saved local records with website sessions actually observed by the assistant (up to 20,000 retained snapshots, one per session). Optional timetable projections are marked `projected-current-schedule`, with unknown attendance. They do not account for holidays or past timetable changes. Export does not retrieve previously unseen historical pages or submit attendance.

**[Installation guide](INSTALL.md)** · **[macOS OCR package guide](OCR-INSTALL.md)**

## 中文

**商店版已上线：[直接安装马莫签到助手（Mamo Check-in）](https://chromewebstore.google.com/detail/mamo-check-in/mneachaobiledakoicnkinfdpcjkbnmm)，然后按扩展内引导继续。**

两个平台均可使用浏览器内置 OCR。Mac 用户可按安装引导下载 OCR 配套包，选择安装识别效果更好的 Apple Vision。

| 项目 | 下载 |
| --- | --- |
| Chrome 扩展 | [mamo-checkin-extension.zip](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-checkin-extension.zip) |
| Mac OCR 配套包 | [mamo-ocr-mac.zip](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-mac.zip) |

解压扩展包，打开 `chrome://extensions`，开启开发者模式，点击“加载已解压的扩展程序”，选择根目录直接包含 `manifest.json` 的文件夹，再按引导继续。匹配场次后会自动尝试识别到的签到码，包括低置信度候选；候选全部失败后再交由用户核对。

从 Gmail、Monash Moodle 和 Ed 识别签到码，自动匹配课程并签到。支持文字和图片，在本机识别（Mac：Apple Vision；Windows：浏览器内置 OCR）。

## 三步开始

1. **加载扩展**：两个平台都可直接使用浏览器内置 OCR；Mac 可按引导选装 Apple Vision 配套程序以提升识别效果。
2. **填写身份**：保存签到系统显示的姓名；学校邮箱只在课程使用邮件来源时填写。
3. **配置课程**：登录签到系统、检测课程、选择邮件/Moodle/Ed 来源并保存。

完成后可使用三个分页：**设置、课程来源与课表、签到记录**。Moodle 可填写 `course/view.php?id=` 后面的 `course_id`，也可粘贴完整课程网址自动提取。

点击“立即签到”后，助手会先检测当前课程所需的登录状态，再开始执行。检测中请勿关闭打开的浏览器页面。场次资料不完整时需核对；签到码置信度低本身不会阻止自动尝试。

原图与记录保存在本机，不上传至第三方 AI。开启自动运行后 Chrome 需保持运行、电脑不能睡眠。

### 诊断与历史导出

在签到记录中点击“下载日志”，可导出运行明细及最近 500 条本地诊断记录，包括 OCR 各轮耗时、候选码和来源选择。日志可能包含课程代码及来源链接，分享前请检查。浏览器 OCR 即便已识别出部分行，也会补扫码列。

“学期记录导出”支持选择不超过一年的日期范围，合并已保存的本地记录与助手实际读取过的网站场次（最多保留 20,000 个场次的最新快照）。可选的课表推算行标为 `projected-current-schedule`，签到状态为未知；推算不考虑假期或历史课表调整。导出不会读取此前未访问的历史页面，也不会执行签到。

**[安装指南](INSTALL.md)** · **[Mac OCR 配套包说明](OCR-INSTALL.md)** · **Chrome / macOS 12+ / Windows 10、11 x64**

## 开发

```sh
npm ci
npm test
npm run build
npm run build:store
```

两个平台均可使用浏览器内置 OCR；Mac OCR 配套包需要 Xcode 命令行工具，只有 Mac 用户希望使用 Apple Vision 时才需要下载。
