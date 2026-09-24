// Placeholders are values, not prose: never character-convert names or URLs.
const rows=`
有 {0} 条记录未读取到对应网站场次，不能确认历史签到状态。|No matching website session was observed for {0} records; historical attendance cannot be confirmed.|有 {0} 條記錄未讀取到對應網站場次，不能確認歷史簽到狀態。
第 {0}/{1} 张图片失败（总计已发现 {2} 张）：{3:message}|Image {0}/{1} failed ({2} images found in total): {3:message}|第 {0}/{1} 張圖片失敗（總計已發現 {2} 張）：{3:message}
正在下载第 {0}/{1} 张图片（总计已发现 {2} 张，最多 {3} 秒）|Downloading image {0}/{1} ({2} images found in total, up to {3} seconds)|正在下載第 {0}/{1} 張圖片（總計已發現 {2} 張，最多 {3} 秒）
第 {0}/{1} 张图片已识别并保存（总计已发现 {2} 张）|Image {0}/{1} recognized and saved ({2} images found in total)|第 {0}/{1} 張圖片已辨識並儲存（總計已發現 {2} 張）
{0:number} 场|{0:number} sessions|{0:number} 場
已检测到 1 门课程。请在下方完善课程来源和课表。|1 course detected. Complete the sources and timetable below.|已偵測到 1 門課程。請在下方完善課程來源和課表。
已检测到 {0} 门课程。请在下方完善课程来源和课表。|{0} courses detected. Complete the sources and timetable below.|已偵測到 {0} 門課程。請在下方完善課程來源和課表。
{0} 课表检查失败：{1} 需要登录。请打开 {1}，完成学校账号登录及验证；请勿关闭浏览器页面，再返回助手重试。本轮尚未完成该网站的检查。|{0} timetable check failed: {1} requires sign-in. Open {1}, complete school sign-in and verification; keep the browser page open, then return to Assistant and retry. This site's check is not complete.|{0} 課表檢查失敗：{1} 需要登入。請開啟 {1}，完成學校帳號登入及驗證；請勿關閉瀏覽器頁面，再返回助手重試。本輪尚未完成該網站的檢查。
{0} 需要登录。请打开 {0}，完成学校账号登录及验证；请勿关闭浏览器页面，再返回助手重试。本轮尚未完成该网站的检查。|{0} requires sign-in. Open {0}, complete school sign-in and verification; keep the browser page open, then return to Assistant and retry. This site's check is not complete.|{0} 需要登入。請開啟 {0}，完成學校帳號登入及驗證；請勿關閉瀏覽器頁面，再返回助手重試。本輪尚未完成該網站的檢查。
有 1 场等待签到码，暂未找到；可能尚未发布或当前来源未检索到，可稍后重试|1 session is waiting for codes. They may not be published yet or were not found in the selected sources. Retry later.|有 1 場等待簽到碼，暫未找到；可能尚未發布或目前來源未搜尋到，可稍後重試
有 {0} 场等待签到码，暂未找到；可能尚未发布或当前来源未检索到，可稍后重试|{0} sessions are waiting for codes. They may not be published yet or were not found in the selected sources. Retry later.|有 {0} 場等待簽到碼，暫未找到；可能尚未發布或目前來源未搜尋到，可稍後重試
已自动选择 {0}，正在等待 Gmail；如需密码或验证，请完成后等待自动检测。|Selected {0}; waiting for Gmail. Complete any password or verification prompt to continue.|已自動選擇 {0}，正在等待 Gmail；如需密碼或驗證，請完成後等待自動偵測。
请在 Gmail 登录 {0}，完成验证后会自动检测。|Sign in to Gmail as {0}. Verification will continue automatically.|請在 Gmail 登入 {0}，完成驗證後會自動偵測。
检测中 · 剩余 {0} 秒 · 请勿关闭浏览器页面|Checking · {0} seconds remaining · Do not close the browser page|偵測中 · 剩餘 {0} 秒 · 請勿關閉瀏覽器頁面
请勿关闭新打开的 Gmail 标签页，完成登录后会自动检测 {0}。|Keep the new Gmail tab open. Verification will continue after signing in as {0}.|請勿關閉新開啟的 Gmail 分頁，完成登入後會自動偵測 {0}。
请在新打开的 Gmail 标签页登录 {0}，完成验证后会自动检测；请勿关闭页面。|Sign in as {0} in the new Gmail tab. Verification will continue; keep the page open.|請在新開啟的 Gmail 分頁登入 {0}，完成驗證後會自動偵測；請勿關閉頁面。
尚未确认 Gmail 账号，请在此标签页登录 {0} 后等待检测；请勿关闭页面。|Gmail account not confirmed. Sign in as {0} in this tab and keep the page open while verification continues.|尚未確認 Gmail 帳號，請在此分頁登入 {0} 後等待偵測；請勿關閉頁面。
请在新打开的 {0:message} 标签页完成学校账号登录，检测会自动继续；请勿关闭页面。|Sign in to your school account in the new {0:message} tab. Verification will continue; keep the page open.|請在新開啟的 {0:message} 分頁完成學校帳號登入，偵測會自動繼續；請勿關閉頁面。
当前 Gmail 是 {0}，正在自动切换到 {1}；尚未读取邮件。|Gmail is signed in as {0}; switching to {1}. No messages have been read.|目前 Gmail 是 {0}，正在自動切換到 {1}；尚未讀取郵件。
当前 Gmail 是 {0}，目标邮箱为 {1}；请完成登录，助手将继续检测，尚未读取邮件。|Gmail is signed in as {0}; the target is {1}. Complete sign-in to continue. No messages have been read.|目前 Gmail 是 {0}，目標信箱為 {1}；請完成登入，助手將繼續偵測，尚未讀取郵件。
尚未确认 Gmail 账号，请登录 {0} 后等待检测。|Gmail account not confirmed. Sign in as {0} and wait for verification.|尚未確認 Gmail 帳號，請登入 {0} 後等待偵測。
正在切换 Gmail 到 {0}，完成登录后将自动继续|Switching Gmail to {0}; processing resumes after sign-in|正在切換 Gmail 到 {0}，完成登入後將自動繼續
Gmail 列表读取完成（{0} 秒），{1} 个待检查会话|Gmail list loaded ({0} seconds), {1} threads to check|Gmail 清單讀取完成（{0} 秒），{1} 個待檢查對話
核对 {0}|Checking {0}|核對 {0}
正在核对 Gmail 目标账号：{0}|Verifying Gmail account: {0}|正在核對 Gmail 目標帳號：{0}
检查邮件会话 {0}/{1}（最多等待 {2} 秒）|Checking email thread {0}/{1} (up to {2} seconds)|檢查郵件對話 {0}/{1}（最多等待 {2} 秒）
已读取 Moodle {0}（{1} 秒）|Read Moodle {0} ({1} seconds)|已讀取 Moodle {0}（{1} 秒）
正在加载 Ed 页面（最多等待 {0} 秒）|Loading Ed page (up to {0} seconds)|正在載入 Ed 頁面（最多等待 {0} 秒）
已读取 Ed 课程页面（{0}）|Read Ed course page ({0})|已讀取 Ed 課程頁面（{0}）
检查 Ed 讨论帖 {0}/{1}|Checking Ed thread {0}/{1}|檢查 Ed 討論串 {0}/{1}
自动读取到 {0} 场近期待签到课程|Detected {0} recent pending sessions|自動讀取到 {0} 場近期待簽到課程
已保存 {0} 条文字记录|Saved {0} text records|已儲存 {0} 筆文字記錄
正在下载第 {0}/{1} 张图片（最多 {2} 秒）|Downloading image {0}/{1} (up to {2} seconds)|正在下載第 {0}/{1} 張圖片（最多 {2} 秒）
第 {0}/{1} 张图片已识别并保存|Image {0}/{1} recognized and saved|第 {0}/{1} 張圖片已辨識並儲存
第 {0}/{1} 张图片失败：{2:message}|Image {0}/{1} failed: {2:message}|第 {0}/{1} 張圖片失敗：{2:message}
正在核对并填写 {0}|Checking and entering {0}|正在核對並填寫 {0}
暂未检测到，{0} 秒后自动检查|Not detected yet. Checking again in {0} seconds.|暫未偵測到，{0} 秒後自動檢查
签到成功 1 场|1 session checked in|簽到成功 1 場
签到成功 {0} 场|{0} sessions checked in|簽到成功 {0} 場
{0} 场等待签到码|{0} waiting for codes|{0} 場等待簽到碼
{0} 场已过期|{0} expired|{0} 場已過期
{0} 场待核对|{0} to review|{0} 場待核對
本轮已确认 1 场签到成功。|Confirmed 1 check-in this round.|本輪已確認 1 場簽到成功。
本轮已确认 {0} 场签到成功。|Confirmed {0} check-ins this round.|本輪已確認 {0} 場簽到成功。
等待 Attendance 登录{0}|Waiting for Attendance sign-in{0}|等待 Attendance 登入{0}
签到未全部完成：{0:message}|Not all sessions are checked in: {0:message}|簽到未全部完成：{0:message}
有 {0} 场等待签到码|{0} sessions are waiting for codes|有 {0} 場等待簽到碼
每周 {0} 场|{0} sessions per week|每週 {0} 場
最多 {0} 秒|up to {0} seconds|最多 {0} 秒
正在检测 {0} · 剩余 {1} 秒|Checking {0} · {1}s remaining|正在偵測 {0} · 剩餘 {1} 秒
{0}: 登录检测超时，请完成登录后重新检测。|{0}: Sign-in verification timed out. Complete sign-in and check again.|{0}：登入偵測逾時，請完成登入後重新偵測。
[LOGIN_REQUIRED] {0} 需要登录，请完成学校账号登录及验证后重试|[LOGIN_REQUIRED] {0} requires sign-in. Complete school sign-in and verification, then retry.|[LOGIN_REQUIRED] {0} 需要登入，請完成學校帳號登入及驗證後重試
{0}。请在同一个 Chrome 配置文件打开 {1} 并完成登录，确认学校邮箱和姓名与设置一致，再返回助手重试。|{0}. Open {1} in the same Chrome profile and sign in. Check that your email and name match your settings, then retry.|{0}。請在同一個 Chrome 設定檔開啟 {1} 並完成登入，確認學校信箱和姓名與設定一致，再返回助手重試。
[LOGIN_REQUIRED] Gmail 尚未登录目标邮箱 {0}|[LOGIN_REQUIRED] Gmail is not signed in to {0}|[LOGIN_REQUIRED] Gmail 尚未登入目標信箱 {0}
网站签到状态读取完成（{0} 场）|Website attendance loaded ({0} sessions)|網站簽到狀態讀取完成（{0} 場）
{0} 网站待签到场次与已保存课表不一致，请核对或重新检测课程|{0}: Website sessions differ from the saved timetable. Review or detect courses again.|{0} 網站待簽到場次與已儲存課表不一致，請核對或重新偵測課程
{0} 自动读取到 {1} 场近期待签到课程{2}|{0}: Detected {1} recent pending sessions{2}|{0} 自動讀取到 {1} 場近期待簽到課程{2}
{0} 近 7 天共 {1} 场，继续查找未完成场次|{0}: {1} sessions in the last 7 days. Searching for unfinished sessions.|{0} 近 7 天共 {1} 場，繼續查詢未完成場次
{0} 课表场次已完成或已取得可用码，跳过来源扫描|{0}: Sessions are complete or have usable codes. Skipping source scanning.|{0} 課表場次已完成或已取得可用碼，略過來源掃描
1 项处理失败：{0:message}|1 item failed: {0:message}|1 項處理失敗：{0:message}
{0} 项处理失败：{1:message}|{0} items failed: {1:message}|{0} 項處理失敗：{1:message}
{0} 条记录需要核对|{0} records need review|{0} 筆記錄需要核對
已保存记录中有 {0} 场已过期，无法补签{1:message}|{0} saved sessions expired and cannot be checked in{1:message}|已儲存記錄中有 {0} 場已過期，無法補簽{1:message}
；本次另有 {0} 场签到成功|; {0} other sessions checked in this run|；本次另有 {0} 場簽到成功
有 {0} 场尚未确认签到成功，请核对记录{1:message}|{0} sessions are unconfirmed. Review the records{1:message}|有 {0} 場尚未確認簽到成功，請核對記錄{1:message}
本次签到成功 {0} 场{1:message}|Checked in to {0} sessions this run{1:message}|本次簽到成功 {0} 場{1:message}
；网站显示已签到 {0} 场|; the website shows {0} sessions attended|；網站顯示已簽到 {0} 場
网站显示 {0} 场已签到，本次无需重复签到或查找签到码|The website shows {0} sessions attended. No duplicate check-ins or code search are needed.|網站顯示 {0} 場已簽到，本次無需重複簽到或查詢簽到碼
{0} 信息不完整、组别冲突或近 14 天没有场次，请核对课表|{0}: Incomplete details, conflicting groups or no sessions in the last 14 days. Review the timetable.|{0} 資訊不完整、組別衝突或近 14 天沒有場次，請核對課表
第{0}步|Step {0}|第{0}步
同一行包含多个{0}|Multiple {0} values in the same row|同一行包含多個{0}
[LOGIN_REQUIRED] Gmail 当前账号是 {0}，目标账号是 {1}。请切换或登录目标邮箱后重试；尚未搜索邮件。|[LOGIN_REQUIRED] Gmail is signed in as {0}, but {1} is required. Switch accounts and retry. No mail has been searched.|[LOGIN_REQUIRED] Gmail 目前帳號是 {0}，目標帳號是 {1}。請切換或登入目標信箱後重試；尚未搜尋郵件。
[LOGIN_REQUIRED] Gmail 当前账号是 {0}，目标账号是 {1}。请切换到目标邮箱后重试；未读取邮件|[LOGIN_REQUIRED] Gmail is signed in as {0}, but {1} is required. Switch accounts and retry. No mail has been read.|[LOGIN_REQUIRED] Gmail 目前帳號是 {0}，目標帳號是 {1}。請切換到目標信箱後重試；未讀取郵件
图片下载失败（HTTP {0}），请检查原页面登录和网络状态|Image download failed (HTTP {0}). Check the original page sign-in and network.|圖片下載失敗（HTTP {0}），請檢查原頁面登入和網路狀態
{0:message}；原页面读取也未完成，请确认该页面仍已登录并可访问图片|{0:message}; reading the original page also failed. Check that it is still signed in and the image is accessible.|{0:message}；原頁面讀取也未完成，請確認該頁面仍已登入並可存取圖片
{0}响应超时（{1} 秒）|{0} response timed out ({1} seconds)|{0}回應逾時（{1} 秒）
{0} 页面已被关闭，无法执行签到|{0} page was closed; unable to check in|{0} 頁面已被關閉，無法執行簽到
（{0} 秒）|({0} seconds)|（{0} 秒）
图片识别超时（{0} 秒，{1}）|Image recognition timed out ({0} seconds, {1})|圖片辨識逾時（{0} 秒，{1}）
图片解码超时（{0} 字节，{1}），请稍后重试|Image decoding timed out ({0} bytes, {1}). Retry later.|圖片解碼逾時（{0} 位元組，{1}），請稍後重試
已检测到 1 门课程。请在下方完善课程来源和课表。{0}|1 course detected. Complete the sources and timetable below.{0}|已偵測到 1 門課程。請在下方完善課程來源和課表。{0}
已检测到 {0} 门课程。请在下方完善课程来源和课表。{1}|{0} courses detected. Complete the sources and timetable below.{1}|已偵測到 {0} 門課程。請在下方完善課程來源和課表。{1}
{0} · Week {1}（来源标注）|{0} · Week {1} (source label)|{0} · Week {1}（來源標註）
第 {0} 页|Page {0}|第 {0} 頁
总用时 {0}|Total time {0}|總用時 {0}
当前步骤 {0}|Current step {0}|目前步驟 {0}
{0} 秒前更新|Updated {0} seconds ago|{0} 秒前更新
课程场次 · 每周 {0} 场|Weekly sessions · {0} per week|課程場次 · 每週 {0} 場
{0} 请选择签到码来源|{0}: Select a code source|{0} 請選擇簽到碼來源
{0} 请填写每个场次的星期和时间|{0}: Enter the weekday and time for every session|{0} 請填寫每個場次的星期和時間
马莫签到助手 {0} 运行日志|Check-in Assistant {0} run log|簽到助手 {0} 執行記錄
生成时间：{0}|Generated at: {0}|產生時間：{0}
条目数：{0}|Entries: {0}|項目數：{0}
已导出 {0} 条记录{1:message}。助手只保存最近 7 天内处理的记录；更早的场次请以签到网站显示为准。|Exported {0} records{1:message}. The assistant keeps records processed in the last 7 days; check the school website for older sessions.|已匯出 {0} 筆記錄{1:message}。助手只儲存最近 7 天內處理的記錄；更早的場次請以簽到網站顯示為準。
，覆盖 {0} 至 {1}|, covering {0} to {1}|，涵蓋 {0} 至 {1}
提交前已保存检查点（候选 {0}/{1}）|Checkpoint saved before submission (candidate {0}/{1})|提交前已儲存檢查點（候選 {0}/{1}）
提交前保存失败，未填写签到码：{0:message}|Saving before submission failed; no code was entered: {0:message}|提交前儲存失敗，未填寫簽到碼：{0:message}
未填写签到码，但检查点恢复保存失败：{0:message}|No code was entered, but saving the restored checkpoint failed: {0:message}|未填寫簽到碼，但檢查點還原儲存失敗：{0:message}
签到码被门户拒绝，尝试下一候选（{0}/{1}）|The portal rejected the code. Trying the next candidate ({0}/{1}).|簽到碼被入口網站拒絕，嘗試下一候選（{0}/{1}）
提交结果待核对：{0:message}|Submission needs verification: {0:message}|提交結果待核對：{0:message}
{0} 发件人邮箱无效|{0}: Invalid sender email|{0} 寄件者信箱無效
{0} Moodle 网址无效|{0}: Invalid Moodle URL|{0} Moodle 網址無效
{0} 请填写 Monash Moodle 课程、公告或页面网址|{0}: Enter a Monash Moodle course, announcement or page URL|{0} 請填寫 Monash Moodle 課程、公告或頁面網址
{0} 最多配置 3 个 Moodle 入口|{0}: At most 3 Moodle entry points are allowed|{0} 最多設定 3 個 Moodle 入口
{0} Ed 课程网址无效|{0}: Invalid Ed course URL|{0} Ed 課程網址無效
{0} 请填写 Ed course_id 或课程网址，例如 37233 或 https://edstem.org/au/courses/37233|{0}: Enter an Ed course_id or course URL, such as 37233 or https://edstem.org/au/courses/37233|{0} 請填寫 Ed course_id 或課程網址，例如 37233 或 https://edstem.org/au/courses/37233
{0} 最多配置 1 个 Ed 课程入口|{0}: At most 1 Ed course entry point is allowed|{0} 最多設定 1 個 Ed 課程入口
{0} 每周最多设置 14 节课|{0}: At most 14 classes per week are allowed|{0} 每週最多設定 14 節課
{0} 请填写每节课的星期和时间|{0}: Enter the weekday and time for every class|{0} 請填寫每節課的星期和時間
{0} 活动类型请使用签到网站显示的英文名称|{0}: Use the English activity type shown on the attendance website|{0} 活動類型請使用簽到網站顯示的英文名稱
{0} 组别格式例如 01 或 01-P1|{0}: Use a group format such as 01 or 01-P1|{0} 組別格式例如 01 或 01-P1
{0} 存在重复或无法区分的上课场次|{0}: Duplicate or ambiguous class sessions|{0} 存在重複或無法區分的上課場次
正在检查识别服务，剩余 {0} 秒|Checking the OCR service; {0} seconds remaining|正在檢查辨識服務，剩餘 {0} 秒
{0} 读取权限不足。请在 Chrome 扩展管理中允许助手访问对应网站，然后重试。|{0} cannot be read without site permission. Allow access in Chrome extension settings, then retry.|{0} 讀取權限不足。請在 Chrome 擴充功能管理中允許助手存取對應網站，然後重試。
{0} 页面在读取期间发生跳转。请等待页面加载完成后重试。|{0} navigated while being read. Wait for the page to finish loading, then retry.|{0} 頁面在讀取期間發生跳轉。請等待頁面載入完成後重試。
{0} 网络连接失败。请检查网络及学校网站是否可以打开，然后重试。|{0} could not connect. Check your network and whether the school website opens, then retry.|{0} 網路連線失敗。請檢查網路及學校網站是否可以開啟，然後重試。
{0} 响应超时，结果尚未确认。请检查网站或识别服务后重试；若已经提交签到，请先核对学校网站记录。|{0} timed out and the result is unconfirmed. Check the website or OCR service before retrying. If attendance was submitted, verify the school records first.|{0} 回應逾時，結果尚未確認。請檢查網站或辨識服務後重試；若已經提交簽到，請先核對學校網站記錄。
{0} 未能完成。请重试；若已提交签到，请先核对学校网站记录。诊断信息：{1}|{0} could not finish. Retry; if attendance was submitted, verify the school records first. Diagnostic details: {1}|{0} 未能完成。請重試；若已提交簽到，請先核對學校網站記錄。診斷資訊：{1}
无法识别邮件发送年份：{0}|Cannot determine the email's sent year: {0}|無法辨識郵件寄送年份：{0}
`.trim().split('\n').map(row=>row.split('|'));
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const compile=template=>{
 const slots=[];let previous=0,pattern='';
 for(const match of template.matchAll(/\{(\d+)(:message|:number)?\}/g)){pattern+=escape(template.slice(previous,match.index))+(match[2]===':number'?'(\\d+)':'([\\s\\S]*?)');slots.push(Number(match[1]));previous=match.index+match[0].length;}
 return {pattern:new RegExp('^'+pattern+escape(template.slice(previous))+'$'),slots};
};
const messages=rows.sort((a,b)=>b[0].replace(/\{[^}]+\}/g,'').length-a[0].replace(/\{[^}]+\}/g,'').length).map(values=>({values,patterns:values.map(compile)}));
export function dynamicText(text,language,translate){
 const target=language==='zh'?0:language==='zh_TW'?2:1;
 for(const {values,patterns} of messages)for(const {pattern,slots} of patterns){
  const match=pattern.exec(text);if(!match)continue;
  const data=new Map();let consistent=true;
  for(const [i,slot] of slots.entries()){if(data.has(slot)&&data.get(slot)!==match[i+1]){consistent=false;break;}data.set(slot,match[i+1]);}
  if(!consistent)continue;
  return values[target].replace(/\{(\d+)(:message|:number)?\}/g,(_,slot,type)=>{const value=data.get(Number(slot))??'';return type===':message'&&value.length<text.length?translate(value,language):value;});
 }
}
