# Mamo Check-in User Guide · 使用指南

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

### Source rules (2.0.0)

Version **2.0.0** adds declarative JSON image-location rules. Use the latest GitHub package for these features; the Chrome Web Store version follows its separate review process. Open **Recognition and rules** in Settings. Its tabs are **OCR method**, **Recognition rule repository**, **Rule matching test**, and **Assign rules to courses**. Windows hides the OCR method tab and uses browser OCR. Testing is available in normal mode; switching developer mode preserves the current page.

The repository sidebar separates **Official rules**, **Shared rules**, **Create rule**, and **Import rules**. Shared rules includes browsing, contribution guidance and an author directory. Course filters apply to both downloaded and available rules. Synthetic examples stay hidden, including under All courses, until **Expand examples** is selected; closing any example-course chip hides them all. Author icons open attribution details, repository icons open rule-file links, and supported courses appear as tags.

**Create rule** offers guided **Simulated creation** and **Actual creation** with the same step layout. Practice opens a synthetic source page in a new tab; its sample courses and assignments stay separate from real courses. Actual creation uses configured courses and verified Gmail or Moodle pages. Select one or more images, mark inclusion/exclusion, review matches, optionally test local OCR, then save. Saving a draft provides an import-history link; continuing to course matching does not automatically select or enable the rule. Ed visual authoring remains unavailable because its signed-in account cannot be reliably verified. Creation sessions expire after ten minutes and never submit attendance or write production records. Quoted content is not automatically considered outdated: explicit exclusion selectors still apply, alongside source and visibility checks.

**Import rules > New import** accepts a dragged/uploaded file or pasted JSON and provides a full-field template. Replace placeholder attribution before sharing. Optional keyword and exclusion arrays may be empty; nonempty attachment selectors are Ed-only. **Import history** lists saved rules, details, JSON copy/download and testing actions. Rule status is **Waiting for test** (yellow), **Waiting for matching** (blue), or **Matched** (green). Tested entries offer **Test again**. Personal configuration exports contain complete imported JSON and bindings, not just IDs; practice data is excluded.

**Rule matching test** walks through course/rule selection, image review and completion. The default date range is the latest **14 calendar days including today (UTC+8)** and is editable. An optional message/post URL narrows the source search. Review multiple images individually and optionally run OCR. Selecting a previously tested rule shows a reminder. Untested rules cannot be selected for matching; deliberately skipping a test requires two confirmations and is labelled separately. Shared/local rules must match both the exact course code and source: a rule for `FIT5222` will not appear for `FIT5122`. Select up to eight shared and local rules combined per course/source. Importing or testing does not automatically apply them. Matching images are deduplicated while retaining rule provenance; rules cannot execute scripts or change OCR/submission logic.

Tests never submit attendance or save production records, source markers, OCR caches or archives. New Mac helpers support temporary Apple Vision previews; older helpers fall back to browser OCR for tests only. Exported diagnostics omit message bodies, images, OCR text, email addresses and source URLs.

