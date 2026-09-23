const rows={
 'sample-courses':['Sample course','样例课程','範例課程'],
 'real-courses':['Real courses','真实课程','真實課程'],
 'remove-sample':['Remove sample course','删除样例课程','刪除範例課程'],
 'ocr-error':['Recognition failed.','识别失败。','辨識失敗。'],
 'ocr-timeout':['Recognition timed out. Retry the test or check the recognition service.','图片识别超时，请重试测试或检查识别服务。','圖片辨識逾時，請重試測試或檢查辨識服務。'],
 title:['Simulated creation','模拟创建','模擬建立'],
 steps:[['Open sample page','Choose course, source and page','Select image','Check matches','Test recognition','Save rule'],['打开示例页面','选择课程、来源和页面','选择图片','检查匹配','测试识别','保存规则'],['開啟範例頁面','選擇課程、來源和頁面','選擇圖片','檢查匹配','測試辨識','儲存規則']],
 guide1:['Open the sample course in a new tab, then return here.','在新标签页打开示例课程，然后返回此处。','在新分頁開啟範例課程，然後返回此處。'],
 guide2:['Choose the registered practice page. These settings apply only to practice.','选择已注册的练习页面。这些设置仅用于练习。','選擇已註冊的練習頁面。這些設定僅用於練習。'],
 guide3:['Browse the course activities and select an attendance image.','浏览课程活动并选择签到图片。','瀏覽課程活動並選擇簽到圖片。'],
 guide4:['Review actual matches. Exclude unrelated images and confirm additional matches.','检查实际匹配。排除无关图片并确认额外匹配。','檢查實際匹配。排除無關圖片並確認額外匹配。'],
 guide5:['Test recognition on a matched image. Recognition does not verify attendance correctness.','测试匹配图片的识别。识别结果不代表签到内容正确。','測試匹配圖片的辨識。辨識結果不代表簽到內容正確。'],
 guide6:['Save only to the isolated practice library. Real courses and settings are unchanged.','仅保存到独立练习库。真实课程和设置不受影响。','僅儲存至獨立練習庫。真實課程與設定不受影響。'],
 'open-source':['Open sample page','打开示例页面','開啟範例頁面'],reopen:['Reopen sample page','重新打开示例页面','重新開啟範例頁面'],
 back:['Back to rules','返回规则','返回規則'],reset:['Reset practice','重置练习','重設練習'],cancel:['Cancel','取消','取消'],
 course:['Course','课程','課程'],source:['Source','来源','來源'],page:['Page','页面','頁面'],refresh:['Refresh pages','刷新页面','重新整理頁面'],
 context:['Continue','继续','繼續'],pick:['Select image on sample page','在示例页面选择图片','在範例頁面選擇圖片'],'check-selection':['Check selection','检查选择','檢查選擇'],
 preview:['Run match preview','预览匹配','預覽匹配'],'matches-next':['Continue to recognition','继续测试识别','繼續測試辨識'],
 'review-needed':['Review the other images selected by this rule. Check the ones you want to recognize, or choose Exclude.','请检查规则选中的其他图片：需要的勾选“这张也要识别”，不需要的选择“排除”。','請檢查規則選中的其他圖片：需要的勾選「這張也要辨識」，不需要的選擇「排除」。'],
 recognize:['Test recognition','测试识别','測試辨識'],'ocr-next':['Continue to save','继续保存','繼續儲存'],skip:['Skip recognition','跳过识别','略過辨識'],
 'select-again':['Back to image selection','返回图片选择','返回圖片選擇'],
 name:['Rule name','规则名称','規則名稱'],id:['Rule ID','规则 ID','規則 ID'],'edit-rule':['Apply name and ID','应用名称和 ID','套用名稱與 ID'],
 draft:['Save practice draft','保存练习草稿','儲存練習草稿'],enable:['Simulate enable','模拟启用','模擬啟用'],export:['Export JSON','导出 JSON','匯出 JSON'],json:['Generated JSON','生成的 JSON','產生的 JSON'],
 include:['Include','包含','包含'],exclude:['Exclude','排除','排除'],unmarked:['Unmarked','未标记','未標記'],confirm:['Confirm extra match','确认额外匹配','確認額外匹配'],matched:['Matched','已匹配','已匹配'],image:['Course image','课程图片','課程圖片'],
 busy:['Working…','处理中…','處理中…'],error:['Operation failed. Retry or reopen the sample page.','操作失败。请重试或重新打开示例页面。','操作失敗。請重試或重新開啟範例頁面。'],
 empty:['No text recognized. Retry or skip recognition to continue the simulation.','未识别到文字，请重试或跳过识别继续模拟。','未辨識到文字，請重試或略過辨識繼續模擬。'],
 saved:['Practice draft saved for DEMO1000 only.','已保存仅用于 DEMO1000 的练习草稿。','已儲存僅用於 DEMO1000 的練習草稿。'],enabled:['Simulated enable completed for DEMO1000 only.','已完成仅用于 DEMO1000 的模拟启用。','已完成僅用於 DEMO1000 的模擬啟用。'],
 library:['Saved practice rules','已保存的练习规则','已儲存的練習規則'],none:['No practice rules saved.','尚无练习规则。','尚無練習規則。'],applied:['Applied in practice','已在练习中应用','已在練習中套用'],expired:['Practice session ended. Reopen the sample page.','练习会话已结束。请重新打开示例页面。','練習工作階段已結束。請重新開啟範例頁面。']
};
export const WIZARD_STRINGS=Object.fromEntries(Object.entries(rows).flatMap(([key,values])=>key==='steps'
 ?values[0].map((_,index)=>[`rules.practice-step-${index+1}`,{en:values[0][index],zh_CN:values[1][index],zh_TW:values[2][index]}])
 :[[`rules.practice-${key}`,{en:values[0],zh_CN:values[1],zh_TW:values[2]}]]));
export function practiceText(key,lang='en'){
 const index=/TW|Hant|HK/i.test(lang)?2:/^zh/i.test(lang)?1:0;
 return rows[key]?.[index]||key;
}
