const entries=`
登录并确认学校身份|Sign in and confirm your identity
登录并读取姓名|Sign in and read name
自动读取登录后的姓名，也可手动修改|Read your signed-in name automatically, or edit it manually
正在读取 Attendance 姓名…|Reading your Attendance name…
已读取 Attendance 姓名，请确认后保存。|Attendance name retrieved. Confirm it before saving.
请在新标签页登录 Attendance；登录后会自动读取姓名，返回此页确认即可。|Sign in to Attendance in the new tab. Your name will be filled automatically; return here to confirm it.
尚未读取到姓名，请登录后点击重试，也可手动填写。|Name not found yet. Sign in and retry, or enter it manually.
已切换为手动填写，请确认姓名与 Attendance 一致。|Manual entry selected. Check that your name matches Attendance.
请先登录 Attendance 系统，再读取姓名|Sign in to Attendance before reading your name
未能读取姓名，请确认登录成功；也可手动填写|Could not read your name. Check that you are signed in, or enter it manually

识别服务未就绪，请完成安装引导。|Recognition service is not ready. Complete the installation guide.
本地识别服务无法连接。请运行安装包中的|Cannot connect to local recognition. Run the installer in the download:
，然后重新加载马莫签到助手。|, then reload Mamo Check-in.
本地识别未返回有效结果|Local recognition returned no valid result
本地识别连接已关闭|Local recognition connection closed
本地识别响应超时，已停止本次连接；原图由本机服务保存。|Local recognition timed out. The connection was closed; the original image is saved locally.
正在使用本地识别（最多 30 秒）|Recognizing locally (up to 30 seconds)
复用本地识别结果|Reusing cached recognition
本地识别完成|Local recognition complete
识别服务未就绪，请运行对应系统的识别服务安装程序。|Recognition is not ready. Run the installer for your operating system.

先安装 Windows 识别服务|Install the Windows recognition service first
安装 Tesseract OCR|Install Tesseract OCR
下载 Tesseract Windows 安装程序 ↗|Download the Tesseract Windows installer ↗
使用默认安装位置，保留 English 语言数据。|Keep the default installation folder and English language data.
连接浏览器|Connect Chrome
双击 Install Windows OCR.exe，等待安装成功。|Run Install Windows OCR.exe and wait for installation to finish.
无需安装 Python，也无需开启定时签到。|No Python installation is needed. Scheduled check-in is optional.
Windows 阻止了安装程序？|Windows blocked the installer?
确认文件来自本项目 Release 后，在 SmartScreen 中选择“更多信息 → 仍要运行”。学校管理的电脑若不允许，请联系管理员。|Verify the file came from this project, then choose More info → Run anyway in SmartScreen. For managed computers, contact your administrator if blocked.
本地图片识别|Local image recognition
Mac 使用 Apple Vision；Windows 使用 Tesseract，均在本机识别。|Mac uses Apple Vision; Windows uses Tesseract. Both run locally.
首次安装请按安装引导运行对应系统的识别服务安装程序。|Follow the installation guide for your operating system.
正在写入本地归档|Saving the local archive
本地识别|Local recognition
本地原生识别|Local recognition

Attendance系统|Attendance system

安装命令授权|Allow the installer
attendance-ocr 授权|Allow attendance-ocr
如被阻止：系统设置 → 隐私与安全性 → 仍要打开。|If blocked: System Settings → Privacy & Security → Open Anyway.
第一步允许后，识别程序还需要单独授权。|After allowing the installer, the recognition executable needs separate approval.
被阻止，请再次前往|is blocked, go again to
允许后回到这里重新检测。|After allowing it, return here and check again.
如果|If

正在检查识别服务…|Checking recognition service…
请确认课程配置|Review course configuration
正在检测课程…|Detecting courses…
已检测到|Detected
按课程查看记录|Browse records by course
查看字段说明|View field help
运行状态已更新|Run status updated
正在识别|Recognizing
就绪|Ready
请选择|Select
活动类型（可选）|Activity type (optional)
组别（可选）|Group (optional)
处理失败，请查看明细|Processing failed; see details
本轮已结束|Run finished
等待首次检查|Waiting for first run
正在重新查找|Searching again for
的签到码…|attendance codes…
该课程|This course
正在保存设置…|Saving settings…
配置字段|Setting
无法保存：请检查|Cannot save. Check
签到记录|Attendance records
留空可扩大检索|Leave blank for a broader search
原生图片识别|Native text recognition
签到系统|Attendance system
系统设置|System Settings
隐私与安全性|Privacy & Security
仍要打开|Open Anyway
安全性|Security
第|Step

自动检测或手动填写。默认无需填写：先从签到页面读取最近 7 天的场次并保存成固定周课表，再查找待签到场次的签到码。信息不全或组别不唯一时请确认；也可手动填写课表。已设课表时，已完成或已取得有效签到码的场次不再查询。|Detect automatically or enter sessions manually. Recent sessions become a recurring timetable. Review incomplete or ambiguous groups. Completed sessions and sessions with usable codes are skipped.
保持 Chrome 运行并登录学校 Gmail、Moodle 和签到系统。电脑睡眠或登录过期时，检查会延后。缺少日期、组别或识别不确定的内容会保存为|Keep Chrome running and sign in to school Gmail, Moodle and attendance. Runs are delayed while the computer sleeps or login expires. Incomplete or uncertain results are marked
填写 Moodle 课程、Week 栏目或公告网址，每行一个。两种来源都填时先查 Gmail，再从 Moodle 补齐缺少的场次。|Enter Moodle course, weekly section or announcement URLs, one per line. With both sources selected, Gmail is searched first, then Moodle for remaining sessions.
可选，填写签到系统中的活动类型，例如 Studio、Seminar、Workshop 或 Applied。|Optional: the activity type shown on the attendance site, e.g. Studio, Seminar, Workshop or Applied.
后台响应超时，操作结果尚未确认。请重新打开马莫签到助手查看状态；若刚升级扩展，请关闭旧页面后重新打开。|The background service timed out. Reopen Mamo Check-in to verify the result. After updating the extension, close the old page and open it again.
填写后从 Gmail 查找该发件人的签到邮件。留空则不查该课程邮件；学校邮箱只用于登录身份。|Search Gmail for attendance emails from this sender. Leave blank to skip email for this course. Your student email is only used to verify identity.
按马来西亚时间（UTC+8）填写。未到上课时间的场次不会提前搜索，超过 7 天的课程不补签。|Use Malaysia time (UTC+8). Future sessions are not searched; sessions older than 7 days cannot be checked in.
自动运行的检查间隔。保存并开启后可关闭本页面；Chrome 必须运行，电脑睡眠时不会检查。|Interval between scheduled runs. Save and enable it to run with this page closed. Chrome must remain running and the computer awake.
已生成可编辑的课程与课表，请选择邮件、Moodle 或两者，并填写对应来源后保存。|An editable course timetable is ready. Choose email, Moodle or both, fill in the sources and save.
学校邮箱只用于核对签到系统登录身份。每门课的邮件来源请在 邮件发件人邮箱中配置。|Your student email verifies your identity. Configure each course's email source in Sender email.
选择签到码来源，只显示并使用对应配置。两者都选时先查邮件，再查 Moodle。|Choose the code source. Only selected sources are used. With both selected, email is searched before Moodle.
正在读取签到系统。若需要登录，请先打开上方签到系统链接完成登录，再回来重试。|Reading the attendance system. If sign-in is needed, open the link above, sign in and retry.
课程检测完成。请在下方选择各课程来源并核对课表，点击保存全部设置完成配置。|Courses detected. Choose sources, review the timetable below and save all settings.
可选，填写你自己的组别，例如 01 或 01-P1；填写后只匹配该组别。|Optional: your group, e.g. 01 or 01-P1. Only that group will be matched.
使用刚填写的学校账号完成登录；确认姓名一致，再回到这里重试。原始信息：|Sign in with the school account you entered, verify the name, then retry here. Details:
正在打开 Gmail 最近 7 天的邮件（页面最多等待 25 秒）|Opening Gmail messages from the last 7 days (up to 25 seconds)
场等待签到码，暂未找到；可能尚未发布或当前来源未检索到，可稍后重试|sessions are waiting for codes. They may not be published yet or found in the selected sources. Retry later.
填写签到页面最上方显示的姓名，与页面保持一致，用于核对登录身份。|Enter the name shown at the top of the attendance page to verify your identity.
请先在第 2 步填写并保存学校邮箱和姓名，再登录签到系统检测课程|Save your student email and name in step 2, then sign in and detect courses.
最近 7 天未发现课程，请确认签到页面已登录，或手动添加课程。|No courses found in the last 7 days. Verify your sign-in or add courses manually.
检测完成，但你正在编辑配置。请先保存，再重新检测以免覆盖改动。|Detection finished while you were editing. Save your changes before detecting again.
用于课程页面的年份参考；年份无法可靠确定的签到码不会自动提交。|Reference year for course pages. Codes with an uncertain year are not submitted automatically.
所有课程共用的 Gmail 检索关键词，留空可扩大检索范围。|Gmail search keywords shared by all courses. Leave blank for a broader search.
正在读取 Moodle 页面文字和图片（最多等待 25 秒）|Reading Moodle text and images (up to 25 seconds)
正在读取签到页面最近 7 天的课程，请保持学校账号已登录…|Reading courses from the last 7 days. Keep your school account signed in…
并完成登录，确认学校邮箱和姓名与设置一致，再返回助手重试。|and sign in. Verify that the email and name match your settings, then retry.
已有签到记录，请使用独立的 Chrome 配置文件切换账号|Attendance records exist. Use a separate Chrome profile for another account.
已有记录时请使用单独的 Chrome 配置文件切换账号|Records exist. Use a separate Chrome profile for another account.
已将最近 7 天的课程场次保存为固定周课表，下次直接复用|Recent sessions were saved as a recurring weekly timetable.
请填写 Monash Moodle 课程、公告或页面网址|Enter a Monash Moodle course, announcement or page URL.
请先在 Chrome 加载此扩展，再从扩展图标打开设置|Load the extension in Chrome, then open settings from its icon.
本轮 Moodle 检查达到时间上限，其余课程下轮继续|Moodle time limit reached; remaining courses will continue next run.
正在加载 Moodle 课程页面（最多等待 25 秒）|Loading Moodle course page (up to 25 seconds)
网站待签到场次与已保存课表不一致，请核对或重新检测课程|The site's pending sessions differ from your timetable. Review it or detect courses again.
填写学校课程代码，用于匹配邮件、课程页面及签到场次。|Enter the course code to match emails, course pages and attendance sessions.
页面没有及时加载，请确认 Chrome 中的登录状态|The page did not load in time. Check your Chrome sign-in.
信息不完整、组别冲突或近 7 天没有场次，请核对课表|Incomplete details, conflicting groups or no recent sessions. Review the timetable.
门课程。请为每门课选择签到码来源，核对课表后保存。|courses. Choose sources, review the timetable and save.
只填写 4 个英文字母加 4 个数字，后缀固定为|Enter 4 letters followed by 4 digits. The fixed suffix is
识别服务未就绪，请运行 Mac 识别服务安装命令。|Recognition service is not ready. Run the Mac recognition installer.
缓存正被其他助手页面使用，请关闭其他助手页面后重试|Cache is in use by another assistant page. Close it and retry.
后台未返回结果，请关闭此页面，从扩展图标重新打开|No background response. Close this page and reopen it from the extension icon.
正在检查识别服务，请稍候（最多等待 10 秒）。|Checking recognition service (up to 10 seconds).
未找到最近 7 天内与课表匹配的场次，请核对课表|No matching sessions in the last 7 days. Review your timetable.
至少需要一个 Gmail 或 Moodle 来源|At least one Gmail or Moodle source is required.
正在检查课程图片是否更新（下载最多 20 秒）|Checking for updated course images (download up to 20 seconds)
邮件主题必须包含此文字；留空时使用课程代码。|Email subjects must contain this text. Defaults to the course code.
正在展开并读取邮件正文（最多等待 25 秒）|Opening email contents (up to 25 seconds)
上次检查已中断，已保存进度，可以重新开始检查|The previous run was interrupted. Progress was saved; you can start again.
无法确认签到系统登录状态或读取课程。请点击|Unable to verify attendance sign-in or read courses. Open
所有课程和收集记录已清空，自动运行已暂停。|Courses and attendance records cleared. Scheduled runs paused.
本轮最多处理 40 个新会话，其余下轮继续|Up to 40 new threads per run; remaining threads continue next run.
本轮邮件检查达到时间上限，其余会话下轮继续|Email time limit reached; remaining threads continue next run.
正在核对网站已有签到（最多等待 25 秒）|Checking existing attendance (up to 25 seconds)
部分信息不完整或组别不唯一，请核对课程配置|Some details or groups are ambiguous. Review course settings.
课表场次已完成或已取得可用码，跳过来源扫描|Sessions are completed or have usable codes; source search skipped.
正在读取网站签到记录（最多等待 25 秒）|Reading website attendance (up to 25 seconds)
正在运行，请等待当前检查结束再重新检测课程|Wait for the current run before detecting courses again.
请先保存正在编辑的配置，再重新检测课程。|Save your changes before detecting courses again.
正在检查识别服务（最多等待 10 秒）…|Checking recognition service (up to 10 seconds)…
请在同一个 Chrome 配置文件打开|In the same Chrome profile, open
请填写有效的学校邮箱和学校系统显示的姓名|Enter a valid student email and the name shown on the attendance site.
正在等待邮件内容（最多等待 25 秒）|Waiting for email contents (up to 25 seconds)
自动签到已暂停或账号、课程设置发生变化|Scheduled check-in paused or account/course settings changed.
场已签到，本次无需重复签到或查找签到码|sessions already checked in; no repeat submission or code search needed.
未能读取网站签到状态，请确认登录后重试|Unable to read attendance status. Sign in and retry.
缓存清理失败，请关闭其他助手页面后重试|Cache cleanup failed. Close other assistant pages and retry.
保存设置并开启后，自动检查课程来源。|Save and enable scheduled runs to check course sources automatically.
最多配置 3 个 Moodle 入口|Up to 3 Moodle source URLs.
活动类型请使用签到网站显示的英文名称|Use the English activity type shown on the attendance site.
开启后，工具将按设定间隔自动检查。|When enabled, runs follow your selected interval.
课表预检查失败，将继续寻找签到码：|Timetable check failed; code search will continue:
正在运行，请等待检查结束再清空课程|Wait for the current run before clearing courses.
组别格式例如 01 或 01-P1|Group format: 01 or 01-P1.
正在检测课程（最多 30 秒）…|Detecting courses (up to 30 seconds)…
请先填写邮箱、姓名和至少一门课程|Enter your email, name and at least one course.
识别服务检查通过，可以识别图片。|Recognition service is ready to read images.
正在签到：核对最近 7 天的课程|Checking in: reviewing sessions from the last 7 days
正在签到；图片识别会在需要时启动|Checking in; image recognition starts when needed
记录已存于扩展，下载归档待重试：|Records saved in the extension; archiving needs retry:
正在重新检测课程，请稍后检查签到|Course detection in progress. Try checking in later.
尚未启动（识别图片时自动启动）|Starts automatically when reading images
正在核对最近 7 天的签到记录|Reviewing attendance from the last 7 days
场尚未确认签到成功，请核对记录|sessions are not confirmed. Review the records.
签到已提交，正在等待网站确认|Submitted; waiting for website confirmation
请等待当前检查结束再修改身份|Wait for this run to finish before changing your identity.
门课程，例如 FIT5120|courses, e.g. FIT5120
存在重复或无法区分的上课场次|Duplicate or ambiguous sessions found.
选择该场次每周上课的星期。|Choose the day of the week for this session.
请填写每个场次的星期和时间|Enter the day and time for every session.
配置文件超过 128 KB|Configuration exceeds 128 KB.
表单课程、日期或时间不匹配|Form course, date or time does not match.
正在写入 Mac 本地归档|Writing the local Mac archive
请等待当前检查结束后再重置|Wait for this run to finish before resetting.
邮件会话缺少最新消息标识|Email thread has no latest-message identifier.
近期场次已关闭，无法补签|Recent sessions are closed; late check-in is unavailable.
正在签到，请等待本轮结束|Check-in is running. Wait for it to finish.
课程已被移除，请重新配置|This course was removed. Configure it again.
每周最多设置 14 节课|Up to 14 sessions per week.
请填写每节课的星期和时间|Enter the day and time for each session.
已保存记录中有|Saved records contain
场已过期，无法补签|expired sessions; late check-in is unavailable
本次另有|Also checked in this run:
本次签到成功|Checked in this run:
网站显示已签到|Already checked in on website:
网站显示|Website reports
本轮已确认|Confirmed this run:
场签到成功。|successful check-ins.
学校邮箱前缀必须是 4 个英文字母加 4 个数字，例如 abcd1234|Student email prefix must be 4 letters followed by 4 digits, e.g. abcd1234.
自动检测或手动填写。|Detect automatically or enter manually.
全部完成|All done
每周|Per week
近 7 天共|Sessions in the last 7 days:
继续查找未完成场次|Searching remaining sessions
源文件|Source file
正在清空课程|Clearing courses
签到链接日期不匹配|Attendance link date mismatch
请输入|Enter
请填写有效课程年份|Enter a valid academic year
请填写邮箱和姓名|Enter email and name
发件人邮箱无效|Invalid sender email
网址无效|Invalid URL
课程代码重复|Duplicate course code
组别冲突|Conflicting groups
未填写签到码|Code was not entered
首次安装需运行|For first-time installation, run
文稿 / 签到助手归档|Documents / 签到助手归档

马莫签到助手|Mamo Check-in
收好签到码，自动完成对应场次。|Collect attendance codes and check in to matching sessions.
导入个人配置|Import settings
导出个人配置|Export settings
运行状态|Run status
准备就绪|Ready
尚未开始处理|Not started
立即签到|Check in now
保存并立即签到|Save and check in
正在签到|Checking in
签到设置|Check-in settings
保存全部设置|Save all settings
保存设置|Save settings
定时自动签到（可选）|Scheduled check-in (optional)
学校邮箱|Student email
学校系统中的姓名|Name in the attendance system
签到系统显示的姓名|Name in the attendance system
填写最上方的姓名|Enter the name shown at the top
检查间隔|Check-in interval
课程年份|Academic year
邮件检索关键词|Email search keywords
识别与保存|Recognition and storage
原图与记录保存在|Images and records are saved to
检查识别服务|Check recognition service
Mac 原生图片识别|Mac text recognition
使用 macOS 原生文字识别（Apple Vision）。|Uses on-device text recognition (Apple Vision).
识别和归档由本机服务完成。|Recognition and archiving run locally.
课程来源与课表|Course sources and timetable
重新检测课程|Detect courses again
清空所有课程|Clear all courses
添加课程|Add course
课程代码|Course code
签到码来源|Code source
请选择签到码来源|Select a code source
邮件发件人邮箱|Sender email
邮件主题中包含|Email subject contains
课程场次|Weekly sessions
每周场次|Sessions per week
自动检测（无需填写）|Detect automatically
自动检测|Detect automatically
活动类型|Activity type
组别|Group
移除|Remove
收集记录|Attendance records
原图、文字、提交结果|Images, text and attendance results
导出 CSV|Export CSV
日期 / 星期 / 时间|Date / day / time
课程 / 场次|Course / session
签到码|Attendance code
状态|Status
来源 / 详情|Source / details
等待签到码|Waiting for code
等待匹配|Waiting for match
已签到|Checked in
已过期|Expired
需要核对|Review required
核对提交结果|Verifying submission
结果待确认|Confirmation pending
重试复制|Retry copy
已复制|Copied
复制中|Copying
复制|Copy
重试|Retry
查看签到系统|View attendance system
查看邮件|View email
查看 Moodle|View Moodle
网站原已签到，本次无需重复提交|Already checked in on the website; no new submission needed
网站原已签到，本次未重复提交|Already checked in on the website; not submitted again
网站已确认签到|Attendance confirmed by the website
本次签到已获网站确认|This check-in was confirmed by the website
课程已上，暂未找到签到码；可能尚未发布或当前来源未检索到。可稍后重试。|The session has started, but no code was found. It may not be published yet or may be missing from the selected sources. Retry later.
网站已关闭该场次录入，无法补签|The website has closed this session; late check-in is unavailable
课程已超过 7 天，无法补签|This session is over 7 days old; late check-in is unavailable
课程已超过 7 天，不再补签|This session is over 7 days old; late check-in is unavailable
签到未完成：存在已过期场次|Check-in incomplete: expired sessions
部分签到成功|Partially checked in
签到未全部完成|Check-in incomplete
签到待确认|Check-in needs attention
签到成功|Check-in successful
课程已全部签到|All sessions already checked in
没有可确认的签到结果|No confirmed check-in results
核对课程配置|Review course settings
已核对，关闭|Reviewed, close
知道了|Got it
确认|Confirm
本轮签到流程已完成。|The check-in run has finished.
本轮签到流程已完成|The check-in run has finished
本轮检查已结束|This run has finished
本轮已停止，请查看上方原因|This run stopped; see the reason above
正在准备下一步|Preparing the next step
正在处理，请稍候|Processing, please wait
正在请求|Requesting
正在保存|Saving
正在导出|Exporting
设置已保存。|Settings saved.
个人配置已导入并保存。|Configuration imported and saved.
已导出上次保存的个人配置；页面尚未保存的修改未包含在文件中。|Exported saved settings. Unsaved changes on this page are not included.
个人配置已导出，可通过“导入个人配置”恢复。|Configuration exported. Use “Import configuration” to restore it.
正在保存设置，完成后立即签到…|Saving settings, then checking in…
正在请求后台开始签到…|Requesting a check-in run…
后台已收到签到请求，正在等待运行状态…|Request accepted; waiting for progress…
复制失败，请选中签到码手动复制。|Copy failed. Select the code and copy it manually.
签到码已复制。|Attendance code copied.
导出失败|Export failed
自动运行已暂停|Scheduled check-in paused
自动运行已开启|Scheduled check-in enabled
尚未开启|Not enabled
安装识别服务|Install recognition service
填写身份|Enter your details
登录并配置课程|Sign in and configure courses
先安装 Mac 识别服务|Install Mac recognition service
完成这一步后，才能识别签到图片。|Install the service to read attendance code images.
打开下载并解压的安装包。|Open the downloaded and extracted package.
双击|Double-click
安装Mac识别服务.command|安装Mac识别服务.command
按终端提示安装。|Follow the terminal instructions.
如果再次提示|If macOS also blocks
被阻止，请再到|, go to
系统设置 → 隐私与安全性 → 仍要打开|System Settings → Privacy & Security → Open Anyway
系统设置 → 隐私与安全性 → 安全性 → 仍要打开|System Settings → Privacy & Security → Security → Open Anyway
允许这个识别程序。安装命令和识别程序可能需要分别允许。|to allow it. The installer and recognition executable may each need approval.
回到此页面，等待检测通过，再点击|Return here, wait for verification, then click
刷新并继续|Reload and continue
已在系统设置允许，重新检测|Allowed in System Settings — check again
我已安装，立即检测|Installed — check now
安装成功 · 刷新并继续|Installed — reload and continue
提示无法验证开发者、打不开？|blocked the app or cannot verify its developer?
确认文件来自本项目 Release 后，先尝试打开一次，再进入|After verifying the download is from this project's Release, try opening it once, then go to
按提示确认。只允许这个文件，不需要关闭系统安全保护。|Follow the prompts. Allow this file only; keep system security enabled.
查看 Apple 操作说明|View Apple's instructions
下载安装包|Download installer
填写你的学校身份|Enter your school account details
用于核对登录账号，避免在错误账号下签到。|Used to verify the signed-in account and avoid checking in as someone else.
与学校系统完全一致|Exactly as shown on the attendance website
保存身份 · 下一步|Save details and continue
登录学校网站，再检测课程|Sign in, then detect your courses
请在当前 Chrome 配置文件登录签到系统。点击检测后会生成课表，再为每门课选择邮件或 Moodle 来源。|Sign in to the attendance system in this Chrome profile. Detect your timetable, then choose email or Moodle sources for each course.
打开签到系统并登录|Open attendance system and sign in
登录学校 Gmail|Sign in to school Gmail
登录 Gmail|Sign in to Gmail
登录 Moodle|Sign in to Moodle
登录签到系统|Sign in to attendance system
已登录，检测课程信息|Signed in — detect courses
修改姓名或邮箱|Edit name or email
检测完成后，请在下方核对课程、选择来源并保存，完成后才会显示完整页面。|Review courses below, choose their sources, then save to open the full dashboard.
清空所有配置与缓存|Clear all settings and cache
未通过启动自检。请按提示更新或允许程序，再手动点击重新检测。|did not pass the startup check. Follow the update or approval instructions, then check again.
尚未连接识别服务。请完成安装；本页每 5 秒自动重试，无需反复刷新。|Recognition service is not connected. Finish installation; this page checks every 5 seconds.
已检测到识别服务安装成功。请点击下方按钮刷新，继续填写身份。|Recognition service detected. Click below to reload and enter your details.
识别服务已就绪。|Recognition service is ready.
姓名|Name
日期待核对|Date needs review
课程待核对|Course needs review
来源标注|from source
暂无运行明细|No activity yet
暂无可确认的近期场次，请核对课表及签到码来源。|No confirmed recent sessions. Review your timetable and code sources.
请确认课程、日期、星期、时间和组别；未填写课表或未检测到数据，不代表已经签到成功。|Review course, date, day, time and group. A missing timetable or no detected data does not mean attendance succeeded.
请查看运行明细并核对配置。|Review the run details and configuration.
页面|Pages
消息|Messages
图片|Images
缓存|Cache
记录|Records
跳过|Skipped
总用时|Elapsed
当前步骤|Current step
最近检查|Last run
查看当前来源|View current source
查看来源|View source
签到流程完成|Check-in run finished
签到结束|Check-in run ended
星期一|Monday
星期二|Tuesday
星期三|Wednesday
星期四|Thursday
星期五|Friday
星期六|Saturday
星期日|Sunday
星期|Day
时间|Time
星期几|Day of week
每 1 天|Every day
每 3 天|Every 3 days
每 5 天|Every 5 days
每 7 天|Every 7 days
邮件和 Moodle|Email and Moodle
邮件|Email
例如|e.g.
默认使用课程代码|Defaults to course code
每行一个网址，最多 3 个|One URL per line, up to 3
课程、Week 栏目或公告网址|course, weekly section or announcement URLs
默认无需填写：先从签到页面读取最近 7 天的场次并保存成固定周课表，再查找待签到场次的签到码。|Detect recent sessions and save a recurring timetable before searching for codes.
课表按马来西亚时间（UTC+8）运行。默认自动读取签到页面的待签到场次，无需填写每周课表。|Timetables use Malaysia time (UTC+8). Pending sessions are detected automatically.
首次自动检测课程和周课表，再选择签到码来源。课表可修改，也可重新检测后核对保存。|Detect courses and weekly sessions, then choose code sources. You can edit the timetable or detect it again.
立即签到可单独使用，无需开启自动运行。开启并保存自动运行后可关闭本页面，Chrome 会在后台定时检查。请保持 Chrome 运行、电脑唤醒并登录学校账号。|Check in now works independently. Enable and save scheduled check-in to run with this page closed. Keep Chrome running, your computer awake and your school account signed in.
课程中的签到码会按场次整理在这里。|Your attendance sessions and codes will appear here.
在本机识别与归档，无需额外 AI 账号。|On-device recognition and archiving. No extra AI account required.
确定清空所有课程、来源、课表及收集记录吗？此操作不可撤销，自动运行会暂停。本机已归档的图片文件不受影响。|Clear all courses, sources, timetables and attendance records? This cannot be undone. Scheduled runs will pause; archived images remain on this Mac.
确定清空助手的姓名、邮箱、课程、签到记录和浏览器内缓存吗？此操作不可撤销，自动运行会停止。|Clear your name, email, courses, attendance records and app cache? This cannot be undone. Scheduled runs will stop.
重新检测最近 7 天的课程和课表？检测结果会填入编辑区，保存后替换原课表。|Detect courses from the last 7 days again? Review and save the results to replace your timetable.
是否检测课程信息？确认后将打开已登录的签到页面，读取最近 7 天的课程并生成可编辑课表。此步骤不会提交签到。|Detect courses now? The signed-in attendance page will open to read the last 7 days and create an editable timetable. This does not submit attendance.
`.trim().split('\n').map(line=>line.split('|')).filter(([source,target])=>source&&target);
const sortedEntries=[...entries].sort((a,b)=>b[0].length-a[0].length);
let language='en';
export function detectLanguage(value){return /^zh(?:-|$)/i.test(value||'')?'zh':'en';}
export function translate(text,lang=language){
 if(lang==='zh')return text;
 let result=String(text);
 for(const [zh,en] of sortedEntries)result=result.split(zh).join(en);
 return result.replace(/每周\s*(\d+)\s*场/g,'$1 sessions per week').replace(/(\d+)\s*场/g,'$1 sessions').replace(/(\d+)\s*秒前更新/g,'Updated $1 seconds ago').replace(/最多\s*(\d+)\s*秒/g,'up to $1 seconds');
}
export function installLanguageUI(doc=document){
 const picker=doc.createElement('select');picker.id='language';picker.setAttribute('aria-label','Language / 语言');picker.innerHTML='<option value="auto">Auto / 自动</option><option value="en">English</option><option value="zh">中文</option>';const header=doc.querySelector('header'),tools=doc.createElement('div');tools.className='header-tools';const actions=header.querySelector('.header-actions');if(actions)tools.append(actions);tools.append(picker);header.append(tools);
 let choice='auto';try{choice=doc.defaultView.localStorage.getItem('mamo-language')||'auto';}catch{}
 picker.value=['en','zh'].includes(choice)?choice:'auto';
 const texts=new WeakMap(),attrs=new WeakMap();
 function apply(){
  language=picker.value==='auto'?detectLanguage(globalThis.chrome?.i18n?.getUILanguage?.()||doc.defaultView.navigator.language):picker.value;doc.documentElement.lang=language==='zh'?'zh-CN':'en';
  const walker=doc.createTreeWalker(doc.documentElement,4);let node;
  while(node=walker.nextNode()){
   if(node.parentElement?.closest('script,style,#language'))continue;
   const old=texts.get(node),original=old&&node.nodeValue===old.output?old.original:node.nodeValue,output=translate(original);texts.set(node,{original,output});if(node.nodeValue!==output)node.nodeValue=output;
  }
  for(const el of doc.querySelectorAll('[placeholder],[title],[aria-label]'))for(const key of ['placeholder','title','aria-label']){
   if(!el.hasAttribute(key)||el===picker)continue;const value=el.getAttribute(key),map=attrs.get(el)||{},old=map[key],original=old&&value===old.output?old.original:value,output=translate(original);map[key]={original,output};attrs.set(el,map);if(value!==output)el.setAttribute(key,output);
  }
 }
 const observer=new doc.defaultView.MutationObserver(()=>{observer.disconnect();apply();observe();});
 const observe=()=>observer.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
 picker.onchange=()=>{try{doc.defaultView.localStorage.setItem('mamo-language',picker.value);}catch{}observer.disconnect();apply();observe();};apply();observe();return {apply,disconnect:()=>observer.disconnect()};
}
