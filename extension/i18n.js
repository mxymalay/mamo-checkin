import {ruleText} from './source-rules/strings.js';
import {dynamicText} from './i18n-dynamic.js';
import {installHeaderMenu} from './personal-settings-menu.js';
const entries=`
语言|Language|語言
跟随系统|System language|跟隨系統
个人配置|Personal settings|個人設定
导入|Import|匯入
导出|Export|匯出
签到系统需要重新登录|Sign in to the attendance system again|簽到系統需要重新登入
签到页面结构改变或尚未登录，未提交任何签到|The attendance page changed or is not signed in. No check-in was submitted.|簽到頁面結構改變或尚未登入，未提交任何簽到
签到系统的学生姓名与配置不一致|The student name on the attendance website does not match your settings.|簽到系統的學生姓名與設定不一致
出现非预期的签到链接|Unexpected attendance link|出現非預期的簽到連結
签到表单与已核对的场次不匹配|The check-in form does not match the verified session.|簽到表單與已核對的場次不匹配
签到码格式不正确|Invalid check-in code format|簽到碼格式不正確
未知签到操作|Unknown check-in operation|未知簽到操作
Windows 使用浏览器内置识别|Windows uses built-in browser OCR|Windows 使用瀏覽器內建辨識
本机识别服务未就绪|The local OCR service is not ready|本機辨識服務未就緒
Attendance 课表检查失败：|Attendance timetable check failed:|Attendance 課表檢查失敗：
需要登录 Attendance|Sign in to Attendance|需要登入 Attendance
已在打开的页面完成登录后，本轮签到会自动继续（最多等待 3 分钟）。|This check resumes after sign-in in the opened tab (up to 3 minutes).|已在開啟的頁面完成登入後，本輪簽到會自動繼續（最多等待 3 分鐘）。
自动签到已开始|Automatic check-in started|自動簽到已開始
页面将在后台打开并检查最近 7 天的课程，完成后会再通知结果。|Pages will open in the background to check courses from the last 7 days. Results will be reported when finished.|頁面將在後臺開啟並檢查最近 7 天的課程，完成後會再通知結果。
Attendance 签到提交检查失败：|Attendance submission check failed:|Attendance 簽到提交檢查失敗：
网站登录未完成，签到码来源尚未检查完整。请先登录，再重试。|Sign-in is incomplete; code sources have not all been checked. Sign in and retry.|網站登入未完成，簽到碼來源尚未檢查完整。請先登入，再重試。
点击打开马莫签到助手查看记录。|Open the Check-in Assistant to view records.|點選開啟馬莫簽到助手檢視記錄。
课程和收集记录已清空|Courses and collected records cleared|課程和收集記錄已清空
正在运行，请稍后再更改识别方式|A check is running. Change the recognition method after it finishes.|正在執行，請稍後再更改辨識方式
浏览器内置识别|Built-in browser OCR|瀏覽器內建辨識
未知请求|Unknown request|未知請求
配置文件不是有效 JSON|The configuration file is not valid JSON.|設定檔案不是有效 JSON
请选择马莫签到助手的个人配置文件|Select a Check-in Assistant personal configuration file.|請選擇馬莫簽到助手的個人設定檔案
缺少可靠的日期或邮件年份|A reliable date or email year is missing|缺少可靠的日期或郵件年份
月份无法识别|Month not recognized|月份無法辨識
图片日期距发送日期超过 21 天|The image date differs from the sent date by more than 21 days|圖片日期距傳送日期超過 21 天
图片的星期与日期不一致|The image weekday does not match its date|圖片的星期與日期不一致
同一行包含多个日期|Multiple dates in the same row|同一行包含多個日期
组别不完整|Incomplete group|組別不完整
上课时间不完整|Incomplete class time|上課時間不完整
签到码不是 5 位字母数字|The code must contain 5 letters or digits|簽到碼不是 5 位字母數字
活动类型、日期、时间或组别识别置信度不足|Activity type, date, time or group recognition is uncertain|活動類型、日期、時間或組別辨識置信度不足
同一场次出现不同签到码|Conflicting codes for the same session|同一場次出現不同簽到碼
未知 Ed 操作|Unknown Ed operation|未知 Ed 操作
Ed 需要重新登录|Sign in to Ed again|Ed 需要重新登入
Ed 页面与配置课程不匹配|The Ed page does not match the configured course|Ed 頁面與設定課程不匹配
Ed 页面与配置课程不匹配，请核对 Ed course_id（与 Moodle 的不同）|The Ed page does not match the course. Check the Ed course_id; it is different from Moodle's.|Ed 頁面與設定課程不匹配，請核對 Ed course_id（與 Moodle 的不同）
[LOGIN_REQUIRED] Gmail 登录页面尚未完成，请完成登录后重试；尚未搜索邮件。|[LOGIN_REQUIRED] Complete Gmail sign-in and retry. No mail has been searched.|[LOGIN_REQUIRED] Gmail 登入頁面尚未完成，請完成登入後重試；尚未搜尋郵件。
[LOGIN_REQUIRED] Gmail 账号地址尚未确认，请打开目标邮箱后重试；尚未搜索邮件。|[LOGIN_REQUIRED] Gmail account address not confirmed. Open the target mailbox and retry. No mail has been searched.|[LOGIN_REQUIRED] Gmail 帳號地址尚未確認，請開啟目標信箱後重試；尚未搜尋郵件。
[LOGIN_REQUIRED] Gmail 当前登录账号无法唯一确认，请打开目标邮箱后重试；未读取邮件|[LOGIN_REQUIRED] The Gmail account could not be uniquely confirmed. Open the target mailbox and retry. No mail has been read.|[LOGIN_REQUIRED] Gmail 目前登入帳號無法唯一確認，請開啟目標信箱後重試；未讀取郵件
多个课程规则同时匹配邮件主题，请修改课程关键词|Multiple course rules match this subject. Change the course keywords.|多個課程規則同時匹配郵件主題，請修改課程關鍵詞
邮件列表已变化，请重新扫描|The mail list changed. Scan again.|郵件列表已變化，請重新掃描
未知邮件操作|Unknown mail operation|未知郵件操作
图片网址无效|Invalid image URL|圖片網址無效
图片来源不在许可范围|Image source is not permitted|圖片來源不在許可範圍
图片原页面已切换，无法在当前页面读取|The original image page changed. It cannot be read from the current page.|圖片原頁面已切換，無法在目前頁面讀取
原页面中已找不到这张图片，请重新检查邮件或课程页面|The image is no longer on the original page. Check the mail or course page again.|原頁面中已找不到這張圖片，請重新檢查郵件或課程頁面
图片读取超时（总计最多 20 秒），请稍后重试|Image reading timed out (20 seconds total). Retry later.|圖片讀取超時（總計最多 20 秒），請稍後重試
图片跳转到未获许可的网站，可能需要重新登录 Gmail 或 Moodle|The image redirected to an unapproved website. You may need to sign in to Gmail or Moodle again.|圖片跳轉到未獲許可的網站，可能需要重新登入 Gmail 或 Moodle
图片地址返回了 HTML 页面，请重新登录 Gmail 或 Moodle 后重试|The image URL returned HTML. Sign in to Gmail or Moodle again and retry.|圖片地址返回了 HTML 頁面，請重新登入 Gmail 或 Moodle 後重試
图片格式不是 PNG/JPEG，无法读取原图|The image is not PNG/JPEG. The original cannot be read.|圖片格式不是 PNG/JPEG，無法讀取原圖
图片超过 8 MiB 大小限制|The image exceeds the 8 MiB size limit|圖片超過 8 MiB 大小限制
图片响应没有可读取的内容|The image response has no readable content|圖片回應沒有可讀取的內容
图片内容为空，请重新检查原页面|The image is empty. Check the original page again.|圖片內容為空，請重新檢查原頁面
原页面未返回图片，请重新检查邮件或课程页面|The original page returned no image. Check the mail or course page again.|原頁面未返回圖片，請重新檢查郵件或課程頁面
识别服务已关闭|OCR service closed|辨識服務已關閉
离线识别签到图片并保存用户授权的本地归档|Recognize attendance images offline and save user-authorized local archives|離線辨識簽到圖片並儲存使用者授權的本地歸檔
识别服务连接中断：|OCR connection interrupted:|辨識服務連線中斷：
图片识别|Image recognition|圖片辨識
识别服务状态查询|OCR service status check|辨識服務狀態查詢
图片识别服务没有响应|The OCR service did not respond|圖片辨識服務沒有回應
相同图片已识别，复用结果|Reusing the result for an already recognized image|相同圖片已辨識，複用結果
正在重新识别图片（第 2 次，最多 130 秒）|Retrying image recognition (attempt 2, up to 130 seconds)|正在重新辨識圖片（第 2 次，最多 130 秒）
正在识别图片（最多 130 秒）|Recognizing image (up to 130 seconds)|正在辨識圖片（最多 130 秒）
识别服务已恢复，重试成功|OCR service recovered; retry succeeded|辨識服務已恢復，重試成功
图片识别重试后仍失败，后续图片继续检查：|Image recognition failed after retry. Continuing with other images:|圖片辨識重試後仍失敗，後續圖片繼續檢查：
图片识别失败，正在重启识别服务并重试一次：|Image recognition failed. Restarting OCR and retrying once:|圖片辨識失敗，正在重啟辨識服務並重試一次：
未知本地归档操作|Unknown local archive operation|未知本地歸檔操作
页面已被关闭|Page closed|頁面已被關閉
请输入 Moodle course_id，或粘贴完整课程网址|Enter a Moodle course_id or paste a full course URL.|請輸入 Moodle course_id，或貼上完整課程網址
请打开 Moodle 课程主页，复制 course/view.php?id= 后的数字或完整课程网址|Open the Moodle course home page. Copy the number after course/view.php?id= or the full course URL.|請開啟 Moodle 課程主頁，複製 course/view.php?id= 後的數字或完整課程網址
Moodle course_id 必须是正整数|Moodle course_id must be a positive integer|Moodle course_id 必須是正整數
原表未提供组别，需核对后匹配签到场次|The table has no group. Verify it before matching the session.|原表未提供組別，需核對後匹配簽到場次
日期无效|Invalid date|日期無效
星期与日期不一致|Weekday does not match date|星期與日期不一致
上课时间范围无效|Invalid class time range|上課時間範圍無效
未知 Moodle 操作|Unknown Moodle operation|未知 Moodle 操作
Moodle 需要重新登录|Sign in to Moodle again|Moodle 需要重新登入
Moodle 登录账号无法确认，请登录配置的学校账号|Moodle account not confirmed. Sign in with the configured school account.|Moodle 登入帳號無法確認，請登入設定的學校帳號
Moodle 页面与配置课程不匹配|The Moodle page does not match the configured course|Moodle 頁面與設定課程不匹配
Moodle 课程年份与设置不符|The Moodle course year does not match your settings|Moodle 課程年份與設定不符
正在使用本地识别（最多 60 秒）|Using local OCR (up to 60 seconds)|正在使用本地辨識（最多 60 秒）
图片识别失败：|Image recognition failed:|圖片辨識失敗：
识别失败|Recognition failed|辨識失敗
识别图片时自动启动|Starts automatically for image recognition|辨識圖片時自動啟動
正在启动图片识别引擎|Starting the OCR engine|正在啟動圖片辨識引擎
已取消旧识别引擎|Previous OCR engine cancelled|已取消舊辨識引擎
图片识别完成|Image recognition complete|圖片辨識完成
识别引擎需要重启|The OCR engine needs restarting|辨識引擎需要重啟
正在识别整张图片|Recognizing the full image|正在辨識整張圖片
正在复核签到码|Rechecking the attendance code|正在複核簽到碼
正在复核课程日期、组别和时间|Rechecking the course date, group and time|正在複核課程日期、組別和時間
正在用码列区域补扫签到码|Rescanning the code column for attendance codes|正在用碼列區域補掃簽到碼
内置识别引擎脚本未加载（vendor/tesseract.min.js 缺失），请在 chrome://extensions 重新加载扩展后再试；若反复出现请重新构建安装包。|The built-in OCR script is missing (vendor/tesseract.min.js). Reload the extension at chrome://extensions. Rebuild the package if this persists.|內建辨識引擎指令碼未載入（vendor/tesseract.min.js 缺失），請在 chrome://extensions 重新載入擴充功能後再試；若反覆出現請重新構建安裝包。
正在加载识别引擎：|Loading the OCR engine:|正在載入辨識引擎：
核心模块|Core module|核心模組
英语识别数据|English recognition data|英語辨識資料
识别接口|Recognition interface|辨識介面
图片尺寸过大|Image dimensions are too large|圖片尺寸過大
未知图片处理操作|Unknown image operation|未知圖片處理操作
已读取此来源|Source read|已讀取此來源
正在准备下一步…|Preparing the next step…|正在準備下一步…
查看来源 ↗|View sources ↗|檢視來源 ↗
课程场次 · 自动检测|Weekly sessions · Detect automatically|課程場次 · 自動偵測
签到结束：|Check-in run ended:|簽到結束：
签到流程完成：|Check-in run finished:|簽到流程完成：
最近检查：|Last run:|最近檢查：
正在请求…|Requesting…|正在請求…
复制失败|Copy failed|複製失敗
正在检查识别服务，请稍候（最多等待 5 秒）。|Checking the OCR service. Please wait (up to 5 seconds).|正在檢查辨識服務，請稍候（最多等待 5 秒）。
正在检查识别服务（最多等待 5 秒）…|Checking the OCR service (up to 5 seconds)…|正在檢查辨識服務（最多等待 5 秒）…
识别服务未就绪，请完成安装后重试。|The OCR service is not ready. Complete installation and retry.|辨識服務未就緒，請完成安裝後重試。
课程代码重复：|Duplicate course code:|課程代碼重複：
正在清空课程…|Clearing courses…|正在清空課程…
正在导出…|Exporting…|正在匯出…
导出失败：|Export failed:|匯出失敗：
正在启动签到检查，请稍候…|Starting the attendance check. Please wait…|正在啟動簽到檢查，請稍候…
（暂无日志）|(No logs yet)|（暫無日誌）
暂无可导出的记录。|No records to export.|暫無可匯出的記錄。
处理完成|All done|處理完成
后台未返回结果，请从扩展图标重新打开|The background did not respond; reopen the popup shortly.|後臺未返回結果，請從擴充功能圖示重新開啟
准备检查最近 7 天的签到|Preparing attendance checks for the last 7 days|準備檢查最近 7 天的簽到
网站已关闭该场次录入|The website closed entry for this session|網站已關閉該場次錄入
提交前已保存检查点|Checkpoint saved before submission|提交前已儲存檢查點
提交前已停止|Stopped before submission|提交前已停止
无效的身份字段|Invalid identity field|無效的身分欄位
学校系统姓名不能为空|Your school-system name is required|學校系統姓名不能為空
请填写有效的学校邮箱|Enter a valid school email|請填寫有效的學校信箱
请填写 1–20 门课程，例如 FIT5120|Enter 1–20 courses, for example FIT5120|請填寫 1–20 門課程，例如 FIT5120
页面没有及时加载|The page did not load in time|頁面沒有及時載入
Gmail 账号已确认，正在搜索最近 7 天的邮件|Gmail account verified; searching the last 7 days|Gmail 帳號已確認，正在搜尋最近 7 天的郵件
[LOGIN_REQUIRED] Gmail 来源链接属于另一个账号|[LOGIN_REQUIRED] The Gmail source link belongs to another account|[LOGIN_REQUIRED] Gmail 來源連結屬於另一個帳號
本轮 Ed 检查达到时间上限，其余课程下轮继续|Ed checks reached this round's time limit; remaining courses continue next round|本輪 Ed 檢查達到時間上限，其餘課程下輪繼續
页面已被关闭，无法执行签到|The page was closed; unable to check in|頁面已被關閉，無法執行簽到
年份仅为参考，旧页面记录不自动提交|The year is a reference only. Older page records are not submitted automatically.|年份僅為參考，舊頁面記錄不自動提交
签到日期不在课程周栏目的日期范围内|The attendance date is outside the course week's date range|簽到日期不在課程周欄目的日期範圍內
；发现多个 5 位候选码，未自动选择|; multiple 5-character candidate codes found; none selected automatically|；發現多個 5 位候選碼，未自動選擇
正文含签到码但缺少完整日期、活动类型、组别或时间|The text contains a code but lacks a complete date, activity type, group or time|正文含簽到碼但缺少完整日期、活動類型、組別或時間
跳过超过 7 天的旧内容|Skipping content older than 7 days|跳過超過 7 天的舊內容
正在读取签到文字和图片|Reading attendance text and images|正在讀取簽到文字和圖片
该课程所需场次已找到，跳过剩余图片|Required sessions found; skipping remaining images|該課程所需場次已找到，跳過剩餘圖片
图片未识别出完整签到表格|No complete attendance table was recognized in the image|圖片未辨識出完整簽到表格
准备好，轻松签到|Ready when you are|準備好，輕鬆簽到
剩下的交给签到助手|Let the Check-in Assistant take it from here|剩下的交給簽到助手
正在为你签到|Taking care of check-in|正在為你簽到
查找、识别，一步步完成|Finding codes. Making progress.|查詢、辨識，一步步完成
正在检查登录状态|Checking sign-in status|正在檢查登入狀態
检测通过后，自动继续|Continuing automatically once verified|偵測通過後，自動繼續
可以安心去忙啦|You can get back to your day|可以安心去忙啦
遇到一点问题|A little help needed|遇到一點問題
查看下方提示，再试一次|Check the message below and retry|檢視下方提示，再試一次
还有一点待完成|A little more to do|還有一點待完成
详细结果可在更多设置中查看|See More settings for the details|詳細結果可在更多設定中檢視
自动签到已开启|Auto check-in on|自動簽到已開啟
自动签到已关闭|Auto check-in off|自動簽到已關閉
如需登录，请在打开的网页中完成。|If sign-in is needed, complete it in the opened tab.|如需登入，請在開啟的網頁中完成。
本次无需补签。|No additional check-ins needed this time.|本次無需補簽。
自动签到未开启；点击下方按钮再次检查。|Auto check-in is off; click below to run another check.|自動簽到未開啟；點選下方按鈕再次檢查。
学期签到报告|Attendance report|學期簽到報告
本机收集记录|Local collection|本機收集記錄
网站实读记录|Observed on website|網站實讀記錄
按当前课表推算|Projected from current timetable|按目前課表推算
本机记录状态|Local record status|本機記錄狀態
网站状态|Website status|網站狀態
依据 / 来源|Evidence / Source|依據 / 來源
条记录|records|條記錄
仅汇总本机已保存的数据；导出不会重新检索 Gmail 或 Attendance。推算场次不代表实际上课或已签到，未知状态也不代表缺勤。|This report uses locally saved data only; exporting does not search Gmail or Attendance. Projected sessions do not confirm classes or attendance. Unknown status does not mean absence.|僅彙總本機已儲存的資料；匯出不會重新檢索 Gmail 或 Attendance。推算場次不代表實際上課或已簽到，未知狀態也不代表缺勤。
本机收集状态与网站实读状态分别列出。|Local collection and observed website status are shown separately.|本機收集狀態與網站實讀狀態分別列出。
网站暂不允许继续尝试，请查看签到系统。|The website is not allowing further attempts. Check the attendance system.|網站暫不允許繼續嘗試，請檢視簽到系統。
提交结果尚未确认，下次运行先检查学校签到状态。|Submission is unconfirmed. The next run will check the school attendance status first.|提交結果尚未確認，下次執行先檢查學校簽到狀態。
所有候选码均被网站拒绝，可能识别有误或来源码有误，请核对来源或手动补码。|All candidate codes were rejected. Recognition or the source code may be incorrect. Check the source or enter a code manually.|所有候選碼均被網站拒絕，可能辨識有誤或來源碼有誤，請核對來源或手動補碼。
关联已解除，等待签到码。|Link removed. Waiting for a check-in code.|關聯已解除，等待簽到碼。
使用此签到码|Use this code|使用此簽到碼
补全后保存为待提交，下次运行核对学校场次后提交。|Save the completed record as pending. The next run verifies the school session before submitting.|補全後儲存為待提交，下次執行核對學校場次後提交。
签到码与场次信息完整，等待核对学校场次后提交。|Code and session details are complete. Waiting to verify the school session before submission.|簽到碼與場次資訊完整，等待核對學校場次後提交。
学校网站已确认签到成功。|The school website has confirmed a successful check-in.|學校網站已確認簽到成功。
识别结果需要核对，请确认场次信息及签到码。|Review the recognition result and confirm the session details and code.|辨識結果需要核對，請確認場次資訊及簽到碼。
已尝试提交，但尚未确认结果，请查看学校网站。|Submission was attempted but the result is unconfirmed. Check the school website.|已嘗試提交，但尚未確認結果，請檢視學校網站。
正在向匹配的学校场次提交签到码。|Submitting the code to the matching school session.|正在向匹配的學校場次提交簽到碼。
已找到场次，尚未找到可用签到码。|Session found, but no usable code has been found yet.|已找到場次，尚未找到可用簽到碼。
已识别签到码，但缺少可靠日期，请关联对应场次。|Code recognized, but a reliable date is missing. Link it to the matching session.|已辨識簽到碼，但缺少可靠日期，請關聯對應場次。
日期、时间与签到码尚未完整识别，请核对来源。|Date, time and code could not be fully recognized. Check the source.|日期、時間與簽到碼尚未完整辨識，請核對來源。
使用此签到码补全目标场次|Use this code to complete the target session|使用此簽到碼補全目標場次
请核对日期、时间、类型和组别。补全后仅保存为待提交，下一次运行仍核对学校网站；演示记录不会提交。|Check the date, time, activity type and group. Completing the record only saves it for submission; the next run still checks the school website. Demo records are never submitted.|請核對日期、時間、類型和組別。補全後僅儲存為待提交，下一次執行仍核對學校網站；示範記錄不會提交。
存在多个候选码，请先核对后手动补码|Multiple candidate codes exist. Review them and enter the code manually.|存在多個候選碼，請先核對後手動補碼
显示演示记录|Show demo records|顯示示範記錄
演示记录说明|About demo records|示範記錄說明
演示记录，不会提交签到|Demo record. No check-in will be submitted.|示範記錄，不會提交簽到
临时显示演示记录，可测试关联、忽略与恢复。不修改真实记录，不读取邮箱或提交签到。关闭开关或刷新页面后清除演示。|Temporarily shows demo records for testing linking, ignoring and restoring. Does not modify real records, read mail or submit check-ins. Turn this off or refresh to clear the demo.|臨時顯示示範記錄，可測試關聯、忽略與恢復。不修改真實記錄，不讀取信箱或提交簽到。關閉開關或重新整理頁面後清除示範。
30 秒检查间隔说明|About the 30-second interval|30 秒檢查間隔說明
仅识别模式说明|About recognition-only mode|僅辨識模式說明
开启后，检查间隔中才会出现“每 30 秒”。仍需开启定时自动签到并选择该间隔。关闭后，已选的 30 秒间隔恢复为每天；频繁检查会增加资源占用。|Adds the every-30-seconds option. Enable scheduled check-ins and select that interval separately. Turning this off resets a selected 30-second interval to daily. Frequent checks use more resources.|開啟後，檢查間隔中才會出現“每 30 秒”。仍需開啟定時自動簽到並選擇該間隔。關閉後，已選的 30 秒間隔恢復為每天；頻繁檢查會增加資源佔用。
正常读取来源、识别并保存签到码，但不填写或提交签到表单。适用于测试识别与补码。关闭此开关或退出开发者模式后，后续运行可提交符合条件的记录。|Reads sources, recognizes and saves codes without filling or submitting check-in forms. Use this to test recognition and manual code entry. After turning this off or leaving developer mode, subsequent runs may submit eligible records.|正常讀取來源、辨識並儲存簽到碼，但不填寫或提交簽到表單。適用於測試辨識與補碼。關閉此開關或退出開發者模式後，後續執行可提交符合條件的記錄。
关联到已有场次|Link to an existing session|關聯到已有場次
选择对应场次|Select the matching session|選擇對應場次
确认关联|Confirm link|確認關聯
没有可关联的匹配场次|No matching session is available|沒有可關聯的匹配場次
忽略此记录|Ignore this record|忽略此記錄
已忽略 / 已关联|Ignored / linked|已忽略 / 已關聯
忽略此记录？可在“已忽略 / 已关联”中恢复。|Ignore this record? You can restore it under Ignored / linked.|忽略此記錄？可在“已忽略 / 已關聯”中恢復。
恢复记录|Restore record|恢復記錄
已关联|Linked|已關聯
已忽略|Ignored|已忽略
记录不存在，请刷新后重试|Record not found. Refresh and try again.|記錄不存在，請重新整理後重試
此记录无需恢复|This record does not need restoring.|此記錄無需恢復
只能整理尚未提交的待核对记录|Only unsubmitted records needing review can be organized.|只能整理尚未提交的待核對記錄
无效的记录操作|Invalid record action.|無效的記錄操作
场次不匹配或签到码冲突，无法关联|The session does not match or the codes conflict. Linking is not allowed.|場次不匹配或簽到碼衝突，無法關聯
允许每 30 秒自动检查|Allow automatic checks every 30 seconds|允許每 30 秒自動檢查
未完整识别的来源记录|Incomplete source readings|未完整辨識的來源記錄
最新|Latest|最新
查看详情|View details|檢視詳情
关闭|Close|關閉
仅识别签到码，不提交|Recognize codes only, without submitting|僅辨識簽到碼，不提交
仅识别模式已开启，不会提交签到。|Recognition-only mode is on. No check-ins will be submitted.|僅辨識模式已開啟，不會提交簽到。
仅识别模式已关闭。|Recognition-only mode is off.|僅辨識模式已關閉。
仅识别模式：签到码已保留，本轮不填写或提交签到|Recognition-only mode: codes are saved. No check-in form will be filled or submitted during this run.|僅辨識模式：簽到碼已保留，本輪不填寫或提交簽到
手动补码|Enter code|手動補碼
手动补充签到码|Enter the missing check-in code|手動補充簽到碼
保存并重试|Save and retry|儲存並重試
只有尚未提交且缺少签到码的场次可以补码|Only unsubmitted sessions without a code can be edited.|只有尚未提交且缺少簽到碼的場次可以補碼
只能补充最近 7 天已开始的场次|Only sessions that started within the last 7 days can be updated.|只能補充最近 7 天已開始的場次
图片字段不完整，正在使用内置识别补扫|Some image fields are missing. Retrying with built-in OCR.|圖片欄位不完整，正在使用內建辨識補掃
找到相关图片，但日期或签到码未完整识别。请重试识别，或核对来源后手动补码。|A related image was found, but its date or code could not be fully read. Retry recognition or check the source and enter the code.|找到相關圖片，但日期或簽到碼未完整辨識。請重試辨識，或核對來源後手動補碼。
学期报告|Semester report|學期報告
导出 HTML 报告|Export HTML report|匯出 HTML 報告
开发与致谢|Development & thanks|開發與致謝
让签到更轻松，也让好想法一起生长。|Easier check-ins. Better ideas, together.|讓簽到更輕鬆，也讓好想法一起生長。
一起把签到助手做得更好|Build a better check-in assistant together|一起把簽到助手做得更好
欢迎提交 PR：修复问题、完善翻译，或带来新的想法。|Pull requests are welcome: fix a bug, improve a translation, or bring a new idea.|歡迎提交 PR：修復問題、完善翻譯，或帶來新的想法。
参与开发 ↗|Contribute ↗|參與開發 ↗
反馈问题与想法 ↗|Issues & ideas ↗|回饋問題與想法 ↗
共同开发者|Contributors|共同開發者
项目发起人与开发者|Creator & developer|專案發起人與開發者
感谢每一位使用、反馈和参与改进签到助手的人。|Thank you to everyone who uses the check-in assistant, shares feedback, and helps it improve.|感謝每一位使用、回饋和參與改進簽到助手的人。
继续使用内置识别|Keep using built-in OCR|繼續使用內建辨識
Gmail 账号已改变，请重新检测目标邮箱；尚未搜索邮件。|The Gmail account changed. Verify the target mailbox again; no mail has been searched.|Gmail 帳號已改變，請重新偵測目標信箱；尚未搜尋郵件。
正在读取邮件和签到码|Reading mail and check-in codes|正在讀取郵件和簽到碼
当前使用浏览器内置识别引擎，全程在本机完成、无需安装；如需更高识别精度，可安装 Mac OCR 配套程序。|Using built-in browser OCR, entirely on this computer. No installation needed. The optional Mac OCR helper may improve recognition.|目前使用瀏覽器內建辨識引擎，全程在本機完成、無需安裝；如需更高辨識精度，可安裝 Mac OCR 配套程式。
浏览器扩展存储（无本机归档）|Browser extension storage (no local file archive)|瀏覽器擴充功能儲存（無本機歸檔）
开发者模式|Developer mode|開發者模式
切换模式|Switch mode|切換模式
学期记录导出|Semester history export|學期記錄匯出
开始日期|Start date|開始日期
结束日期|End date|結束日期
包含按当前课表推算的场次|Include sessions projected from the current timetable|包含按目前課表推算的場次
推算场次不代表实际上课或签到。网站记录仅包含助手实际读取过的场次。|Projected sessions do not confirm classes or attendance. Website records include only sessions actually observed by the assistant.|推算場次不代表實際上課或簽到。網站記錄僅包含助手實際讀取過的場次。
导出学期 CSV|Export semester CSV|匯出學期 CSV
请选择有效的起止日期，范围不超过一年。|Choose a valid date range of no more than one year.|請選擇有效的起止日期，範圍不超過一年。
所选日期范围内没有记录。|No records in the selected date range.|所選日期範圍內沒有記錄。
学期记录已导出。|Semester history exported.|學期記錄已匯出。
正在读取 Moodle 页面内容（最多等待 45 秒）|Reading Moodle content (up to 45 seconds)|正在讀取 Moodle 頁面內容（最多等待 45 秒）
正在读取 Ed 页面内容（最多等待 45 秒）|Reading Ed content (up to 45 seconds)|正在讀取 Ed 頁面內容（最多等待 45 秒）
页面内容没有及时加载，请确认登录状态后重试|Page content did not load in time. Check your sign-in and retry.|頁面內容沒有及時載入，請確認登入狀態後重試
就绪（浏览器内置识别，可选装配套程序提升精度）|Ready (built-in browser OCR; install the companion for higher accuracy)|就緒（瀏覽器內建辨識，可選裝配套程式提升精度）
未检测到本机识别服务，将使用浏览器内置识别；可安装配套程序提升识别质量。|No local OCR helper detected; the built-in browser OCR will be used. Install the companion for higher accuracy.|未偵測到本機辨識服務，將使用瀏覽器內建辨識；可安裝配套程式提升辨識品質。
未检测到可用的本机识别服务，改用浏览器内置识别|No usable local OCR helper detected; switching to the built-in browser OCR.|未偵測到可用的本機辨識服務，改用瀏覽器內建辨識
正在签到；使用浏览器内置识别图片|Checking in; recognizing images with the built-in browser OCR|正在簽到；使用瀏覽器內建辨識圖片
浏览器内置识别无独立日志文件|The built-in browser OCR keeps no separate log file.|瀏覽器內建辨識無獨立日誌檔案
当前使用浏览器内置识别引擎，全程在本机完成、无需安装；Mac 可按引导下载配套程序使用 Apple Vision 提升识别效果。|Using the built-in browser OCR engine: fully on-device, nothing to install. Mac users can follow the guide to install the companion for higher-accuracy Apple Vision recognition.|目前使用瀏覽器內建辨識引擎，全程在本機完成、無需安裝；Mac 可按引導下載配套程式使用 Apple Vision 提升辨識效果。
两个平台均可使用浏览器内置识别；Mac 可选装 Apple Vision 配套程序。|Both platforms can use built-in browser OCR; Mac users can optionally install the Apple Vision companion.|兩個平臺均可使用瀏覽器內建辨識；Mac 可選裝 Apple Vision 配套程式。
本机识别服务版本不兼容。请使用本页下载按钮安装 OCR 配套程序，再重新检测。|The local OCR helper is incompatible. Install the companion using this page's download button, then check again.|本機辨識服務版本不相容。請使用本頁下載按鈕安裝 OCR 配套程式，再重新偵測。
改用本机识别（安装配套程序）|Use Mac OCR helper|改用本機辨識（安裝配套程式）
已恢复本机识别优先；请在上方引导第 1 步安装配套程序。|On-device OCR is preferred again. Install the companion in step 1 of the guide above.|已恢復本機辨識優先；請在上方引導第 1 步安裝配套程式。
不想麻烦？先尝试下内置识别。|Prefer to keep it simple? Try the built-in recognition first.|不想麻煩？先嘗試下內建辨識。
下载 Mac OCR 配套程序|Download Mac OCR helper|下載 Mac OCR 配套程式
下载 Mac OCR 配套包|Download the Mac OCR helper|下載 Mac OCR 配套包
请下载后解压。随后进行以下步骤。|Download and extract it. Then follow the steps below.|請下載後解壓。隨後進行以下步驟。
助手连接已失效。请关闭助手页面，从 Chrome 扩展图标重新打开后重试。|The assistant connection expired. Close this page and reopen it from the Chrome extension icon, then retry.|助手連線已失效。請關閉助手頁面，從 Chrome 擴充功能圖示重新開啟後重試。
读取权限不足。请在 Chrome 扩展管理中允许助手访问对应网站，然后重试。|cannot be read without site permission. Allow access in Chrome extension settings, then retry.|讀取權限不足。請在 Chrome 擴充功能管理中允許助手訪問對應網站，然後重試。
页面在读取期间发生跳转。请等待页面加载完成后重试。|navigated while being read. Wait for the page to finish loading, then retry.|頁面在讀取期間發生跳轉。請等待頁面載入完成後重試。
网络连接失败。请检查网络及学校网站是否可以打开，然后重试。|could not connect. Check your network and whether the school website opens, then retry.|網路連線失敗。請檢查網路及學校網站是否可以開啟，然後重試。
本机存储空间不足，未能保存数据。请释放空间后重试，不要卸载扩展或清空签到记录。|Local storage is full; data could not be saved. Free some space and retry. Do not uninstall the extension or clear attendance records.|本機儲存空間不足，未能儲存資料。請釋放空間後重試，不要解除安裝擴充功能或清空簽到記錄。
响应超时，结果尚未确认。请检查网站或识别服务后重试；若已经提交签到，请先核对学校网站记录。|timed out and the result is unconfirmed. Check the website or OCR service before retrying. If attendance was submitted, verify the school records first.|回應超時，結果尚未確認。請檢查網站或辨識服務後重試；若已經提交簽到，請先核對學校網站記錄。
操作失败，未返回错误详情。请重新打开助手后重试；若已提交签到，请先核对学校网站记录。|The operation failed without error details. Reopen the assistant and retry. If attendance was submitted, verify the school records first.|操作失敗，未返回錯誤詳情。請重新開啟助手後重試；若已提交簽到，請先核對學校網站記錄。
未能完成。请重试；若已提交签到，请先核对学校网站记录。诊断信息：|could not finish. Retry; if attendance was submitted, verify the school records first. Diagnostic details:|未能完成。請重試；若已提交簽到，請先核對學校網站記錄。診斷資訊：
提交结果待核对：|Submission needs verification:|提交結果待核對：
助手|Assistant|助手
归档|Archive|歸檔
正在验证 Gmail 邮箱，仅检测登录状态，不执行签到…|Verifying your Gmail account only; this does not start a check-in…|正在驗證 Gmail 信箱，僅偵測登入狀態，不執行簽到…
Gmail 邮箱检测通过，已保存。|Gmail account verified and saved.|Gmail 信箱偵測通過，已儲存。
Attendance 姓名检测通过，已保存。|Attendance name verified and saved.|Attendance 姓名偵測通過，已儲存。
设置|Settings|設定
助手页面|Assistant pages|助手頁面
还有更多课程？|More courses?|還有更多課程？
添加更多课程|Add more courses|新增更多課程
Moodle course_id|Moodle course_id|Moodle course_id
例如 35417，也可粘贴完整课程网址|e.g. 35417, or paste a full course URL|例如 35417，也可貼上完整課程網址
打开 Moodle 课程|Open Moodle course|開啟 Moodle 課程
打开 Moodle 查看课程网址|Open Moodle to find the course URL|開啟 Moodle 檢視課程網址
打开 Moodle 后进入对应课程，网址中 course/view.php?id= 后面的数字就是 course_id；粘贴完整课程网址也会自动提取。|Open your course in Moodle. The number after course/view.php?id= is the course_id. You can also paste the full course URL to extract it automatically.|開啟 Moodle 後進入對應課程，網址中 course/view.php?id= 後面的數字就是 course_id；貼上完整課程網址也會自動提取。
学校身份|School identity|學校身分
课程检索|Course search|課程檢索
登录可自动填写|Sign in to auto-fill|登入可自動填寫
为什么没有签到码？|Why is there no attendance code?|為什麼沒有簽到碼？
已检测到该场次已签到，因此没有重复查询签到码。|This session was already marked as attended, so the attendance code was not searched again.|已偵測到該場次已簽到，因此沒有重複查詢簽到碼。
签到前登录检测 · 请勿关闭浏览器页面|Pre-check sign-in · Do not close the browser page|簽到前登入偵測 · 請勿關閉瀏覽器頁面
登录身份已核对，开始检查课程和签到码…|Sign-in verified. Checking courses and attendance codes…|登入身分已核對，開始檢查課程和簽到碼…
自动检查|Automatic checks|自動檢查
登录并检测|Sign in and verify|登入並偵測
重新登录并检测|Sign in and verify again|重新登入並偵測
登录并检测 Gmail 邮箱|Sign in and verify Gmail account|登入並偵測 Gmail 信箱
登录并检测 Attendance 姓名|Sign in and verify Attendance name|登入並偵測 Attendance 姓名
选择学校邮箱|Choose a school email|選擇學校信箱
检测到多个已登录的学校邮箱，请选择一个继续。|Multiple signed-in school emails were found. Choose one to continue.|偵測到多個已登入的學校信箱，請選擇一個繼續。
学校邮箱|School email|學校信箱
取消|Cancel|取消
继续检测|Continue verification|繼續偵測
检测到多个已登录的学校邮箱，请选择一个。|Multiple signed-in school emails found. Choose one.|偵測到多個已登入的學校信箱，請選擇一個。
正在检测 Gmail 登录账号…|Checking your Gmail account…|正在偵測 Gmail 登入帳號…
正在查找已登录的学校邮箱…|Looking for signed-in school email accounts…|正在查詢已登入的學校信箱…
正在打开 Gmail 并查找已登录的学校邮箱…|Opening Gmail and looking for signed-in school email accounts…|正在開啟 Gmail 並查詢已登入的學校信箱…
未找到已登录的学校邮箱，正在重试…|No signed-in school email found. Retrying…|未找到已登入的學校信箱，正在重試…
暂未找到已登录的学校邮箱，正在重试…|No signed-in school email found yet. Retrying…|暫未找到已登入的學校信箱，正在重試…
请在打开的 Gmail 标签页完成登录，正在等待账号…|Complete sign-in in the opened Gmail tab. Waiting for the account…|請在開啟的 Gmail 分頁完成登入，正在等待帳號…
正在检测登录状态…|Checking sign-in status…|正在偵測登入狀態…
正在保存检测结果…|Saving verification result…|正在儲存偵測結果…
Attendance 签到系统|Attendance system|Attendance 簽到系統
Moodle 姓名与配置不一致，请登录配置的学校账号后继续检测。|The Moodle name does not match your settings. Sign in with the configured school account to continue.|Moodle 姓名與設定不一致，請登入設定的學校帳號後繼續偵測。
Attendance 姓名与配置不一致，请登录配置的学校账号后继续检测。|The Attendance name does not match your settings. Sign in with the configured school account to continue.|Attendance 姓名與設定不一致，請登入設定的學校帳號後繼續偵測。
签到前身份已改变，请重新登录并检测后再试|Your identity changed before check-in. Sign in and verify again.|簽到前身分已改變，請重新登入並偵測後再試
Gmail 登录已确认，正在读取目标邮箱|Gmail sign-in confirmed. Reading the configured mailbox.|Gmail 登入已確認，正在讀取目標信箱
请先填写学校系统中的姓名。|Enter your name as shown in the school system first.|請先填寫學校系統中的姓名。
无法保存：请检查|Cannot save: please check|無法儲存：請檢查
您有旧的配置？|Have a saved configuration?|您有舊的設定？
可以导入以前导出的个人配置，跳过重复填写。|Import your saved configuration to skip re-entering it.|可以匯入以前匯出的個人設定，跳過重複填寫。
显示导入配置|Import configuration|顯示匯入設定
查看来源与运行日志|View sources and run logs|檢視來源與執行日誌
查看本机原图路径|View archived image path|檢視本機原圖路徑
打开来源|Open source|開啟來源
OCR 诊断日志|OCR diagnostic log|OCR 診斷日誌
忽略已签到|Ignore attended sessions|忽略已簽到
忽略已签到说明|Ignore attended sessions explanation|忽略已簽到說明
勾选后仍会读取已在 Attendance 中标记为已签到的场次，用于测试识别；不会重复提交签到。|When enabled, sessions already marked attended in Attendance are read again for recognition testing; check-in is not submitted twice.|勾選後仍會讀取已在 Attendance 中標記為已簽到的場次，用於測試辨識；不會重複提交簽到。
确认信息并签到|Confirm details and check in|確認資訊並簽到
正在确认…|Confirming…|正在確認…
我已核对课程、日期、星期、时间、组别和签到码，确认这些信息正确并允许签到。|I have checked the course, date, weekday, time, group and attendance code. These details are correct and check-in is allowed.|我已核對課程、日期、星期、時間、組別和簽到碼，確認這些資訊正確並允許簽到。
已确认识别结果，准备签到…|Recognition confirmed. Preparing check-in…|已確認辨識結果，準備簽到…
用户已核对识别结果，允许签到|User confirmed the recognized details; check-in allowed|使用者已核對辨識結果，允許簽到
签到码必须是 5 位字母数字|The attendance code must contain 5 letters or digits|簽到碼必須是 5 位字母數字
日期、活动类型、组别和时间必须完整后才能确认|Date, activity type, group and time must be complete before confirmation|日期、活動類型、組別和時間必須完整後才能確認
只有需要核对的记录可以确认|Only records needing review can be confirmed|只有需要核對的記錄可以確認
该记录存在多个签到码候选，请重新检测后再确认|This record has multiple attendance-code candidates. Detect again before confirming.|該記錄存在多個簽到碼候選，請重新偵測後再確認
等待检测|Waiting to verify|等待偵測
登录检测通过。|Sign-in verification passed.|登入偵測通過。
请在打开的网站完成登录，检测会自动继续。|Complete sign-in in the opened website. Verification will continue automatically.|請在開啟的網站完成登入，偵測會自動繼續。
登录检测超时，请完成登录后重新检测。|Sign-in verification timed out. Complete sign-in and try again.|登入偵測超時，請完成登入後重新偵測。
页面已被关闭，检测已停止。请重新登录并检测。|The page was closed. Verification stopped. Sign in again and verify.|頁面已被關閉，偵測已停止。請重新登入並偵測。
Gmail 邮箱检测通过，请确认后保存。|Gmail account verified. Confirm it before saving.|Gmail 信箱偵測通過，請確認後儲存。
请在新标签页登录填写的 Gmail 邮箱，登录后会自动检测。|Sign in to the entered Gmail account in the new tab. Verification will continue automatically.|請在新分頁登入填寫的 Gmail 信箱，登入後會自動偵測。
尚未确认目标邮箱，请登录后重新检测。|Target account not confirmed. Sign in and verify again.|尚未確認目標信箱，請登入後重新偵測。
邮箱已修改，请重新检测。|Email changed. Verify again.|信箱已修改，請重新偵測。
确认你的身份|Confirm your identity|確認你的身分
登录并读取姓名|Sign in and read name|登入並讀取姓名
重新登录并读取姓名|Sign in and read name again|重新登入並讀取姓名
正在读取 Attendance 姓名…|Reading your Attendance name…|正在讀取 Attendance 姓名…
已读取 Attendance 姓名，请确认后保存。|Attendance name retrieved. Confirm it before saving.|已讀取 Attendance 姓名，請確認後儲存。
请在新标签页登录 Attendance；登录后会自动读取姓名，返回此页确认即可。|Sign in to Attendance in the new tab. Your name will be filled automatically; return here to confirm it.|請在新分頁登入 Attendance；登入後會自動讀取姓名，返回此頁確認即可。
尚未读取到姓名，请登录后点击重试，也可手动填写。|Name not found yet. Sign in and retry, or enter it manually.|尚未讀取到姓名，請登入後點選重試，也可手動填寫。
已切换为手动填写，请确认姓名与 Attendance 一致。|Manual entry selected. Check that your name matches Attendance.|已切換為手動填寫，請確認姓名與 Attendance 一致。
请先登录 Attendance 系统，再读取姓名|Sign in to Attendance before reading your name|請先登入 Attendance 系統，再讀取姓名
未能读取姓名，请确认登录成功；也可手动填写|Could not read your name. Check that you are signed in, or enter it manually|未能讀取姓名，請確認登入成功；也可手動填寫
识别服务未就绪，请完成安装引导。|Recognition service is not ready. Complete the installation guide.|辨識服務未就緒，請完成安裝引導。
本地识别服务无法连接。请运行安装包中的|Cannot connect to local recognition. Run the installer in the download:|本地辨識服務無法連線。請執行安裝包中的
，然后重新加载马莫签到助手。|, then reload Mamo Check-in.|，然後重新載入馬莫簽到助手。
本地识别服务无法连接。请运行安装包中的安装程序，然后重新加载马莫签到助手。|Local recognition is unavailable. Run the installer in the package, then reload Mamo Check-in.|本地辨識服務無法連線。請執行安裝包中的安裝程式，然後重新載入馬莫簽到助手。
本地识别服务无法连接。请运行安装包中的“安装 Mac 识别服务.command”，然后重新加载马莫签到助手。|Local recognition is unavailable. Run “Install Mac Recognition.command” from the package, then reload Mamo Check-in.|本地辨識服務無法連線。請執行安裝包中的“Install Mac Recognition.command”，然後重新載入馬莫簽到助手。
本地识别未返回有效结果|Local recognition returned no valid result|本地辨識未返回有效結果
本地识别连接已关闭|Local recognition connection closed|本地辨識連線已關閉
本地识别响应超时，已停止本次连接；原图由本机服务保存。|Local recognition timed out. The connection was closed; the original image is saved locally.|本地辨識回應超時，已停止本次連線；原圖由本機服務儲存。
正在使用本地识别（最多 30 秒）|Recognizing locally (up to 30 seconds)|正在使用本地辨識（最多 30 秒）
复用本地识别结果|Reusing cached recognition|複用本地辨識結果
本地识别完成|Local recognition complete|本地辨識完成
识别服务未就绪，请运行对应系统的识别服务安装程序。|Recognition is not ready. Run the installer for your operating system.|辨識服務未就緒，請執行對應系統的辨識服務安裝程式。
连接浏览器|Connect Chrome|連線瀏覽器
无需安装 Python，也无需开启定时签到。|No Python installation is needed. Scheduled check-in is optional.|無需安裝 Python，也無需開啟定時簽到。
本地图片识别|Local image recognition|本地圖片辨識
首次安装请按安装引导运行对应系统的识别服务安装程序。|Follow the installation guide for your operating system.|首次安裝請按安裝引導執行對應系統的辨識服務安裝程式。
正在写入本地归档|Saving the local archive|正在寫入本地歸檔
本地识别|Local recognition|本地辨識
本地原生识别|Local recognition|本地原生辨識
Attendance系统|Attendance system|Attendance系統
Moodle 签到码来源|Moodle attendance code source|Moodle 簽到碼來源
签到码从 Moodle 界面读取。|Attendance codes are read from the Moodle interface.|簽到碼從 Moodle 介面讀取。
安装命令授权|Allow the installer|安裝命令授權
attendance-ocr 自检|attendance-ocr self-check|attendance-ocr 自檢
如被阻止：系统设置 → 隐私与安全性 → 仍要打开。|If blocked: System Settings → Privacy & Security → Open Anyway.|如被阻止：系統設定 → 隱私與安全性 → 仍要開啟。
安装脚本会自动完成自检；macOS 首次检查新程序可能需要约半分钟，请耐心等待。|The installer script completes the self-check automatically; macOS may take about half a minute the first time it inspects a new program, so wait patiently.|安裝指令碼會自動完成自檢；macOS 首次檢查新程式可能需要約半分鐘，請耐心等待。
被阻止时，才前往|is blocked, open|被阻止時，才前往
 允许它，然后回到这里重新检测。| and allow it, then return here and check again.| 允許它，然後回到這裡重新偵測。
只有当 macOS 明确提示|Only when macOS explicitly reports|只有當 macOS 明確提示
正在检查识别服务…|Checking OCR…|正在檢查辨識服務…
请确认课程配置|Review course configuration|請確認課程設定
正在检测课程…|Detecting courses…|正在偵測課程…
已检测到|Detected|已偵測到
按课程查看记录|Browse records by course|按課程檢視記錄
查看字段说明|View field help|檢視欄位說明
运行状态已更新|Run status updated|執行狀態已更新
正在识别|Recognizing|正在辨識
就绪|Ready|就緒
请选择|Select|請選擇
活动类型（可选）|Activity type (optional)|活動類型（可選）
组别（可选）|Group (optional)|組別（可選）
处理失败，请查看明细|Processing failed; see details|處理失敗，請檢視明細
本轮已结束|Run finished|本輪已結束
等待首次检查|Waiting for first run|等待首次檢查
尚未开始检查；点击“立即签到”开始。|No check has started; click “Check in now” to begin.|尚未開始檢查；點選“立即簽到”開始。
上次检查已完成；点击“立即签到”开始下一轮。|The last check is complete; click “Check in now” to run another.|上次檢查已完成；點選“立即簽到”開始下一輪。
正在启动签到检查…|Starting the check…|正在啟動簽到檢查…
正在预读 Gmail 签到邮件…|Reading Gmail attendance messages ahead of the course check…|正在預讀 Gmail 簽到郵件…
本轮检查失败，请查看运行明细。|This check failed; see the run details.|本輪檢查失敗，請檢視執行明細。
正在重新查找|Searching again for|正在重新查詢
的签到码…|attendance codes…|的簽到碼…
该课程|This course|該課程
正在保存设置…|Saving settings…|正在儲存設定…
配置字段|Setting|設定欄位
无法保存：请检查|Cannot save. Check|無法儲存：請檢查
签到记录|Attendance records|簽到記錄
留空可扩大检索|Leave blank for a broader search|留空可擴大檢索
原生图片识别|Native text recognition|原生圖片辨識
签到系统|Attendance system|簽到系統
系统设置|System Settings|系統設定
隐私与安全性|Privacy & Security|隱私與安全性
仍要打开|Open Anyway|仍要開啟
安全性|Security|安全性
第|Step|第
自动检测或手动填写。默认无需填写：先从签到页面读取最近 14 天的场次并保存成固定周课表，再查找待签到场次的签到码。信息不全或组别不唯一时请确认；也可手动填写课表。已设课表时，已完成或已取得有效签到码的场次不再查询。|Detect automatically or enter sessions manually. Recent sessions become a recurring timetable. Review incomplete or ambiguous groups. Completed sessions and sessions with usable codes are skipped.|自動偵測或手動填寫。預設無需填寫：先從簽到頁面讀取最近 14 天的場次並儲存成固定周課表，再查詢待簽到場次的簽到碼。資訊不全或組別不唯一時請確認；也可手動填寫課表。已設課表時，已完成或已取得有效簽到碼的場次不再查詢。
检测期间请勿关闭浏览器页面。|Keep the browser page open while detection is running.|偵測期間請勿關閉瀏覽器頁面。
保持 Chrome 运行并登录学校 Gmail、Moodle 和签到系统。电脑睡眠或登录过期时，检查会延后。缺少日期、组别或识别不确定的内容会保存为|Keep Chrome running and sign in to school Gmail, Moodle and attendance. Runs are delayed while the computer sleeps or login expires. Incomplete or uncertain results are marked|保持 Chrome 執行並登入學校 Gmail、Moodle 和簽到系統。電腦睡眠或登入過期時，檢查會延後。缺少日期、組別或辨識不確定的內容會儲存為
填写 Moodle 课程、Week 栏目或公告网址，每行一个。两种来源都填时先查 Gmail，再从 Moodle 补齐缺少的场次。|Enter Moodle course, weekly section or announcement URLs, one per line. With both sources selected, Gmail is searched first, then Moodle for remaining sessions.|填寫 Moodle 課程、Week 欄目或公告網址，每行一個。兩種來源都填時先查 Gmail，再從 Moodle 補齊缺少的場次。
可选，填写签到系统中的活动类型，例如 Studio、Seminar、Workshop 或 Applied。|Optional: the activity type shown on the attendance site, e.g. Studio, Seminar, Workshop or Applied.|可選，填寫簽到系統中的活動類型，例如 Studio、Seminar、Workshop 或 Applied。
后台响应超时，操作结果尚未确认。请重新打开马莫签到助手查看状态；若刚升级扩展，请关闭旧页面后重新打开。|The background service timed out. Reopen Mamo Check-in to verify the result. After updating the extension, close the old page and open it again.|後臺回應超時，操作結果尚未確認。請重新開啟馬莫簽到助手檢視狀態；若剛升級擴充功能，請關閉舊頁面後重新開啟。
填写后只查找该发件人的邮件；留空则按邮件主题关键词查找，关键词留空时使用课程代码。学校邮箱只用于核对登录身份。|Search only this sender's emails when filled in. Leave blank to search by subject keyword, or by course code when the keyword is blank. Your student email is only used to verify sign-in identity.|填寫後只查找該寄件者的郵件；留空則按郵件主旨關鍵詞查找，關鍵詞留空時使用課程代碼。學校信箱只用於核對登入身分。
按马来西亚时间（UTC+8）填写。未到上课时间的场次不会提前搜索，超过 7 天的课程不补签。|Use Malaysia time (UTC+8). Future sessions are not searched; sessions older than 7 days cannot be checked in.|按馬來西亞時間（UTC+8）填寫。未到上課時間的場次不會提前搜尋，超過 7 天的課程不補簽。
自动运行的检查间隔。保存并开启后可关闭本页面；Chrome 必须运行，电脑睡眠时不会检查。|Interval between scheduled runs. Save and enable it to run with this page closed. Chrome must remain running and the computer awake.|自動執行的檢查間隔。儲存並開啟後可關閉本頁面；Chrome 必須執行，電腦睡眠時不會檢查。
已生成可编辑的课程与课表，请选择邮件、Moodle 或两者，并填写对应来源后保存。|An editable course timetable is ready. Choose email, Moodle or both, fill in the sources and save.|已生成可編輯的課程與課表，請選擇郵件、Moodle 或兩者，並填寫對應來源後儲存。
学校邮箱只用于核对签到系统登录身份。每门课的邮件来源请在 邮件发件人邮箱中配置。|Your student email verifies your identity. Configure each course's email source in Sender email.|學校信箱只用於核對簽到系統登入身分。每門課的郵件來源請在 郵件發件人信箱中設定。
选择签到码来源，只显示并使用对应配置。两者都选时先查邮件，再查 Moodle。|Choose the code source. Only selected sources are used. With both selected, email is searched before Moodle.|選擇簽到碼來源，只顯示並使用對應設定。兩者都選時先查郵件，再查 Moodle。
正在读取签到系统。若需要登录，请先打开上方签到系统链接完成登录，再回来重试。|Reading the attendance system. If sign-in is needed, open the link above, sign in and retry.|正在讀取簽到系統。若需要登入，請先開啟上方簽到系統連結完成登入，再回來重試。
课程检测完成。请在下方选择各课程来源并核对课表，点击保存全部设置完成配置。|Courses detected. Choose sources, review the timetable below and save all settings.|課程偵測完成。請在下方選擇各課程來源並核對課表，點選儲存全部設定完成設定。
可选，填写你自己的组别，例如 01 或 01-P1；填写后只匹配该组别。|Optional: your group, e.g. 01 or 01-P1. Only that group will be matched.|可選，填寫你自己的組別，例如 01 或 01-P1；填寫後只匹配該組別。
使用刚填写的学校账号完成登录；确认姓名一致，再回到这里重试。原始信息：|Sign in with the school account you entered, verify the name, then retry here. Details:|使用剛填寫的學校帳號完成登入；確認姓名一致，再回到這裡重試。原始資訊：
正在打开 Gmail 最近 7 天的邮件（页面最多等待 25 秒）|Opening Gmail messages from the last 7 days (up to 25 seconds)|正在開啟 Gmail 最近 7 天的郵件（頁面最多等待 25 秒）
场等待签到码，暂未找到；可能尚未发布或当前来源未检索到，可稍后重试|sessions are waiting for codes. They may not be published yet or found in the selected sources. Retry later.|場等待簽到碼，暫未找到；可能尚未釋出或目前來源未檢索到，可稍後重試
填写签到页面最上方显示的姓名，与页面保持一致，用于核对登录身份。|Enter the name shown at the top of the attendance page to verify your identity.|填寫簽到頁面最上方顯示的姓名，與頁面保持一致，用於核對登入身分。
请先在第 2 步填写并保存姓名，再登录签到系统检测课程|Save your name in step 2, then sign in and detect courses.|請先在第 2 步填寫並儲存姓名，再登入簽到系統偵測課程
最近 7 天未发现课程，请确认签到页面已登录，或手动添加课程。|No courses found in the last 7 days. Verify your sign-in or add courses manually.|最近 7 天未發現課程，請確認簽到頁面已登入，或手動新增課程。
检测完成，但你正在编辑配置。请先保存，再重新检测以免覆盖改动。|Detection finished while you were editing. Save your changes before detecting again.|偵測完成，但你正在編輯設定。請先儲存，再重新偵測以免覆蓋改動。
用于课程页面的年份参考；年份无法可靠确定的签到码不会自动提交。|Reference year for course pages. Codes with an uncertain year are not submitted automatically.|用於課程頁面的年份參考；年份無法可靠確定的簽到碼不會自動提交。
所有课程共用的 Gmail 检索关键词，留空可扩大检索范围。|Gmail search keywords shared by all courses. Leave blank for a broader search.|所有課程共用的 Gmail 檢索關鍵詞，留空可擴大檢索範圍。
正在读取 Moodle 页面文字和图片（最多等待 25 秒）|Reading Moodle text and images (up to 25 seconds)|正在讀取 Moodle 頁面文字和圖片（最多等待 25 秒）
正在读取签到页面最近 7 天的课程，请保持学校账号已登录…|Reading courses from the last 7 days. Keep your school account signed in…|正在讀取簽到頁面最近 7 天的課程，請保持學校帳號已登入…
并完成登录，确认学校邮箱和姓名与设置一致，再返回助手重试。|and sign in. Verify that the email and name match your settings, then retry.|並完成登入，確認學校信箱和姓名與設定一致，再返回助手重試。
已有签到记录，请使用独立的 Chrome 配置文件切换账号|Attendance records exist. Use a separate Chrome profile for another account.|已有簽到記錄，請使用獨立的 Chrome 設定檔案切換帳號
已有记录时请使用单独的 Chrome 配置文件切换账号|Records exist. Use a separate Chrome profile for another account.|已有記錄時請使用單獨的 Chrome 設定檔案切換帳號
已将最近 14 天的课程场次保存为固定周课表，下次直接复用|Recent sessions were saved as a recurring weekly timetable.|已將最近 14 天的課程場次儲存為固定周課表，下次直接複用
请填写 Monash Moodle 课程、公告或页面网址|Enter a Monash Moodle course, announcement or page URL.|請填寫 Monash Moodle 課程、公告或頁面網址
请先在 Chrome 加载此扩展，再从扩展图标打开设置|Load the extension in Chrome, then open settings from its icon.|請先在 Chrome 載入此擴充功能，再從擴充功能圖示開啟設定
本轮 Moodle 检查达到时间上限，其余课程下轮继续|Moodle time limit reached; remaining courses will continue next run.|本輪 Moodle 檢查達到時間上限，其餘課程下輪繼續
正在加载 Moodle 课程页面（最多等待 25 秒）|Loading Moodle course page (up to 25 seconds)|正在載入 Moodle 課程頁面（最多等待 25 秒）
网站待签到场次与已保存课表不一致，请核对或重新检测课程|The site's pending sessions differ from your timetable. Review it or detect courses again.|網站待簽到場次與已儲存課表不一致，請核對或重新偵測課程
填写学校课程代码，用于匹配邮件、课程页面及签到场次。|Enter the course code to match emails, course pages and attendance sessions.|填寫學校課程代碼，用於匹配郵件、課程頁面及簽到場次。
页面没有及时加载，请确认 Chrome 中的登录状态|The page did not load in time. Check your Chrome sign-in.|頁面沒有及時載入，請確認 Chrome 中的登入狀態
信息不完整、组别冲突或近 14 天没有场次，请核对课表|Incomplete details, conflicting groups or no recent sessions. Review the timetable.|資訊不完整、組別衝突或近 14 天沒有場次，請核對課表
门课程。请为每门课选择签到码来源，核对课表后保存。|courses. Choose sources, review the timetable and save.|門課程。請為每門課選擇簽到碼來源，核對課表後儲存。
只填写 4 个英文字母加 4 个数字，后缀固定为|Enter 4 letters followed by 4 digits. The fixed suffix is|只填寫 4 個英文字母加 4 個數字，字尾固定為
识别服务未就绪，请运行 Mac 识别服务安装命令。|Recognition service is not ready. Run the Mac recognition installer.|辨識服務未就緒，請執行 Mac 辨識服務安裝命令。
缓存正被其他助手页面使用，请关闭其他助手页面后重试|Cache is in use by another assistant page. Close it and retry.|快取正被其他助手頁面使用，請關閉其他助手頁面後重試
后台未返回结果，请关闭此页面，从扩展图标重新打开|No background response. Close this page and reopen it from the extension icon.|後臺未返回結果，請關閉此頁面，從擴充功能圖示重新開啟
正在检查识别服务，请稍候（最多等待 10 秒）。|Checking recognition service (up to 10 seconds).|正在檢查辨識服務，請稍候（最多等待 10 秒）。
未找到最近 7 天内与课表匹配的场次，请核对课表|No matching sessions in the last 7 days. Review your timetable.|未找到最近 7 天內與課表匹配的場次，請核對課表
至少需要一个 Gmail 或 Moodle 来源|At least one Gmail or Moodle source is required.|至少需要一個 Gmail 或 Moodle 來源
正在检查课程图片是否更新（下载最多 20 秒）|Checking for updated course images (download up to 20 seconds)|正在檢查課程圖片是否更新（下載最多 20 秒）
邮件主题必须包含此文字；留空时使用课程代码。|Email subjects must contain this text. Defaults to the course code.|郵件主題必須包含此文字；留空時使用課程代碼。
正在展开并读取邮件正文（最多等待 25 秒）|Opening email contents (up to 25 seconds)|正在展開並讀取郵件正文（最多等待 25 秒）
上次检查已中断，已保存进度，可以重新开始检查|The previous run was interrupted. Progress was saved; you can start again.|上次檢查已中斷，已儲存進度，可以重新開始檢查
无法确认签到系统登录状态或读取课程。请点击|Unable to verify attendance sign-in or read courses. Open|無法確認簽到系統登入狀態或讀取課程。請點選
所有课程和收集记录已清空，自动运行已暂停。|Courses and attendance records cleared. Scheduled runs paused.|所有課程和收集記錄已清空，自動執行已暫停。
本轮最多处理 40 个新会话，其余下轮继续|Up to 40 new threads per run; remaining threads continue next run.|本輪最多處理 40 個新會話，其餘下輪繼續
本轮邮件检查达到时间上限，其余会话下轮继续|Email time limit reached; remaining threads continue next run.|本輪郵件檢查達到時間上限，其餘會話下輪繼續
正在核对网站已有签到（最多等待 25 秒）|Checking existing attendance (up to 25 seconds)|正在核對網站已有簽到（最多等待 25 秒）
部分信息不完整或组别不唯一，请核对课程配置|Some details or groups are ambiguous. Review course settings.|部分資訊不完整或組別不唯一，請核對課程設定
课表场次已完成或已取得可用码，跳过来源扫描|Sessions are completed or have usable codes; source search skipped.|課表場次已完成或已取得可用碼，跳過來源掃描
正在读取网站签到记录（最多等待 25 秒）|Reading website attendance (up to 25 seconds)|正在讀取網站簽到記錄（最多等待 25 秒）
正在运行，请等待当前检查结束再重新检测课程|Wait for the current run before detecting courses again.|正在執行，請等待目前檢查結束再重新偵測課程
请先保存正在编辑的配置，再重新检测课程。|Save your changes before detecting courses again.|請先儲存正在編輯的設定，再重新偵測課程。
正在检查识别服务（最多等待 10 秒）…|Checking recognition service (up to 10 seconds)…|正在檢查辨識服務（最多等待 10 秒）…
请在同一个 Chrome 配置文件打开|In the same Chrome profile, open|請在同一個 Chrome 設定檔案開啟
请填写有效的学校邮箱和学校系统显示的姓名|Enter a valid student email and the name shown on the attendance site.|請填寫有效的學校信箱和學校系統顯示的姓名
正在等待邮件内容（最多等待 25 秒）|Waiting for email contents (up to 25 seconds)|正在等待郵件內容（最多等待 25 秒）
自动签到已暂停或账号、课程设置发生变化|Scheduled check-in paused or account/course settings changed.|自動簽到已暫停或帳號、課程設定發生變化
场已签到，本次无需重复签到或查找签到码|sessions already checked in; no repeat submission or code search needed.|場已簽到，本次無需重複簽到或查詢簽到碼
未能读取网站签到状态，请确认登录后重试|Unable to read attendance status. Sign in and retry.|未能讀取網站簽到狀態，請確認登入後重試
缓存清理失败，请关闭其他助手页面后重试|Cache cleanup failed. Close other assistant pages and retry.|快取清理失敗，請關閉其他助手頁面後重試
保存设置并开启后，自动检查课程来源。|Save and enable scheduled runs to check course sources automatically.|儲存設定並開啟後，自動檢查課程來源。
最多配置 3 个 Moodle 入口|Up to 3 Moodle source URLs.|最多設定 3 個 Moodle 入口
活动类型请使用签到网站显示的英文名称|Use the English activity type shown on the attendance site.|活動類型請使用簽到網站顯示的英文名稱
开启后，工具将按设定间隔自动检查。|When enabled, runs follow your selected interval.|開啟後，工具將按設定間隔自動檢查。
课表预检查失败，将继续寻找签到码：|Timetable check failed; code search will continue:|課表預檢查失敗，將繼續尋找簽到碼：
正在运行，请等待检查结束再清空课程|Wait for the current run before clearing courses.|正在執行，請等待檢查結束再清空課程
组别格式例如 01 或 01-P1|Group format: 01 or 01-P1.|組別格式例如 01 或 01-P1
正在检测课程（最多 30 秒）…|Detecting courses (up to 30 seconds)…|正在偵測課程（最多 30 秒）…
请先填写邮箱、姓名和至少一门课程|Enter your email, name and at least one course.|請先填寫信箱、姓名和至少一門課程
识别服务检查通过，可以识别图片。|Recognition service is ready to read images.|辨識服務檢查通過，可以辨識圖片。
正在签到：核对最近 7 天的课程|Checking in: reviewing sessions from the last 7 days|正在簽到：核對最近 7 天的課程
正在签到；图片识别会在需要时启动|Checking in; image recognition starts when needed|正在簽到；圖片辨識會在需要時啟動
记录已存于扩展，下载归档待重试：|Records saved in the extension; archiving needs retry:|記錄已存於擴充功能，下載歸檔待重試：
正在重新检测课程，请稍后检查签到|Course detection in progress. Try checking in later.|正在重新偵測課程，請稍後檢查簽到
尚未启动（识别图片时自动启动）|Starts automatically when reading images|尚未啟動（辨識圖片時自動啟動）
正在核对最近 7 天的签到记录|Reviewing attendance from the last 7 days|正在核對最近 7 天的簽到記錄
场尚未确认签到成功，请核对记录|sessions are not confirmed. Review the records.|場尚未確認簽到成功，請核對記錄
签到已提交，正在等待网站确认|Submitted; waiting for website confirmation|簽到已提交，正在等待網站確認
请等待当前检查结束再修改身份|Wait for this run to finish before changing your identity.|請等待目前檢查結束再修改身分
门课程，例如 FIT5120|courses, e.g. FIT5120|門課程，例如 FIT5120
存在重复或无法区分的上课场次|Duplicate or ambiguous sessions found.|存在重複或無法區分的上課場次
选择该场次每周上课的星期。|Choose the day of the week for this session.|選擇該場次每週上課的星期。
请填写每个场次的星期和时间|Enter the day and time for every session.|請填寫每個場次的星期和時間
配置文件超过 128 KB|Configuration exceeds 128 KB.|設定檔案超過 128 KB
表单课程、日期或时间不匹配|Form course, date or time does not match.|表單課程、日期或時間不匹配
正在写入 Mac 本地归档|Writing the local Mac archive|正在寫入 Mac 本地歸檔
请等待当前检查结束后再重置|Wait for this run to finish before resetting.|請等待目前檢查結束後再重置
邮件会话缺少最新消息标识|Email thread has no latest-message identifier.|郵件會話缺少最新訊息標識
近期场次已关闭，无法补签|Recent sessions are closed; late check-in is unavailable.|近期場次已關閉，無法補簽
正在签到，请等待本轮结束|Check-in is running. Wait for it to finish.|正在簽到，請等待本輪結束
课程已被移除，请重新配置|This course was removed. Configure it again.|課程已被移除，請重新設定
每周最多设置 14 节课|Up to 14 sessions per week.|每週最多設定 14 節課
请填写每节课的星期和时间|Enter the day and time for each session.|請填寫每節課的星期和時間
已保存记录中有|Saved records contain|已儲存記錄中有
场已过期，无法补签|expired sessions; late check-in is unavailable|場已過期，無法補簽
本次另有|Also checked in this run:|本次另有
本次签到成功|Checked in this run:|本次簽到成功
网站显示已签到|Already checked in on website:|網站顯示已簽到
网站显示|Website reports|網站顯示
本轮已确认|Confirmed this run:|本輪已確認
场签到成功。|successful check-ins.|場簽到成功。
学校邮箱前缀必须是 4 个英文字母加 4 个数字，例如 abcd1234|Student email prefix must be 4 letters followed by 4 digits, e.g. abcd1234.|學校信箱字首必須是 4 個英文字母加 4 個數字，例如 abcd1234
自动检测或手动填写。|Detect automatically or enter manually.|自動偵測或手動填寫。
全部完成|All done|全部完成
每周|Per week|每週
近 7 天共|Sessions in the last 7 days:|近 7 天共
继续查找未完成场次|Searching remaining sessions|繼續查詢未完成場次
源文件|Source file|原始檔
正在清空课程|Clearing courses|正在清空課程
签到链接日期不匹配|Attendance link date mismatch|簽到連結日期不匹配
请输入|Enter|請輸入
请填写有效课程年份|Enter a valid academic year|請填寫有效課程年份
课程使用邮件来源时，请在学校身份中填写学校邮箱|A course uses the email source; enter your school email in the school identity card|課程使用郵件來源時，請在學校身分中填寫學校信箱
请填写学校系统显示的姓名|Enter your name as shown in the school system|請填寫學校系統顯示的姓名
发件人邮箱无效|Invalid sender email|發件人信箱無效
网址无效|Invalid URL|網址無效
课程代码重复|Duplicate course code|課程代碼重複
组别冲突|Conflicting groups|組別衝突
未填写签到码|Code was not entered|未填寫簽到碼
首次安装需运行|For first-time installation, run|首次安裝需執行
文稿 / 签到助手归档|Documents / 签到助手归档|文稿 / 签到助手归档
马莫签到助手|Mamo Check-in|馬莫簽到助手
收好签到码，自动完成对应场次。|Collect attendance codes and check in to matching sessions.|收好簽到碼，自動完成對應場次。
导入个人配置|Import settings|匯入個人設定
导出个人配置|Export settings|匯出個人設定
运行状态|Run status|執行狀態
准备就绪|Ready|準備就緒
尚未开始处理|Not started|尚未開始處理
立即签到|Check in now|立即簽到
保存并立即签到|Save and check in|儲存並立即簽到
正在签到|Checking in|正在簽到
签到设置|Check-in settings|簽到設定
保存全部设置|Save all settings|儲存全部設定
保存设置|Save settings|儲存設定
定时自动签到（可选）|Scheduled check-in (optional)|定時自動簽到（可選）
学校邮箱|Student email|學校信箱
学校系统中的姓名|Name in the attendance system|學校系統中的姓名
签到系统显示的姓名|Name in the attendance system|簽到系統顯示的姓名
填写最上方的姓名|Enter the name shown at the top|填寫最上方的姓名
检查间隔|Check-in interval|檢查間隔
课程年份|Academic year|課程年份
邮件检索关键词|Email search keywords|郵件檢索關鍵詞
更多设置|More settings|更多設定
自动运行中|Auto-run on|自動執行中
已暂停|Paused|已暫停
先完成初始设置：填写姓名并配置课程。|Finish setup first: enter your name and configure courses.|先完成初始設定：填寫姓名並設定課程。
继续完成配置|Continue setup|繼續完成設定
请在签到系统完成登录，课程检测会自动继续。|Sign in to Attendance. Course detection will resume automatically.|請在簽到系統完成登入，課程偵測會自動繼續。
登录尚未完成。请完成登录后点击重新检测课程。|Sign-in is not complete. Sign in, then select Detect courses again.|登入尚未完成。請完成登入後點擊重新偵測課程。
最近 14 天未检测到课程，可稍后重新检测或手动添加。|No courses were found in the last 14 days. Try again later or add a course manually.|最近 14 天未偵測到課程，可稍後重新偵測或手動新增。
请输入签到码。|Enter the check-in code.|請輸入簽到碼。
签到码需为 5 位英文字母或数字，且至少包含一个字母。|Use exactly 5 letters (A-Z) or digits, including at least one letter.|簽到碼需為 5 位英文字母或數字，且至少包含一個字母。
这看起来是时间而非签到码，请核对原始签到码。|This looks like a time rather than a check-in code. Check the original code.|這看起來是時間而非簽到碼，請核對原始簽到碼。
签到成功，有过期场次提醒|Check-in successful; expired sessions noted|簽到成功，有過期場次提醒
检查完成，有过期场次提醒|Check complete; expired sessions noted|檢查完成，有過期場次提醒
仍有场次待处理，请查看签到记录。|Some sessions still need attention. Check the attendance records.|仍有場次待處理，請查看簽到記錄。
已过期场次仅作提醒，无法补签。|Expired sessions are reminders only and cannot be checked in retroactively.|已過期場次僅作提醒，無法補簽。
需要完成网页登录|Sign-in required|需要完成網頁登入
需要网页登录|Sign-in required|需要網頁登入
前往登录|Go to sign-in|前往登入
检测已暂停等待登录，不是系统故障。完成登录后会自动继续。|Waiting for you to sign in, not a system error. Checks will resume automatically after sign-in.|偵測已暫停等待登入，不是系統故障。完成登入後會自動繼續。
完成登录后会自动继续。|Checks will resume automatically after sign-in.|完成登入後會自動繼續。
登录页面已关闭，请重新发起检测。|The sign-in page is closed. Start the check again.|登入頁面已關閉，請重新發起偵測。
正在签到…|Checking in…|正在簽到…
上次检查未完成，请重试|The last check did not finish; please retry|上次檢查未完成，請重試
尚未检查；点击下方按钮立即签到。|Not checked yet; click the button below to check in now.|尚未檢查；點選下方按鈕立即簽到。
暂无课程；点击“更多设置”添加。|No courses yet; click “More settings” to add one.|暫無課程；點選“更多設定”新增。
图片网络请求未完成，请检查网络连接及原页面登录状态|The image request did not complete. Check the network and your sign-in state on the source page.|圖片網路請求未完成，請檢查網路連線及原頁面登入狀態
本轮签到流程已完成|The check-in round is complete.|本輪簽到流程已完成
正在签到：核对最近 7 天的课程|Checking in: reviewing the last 7 days of sessions|正在簽到：核對最近 7 天的課程
尚未检查|Not checked yet|尚未檢查
查看来源|View sources|檢視來源
查看运行日志|View run log|檢視執行日誌
选择签到码来源，只显示并使用对应配置，可多选。多选时先查邮件，再查 Moodle，最后查 Ed。|Pick the code sources for this course; multiple choices allowed. Emails are checked first, then Moodle, then Ed.|選擇簽到碼來源，只顯示並使用對應設定，可多選。多選時先查郵件，再查 Moodle，最後查 Ed。
填写 Moodle 课程、Week 栏目或公告网址，每行一个。三种来源都填时先查 Gmail，再从 Moodle 补齐缺少的场次，最后查 Ed。|Enter Moodle course, week-section or announcement URLs, one per line. With all three sources, Gmail is checked first, then Moodle, then Ed.|填寫 Moodle 課程、Week 欄目或公告網址，每行一個。三種來源都填時先查 Gmail，再從 Moodle 補齊缺少的場次，最後查 Ed。
填写 Ed course_id 或课程网址，例如 37233；粘贴带 discussion 等子地址的网址也可以，会自动提取。注意 Ed 的 course_id 与 Moodle 的不同，不要互填。|Enter the Ed course_id or course URL, e.g. 37233; URLs with discussion or other sub-paths are extracted automatically. Ed course_ids differ from Moodle course_ids — do not swap them.|填寫 Ed course_id 或課程網址，例如 37233；貼上帶 discussion 等子地址的網址也可以，會自動提取。注意 Ed 的 course_id 與 Moodle 的不同，不要互填。
只填写 4 个英文字母加 4 个数字，后缀固定为 @student.monash.edu。学校邮箱只用于核对签到系统登录身份。每门课的邮件来源请在 邮件发件人邮箱中配置。|Only 4 letters plus 4 digits, with the fixed @student.monash.edu suffix. The school email only verifies your sign-in identity; configure each course's email source in the sender field.|只填寫 4 個英文字母加 4 個數字，字尾固定為 @student.monash.edu。學校信箱只用於核對簽到系統登入身分。每門課的郵件來源請在 郵件發件人信箱中設定。
马莫签到助手|Mamo Check-in|馬莫簽到助手
Windows 使用浏览器内置识别，全程在本机完成。|Windows uses the built-in browser OCR, fully on-device.|Windows 使用瀏覽器內建辨識，全程在本機完成。
Mac 使用 Apple Vision 在本机识别。|Mac uses Apple Vision on-device.|Mac 使用 Apple Vision 在本機辨識。
OCR识图方案|OCR method|OCR識圖方案
保存路径|Save locations|儲存路徑
高级设置|Advanced|高階設定
原图与记录保存在|Images and records are saved to|原圖與記錄儲存在
检查识别服务|Check OCR service|檢查辨識服務
Mac 原生图片识别|Mac text recognition|Mac 原生圖片辨識
使用 macOS 原生文字识别（Apple Vision）。|Uses on-device text recognition (Apple Vision).|使用 macOS 原生文字辨識（Apple Vision）。
识别和归档由本机服务完成。|Recognition and archiving run locally.|辨識和歸檔由本機服務完成。
课程来源与课表|Course sources and timetable|課程來源與課表
重新检测课程|Detect courses again|重新偵測課程
清空所有课程|Clear all courses|清空所有課程
添加课程|Add course|新增課程
课程代码|Course code|課程代碼
签到码来源|Code source|簽到碼來源
请选择签到码来源|Select a code source|請選擇簽到碼來源
邮件发件人邮箱|Sender email|郵件發件人信箱
邮件主题中包含|Email subject contains|郵件主題中包含
课程场次|Weekly sessions|課程場次
每周场次|Sessions per week|每週場次
自动检测（无需填写）|Detect automatically|自動偵測（無需填寫）
自动检测|Detect automatically|自動偵測
活动类型|Activity type|活動類型
组别|Group|組別
移除|Remove|移除
收集记录|Attendance records|收集記錄
原图、文字、提交结果|Images, text and attendance results|原圖、文字、提交結果
导出 CSV|Export CSV|匯出 CSV
日期 / 星期 / 时间|Date / day / time|日期 / 星期 / 時間
课程 / 场次|Course / session|課程 / 場次
签到码|Attendance code|簽到碼
状态|Status|狀態
来源 / 详情|Source / details|來源 / 詳情
等待签到码|Waiting for code|等待簽到碼
等待匹配|Waiting for match|等待匹配
已签到|Checked in|已簽到
已过期|Expired|已過期
需要核对|Review required|需要核對
资料不完整|Incomplete details|資料不完整
核对提交结果|Verifying submission|核對提交結果
结果待确认|Confirmation pending|結果待確認
重试复制|Retry copy|重試複製
已复制|Copied|已複製
复制中|Copying|複製中
复制|Copy|複製
复制签到码|Copy attendance code|複製簽到碼
复制中|Copying|複製中
重试|Retry|重試
查看签到系统|View attendance system|檢視簽到系統
查看邮件|View email|檢視郵件
查看 Moodle|View Moodle|檢視 Moodle
网站原已签到，本次无需重复提交|Already checked in on the website; no new submission needed|網站原已簽到，本次無需重複提交
网站原已签到，本次未重复提交|Already checked in on the website; not submitted again|網站原已簽到，本次未重複提交
网站已确认签到|Attendance confirmed by the website|網站已確認簽到
本次签到已获网站确认|This check-in was confirmed by the website|本次簽到已獲網站確認
课程已上，暂未找到签到码；可能尚未发布或当前来源未检索到。可稍后重试。|The session has started, but no code was found. It may not be published yet or may be missing from the selected sources. Retry later.|課程已上，暫未找到簽到碼；可能尚未釋出或目前來源未檢索到。可稍後重試。
网站已关闭该场次录入，无法补签|The website has closed this session; late check-in is unavailable|網站已關閉該場次錄入，無法補簽
课程已超过 7 天，无法补签|This session is over 7 days old; late check-in is unavailable|課程已超過 7 天，無法補簽
课程已超过 7 天，不再补签|This session is over 7 days old; late check-in is unavailable|課程已超過 7 天，不再補簽
签到未完成：存在已过期场次|Check-in incomplete: expired sessions|簽到未完成：存在已過期場次
部分签到成功|Partially checked in|部分簽到成功
签到未全部完成|Check-in incomplete|簽到未全部完成
签到待确认|Check-in needs attention|簽到待確認
签到成功|Check-in successful|簽到成功
课程已全部签到|All sessions already checked in|課程已全部簽到
没有可确认的签到结果|No confirmed check-in results|沒有可確認的簽到結果
核对课程配置|Review course settings|核對課程設定
已核对，关闭|Reviewed, close|已核對，關閉
知道了|Got it|知道了
确认|Confirm|確認
本轮签到流程已完成。|The check-in run has finished.|本輪簽到流程已完成。
本轮签到流程已完成|The check-in run has finished|本輪簽到流程已完成
本轮检查已结束|This run has finished|本輪檢查已結束
本轮已停止，请查看上方原因|This run stopped; see the reason above|本輪已停止，請檢視上方原因
正在准备下一步|Preparing the next step|正在準備下一步
正在处理，请稍候|Processing, please wait|正在處理，請稍候
正在请求|Requesting|正在請求
正在保存|Saving|正在儲存
正在导出|Exporting|正在匯出
设置已保存。|Settings saved.|設定已儲存。
课程检索已保存。|Course search saved.|課程檢索已儲存。
自动检查设置已保存。|Automatic check settings saved.|自動檢查設定已儲存。
正在保存…|Saving…|正在儲存…
个人配置已导入并保存。|Configuration imported and saved.|個人設定已匯入並儲存。
已导出上次保存的个人配置；页面尚未保存的修改未包含在文件中。|Exported saved settings. Unsaved changes on this page are not included.|已匯出上次儲存的個人設定；頁面尚未儲存的修改未包含在檔案中。
个人配置已导出，可通过“导入个人配置”恢复。|Configuration exported. Use “Import configuration” to restore it.|個人設定已匯出，可透過“匯入個人設定”恢復。
正在保存设置，完成后立即签到…|Saving settings, then checking in…|正在儲存設定，完成後立即簽到…
正在请求后台开始签到…|Requesting a check-in run…|正在請求後臺開始簽到…
后台已收到签到请求，正在等待运行状态…|Request accepted; waiting for progress…|後臺已收到簽到請求，正在等待執行狀態…
复制失败，请选中签到码手动复制。|Copy failed. Select the code and copy it manually.|複製失敗，請選中簽到碼手動複製。
签到码已复制。|Attendance code copied.|簽到碼已複製。
导出失败|Export failed|匯出失敗
自动运行已暂停|Scheduled check-in paused|自動執行已暫停
自动运行已开启|Scheduled check-in enabled|自動執行已開啟
尚未开启|Not enabled|尚未開啟
安装识别服务|Install recognition service|安裝辨識服務
填写身份|Enter your details|填寫身分
登录并配置课程|Sign in and configure courses|登入並設定課程
安装 Mac 识别服务|Install Mac recognition service|安裝 Mac 辨識服務
Mac 识别服务说明|About Mac recognition|Mac 辨識服務說明
使用 Apple Vision，识别速度极快、准确率极高，带来最佳识别体验。|Powered by Apple Vision for exceptionally fast, highly accurate recognition and the best experience.|使用 Apple Vision，辨識速度極快、準確率極高，帶來最佳辨識體驗。
打开下载并解压的安装包。|Open the downloaded and extracted package.|開啟下載並解壓的安裝包。
打开解压后的 OCR 包。|Open the extracted OCR package.|開啟解壓後的 OCR 包。
打开解压后的 OCR 包。|Open the extracted OCR package.|開啟解壓後的 OCR 包。
双击|Double-click|雙擊
Install Mac Recognition.command|Install Mac Recognition.command|Install Mac Recognition.command
安装 Mac 识别服务.command|Install Mac Recognition.command|Install Mac Recognition.command
按终端提示安装。|Follow the terminal instructions.|按終端提示安裝。
如果再次提示|If macOS also blocks|如果再次提示
被阻止，请再到|, go to|被阻止，請再到
系统设置 → 隐私与安全性 → 仍要打开|System Settings → Privacy & Security → Open Anyway|系統設定 → 隱私與安全性 → 仍要開啟
系统设置 → 隐私与安全性 → 安全性 → 仍要打开|System Settings → Privacy & Security → Security → Open Anyway|系統設定 → 隱私與安全性 → 安全性 → 仍要開啟
允许这个识别程序。安装命令和识别程序可能需要分别允许。|to allow it. The installer and recognition executable may each need approval.|允許這個辨識程式。安裝命令和辨識程式可能需要分別允許。
回到此页面，等待检测通过，再点击|Return here, wait for verification, then click|回到此頁面，等待偵測通過，再點選
刷新并继续|Reload and continue|重新整理並繼續
回到此页面，等待检测通过，自动进入下一步。|Return here and wait for verification; the next step opens automatically.|回到此頁面，等待偵測通過，自動進入下一步。
回到此页面，等待检测通过，自动进入下一步。|Return here and wait for verification; the next step opens automatically.|回到此頁面，等待偵測通過，自動進入下一步。
上一步|Previous step|上一步
下一步|Next step|下一步
安装步骤|Installation steps|安裝步驟
第1步|Step 1|第1步
第2步|Step 2|第2步
第3步|Step 3|第3步
已在系统设置允许，重新检测|Allowed in System Settings — check again|已在系統設定允許，重新偵測
我已安装，立即检测|Installed — check now|我已安裝，立即偵測
安装成功 · 刷新并继续|Installed — reload and continue|安裝成功 · 重新整理並繼續
提示无法验证开发者、打不开？|blocked the app or cannot verify its developer?|提示無法驗證開發者、打不開？
确认文件来自本项目 Release 后，先尝试打开一次，再进入|After verifying the download is from this project's Release, try opening it once, then go to|確認檔案來自本專案 Release 後，先嘗試開啟一次，再進入
按提示确认。只允许这个文件，不需要关闭系统安全保护。|Follow the prompts. Allow this file only; keep system security enabled.|按提示確認。只允許這個檔案，不需要關閉系統安全保護。
查看 Apple 操作说明|View Apple's instructions|檢視 Apple 操作說明
再次下载安装包|Download the installer again|再次下載安裝包
等待检测识别服务…|Waiting for the recognition service check…|等待偵測辨識服務…
正在确认本机识别服务。|Checking whether the local recognition service is available.|正在確認本機辨識服務。
填写你的学校身份|Enter your school account details|填寫你的學校身分
与学校系统完全一致|Exactly as shown on the attendance website|與學校系統完全一致
登录后自动检测并自动填写|Detect and fill automatically after sign-in|登入後自動偵測並自動填寫
确认，继续|Confirm and continue|確認，繼續
重新检测姓名|Check your name again|重新偵測姓名
学校姓名|School name|學校姓名
登录 Attendance 后自动填写|Filled automatically after signing in to Attendance|登入 Attendance 後自動填寫
登录学校网站，再检测课程|Sign in, then detect your courses|登入學校網站，再偵測課程
课程配置|Course setup|課程設定
正在检测课程，请稍候。|Detecting courses. Please wait.|正在偵測課程，請稍候。
正在读取最近 14 天的课程和课表，请保持签到系统登录；检测期间请勿关闭浏览器页面。|Reading courses and timetables from the last 14 days. Keep Attendance signed in and the browser page open while detection runs.|正在讀取最近 14 天的課程和課表，請保持簽到系統登入；偵測期間請勿關閉瀏覽器頁面。
已检测到课程，请在下方完善课程来源和课表。|Courses detected. Complete the sources and timetable below.|已偵測到課程，請在下方完善課程來源和課表。
未检测到课程，请检查签到系统登录状态后重试，或手动添加课程。|No courses found. Check your Attendance sign-in and retry, or add a course manually.|未偵測到課程，請檢查簽到系統登入狀態後重試，或手動新增課程。
需要修改姓名？|Need to change your name?|需要修改姓名？
请在当前 Chrome 配置文件登录签到系统。点击检测后会生成课表，再为每门课选择邮件或 Moodle 来源。|Sign in to the attendance system in this Chrome profile. Detect your timetable, then choose email or Moodle sources for each course.|請在目前 Chrome 設定檔案登入簽到系統。點選偵測後會生成課表，再為每門課選擇郵件或 Moodle 來源。
打开签到系统并登录|Open attendance system and sign in|開啟簽到系統並登入
登录学校 Gmail|Sign in to school Gmail|登入學校 Gmail
登录 Gmail|Sign in to Gmail|登入 Gmail
登录 Moodle|Sign in to Moodle|登入 Moodle
登录签到系统|Sign in to attendance system|登入簽到系統
已登录，检测课程信息|Signed in — detect courses|已登入，偵測課程資訊
修改姓名或邮箱|Edit name or email|修改姓名或信箱
检测完成后，请在下方核对课程、选择来源并保存，完成后才会显示完整页面。|Review courses below, choose their sources, then save to open the full dashboard.|偵測完成後，請在下方核對課程、選擇來源並儲存，完成後才會顯示完整頁面。
清空所有配置与缓存|Clear all settings and cache|清空所有設定與快取
未通过启动自检。请按提示更新或允许程序，再手动点击重新检测。|did not pass the startup check. Follow the update or approval instructions, then check again.|未通過啟動自檢。請按提示更新或允許程式，再手動點選重新偵測。
尚未连接识别服务。请完成安装；本页每 5 秒自动重试，无需反复刷新。|Recognition service is not connected. Finish installation; this page checks every 5 seconds.|尚未連線辨識服務。請完成安裝；本頁每 5 秒自動重試，無需反覆重新整理。
已检测到识别服务安装成功。请点击下方按钮刷新，继续填写身份。|Recognition service detected. Click below to reload and enter your details.|已偵測到辨識服務安裝成功。請點選下方按鈕重新整理，繼續填寫身分。
识别服务已就绪。|Recognition service is ready.|辨識服務已就緒。
请在系统安全设置中允许识别程序，然后点击“重新检测”。|Allow the recognition executable in your system security settings, then click Check service again.|請在系統安全設定中允許辨識程式，然後點選“重新偵測”。
姓名|Name|姓名
日期待核对|Date needs review|日期待核對
课程待核对|Course needs review|課程待核對
来源标注|from source|來源標註
暂无运行明细|No activity yet|暫無執行明細
暂无可确认的近期场次，请核对课表及签到码来源。|No confirmed recent sessions. Review your timetable and code sources.|暫無可確認的近期場次，請核對課表及簽到碼來源。
请确认课程、日期、星期、时间和组别；未填写课表或未检测到数据，不代表已经签到成功。|Review course, date, day, time and group. A missing timetable or no detected data does not mean attendance succeeded.|請確認課程、日期、星期、時間和組別；未填寫課表或未偵測到資料，不代表已經簽到成功。
请查看运行明细并核对配置。|Review the run details and configuration.|請檢視執行明細並核對設定。
页面|Pages|頁面
消息|Messages|訊息
图片|Images|圖片
缓存|Cache|快取
记录|Records|記錄
跳过|Skipped|跳過
总用时|Elapsed|總用時
当前步骤|Current step|目前步驟
最近检查|Last run|最近檢查
查看当前来源|View current source|檢視目前來源
查看来源|View source|檢視來源
签到流程完成|Check-in run finished|簽到流程完成
签到结束|Check-in run ended|簽到結束
星期一|Monday|星期一
星期二|Tuesday|星期二
星期三|Wednesday|星期三
星期四|Thursday|星期四
星期五|Friday|星期五
星期六|Saturday|星期六
星期日|Sunday|星期日
星期|Day|星期
时间|Time|時間
星期几|Day of week|星期幾
每 1 天|Every day|每 1 天
每 3 天|Every 3 days|每 3 天
每 5 天|Every 5 days|每 5 天
每 7 天|Every 7 days|每 7 天
邮件和 Moodle|Email and Moodle|郵件和 Moodle
邮件|Email|郵件
例如|e.g.|例如
默认使用课程代码|Defaults to course code|預設使用課程代碼
每行一个网址，最多 3 个|One URL per line, up to 3|每行一個網址，最多 3 個
课程、Week 栏目或公告网址|course, weekly section or announcement URLs|課程、Week 欄目或公告網址
默认无需填写：先从签到页面读取最近 14 天的场次并保存成固定周课表，再查找待签到场次的签到码。|Detect recent sessions and save a recurring timetable before searching for codes.|預設無需填寫：先從簽到頁面讀取最近 14 天的場次並儲存成固定周課表，再查詢待簽到場次的簽到碼。
课表按马来西亚时间（UTC+8）运行。默认自动读取签到页面的待签到场次，无需填写每周课表。|Timetables use Malaysia time (UTC+8). Pending sessions are detected automatically.|課表按馬來西亞時間（UTC+8）執行。預設自動讀取簽到頁面的待簽到場次，無需填寫每週課表。
自动读取最近 14 天的课程和周课表，再选择签到码来源。|Read courses and weekly sessions from the last 14 days, then choose code sources.|自動讀取最近 14 天的課程和周課表，再選擇簽到碼來源。
立即签到可单独使用，无需开启自动运行。开启并保存自动运行后可关闭本页面，Chrome 会在后台定时检查。请保持 Chrome 运行、电脑唤醒并登录学校账号。|Check in now works independently. Enable and save scheduled check-in to run with this page closed. Keep Chrome running, your computer awake and your school account signed in.|立即簽到可單獨使用，無需開啟自動執行。開啟並儲存自動執行後可關閉本頁面，Chrome 會在後臺定時檢查。請保持 Chrome 執行、電腦喚醒並登入學校帳號。
课程中的签到码会按场次整理在这里。|Your attendance sessions and codes will appear here.|課程中的簽到碼會按場次整理在這裡。
在本机识别与归档，无需额外 AI 账号。|On-device recognition and archiving. No extra AI account required.|在本機辨識與歸檔，無需額外 AI 帳號。
确定清空所有课程、来源、课表及收集记录吗？此操作不可撤销，自动运行会暂停。本机已归档的图片文件不受影响。|Clear all courses, sources, timetables and attendance records? This cannot be undone. Scheduled runs will pause; archived images remain on this Mac.|確定清空所有課程、來源、課表及收集記錄嗎？此操作不可撤銷，自動執行會暫停。本機已歸檔的圖片檔案不受影響。
确定清空助手的姓名、邮箱、课程、签到记录和浏览器内缓存吗？此操作不可撤销，自动运行会停止。|Clear your name, email, courses, attendance records and app cache? This cannot be undone. Scheduled runs will stop.|確定清空助手的姓名、信箱、課程、簽到記錄和瀏覽器內快取嗎？此操作不可撤銷，自動執行會停止。
重新检测最近 14 天的课程和课表？检测结果会填入编辑区，保存后替换原课表。|Detect courses from the last 14 days again? Review and save the results to replace your timetable.|重新偵測最近 14 天的課程和課表？偵測結果會填入編輯區，儲存後替換原課表。
是否检测课程信息？确认后将打开已登录的签到页面，读取最近 14 天的课程并生成可编辑课表。此步骤不会提交签到。|Detect courses now? The signed-in attendance page will open to read the last 14 days and create an editable timetable. This does not submit attendance.|是否偵測課程資訊？確認後將開啟已登入的簽到頁面，讀取最近 14 天的課程並生成可編輯課表。此步驟不會提交簽到。
未开始|Not started|未開始
本周|This week|本週
上周|Last week|上週
已提前找到签到码，开课后自动提交|Code found early; it is submitted automatically after class starts|已提前找到簽到碼，開課後自動提交
开课前暂不搜索签到码|No code is searched before class starts|開課前暫不搜尋簽到碼
完整运行日志|Full run log|完整執行日誌
下载日志|Download log|下載日誌
运行日志已导出。|Run log exported.|執行日誌已匯出。
查看 Ed|Open Ed|檢視 Ed
Ed course_id|Ed course_id|Ed course_id
例如 37233，也可粘贴完整课程网址|e.g. 37233, or paste the full course URL|例如 37233，也可貼上完整課程網址
打开 Ed 查看课程网址|Open Ed to find the course URL|開啟 Ed 檢視課程網址
打开 Ed 后进入对应课程，网址中 au/courses/ 后面的数字就是 Ed course_id；粘贴带 discussion 等子地址的课程网址也会自动提取。|Open your course in Ed. The number after au/courses/ in the URL is the Ed course_id; URLs with discussion or other sub-paths are extracted automatically.|開啟 Ed 後進入對應課程，網址中 au/courses/ 後面的數字就是 Ed course_id；貼上帶 discussion 等子地址的課程網址也會自動提取。
注意 Ed 的 course_id 和 Moodle 的不一样，不要互填。|Note: Ed course_ids differ from Moodle course_ids — do not swap them.|注意 Ed 的 course_id 和 Moodle 的不一樣，不要互填。
打开 Ed 课程，网址 au/courses/ 后面的数字就是 Ed course_id；填数字或粘贴完整网址都可以。注意 Ed 的 course_id 和 Moodle 的不一样，不要互填。|Open your Ed course. The number after au/courses/ in the URL is the Ed course_id; enter the number or paste the full URL. Ed course_ids differ from Moodle course_ids — do not swap them.|開啟 Ed 課程，網址 au/courses/ 後面的數字就是 Ed course_id；填數字或貼上完整網址都可以。注意 Ed 的 course_id 和 Moodle 的不一樣，不要互填。
邮件和 Ed|Email and Ed|郵件和 Ed
Moodle 和 Ed|Moodle and Ed|Moodle 和 Ed
邮件、Moodle 和 Ed|Email, Moodle and Ed|郵件、Moodle 和 Ed
`.trim().split('\n').map(line=>line.split('|')).filter(([source,target])=>source&&target);
const sortedEntries=[...entries].sort((a,b)=>b[0].length-a[0].length);
const exactTranslations=new Map(entries);
const reverseTranslations=new Map(entries.flatMap(([source,en,tw])=>[[en,source],...(tw?[[tw,source]]:[])]));
const traditionalTranslations=new Map(entries.filter(([, ,target])=>target).map(([source,,target])=>[source,target]));
let language='en';
export function detectLanguage(value){const locale=String(value||'').replaceAll('_','-');return /^zh-(?:TW|HK|MO|Hant)(?:-|$)/i.test(locale)?'zh_TW':/^zh(?:-|$)/i.test(locale)?'zh':'en';}
export function setLanguage(value){language=detectLanguage(value);}
export function translate(text,lang=language){
 lang=detectLanguage(lang);
 const rule=ruleText(text,lang);if(rule!==undefined)return rule;
 if(['Install Mac Recognition.command','安装 Mac 识别服务.command','Remove Mac Recognition.command','卸载 Mac 识别服务.command'].includes(text))return text;
 text=reverseTranslations.get(String(text))||text;
 if(exactTranslations.has(text))return lang==='zh'?text:lang==='zh_TW'?traditionalTranslations.get(text):exactTranslations.get(text);
 const dynamic=dynamicText(String(text),lang,translate);if(dynamic!==undefined)return dynamic;
 if(lang==='zh'||lang==='zh_TW')return lang==='zh_TW'?(traditionalTranslations.get(text)||text):text;
 let result=String(text);
 const patterns=[
  [/^已检测到 (\d+) 门课程。请在下方完善课程来源和课表。$/g,(_,count)=>`${count} course${Number(count)===1?'':'s'} detected. Complete the sources and timetable below.`],
  [/^(.*?) 课表检查失败：(.+?) 需要登录。请打开 \2，完成学校账号登录及验证；请勿关闭浏览器页面，再返回助手重试。本轮尚未完成该网站的检查。$/g,(_,prefix,site)=>`${prefix} timetable check failed: ${site} requires sign-in. Open ${site}, complete school sign-in and verification; keep the browser page open, then return to Assistant and retry. This site's check is not complete.`],
  [/^(.+?) 需要登录。请打开 \1，完成学校账号登录及验证；请勿关闭浏览器页面，再返回助手重试。本轮尚未完成该网站的检查。$/g,(_,site)=>`${site} requires sign-in. Open ${site}, complete school sign-in and verification; keep the browser page open, then return to Assistant and retry. This site's check is not complete.`],
  [/^有 (\d+) 场等待签到码，暂未找到；可能尚未发布或当前来源未检索到，可稍后重试$/g,(_,count)=>`${count} session${Number(count)===1?'':'s'} ${Number(count)===1?'is':'are'} waiting for codes. They may not be published yet or were not found in the selected sources. Retry later.`],
  [/已自动选择 (.*?)，正在等待 Gmail；如需密码或验证，请完成后等待自动检测。/g,'Selected $1; waiting for Gmail. Complete any password or verification prompt to continue.'],
  [/请在 Gmail 登录 (.*?)，完成验证后会自动检测。/g,'Sign in to Gmail as $1. Verification will continue automatically.'],
  [/检测中 · 剩余 (\d+) 秒 · 请勿关闭浏览器页面/g,'Checking · $1 seconds remaining · Do not close the browser page'],
  [/请勿关闭新打开的 Gmail 标签页，完成登录后会自动检测 (.*?)。/g,'Keep the new Gmail tab open. Verification will continue after signing in as $1.'],
  [/请在新打开的 Gmail 标签页登录 (.*?)，完成验证后会自动检测；请勿关闭页面。/g,'Sign in as $1 in the new Gmail tab. Verification will continue; keep the page open.'],
  [/尚未确认 Gmail 账号，请在此标签页登录 (.*?) 后等待检测；请勿关闭页面。/g,'Gmail account not confirmed. Sign in as $1 in this tab and keep the page open while verification continues.'],
  [/请在新打开的 (.*?) 标签页完成学校账号登录，检测会自动继续；请勿关闭页面。/g,'Sign in to your school account in the new $1 tab. Verification will continue; keep the page open.'],
  [/当前 Gmail 是 (.*?)，正在自动切换到 (.*?)；尚未读取邮件。/g,'Gmail is signed in as $1; switching to $2. No messages have been read.'],
  [/当前 Gmail 是 (.*?)，目标邮箱为 (.*?)；请完成登录，助手将继续检测，尚未读取邮件。/g,'Gmail is signed in as $1; the target is $2. Complete sign-in to continue. No messages have been read.'],
  [/尚未确认 Gmail 账号，请登录 (.*?) 后等待检测。/g,'Gmail account not confirmed. Sign in as $1 and wait for verification.'],
  [/正在切换 Gmail 到 (.*?)，完成登录后将自动继续/g,'Switching Gmail to $1; processing resumes after sign-in'],
  [/Gmail 列表读取完成（([\d.]+) 秒），(\d+) 个待检查会话/g,'Gmail list loaded ($1 seconds), $2 threads to check'],
  [/网站签到状态读取完成（(\d+) 场）/g,'Website attendance loaded ($1 sessions)'],
  [/核对 (?=[A-Z]{2,10}\d)/g,'Checking '],
  [/正在核对 Gmail 目标账号：/g,'Verifying Gmail account: '],
  [/Gmail 账号已确认，正在搜索最近 7 天的邮件/g,'Gmail account verified; searching the last 7 days'],
  [/检查邮件会话 (\d+)\/(\d+)（最多等待 (\d+) 秒）/g,'Checking email thread $1/$2 (up to $3 seconds)'],
  [/已读取 Moodle (.*?)（([\d.]+) 秒）/g,'Read Moodle $1 ($2 seconds)'],
  [/正在加载 Ed 页面（最多等待 (\d+) 秒）/g,'Loading Ed page (up to $1 seconds)'],
  [/已读取 Ed 课程页面（(.*?)）/g,'Read Ed course page ($1)'],
  [/检查 Ed 讨论帖 (\d+)\/(\d+)/g,'Checking Ed thread $1/$2'],
  [/本轮 Ed 检查达到时间上限，其余课程下轮继续/g,"Ed checks reached this round's time limit; remaining courses continue next round"],
  [/自动读取到 (\d+) 场近期待签到课程/g,'Detected $1 recent pending sessions'],
  [/已保存 (\d+) 条文字记录/g,'Saved $1 text records'],
  [/正在下载第 (\d+)\/(\d+) 张图片（最多 (\d+) 秒）/g,'Downloading image $1/$2 (up to $3 seconds)'],
  [/第 (\d+)\/(\d+) 张图片已识别并保存/g,'Image $1/$2 recognized and saved'],
  [/第 (\d+)\/(\d+) 张图片失败：/g,'Image $1/$2 failed: '],
  [/正在核对并填写 /g,'Checking and entering '],
  [/准备检查最近 7 天的签到/g,'Preparing attendance checks for the last 7 days'],
  [/正在读取签到文字和图片/g,'Reading attendance text and images'],
  [/跳过超过 7 天的旧内容/g,'Skipping content older than 7 days'],
  [/该课程所需场次已找到，跳过剩余图片/g,'Required sessions found; skipping remaining images'],
  [/页面已被关闭，无法执行签到/g,'page was closed; unable to check in'],
  [/网站登录未完成，签到码来源尚未检查完整。请先登录，再重试。/g,'Sign-in is incomplete; code sources have not all been checked. Sign in and retry.'],
  [/^重新登录并读取姓名$/g,'Sign in and read name again'],
  [/^重新登录并检测$/g,'Sign in and verify again'],
  [/^暂未检测到，(\d+) 秒后自动检查$/g,'Not detected yet. Checking again in $1 seconds.'],
  [/^签到成功 (\d+) 场$/g,(_,n)=>`${n} session${Number(n)===1?'':'s'} checked in`],
  [/^(\d+) 场等待签到码$/g,(_,n)=>`${n} waiting for codes`],
  [/^(\d+) 场已过期$/g,(_,n)=>`${n} expired`],
  [/^(\d+) 场待核对$/g,(_,n)=>`${n} to review`],
  [/^本轮已确认 (\d+) 场签到成功。$/g,(_,n)=>`Confirmed ${n} check-in${Number(n)===1?'':'s'} this round.`],
  [/^等待 Attendance 登录/g,'Waiting for Attendance sign-in'],
  [/^签到未全部完成：/g,'Not all sessions are checked in: '],
  [/^(\d+) 项处理失败：/g,(_,n)=>`${n} item${Number(n)===1?'':'s'} failed: `],
  [/^有 (\d+) 场等待签到码/g,'$1 sessions are waiting for codes'],
  [/^后台未返回结果，请从扩展图标重新打开$/g,'The background did not respond; reopen the popup shortly.'],
  [/^检测成功$/g,'Check succeeded']
 ];
 for(const [pattern,replacement] of patterns)result=result.replace(pattern,replacement);
 for(const [zh,en] of sortedEntries)result=result.split(zh).join(en);
 return result.replace(/每周\s*(\d+)\s*场/g,'$1 sessions per week').replace(/(\d+)\s*场/g,'$1 sessions').replace(/(\d+)\s*秒前更新/g,'Updated $1 seconds ago').replace(/最多\s*(\d+)\s*秒/g,'up to $1 seconds').replace(/，\s*/g,', ').replace(/。\s*/g,'. ').replace(/；\s*/g,'; ').replace(/：\s*/g,': ').replace(/！/g,'!').replace(/？/g,'?').replace(/[“”]/g,'"').replace(/[（）]/g,match=>match==='（'?'(' : ')');
}
export function installLanguageUI(doc=document){
 const picker=doc.createElement('select');picker.id='language';picker.hidden=true;picker.setAttribute('aria-label','Language / 语言');picker.innerHTML='<option value="auto">Language / 语言</option><option value="en">English</option><option value="zh">中文</option><option value="zh_TW">繁體中文</option>';
 const header=doc.querySelector('header'),tools=doc.createElement('div'),languageAction=doc.createElement('div');tools.className='header-tools';languageAction.className='language-action';
 languageAction.innerHTML='<button id="language-toggle" type="button" class="header-icon-button language-icon-button" aria-label="语言" title="语言" aria-expanded="false" aria-controls="language-menu"><span class="header-control-icon language-icon" aria-hidden="true"></span></button><div id="language-menu" class="personal-settings-menu" hidden><strong class="header-menu-title">语言</strong><button type="button" class="subtle" data-language="auto">跟随系统</button><button type="button" class="subtle" data-language="en" data-i18n-literal>English</button><button type="button" class="subtle" data-language="zh" data-i18n-literal>简体中文</button><button type="button" class="subtle" data-language="zh_TW" data-i18n-literal>繁體中文</button></div>';
 const actions=header.querySelector('.header-actions'),mode=actions?.querySelector('#mode');if(mode)tools.append(mode);tools.append(languageAction);if(actions)tools.append(actions);tools.append(picker);header.append(tools);
 const languageMenu=installHeaderMenu(doc,{triggerId:'language-toggle',panelId:'language-menu'});
 for(const item of languageAction.querySelectorAll('[data-language]'))item.onclick=()=>{picker.value=item.dataset.language;picker.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));};
 let choice='auto';try{choice=doc.defaultView.localStorage.getItem('mamo-language')||'auto';}catch{}
 picker.value=['en','zh','zh_TW'].includes(choice)?choice:'auto';
 const remember=()=>{try{const pending=globalThis.chrome?.storage?.local?.set({uiLanguage:picker.value});pending?.catch?.(()=>{});}catch{}};
 const texts=new WeakMap(),attrs=new WeakMap();
 function apply(){
  const browserLanguage=globalThis.chrome?.i18n?.getUILanguage?.()||doc.defaultView.navigator.language;
  language=picker.value==='auto'?detectLanguage(browserLanguage):picker.value;const htmlLang=language==='zh'?'zh-CN':language==='zh_TW'?'zh-TW':'en';if(doc.documentElement.lang!==htmlLang)doc.documentElement.lang=htmlLang;
  for(const item of languageAction.querySelectorAll('[data-language]'))item.setAttribute('aria-pressed',String(item.dataset.language===picker.value));
  for(const node of doc.querySelectorAll('[data-rule-name]')){
   const value=node.dataset[language==='zh'?'nameZh':language==='zh_TW'?'nameTw':'nameEn']+(node.dataset.nameSuffix||'');
   if(node.textContent!==value)node.textContent=value;
  }
  const walker=doc.createTreeWalker(doc.documentElement,4);let node;
  while(node=walker.nextNode()){
   if(node.parentElement?.closest('script,style,#language,#setup-tour,[data-rule-literal],[data-i18n-literal]'))continue;
   const old=texts.get(node),original=node.parentElement?.dataset.i18nKey||(old&&node.nodeValue===old.output?old.original:node.nodeValue),output=translate(original);texts.set(node,{original,output});if(node.nodeValue!==output)node.nodeValue=output;
  }
  for(const el of doc.querySelectorAll('[placeholder],[title],[aria-label]'))for(const key of ['placeholder','title','aria-label']){
   if(!el.hasAttribute(key)||el===picker||el.closest('[data-rule-literal],[data-i18n-literal]'))continue;const value=el.getAttribute(key),map=attrs.get(el)||{},old=map[key],original=old&&value===old.output?old.original:value,output=translate(original);map[key]={original,output};attrs.set(el,map);if(value!==output)el.setAttribute(key,output);
  }
 }
 const observer=new doc.defaultView.MutationObserver(()=>{observer.disconnect();apply();observe();});
 const observe=()=>observer.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
 picker.onchange=()=>{try{doc.defaultView.localStorage.setItem('mamo-language',picker.value);}catch{}remember();observer.disconnect();apply();observe();};remember();apply();observe();return {apply,disconnect:()=>{observer.disconnect();languageMenu.dispose();}};
}
