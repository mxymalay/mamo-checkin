# Mamo Check-in · 马莫签到助手

## English

The GitHub edition uses one Chrome extension package and a separate local OCR package for your operating system.

| Item | Download |
| --- | --- |
| Chrome extension | [mamo-checkin-extension.zip](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-checkin-extension.zip) |
| macOS OCR helper | [mamo-ocr-mac.zip](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-mac.zip) |
| Windows OCR helper | [mamo-ocr-windows.zip](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-windows.zip) |

Extract the extension ZIP, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the extracted folder whose root contains `manifest.json`. Then download and extract the matching OCR helper and follow the instructions inside it.

The Chrome Web Store edition is live. [Open the Chrome Web Store](https://chromewebstore.google.com/category/extensions), search for **Mamo Check-in** or **马莫签到助手**, install it, and follow the in-extension guide. The same macOS or Windows OCR helper download is required for the store edition.

Collect attendance codes from Gmail and Monash Moodle, recognize text and images locally, and check in to matching school sessions. Supports Chrome on macOS 12+ and Windows 10/11 x64.

### Get started

1. Load the extension and install the matching local OCR helper.
2. Enter your school email and Attendance name, then configure your courses and code sources.
3. Use **Settings**, **Course sources and timetable**, and **Attendance records**. Click **Check in now** to run a check and open the records tab.

The extension verifies Gmail, Attendance, and Moodle only when the configured courses need those sources. Checks show a countdown; keep the opened browser pages available and complete any requested sign-in there.

For Moodle, enter the `course_id` after `course/view.php?id=` or paste the full course URL. Courses are numbered; expand **More courses?** to add another. Timetables can be edited or detected again.

Images and records stay on this computer and are not sent to third-party AI services. Uncertain results remain for review instead of being submitted again automatically.

**[Installation guide](INSTALL.md)** · **[OCR package guide](OCR-INSTALL.md)**

## 中文

GitHub 版本使用一个 Chrome 扩展包，并根据系统另外下载本机 OCR 配套包。

| 项目 | 下载 |
| --- | --- |
| Chrome 扩展 | [mamo-checkin-extension.zip](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-checkin-extension.zip) |
| Mac OCR 配套包 | [mamo-ocr-mac.zip](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-mac.zip) |
| Windows OCR 配套包 | [mamo-ocr-windows.zip](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-windows.zip) |

解压扩展包，打开 `chrome://extensions`，开启开发者模式，点击“加载已解压的扩展程序”，选择根目录直接包含 `manifest.json` 的文件夹。然后下载并解压对应系统的 OCR 配套包，按其中的 `说明.md` 操作。

商店版已上线，可在[Chrome 网上应用店](https://chromewebstore.google.com/category/extensions)搜索 **马莫签到助手（Mamo Check-in）** 安装，再按扩展内引导继续。商店版和 GitHub 版本都需要下载对应系统的 OCR 配套包。

从 Gmail 和 Monash Moodle 识别签到码，自动匹配课程并签到。支持文字和图片，在本机识别（Mac：Apple Vision；Windows：Tesseract）。

## 三步开始

1. **加载扩展并安装 OCR**：加载扩展后，下载并安装对应系统的本机 OCR 配套包。
2. **填写身份**：保存学校邮箱和签到系统显示的姓名。
3. **配置课程**：登录签到系统、检测课程、选择邮件/Moodle 来源并保存。

完成后可使用三个分页：**设置、课程来源与课表、签到记录**。Moodle 可填写 `course/view.php?id=` 后面的 `course_id`，也可粘贴完整课程网址自动提取。

点击“立即签到”后，助手会先检测当前课程所需的登录状态，再开始执行。检测中请勿关闭打开的浏览器页面。已签到但没有签到码的记录会显示说明；不确定的识别结果保留为待核对，不会自动重复提交。

原图与记录保存在本机，不上传至第三方 AI。开启自动运行后 Chrome 需保持运行、电脑不能睡眠。

**[安装指南](INSTALL.md)** · **[OCR 配套包说明](OCR-INSTALL.md)** · **Chrome / macOS 12+ / Windows 10、11 x64**

## 开发

```sh
npm ci
npm test
npm run build
npm run build:store
```

Mac OCR 包需要 Xcode 命令行工具；Windows OCR 包由 GitHub Actions 使用 PyInstaller 构建。扩展包和 OCR 包分别发布。