Rule format, synthetic examples and Agent contribution instructions: [shared rules repository](https://github.com/mxymalay/mamo-checkin-rules). Compatible builds automatically check a separate [signed official rule channel](https://github.com/mxymalay/mamo-checkin-rules/tree/main/official) on installation, when due at browser startup, and every six hours. Updates contain bounded declarative JSON only, verified by a pinned ECDSA public key. Failed downloads keep the current version, bundled rules provide offline fallback, and active scans keep their original snapshot. Official rules support course-specific overrides; shared/local rules still require explicit testing and matching. A manual check and rollback are available in the Official rules page. Old builds need one extension update before they can use this channel. Network requests use a fixed GitHub raw endpoint without credentials or personal course data; the host can see ordinary network metadata. Publishing instructions are in `official/README.md` in the rules repository. Never commit the private signing key.

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

### 来源规则（2.0.0）

**导入规则**支持上传文件、直接输入 JSON 和下载完整字段模板。模板中的作者及链接是占位示例，发布前请替换；`keywords.navigation`、`keywords.context`、`images.excludeSelectors` 可以为空数组。`attachments.selectors` 为空表示不匹配附件链接，只有 Ed 来源可以填写非空附件选择器。名称、ID、课程及图片选择器仍须有效，图片尺寸须为 1–4000 的整数。

图片匹配和点选不再自动排除 `blockquote` 或 `.gmail_quote` 引用区域；引用结构本身不代表签到码过期。用户规则中明确填写的 `excludeSelectors` 仍然生效，来源域名、隐藏元素、签名、图片尺寸等其他校验不变。

**2.0.0** 支持声明式图片定位 JSON；这些功能请使用 GitHub 的最新安装包，Chrome 商店版本需经过独立审核流程。从设置页的**识别与规则**卡片进入，一级菜单为 **OCR识图方案、规则识别仓库、规则匹配测试、规则匹配课程**。Windows 不显示 OCR识图方案，使用浏览器 OCR。规则匹配测试在正常模式下即可使用；切换开发者模式不会跳离当前页面。

规则识别仓库的侧边菜单分为**官方规则、共享规则、创建规则、导入规则**。共享规则下有**查看共享、我要共享、谁在共享**，按课程筛选已下载和可下载规则。未点击**展开样例**时，“全部课程”也不展示样例规则；点击任一样例课程标签的关闭图标可全部收起。作者图标打开详情弹窗，仓库图标跳转规则源文件，适配课程以标签展示。

**创建规则**提供**模拟创建、实际创建**，采用一致的分步布局。模拟创建会新开合成示例页面，练习课程及匹配与真实课程隔离。实际创建使用已配置课程和验证后的 Gmail / Moodle 页面，可选择多张图片、标记包含或排除、检查匹配、按需测试本机 OCR 后保存。保存草稿提供“查看导入”入口；继续到规则匹配课程也不会自动替用户选择或启用规则。由于暂不能可靠确认 Ed 登录账号，Ed 点选创建暂不开放。创建会话十分钟后失效，不会提交签到或写入正式记录。

**导入规则 → 新建导入**支持拖入/上传文件、粘贴 JSON 和下载完整字段模板；**历史导入**展示已保存规则，可查看详情、复制/下载 JSON 和测试。状态依次为黄色**等待测试**、蓝色**等待匹配**、绿色**已匹配**；已测试规则显示**再次测试**。个人配置导出包含完整已导入规则 JSON 与课程绑定，不只是 ID，且不包含练习数据。

**规则匹配测试**按选择课程与规则、检查图片结果、完成分步进行。默认日期为 **UTC+8 最近 14 个自然日（包含今天）**，可手动修改；可选的邮件或帖子链接用于缩小来源搜索范围。多张图片逐张核对，可单独测试 OCR；选中已测试规则会提醒。未测试规则不能直接选择匹配；主动跳过测试需要两次确认，并单独标明。规则的课程代码与来源必须同时一致，例如 `FIT5222` 的规则不会显示在 `FIT5122` 的选择窗口中。每门课程每个来源最多选择共享、本地规则合计 8 个，导入或测试不会自动匹配。命中图片去重识别并保留规则来源；规则不执行脚本、不改变 OCR 和签到逻辑。

测试不提交签到、不保存正式记录、不写来源标记及 OCR 缓存或归档。新版 Mac 配套程序支持临时 Apple Vision 预览；旧版仅在测试中回退浏览器 OCR，不改变正式运行偏好。导出的诊断不含正文、图片、OCR 原文、邮箱或来源链接。

规则格式、合成样例及 Agent 制作指南见[共享规则仓库](https://github.com/mxymalay/mamo-checkin-rules)。支持此功能的版本使用独立的[签名官方规则通道](https://github.com/mxymalay/mamo-checkin-rules/tree/main/official)：安装时获取、启动时按需检查、每 6 小时检查更新，也可在官方规则页面手动检查和回滚。只下载经过固定公钥验证的声明式 JSON，不加载远程脚本；离线使用随包或已缓存规则，失败不覆盖可用版本，正在运行的任务继续使用原快照。课程专属规则只覆盖对应课程的官方通用规则，共享、本地规则仍需测试和手动匹配。旧扩展需先更新一次才能获得自动更新能力。请求不携带凭据或个人课程数据，但托管方仍可看到 IP 等常规网络信息。发布方法见规则仓库 `official/README.md`；签名私钥禁止提交。

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
