import {WIZARD_STRINGS} from './practice/wizard-strings.js';
const rows=`
shared-authors|Who's sharing|谁在共享|誰在共享
shared-author-count|{count} rules|{count} 条规则|{count} 條規則
shared-authors-empty|No rule authors listed yet.|暂无规则作者。|暫無規則作者。
draft-test-notice|Imported drafts not yet tested: {count}.|你有 {count} 个已导入草稿尚未测试。|你有 {count} 個已匯入草稿尚未測試。
go-testing|Rule matching test|规则匹配测试|規則配對測試
invalid-test-date-range|Enter a valid start and end date, with the start no later than the end.|请填写有效的起止日期，开始日期不能晚于结束日期。|請填寫有效的起訖日期，開始日期不能晚於結束日期。
test-page|Specific page (optional)|指定页面（可选）|指定頁面（選填）
test-page-help|Limit the test to one email thread, post or Moodle page. Leave empty to search the course's saved sources within the date range.|填写后仅检查指定邮件会话、帖子或 Moodle 页面；留空则按日期范围查找课程已保存的来源。|填寫後僅檢查指定郵件對話、貼文或 Moodle 頁面；留空則按日期範圍查找課程已儲存的來源。
test-from|From (UTC+8)|开始日期（UTC+8）|開始日期（UTC+8）
test-to|To (UTC+8)|结束日期（UTC+8）|結束日期（UTC+8）
test-date-unknown|Source date unknown|来源日期未知|來源日期未知
test-options|Test options|测试选项|測試選項
test-diagnostics|Diagnostics|诊断详情|診斷詳情
test-image|Course image|课程图片|課程圖片
test-session|Session|场次|場次
test-date|Date|日期|日期
test-code|Check-in code|签到码|簽到碼
test-raw|OCR source text|识别原文|辨識原文
test-review-help|Review each matched image. Confirm only images you want this rule to recognize.|逐张检查匹配图片，仅确认你希望此规则识别的图片。|逐張檢查配對圖片，僅確認你希望此規則辨識的圖片。
test-select|Select course and rules|选择课程与规则|選擇課程與規則
test-review|Review image results|检查图片结果|檢查圖片結果
test-finish|Finish|完成|完成
test-reviewed|This image matches what I want to recognize|这张图片符合我想识别的内容|這張圖片符合我想辨識的內容
test-back|Change selection|修改选择|修改選擇
test-again|Start another test|测试其他规则|測試其他規則
test-skip|Skip selected rules' tests|跳过所选规则测试|略過所選規則測試
test-skip-final|Confirm skip|确认跳过测试|確認略過測試
test-skip-warning-1|These rules have not been verified. Skipping may match unrelated images or miss check-in images. Continue?|这些规则尚未经验证，跳过测试可能匹配无关图片或漏掉签到图片。是否继续？|這些規則尚未經驗證，略過測試可能配對無關圖片或漏掉簽到圖片。是否繼續？
test-skip-warning-2|Confirm again: allow these exact rules for this course without testing? This does not mean the rules passed a test.|请再次确认：不经过测试，允许将所选规则匹配到此课程？这不代表规则已通过测试。|請再次確認：不經過測試，允許將所選規則配對至此課程？這不代表規則已通過測試。
test-skipped|Test skipped|已跳过测试|已略過測試
test-skipped-warning|Test skipped by confirmation. You can now match these rules manually; their results remain unverified.|已确认跳过测试。现在可以手动匹配规则，但识别效果未经验证。|已確認略過測試。現在可以手動配對規則，但辨識效果未經驗證。
author|Author|作者|作者
author-page|Visit author's webpage|访问作者网页|造訪作者網頁
rule-source|View rule source|查看规则源文件|檢視規則原始檔
import-url|Use an HTTP or HTTPS webpage URL without credentials or whitespace.|请填写 HTTP 或 HTTPS 网页地址，不得包含账号密码或空白字符。|請填寫 HTTP 或 HTTPS 網頁網址，不得包含帳號密碼或空白字元。
practice-title|Rule creation practice|规则创建练习|規則建立練習
practice-back|Back to recognition and rules|返回识别与规则|返回辨識與規則
practice-language|Language|语言|語言
practice-isolation|Practice only · Sample images and rules stay separate from your courses. No mail is read and no check-in is submitted.|练习环境 · 样例图片和规则与真实课程隔离，不读取邮件，不提交签到。|練習環境 · 範例圖片與規則和真實課程隔離，不讀取郵件，不提交簽到。
practice-sample|Sample message · DEMO1000|样例消息 · DEMO1000|範例訊息 · DEMO1000
practice-saved|Practice rules|练习规则|練習規則
practice-reset|Reset practice|重置练习|重設練習
practice-reset-done|Practice cleared. Your real rules and records were not changed.|练习已清除，真实规则和记录未改变。|練習已清除，真實規則與紀錄未變更。
practice-empty|No practice rules saved yet.|尚未保存练习规则。|尚未儲存練習規則。
practice-draft|Practice draft|练习草稿|練習草稿
practice-applied|Applied to DEMO1000 only|仅应用于演示 DEMO1000|僅套用於示範 DEMO1000
practice-draft-saved|Practice draft saved. No real course was changed.|练习草稿已保存，未改变真实课程。|練習草稿已儲存，未變更真實課程。
practice-applied-saved|Practice rule applied to the sample course only.|练习规则已应用，仅对样例课程有效。|練習規則已套用，僅對範例課程有效。
practice-error|Practice could not load. Reload this page and try again.|练习加载失败，请刷新页面重试。|練習載入失敗，請重新整理頁面再試。
builder-title|Create rule|创建规则|建立規則
create-practice|Simulated creation|模拟创建|模擬建立
create-actual|Actual creation|实际创建|實際建立
filter-courses|Filter by course|按课程筛选|依課程篩選
all-courses|All courses|全部课程|全部課程
course-empty|No imported rules for this course.|这门课程暂无导入规则。|這門課程尚無匯入規則。
test-course-missing|Testing requires a matching course in your settings. This rule cannot be tested against a different course.|需先配置与规则相同的课程才能测试，不能使用其他课程代替。|需先設定與規則相同的課程才能測試，不能使用其他課程代替。
test-source-missing|Enable this source for a matching course before testing.|请先为对应课程开启此来源，再进行测试。|請先為對應課程開啟此來源，再進行測試。
builder-entry-help|Select a course and an open Gmail or Moodle page, then click the target image on that page to generate a local rule. Preview its matches before saving and enabling it; no AI account is required.|选择课程和已打开的 Gmail 或 Moodle 页面，再点选页面中的目标图片，即可生成本地规则。预览匹配结果后保存并启用，无需 AI 账号。|選擇課程與已開啟的 Gmail 或 Moodle 頁面，再點選頁面中的目標圖片，即可產生本機規則。預覽配對結果後儲存並啟用，無需 AI 帳號。
builder-name-label|Rule name|规则名称|規則名稱
builder-name|Enter a rule name (up to 100 characters).|请输入规则名称（最多 100 字）。|請輸入規則名稱（最多 100 字）。
builder-stale-preview|The rule changed. Use the latest preview.|规则已变化，请使用最新预览。|規則已變更，請使用最新預覽。
builder-back|Back to recognition rule repository|返回规则识别仓库|返回規則辨識倉庫
builder-tab|Open message or page|已打开的消息或页面|已開啟的訊息或頁面
builder-refresh|Refresh tabs|刷新标签页|重新整理分頁
builder-pick|Select an image on the page|在页面中点选图片|在頁面中點選圖片
builder-pick-instruction|Select an image · Arrow keys to move · Enter to select · Esc to cancel|点选图片 · 方向键切换 · Enter 选择 · Esc 取消|點選圖片 · 方向鍵切換 · Enter 選擇 · Esc 取消
builder-add-sample|Add another sample|添加另一个样例|新增另一個範例
builder-help|Only local image rules are generated. Preview does not submit attendance or save collection records. Rules remain inactive until you enable them.|仅在本机生成图片规则。预览不会提交签到，也不会写入收集记录。规则需要你启用后才会生效。|僅在本機產生圖片規則。預覽不會提交簽到，也不會寫入收集記錄。規則需要你啟用後才會生效。
builder-json|Generated JSON|生成的 JSON|產生的 JSON
builder-preview|Preview matches|预览匹配结果|預覽配對結果
builder-continue|Continue|继续|繼續
builder-matches-next|Continue to recognition|继续测试识别|繼續測試辨識
builder-ocr-next|Continue to save|继续保存|繼續儲存
builder-skip|Skip recognition, save draft only|跳过识别，仅保存草稿|略過辨識，僅儲存草稿
builder-step-1|Choose course, source and page|选择课程、来源和页面|選擇課程、來源與頁面
builder-step-2|Select image|选择图片|選擇圖片
builder-step-3|Check matches|检查匹配|檢查匹配
builder-step-4|Test recognition|测试识别|測試辨識
builder-step-5|Save rule|保存规则|儲存規則
builder-draft|Save draft|保存草稿|儲存草稿
builder-enable|Save and match courses|保存并前往规则匹配|儲存並前往規則配對
builder-export|Export JSON|导出 JSON|匯出 JSON
builder-cancel|Cancel selection|取消创建|取消建立
builder-working|Working…|正在处理…|正在處理…
builder-selecting|Waiting for an image selection on the source page|等待在来源页面点选图片|等待在來源頁面點選圖片
builder-editing|Image selected. Preview not yet verified.|已选择图片，尚未验证预览。|已選擇圖片，尚未驗證預覽。
builder-previewed|Preview complete|预览完成|預覽完成
builder-ready|Ready|准备就绪|準備就緒
builder-saved|Rule saved to Import history; not yet applied.|规则已保存至历史导入，尚未应用。|規則已儲存至歷史匯入，尚未套用。
view-imports|View imports|查看导入|檢視匯入
download-json|Download JSON|下载 JSON|下載 JSON
builder-author|Author name (optional)|作者名称（选填）|作者名稱（選填）
builder-author-url|Author webpage (optional)|作者网页（选填）|作者網頁（選填）
builder-author-error|Enter an author name before adding an author webpage.|填写作者网页时，请同时填写作者名称。|填寫作者網頁時，請同時填寫作者名稱。
builder-author-url-error|Use a valid http:// or https:// author webpage URL.|作者网页请填写有效的 http:// 或 https:// 链接。|作者網頁請填寫有效的 http:// 或 https:// 連結。
builder-image-alt|Source image|来源图片|來源圖片
builder-mark|Image selection|图片选择|圖片選擇
builder-unmarked|Not marked|未标记|未標記
builder-include|Include|包含|包含
builder-exclude|Exclude|排除|排除
builder-matched|Matched by this rule|此规则已匹配|此規則已配對
builder-confirm|Also include this image|这张也要识别|這張也要辨識
builder-confirm-help|This rule also selects this image, which you have not explicitly included. It does not mean the images are identical. Check this box to recognize it too, or choose Exclude if you do not want it.|同一条规则也选中了这张尚未被你明确选择的图片，不代表图片内容相同。勾选后会一起识别；不需要它，请选择“排除”。|同一條規則也選中了這張尚未被你明確選擇的圖片，不代表圖片內容相同。勾選後會一起辨識；不需要它，請選擇「排除」。
builder-ocr|Recognize this image|识别此图片|辨識此圖片
builder-ocr-empty|No text recognized|未识别到文字|未辨識到文字
builder-no-tabs|Open a matching course message or page first|请先打开对应课程的消息或页面|請先開啟對應課程的訊息或頁面
builder-busy|Another operation is running. Finish or cancel it first.|另一项操作正在进行，请先完成或取消。|另一項操作正在進行，請先完成或取消。
builder-identity-unverified|Ed rule creation is unavailable until the signed-in account can be verified. Existing Ed collection is unchanged.|暂不能可靠确认 Ed 登录账号，暂不开放 Ed 点选创建。原有 Ed 收集不受影响。|暫不能可靠確認 Ed 登入帳號，暫不開放 Ed 點選建立。原有 Ed 收集不受影響。
builder-source-error|Could not verify the page. Check the saved account, course, year and open message.|无法验证页面，请检查已保存的账号、课程、年份和已打开的消息。|無法驗證頁面，請檢查已儲存的帳號、課程、年份和已開啟的訊息。
builder-source|Choose a configured course and enabled source.|请选择已配置的课程和已启用的来源。|請選擇已設定的課程和已啟用的來源。
builder-no-roots|No eligible message content found. Open the message first.|未找到可用的消息内容，请先打开具体消息。|未找到可用的訊息內容，請先開啟具體訊息。
builder-course-mismatch|This page does not match the selected course.|当前页面与所选课程不匹配。|目前頁面與所選課程不符。
builder-source-changed|The source page changed. Start a new selection.|来源页面已变化，请重新点选。|來源頁面已變更，請重新點選。
builder-settings-changed|Settings changed. Start a new selection.|设置已变化，请重新点选。|設定已變更，請重新點選。
builder-library-changed|The rule library changed. Export this draft, then start again.|规则库已变化，请先导出此草稿，再重新创建。|規則庫已變更，請先匯出此草稿，再重新建立。
builder-expired|This session expired or was interrupted. Start again.|此次创建已过期或中断，请重新开始。|此次建立已過期或中斷，請重新開始。
builder-session|The image selection is no longer available. Start again.|图片选择已失效，请重新开始。|圖片選擇已失效，請重新開始。
builder-owner|This session belongs to another editor.|此次创建属于另一个编辑页面。|此次建立屬於另一個編輯頁面。
builder-cancelled|Selection cancelled|已取消创建|已取消建立
builder-unmatched|No rule matches all included images while excluding unwanted images.|没有规则能同时匹配包含的图片并排除不需要的图片。|沒有規則能同時配對包含的圖片並排除不需要的圖片。
builder-negative-match|The rule also matches an excluded image.|规则还匹配了已排除的图片。|規則仍配對到已排除的圖片。
builder-filtered|A selected image was rejected by the normal recognition filters.|所选图片未通过正式识别的过滤条件。|所選圖片未通過正式辨識的篩選條件。
builder-incomplete|The page is still loading or the preview exceeds its limits.|页面仍在加载，或预览超过数量限制。|頁面仍在載入，或預覽超過數量限制。
builder-budget|Limit reached: 5 samples, 20 images per preview, 8 MB per image and 32 MB total.|已达到限制：5 个样例，每次预览 20 张图片，单张 8 MB、总计 32 MB。|已達到限制：5 個範例，每次預覽 20 張圖片，單張 8 MB、總計 32 MB。
builder-duplicate-sample|This tab is already a sample. Open another message in a separate tab.|此标签页已作为样例，请在另一个标签页打开其他消息。|此分頁已作為範例，請在另一個分頁開啟其他訊息。
builder-preview-required|Review every matched image before enabling. Include the ones you want and exclude the rest.|请先检查规则选中的图片：需要的确认识别，不需要的选择“排除”，再启用。|請先檢查規則選中的圖片：需要的確認辨識，不需要的選擇「排除」，再啟用。
builder-image|Image preview unavailable. Preview the rule again.|图片预览不可用，请重新预览规则。|圖片預覽無法使用，請重新預覽規則。
builder-timeout|Image download or recognition timed out. Try again.|图片下载或识别超时，请重试。|圖片下載或辨識逾時，請重試。
page-title|Recognition and rules|识别与规则|辨識與規則
entry-description|Configure image recognition, and create or import course rules.|配置图片识别方式，创建或导入课程规则。|設定圖片辨識方式，建立或匯入課程規則。
open-modules|Open|打开|開啟
modules|Module management|模块管理|模組管理
matching|Assign rules to courses|规则匹配课程|規則配對課程
test-rules|Rules to test|选择测试规则|選擇測試規則
choose-rules|Select rules|选择规则|選擇規則
save-binding|Save matches|保存匹配|儲存配對
cancel-edit|Cancel|取消|取消
search-rules|Search compatible rules|搜索适用规则|搜尋適用規則
no-compatible|No compatible community rules imported|尚未导入适用的社区规则|尚未匯入適用的社群規則
builtin-always|Official rules always included|始终包含官方规则|一律包含官方規則
source-off|Source not enabled|未启用此来源|未啟用此來源
close|Close|关闭|關閉
copy-json|Copy JSON|复制 JSON|複製 JSON
copied|Copied|已复制|已複製
copy-error|Could not copy. Select and copy the JSON manually.|复制失败，请选中 JSON 手动复制。|複製失敗，請選取 JSON 手動複製。
back-settings|Back to settings|返回设置|返回設定
to-developer|Switch to developer mode|切换开发者模式|切換開發者模式
to-normal|Switch to normal mode|切换正常模式|切換正常模式
bundled|Official · always available|官方 · 始终可用|官方 · 隨時可用
enabled|Enabled|已启用|已啟用
not-in-use|No courses currently use this source|暂无课程使用此来源|尚無課程使用此來源
binding-fallback|Some selected rules are unavailable; official and other valid rules remain active.|部分所选规则不可用，官方及其他有效规则仍可使用。|部分所選規則無法使用，官方及其他有效規則仍可使用。
invalid-package|Invalid package; not loaded|规则包无效，未加载|規則套件無效，未載入
recognition-title|OCR method|OCR识图方案|OCR識圖方案
browser-engine|Built-in browser OCR|浏览器内置 OCR|瀏覽器內建 OCR
vision-engine|Apple Vision|Apple Vision|Apple Vision
engine-browser-info|Recognizes images locally in the browser. No companion installation required.|在浏览器内完成本机图片识别，无需安装配套程序。|在瀏覽器內完成本機圖片辨識，無需安裝配套程式。
engine-vision-info|Uses the installed Mac companion for local Apple Vision recognition.|使用已安装的 Mac 配套程序，通过 Apple Vision 在本机识别。|使用已安裝的 Mac 配套程式，透過 Apple Vision 在本機辨識。
engine-checking|Checking recognition service…|正在检查识别服务…|正在檢查辨識服務…
engine-busy|Recognizing images|正在识别图片|正在辨識圖片
engine-check|Check recognition service|检查识别服务|檢查辨識服務
engine-error|Could not check the service. Try again.|识别服务检查失败，请重试。|辨識服務檢查失敗，請重試。
install-vision|Install Mac companion|安装 Mac 配套程序|安裝 Mac 配套程式
page-load-error|Could not load settings. Reload this page to retry.|设置加载失败，请刷新页面重试。|設定載入失敗，請重新整理頁面重試。
title|Source rules|来源规则|來源規則
library|Recognition rule repository|规则识别仓库|規則辨識倉庫
library-builtin|Official rules|官方规则|官方規則
official-version|Version|版本|版本
official-bundled-version|Included version|随扩展提供的版本|隨擴充功能提供的版本
official-source-bundled|Included with extension|随扩展提供|隨擴充功能提供
official-source-remote|Downloaded release|已下载的发行版|已下載的發行版
official-last-checked|Last checked|上次检查|上次檢查
official-never-checked|Not yet checked|尚未检查|尚未檢查
official-check|Check for updates|检查更新|檢查更新
official-rollback|Restore previous version|恢复上一版|回復上一版
official-rollback-confirm|Restore the previous official rules version?|恢复上一版官方规则？|回復上一版官方規則？
official-error|Could not update official rules. Try again later.|无法更新官方规则，请稍后重试。|無法更新官方規則，請稍後重試。
official-retained|The existing usable version has been retained.|已保留现有可用版本。|已保留現有可用版本。
official-download|Could not download official rules. Check your connection and retry.|无法下载官方规则，请检查网络连接后重试。|無法下載官方規則，請檢查網路連線後重試。
official-signature|The update signature could not be verified. Try again later or contact the publisher.|无法验证更新签名，请稍后重试或联系发布者。|無法驗證更新簽章，請稍後重試或聯絡發布者。
official-invalid|The update contains invalid rule data. Try again later or contact the publisher.|更新包含无效规则数据，请稍后重试或联系发布者。|更新包含無效規則資料，請稍後重試或聯絡發布者。
official-incompatible|These rules require a compatible extension version. Update the extension and retry.|这些规则需要兼容的扩展版本，请更新扩展后重试。|這些規則需要相容的擴充功能版本，請更新擴充功能後重試。
official-size|The update exceeds the allowed size. Try again later or contact the publisher.|更新超出大小限制，请稍后重试或联系发布者。|更新超出大小限制，請稍後重試或聯絡發布者。
official-replay|An outdated or changed release was rejected. Check again later for a newer release.|已拒绝过旧或被更改的发行版，请稍后检查是否有新版本。|已拒絕過舊或被變更的發行版，請稍後檢查是否有新版本。
official-cache-invalid|The saved update could not be verified. Check for updates to download a verified release.|无法验证已保存的更新，请检查更新以下载通过验证的发行版。|無法驗證已儲存的更新，請檢查更新以下載通過驗證的發行版。
official-timeout|The update check timed out. Check your connection and retry.|检查更新超时，请检查网络连接后重试。|檢查更新逾時，請檢查網路連線後重試。
official-storage|Could not save the rules. Check available storage space and retry.|无法保存规则，请检查可用存储空间后重试。|無法儲存規則，請檢查可用儲存空間後重試。
official-no-previous|No previous version is available to restore. Check for updates instead.|没有可恢复的上一版，请尝试检查更新。|沒有可回復的上一版，請嘗試檢查更新。
official-resetting|Official rules are being reset. Wait for the reset to finish, then retry.|正在重置官方规则，请等待重置完成后重试。|正在重設官方規則，請等待重設完成後重試。
library-community|Shared rules|共享规则|共享規則
shared-browse|Browse shared rules|查看共享|檢視共享
share-new|Share a rule|我要共享|我要共享
share-select|Local rule|本地规则|本機規則
share-json|View JSON|查看 JSON|檢視 JSON
share-export|Download rule JSON|下载规则 JSON|下載規則 JSON
share-submit|Submit contribution ↗|提交贡献 ↗|提交貢獻 ↗
share-guide|Contribution requirements ↗|贡献要求 ↗|貢獻要求 ↗
share-empty|No local rules available to share|暂无可共享的本地规则|暫無可共享的本機規則
share-privacy|Review the JSON for private data before publishing. Nothing is uploaded automatically.|发布前请检查 JSON 是否包含私人信息。不会自动上传。|發布前請檢查 JSON 是否包含私人資訊。不會自動上傳。
library-local|Local imports|本地导入|本機匯入
origin-builtin|Official|官方|官方
origin-community|Community|社区|社群
origin-local|Local import|本地导入|本機匯入
local-empty|No local rules yet|暂无本地规则|尚無本機規則
replace-confirm|Replace this copy?|替换当前副本？|取代目前副本？
replace-copy-warning|Only this source's copy is replaced. Its previous content is kept for rollback; other sources are unchanged.|仅替换此来源下的副本，保留上一版供恢复，不影响其他来源的同 ID 规则。|僅取代此來源下的副本，保留上一版供復原，不影響其他來源的同 ID 規則。
download-install|Download and import|下载并导入|下載並匯入
download-update|Download update|下载更新|下載更新
catalog-view|View JSON|查看 JSON|檢視 JSON
catalog-demo|Demo · synthetic course|示例 · 合成课程|範例 · 合成課程
catalog-loading|Loading catalog…|正在加载目录…|正在載入目錄…
catalog-idle|Open this tab to browse community rules.|打开此分页查看社区规则。|開啟此分頁檢視社群規則。
catalog-empty|No community rules available|暂无社区规则|暫無社群規則
catalog-error|Could not load the catalog. Try again or open the repository.|目录加载失败，请重试或打开仓库。|目錄載入失敗，請重試或開啟儲存庫。
catalog-retry|Reload catalog|重新加载目录|重新載入目錄
catalog-download-error|Download failed. Try again or download the JSON from the repository.|下载失败，请重试或从仓库下载 JSON。|下載失敗，請重試或從儲存庫下載 JSON。
catalog-integrity|The downloaded package differs from this catalog. It was not imported.|下载的规则包与目录不符，未导入。|下載的規則套件與目錄不符，未匯入。
catalog-invalid|Invalid rule catalog|规则目录无效|規則目錄無效
size|Rule file exceeds the size limit|规则文件超过大小限制|規則檔案超過大小限制
import|Import rules|导入规则|匯入規則
import-mode-file|Upload file|上传文件|上傳檔案
import-history|Import history|历史导入|歷史匯入
import-new|New import|新建导入|新增匯入
import-mode-json|Enter JSON|输入 JSON|輸入 JSON
import-json-text|Import JSON|导入 JSON|匯入 JSON
json-content|Rule JSON|规则 JSON|規則 JSON
download-template|Download JSON template|下载模板 JSON|下載範本 JSON
import-dropzone|Drop a JSON file here or click to upload|拖入 JSON 文件，或点击上传|拖入 JSON 檔案，或點擊上傳
import-one-file|Import one JSON file at a time.|请每次导入一个 JSON 文件。|請每次匯入一個 JSON 檔案。
import-json-file|Choose a file with a .json extension.|请选择 .json 格式的文件。|請選擇 .json 格式的檔案。
replace|Update existing package|更新已有规则包|更新現有規則套件
replace-help|An update requires a new version. The previous version is kept for rollback. Importing never activates a rule.|更新需使用新版本号，并保留上一版供回退。导入不会自动启用。|更新需使用新版本號，並保留上一版供回復。匯入不會自動啟用。
builtin|Official rules|官方规则|官方規則
draft|Awaiting test|等待测试|等待測試
awaiting-match|Awaiting assignment|等待匹配|等待配對
matched-rule|Assigned|已匹配|已配對
filter-all|All|全部|全部
filter-tested|Tested|已测试|已測試
filter-untested|Untested|未测试|未測試
rule-test-required|Test this rule for this course before assigning it.|请先测试此规则在该课程中的匹配结果，再选择应用。|請先測試此規則在該課程中的配對結果，再選擇套用。
rule-test-not-passed|The test must finish with matching images and no errors before confirmation.|测试需要完成并匹配到图片，且无错误，才能确认通过。|測試需要完成並配對到圖片，且無錯誤，才能確認通過。
rule-test-stale|This rule changed after the test. Test it again.|规则在测试后发生变化，请重新测试。|規則在測試後發生變更，請重新測試。
test-step-1|Course and source|课程与来源|課程與來源
test-step-2|Rules and test options|规则与测试方式|規則與測試方式
test-step-3|Review image results|检查图片结果|檢查圖片結果
test-step-4|Test completed|完成测试|完成測試
test-next|Continue|继续|繼續
test-approve|Confirm these matches|确认匹配结果正确|確認配對結果正確
test-approved|Test confirmed. You can now assign these rules to this course.|测试已确认，现在可以将这些规则匹配到该课程。|測試已確認，現在可以將這些規則配對到該課程。
test-review-image|Select image to review|选择要检查的图片|選擇要檢查的圖片
test-image-count|Image {index} of {count}|图片 {index} / {count}|圖片 {index} / {count}
draft-notice|Imported drafts not yet matched: {count}.|你有 {count} 个已导入草稿尚未匹配。|你有 {count} 個已匯入草稿尚未配對。
go-import-history|Rule import history|规则历史导入|規則匯入歷史
test-again-rule|Test again|再次测试|再次測試
test-already-tested|{count} selected rules have already been tested for this course. You can test them again.|所选规则中有 {count} 个已在此课程完成测试，可再次测试。|所選規則中有 {count} 個已在此課程完成測試，可再次測試。
unapplied-drafts|Unapplied drafts: {count}. Assign them to a course to use them.|你有 {count} 个草稿未应用，请匹配课程后使用。|你有 {count} 個草稿尚未套用，請配對課程後使用。
go-matching|Assign rules to courses|规则匹配课程|規則配對課程
expand-examples|Show examples|展开样例|展開範例
collapse-examples|Hide all example courses|收起全部样例课程|收合全部範例課程
empty|No community rules installed|尚未导入社区规则|尚未匯入社群規則
no-courses|No saved courses|尚无已保存课程|尚無已儲存課程
delete|Delete|删除|刪除
rollback|Restore previous version|恢复上一版|回復上一版
details|Package details|规则包详情|規則套件詳細資料
test|Test rule|测试规则|測試規則
test-title|Rule matching test|规则匹配测试|規則配對測試
test-help|This preview reads the selected source only and never submits or saves production records. Apple Vision previews require the updated helper; older helpers use browser OCR for tests. Production preferences are unchanged.|独立预览只读取选定来源，不提交、不保存正式记录。Apple Vision 测试需新版配套程序；旧版在测试时使用内置 OCR，正式运行偏好不变。|獨立預覽只讀取所選來源，不提交、不儲存正式記錄。Apple Vision 測試需新版配套程式；舊版在測試時使用內建 OCR，正式執行偏好不變。
course|Course|课程|課程
source|Source|来源|來源
rule|Community rule|社区规则|社群規則
none|None selected|未选择|未選取
stage|Test stage|测试阶段|測試階段
locate|Locate images|仅定位图片|僅定位圖片
recognize|Locate and recognize|定位并识别|定位並辨識
scope|Rule selection|规则范围|規則範圍
scope-help|Selected rules alone report no matches when they miss. Combined mode also includes official rules.|仅所选规则未命中时显示零；实际组合会同时使用官方规则。|僅所選規則未命中時顯示零；實際組合會同時使用官方規則。
community|Selected rules only|仅所选规则|僅所選規則
combined|Actual combination|实际组合|實際組合
url|Message or post URL (optional)|邮件或帖子链接（可选）|郵件或貼文連結（選填）
show-images|Show found images|显示找到的图片|顯示找到的圖片
show-images-help|Preview validated, downloaded images locally. Toggling this does not scan. A preview failure is not a zero-match result.|预览通过来源校验并下载的图片。切换开关不会发起扫描，预览失败不代表零命中。|預覽通過來源驗證並下載的圖片。切換開關不會發起掃描，預覽失敗不代表零命中。
show-trace|Show filtering trace|显示筛选过程|顯示篩選過程
show-trace-help|Shows rule matches and exclusions, including size, signatures and forbidden hosts. Blocked images are never downloaded for preview.|查看规则命中和排除原因，包括尺寸、签名和禁止的主机。被拦截的图片不会为预览额外下载。|查看規則命中與排除原因，包括尺寸、簽名和禁止的主機。遭攔截的圖片不會為預覽額外下載。
force-ocr|Force fresh OCR|强制重新 OCR|強制重新 OCR
force-ocr-help|Bypass the existing OCR cache for this test. This does not change the recognition engine preference or saved records.|本次测试绕过 OCR 缓存，不改变识别引擎优先级或已保存记录。|本次測試略過 OCR 快取，不變更辨識引擎優先順序或已儲存記錄。
start|Start test|开始测试|開始測試
cancel|Stop test|停止测试|停止測試
clear|Clear preview|清空预览|清除預覽
export|Export diagnostics|导出诊断|匯出診斷
report-help|The report excludes message bodies, images, OCR text, email addresses and source URLs. Nothing is uploaded. Tests do not add to production caches or archives; existing data is left intact.|报告不含正文、图片、OCR 原文、邮箱和来源链接，不上传任何服务。测试不写入正式缓存或归档，也不会删除已有数据。|報告不含內文、圖片、OCR 原文、信箱與來源連結，不會上傳。測試不寫入正式快取或封存，也不會刪除既有資料。
demo|Demo cases|演示案例|示範案例
demo-label|Synthetic demo|合成演示|合成示範
idle|Ready to test|等待测试|等待測試
source-phase|Reading source|读取来源|讀取來源
locating|Locating images|定位图片|定位圖片
recognizing|Recognizing content|识别内容|辨識內容
complete|Test complete|测试完成|測試完成
partial|Test incomplete|测试未完成|測試未完成
error|Test failed|测试失败|測試失敗
cancelled|Test stopped|测试已停止|測試已停止
interrupted|Test session expired; start again|测试会话已失效，请重新开始|測試工作階段已失效，請重新開始
pages|Sources visited|已访问来源|已造訪來源
found|Images found|发现图片|找到圖片
downloaded|Images downloaded|已下载图片|已下載圖片
excluded|Excluded|已排除|已排除
recognized|OCR complete|OCR 完成|OCR 完成
no-images|No matching images|未找到匹配图片|未找到相符圖片
budget|Scan or preview limit reached|已达到扫描或预览上限|已達掃描或預覽上限
source-link|Open source|查看来源|查看來源
ocr-one|Test OCR on this image|测试这张图的识别|測試這張圖的辨識
ocr-output|Recognition result|识别结果|辨識結果
ocr-empty|OCR returned no text|OCR 未识别出文字|OCR 未辨識出文字
ocr-error|OCR failed|OCR 失败|OCR 失敗
download-error|Image download failed|图片下载失败|圖片下載失敗
downloading|Downloading image|正在下载图片|正在下載圖片
source-error|Source could not be read or verified|来源读取或核验失败|來源讀取或驗證失敗
login-required|Source sign-in needs attention|请检查来源登录状态|請檢查來源登入狀態
cached|OCR cache|OCR 缓存|OCR 快取
fresh|Fresh OCR result|重新识别结果|重新辨識結果
selector-miss|Selector matched no elements|选择器未命中元素|選擇器未命中元素
selector-invalid|Invalid selector|无效选择器|無效選擇器
quoted|Signature or non-content element|签名或非正文元素|簽名或非正文元素
decorative|Decorative image|装饰图片|裝飾圖片
dimensions|Outside size limits|尺寸不符|尺寸不符
loading|Image not loaded|图片尚未加载|圖片尚未載入
host|Image host not allowed|不允许的图片主机|不允許的圖片主機
hidden|Hidden content|隐藏内容|隱藏內容
duplicate|Duplicate candidate|重复候选图片|重複候選圖片
accepted|Image accepted|图片已采用|圖片已採用
rule-test-busy|Another task is running. Wait for it to finish.|另一项任务正在运行，请等待结束。|另一項工作正在執行，請等待結束。
developer-mode-required|Enable developer mode to test rules.|请先开启开发者模式。|請先開啟開發者模式。
invalid-source-url|Use a supported URL from the configured course.|请使用已配置课程的有效来源链接。|請使用已設定課程的有效來源連結。
select-community-rule|Select a compatible community rule.|请选择适用的社区规则。|請選擇適用的社群規則。
invalid-rule-test|Check the saved course and source selection.|请检查已保存的课程和来源选择。|請檢查已儲存的課程與來源選擇。
image-unavailable|Preview is no longer available. Run the test again.|预览已失效，请重新测试。|預覽已失效，請重新測試。
import-error-title|Could not import rule|无法导入规则|無法匯入規則
import-file|File|文件|檔案
import-field|Field|字段|欄位
builder-id-label|Rule ID|规则 ID|規則 ID
import-id-type|ID must be a string.|ID 必须是字符串。|ID 必須是字串。
import-id-empty|ID cannot be empty.|ID 不能为空。|ID 不可為空白。
import-id-length|ID cannot exceed 256 characters.|ID 不能超过 256 个字符。|ID 不可超過 256 個字元。
import-id-format|Use lowercase letters and digits, starting with a letter. Separate at least two parts with a dot or hyphen; no spaces or consecutive separators.|ID 以小写字母开头，仅用小写字母和数字；至少两段，用点或连字符分隔，不能含空格或连续分隔符。|ID 以小寫字母開頭，僅用小寫字母與數字；至少兩段，以點或連字號分隔，不可含空白或連續分隔符號。
import-id-reserved|ID cannot contain builtin or demo, regardless of case.|ID 不能包含 builtin 或 demo，不区分大小写。|ID 不可包含 builtin 或 demo，不區分大小寫。
import-id-example|Valid example: alice.fit5122.moodle|有效示例：alice.fit5122.moodle|有效範例：alice.fit5122.moodle
import-selector|Unsupported image selector. Use the rule creator or a selector allowed by the schema.|图片选择器不受支持。请使用创建规则功能，或按规范填写选择器。|圖片選擇器不受支援。請使用建立規則功能，或依規格填寫選擇器。
import-schema-version|schemaVersion must be 1.|schemaVersion 必须为 1。|schemaVersion 必須為 1。
import-version|Version must contain three numbers, such as 1.0.0.|版本号必须包含三段数字，例如 1.0.0。|版本號必須包含三段數字，例如 1.0.0。
import-source|Source must be gmail, moodle or ed.|来源必须为 gmail、moodle 或 ed。|來源必須為 gmail、moodle 或 ed。
import-course|Course codes must use uppercase letters followed by digits, such as FIT5122.|课程代码必须由大写字母和数字组成，例如 FIT5122。|課程代碼必須由大寫字母與數字組成，例如 FIT5122。
import-string|This field requires non-empty text of at most 256 characters.|此字段必须为非空文本，最多 256 个字符。|此欄位必須為非空文字，最多 256 個字元。
import-object|This field must be a JSON object.|此字段必须为 JSON 对象。|此欄位必須為 JSON 物件。
import-array|This field must be a list within the schema's item limits.|此字段必须为列表，且条目数量符合规范限制。|此欄位必須為清單，且項目數量符合規格限制。
import-duplicate|Remove duplicate items from this list.|请移除此列表中的重复项。|請移除此清單中的重複項目。
import-unknown-field|This field is not supported by the rule schema.|规则规范不支持此字段。|規則規格不支援此欄位。
import-dimensions|Image dimensions must be integers from 1 to 4000; maximum height cannot be smaller than minimum height.|图片尺寸必须为 1 到 4000 的整数，最大高度不能小于最小高度。|圖片尺寸必須為 1 到 4000 的整數，最大高度不可小於最小高度。
import-attachments-source|Attachment rules are only available for Ed.|附件规则仅适用于 Ed。|附件規則僅適用於 Ed。
import-json|The file is not valid JSON. Check its quotes, commas and brackets.|文件不是有效的 JSON，请检查引号、逗号和括号。|檔案不是有效的 JSON，請檢查引號、逗號及括號。
import-size|Rule files must be no larger than 64 KB.|规则文件不能超过 64 KB。|規則檔案不可超過 64 KB。
validation|Invalid rule package|规则包校验失败|規則套件驗證失敗
saved|Rule selection saved|规则选择已保存|規則選擇已儲存
imported|Draft imported; not activated|草稿已导入，尚未启用|草稿已匯入，尚未啟用
updated|Rule library updated|规则库已更新|規則庫已更新
community-site|Community rule repository|社区规则仓库|社群規則儲存庫
confirm-delete|Delete this rule? Bound courses will use official rules.|删除此规则？已绑定课程将恢复官方规则。|刪除此規則？已綁定課程將恢復官方規則。
demo-none|No image|无图片|無圖片
demo-builtin|Official hit|仅官方命中|僅官方命中
demo-community|Community hit|仅社区命中|僅社群命中
demo-both|Both match one image|两者命中同图|兩者命中同圖
demo-filtered|Filtered image|图片被排除|圖片遭排除
demo-download|Download failure|下载失败|下載失敗
demo-empty|Empty OCR|OCR 无结果|OCR 無結果
demo-success|Recognition success|识别成功|辨識成功
`;
export const RULE_STRINGS={...Object.fromEntries(rows.trim().split('\n').map(line=>{const [key,en,zh_CN,zh_TW]=line.split('|');return ['rules.'+key,{en,zh_CN,zh_TW}];})),...WIZARD_STRINGS};
const originals=new Map(Object.entries(RULE_STRINGS).flatMap(([key,values])=>Object.values(values).map(value=>[value,key])));
export function ruleText(text,locale='en'){
 const key=RULE_STRINGS[text]?text:originals.get(String(text));
 const lang=/^(zh_TW|zh-TW|zh-Hant|zh-HK)$/i.test(locale)?'zh_TW':/^zh/.test(locale)?'zh_CN':'en';
 return key?RULE_STRINGS[key][lang]:undefined;
}
export function ruleError(error,t){
 const code=error?.code||String(error?.message||error||'').split(':')[0];
 const known=t('rules.'+code);
 if(known&&known!=='rules.'+code)return known;
 const path=error?.path||String(error?.message||'').match(/\$[.\w\[\]-]*/)?.[0]||'';
 return `${t('rules.validation')}${path?' · '+path:''}`;
}
