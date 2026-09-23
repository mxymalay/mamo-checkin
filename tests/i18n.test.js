import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {detectLanguage,translate,installLanguageUI} from '../extension/i18n.js';
import {ruleUI} from '../extension/source-rules/ui.js';
test('open details and rule names switch language without changing raw JSON or user content',()=>{
 const dom=new JSDOM('<header></header><section id="manager"><pre data-rule-literal>{"name":"内置 Gmail"}</pre><input value="软件开发"></section>',{url:'https://extension.test'}),doc=dom.window.document;
 const ui=installLanguageUI(doc),root=doc.querySelector('#manager'),{nameNode}=ruleUI(root,translate);
 const title=nameNode({id:'local.sample',name:{en:'Gmail example',zh_CN:'Gmail 示例',zh_TW:'Gmail 範例'}},'h3');root.append(title);
 try{for(const [lang,want] of [['zh_TW','Gmail 範例'],['en','Gmail example'],['zh','Gmail 示例']]){doc.querySelector('#language').value=lang;ui.apply();assert.equal(title.textContent,want);assert.equal(doc.querySelector('pre').textContent,'{"name":"内置 Gmail"}');assert.equal(doc.querySelector('input').value,'软件开发');}}finally{ui.disconnect();dom.window.close();}
});
test('app-owned validation and error templates translate while values remain literal',()=>{
 for(const [source,expected] of [['FIT5122 发件人邮箱无效','FIT5122 寄件者信箱無效'],['图片下载失败（HTTP 403），请检查原页面登录和网络状态','圖片下載失敗（HTTP 403），請檢查原頁面登入和網路狀態'],['课程代码重复：','課程代碼重複：']])assert.equal(translate(source,'zh_TW'),expected);
 assert.equal(translate(translate('FIT5122 发件人邮箱无效','en'),'zh_TW'),'FIT5122 寄件者信箱無效');
 assert.equal(translate('設定','en'),'Settings');
});
test('dynamic progress roundtrips and nested application reasons use the selected language',()=>{
 const text='已保存 3 条文字记录',tw=translate(text,'zh_TW');
 assert.equal(translate(tw,'en'),'Saved 3 text records');assert.equal(translate(tw,'zh'),text);
 assert.equal(translate('1 项处理失败：签到码格式不正确','en'),'1 item failed: Invalid check-in code format');
 assert.equal(translate('本次签到成功 1 场；网站显示已签到 2 场','zh_TW'),'本次簽到成功 1 場；網站顯示已簽到 2 場');
 for(const locale of ['zh-Hant-TW','zh_Hant_TW','zh-MO'])assert.equal(translate('rules.origin-community',locale),'社群');
 for(const language of ['en','zh','zh_TW'])assert.equal(translate('Install Mac Recognition.command',language),'Install Mac Recognition.command');
 assert.equal(translate('安装 Mac 识别服务.command','zh_TW'),'安装 Mac 识别服务.command');
});
test('nested download and export clauses translate without leftover source-language prose',()=>{
 const download='图片下载失败（HTTP 403），请检查原页面登录和网络状态；原页面读取也未完成，请确认该页面仍已登录并可访问图片';
 assert.doesNotMatch(translate(download,'en'),/[\u3400-\u9fff]/);
 assert.match(translate(download,'zh_TW'),/^圖片下載失敗（HTTP 403）/);
 const exported='已导出 3 条记录，覆盖 2026-09-20 至 2026-09-23。助手只保存最近 7 天内处理的记录；更早的场次请以签到网站显示为准。';
 assert.doesNotMatch(translate(exported,'en'),/[\u3400-\u9fff]/);
 assert.match(translate(exported,'zh_TW'),/涵蓋 2026-09-20 至 2026-09-23/);
});
test('Traditional Chinese covers existing UI and preserves dynamic user values',()=>{
 for(const [source,expected] of [['设置','設定'],['等待签到码','等待簽到碼'],['课程来源与课表','課程來源與課表'],['所有候选码均被网站拒绝，可能识别有误或来源码有误，请核对来源或手动补码。','所有候選碼均被網站拒絕，可能辨識有誤或來源碼有誤，請核對來源或手動補碼。']])assert.equal(translate(source,'zh_TW'),expected);
 assert.equal(translate('已保存 3 条文字记录','zh_TW'),'已儲存 3 筆文字記錄');
 assert.equal(translate('请在 Gmail 登录 张三@example.com，完成验证后会自动检测。','zh_TW'),'請在 Gmail 登入 张三@example.com，完成驗證後會自動偵測。');
 assert.equal(translate('个人原始内容 张三','zh_TW'),'个人原始内容 张三');
 for(const locale of ['zh-TW','zh-HK','zh-Hant','zh_Hant_TW'])assert.equal(detectLanguage(locale),'zh_TW');
});
test('every existing dictionary entry has an explicit Traditional translation',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../extension/i18n.js',import.meta.url),'utf8');
 const rows=source.match(/const entries=`([\s\S]*?)`\.trim/)[1].trim().split('\n');
 const missing=rows.filter(row=>!row.split('|')[2]);
 assert.deepEqual(missing,[]);
});
test('scoped save feedback translates completely and restores Chinese',()=>{
 for(const [zh,en] of [['课程检索已保存。','Course search saved.'],['自动检查设置已保存。','Automatic check settings saved.'],['正在保存…','Saving…']]){
  assert.equal(translate(zh,'en'),en);assert.equal(translate(en,'zh'),zh);
 }
});
test('every developer switch has accessible bilingual help that survives language switching',async()=>{
 const {readFile}=await import('node:fs/promises');
 const dom=new JSDOM(await readFile(new URL('../extension/options.html',import.meta.url),'utf8'),{url:'https://extension.test'});
 const ui=installLanguageUI(dom.window.document),doc=dom.window.document;
 try{
  const buttons=[...doc.querySelectorAll('#advanced-settings .help-button')];assert.equal(buttons.length,4);
  doc.getElementById('language').value='en';ui.apply();
  for(const button of buttons){const help=doc.getElementById(button.getAttribute('aria-describedby'));assert.equal(button.type,'button');assert.equal(help.getAttribute('role'),'tooltip');assert.doesNotMatch(help.textContent,/[\u3400-\u9fff]/);assert.doesNotMatch(button.getAttribute('aria-label'),/[\u3400-\u9fff]/);}
  doc.getElementById('language').value='zh';ui.apply();
  for(const button of buttons)assert.match(doc.getElementById(button.getAttribute('aria-describedby')).textContent,/[\u3400-\u9fff]/);
 }finally{ui.disconnect();dom.window.close();}
});
test('dynamic progress translates before shorter dictionary fragments',()=>{
 const samples=['Gmail 列表读取完成（0.7 秒），0 个待检查会话','网站签到状态读取完成（10 场）','核对 FIT5120 2026-09-08 18:00 Studio','已保存 3 条文字记录','第 1/3 张图片已识别并保存','正在下载第 1/3 张图片（最多 20 秒）','已读取 Moodle FIT5201（1.2 秒）'];
 for(const text of samples){assert.doesNotMatch(translate(text,'en'),/[\u3400-\u9fff]/);assert.equal(translate(text,'zh'),text);}
 assert.equal(translate(samples[0],'en'),'Gmail list loaded (0.7 seconds), 0 threads to check');
 assert.equal(translate(samples[1],'en'),'Website attendance loaded (10 sessions)');
});
test('composed login failures translate as a complete message',()=>{
 const message='Attendance 课表检查失败：Attendance 需要登录。请打开 Attendance，完成学校账号登录及验证；请勿关闭浏览器页面，再返回助手重试。本轮尚未完成该网站的检查。';
 const translated=translate(message,'en');
 assert.doesNotMatch(translated,/[\u3400-\u9fff]/);
 assert.equal(translated,"Attendance timetable check failed: Attendance requires sign-in. Open Attendance, complete school sign-in and verification; keep the browser page open, then return to Assistant and retry. This site's check is not complete.");
});
test('pending course messages translate without leftover Chinese fragments',()=>{
 const message='有 1 场等待签到码，暂未找到；可能尚未发布或当前来源未检索到，可稍后重试';
 const translated=translate(message,'en');
 assert.doesNotMatch(translated,/[\u3400-\u9fff]/);
 assert.equal(translated,'1 session is waiting for codes. They may not be published yet or were not found in the selected sources. Retry later.');
});
test('course setup messages stay fully bilingual, including detected counts',()=>{
 const messages=['课程配置','正在检测课程，请稍候。','正在自动读取课程，请保持签到系统登录；检测期间请勿关闭浏览器页面。','已检测到课程，请在下方完善课程来源和课表。','未检测到课程，请检查签到系统登录状态后重试，或手动添加课程。','需要修改姓名？','已检测到 2 门课程。请在下方完善课程来源和课表。'];
 for(const message of messages)assert.doesNotMatch(translate(message,'en'),/[\u3400-\u9fff]/);
 assert.equal(translate('已检测到 1 门课程。请在下方完善课程来源和课表。','en'),'1 course detected. Complete the sources and timetable below.');
 assert.equal(translate('已检测到 2 门课程。请在下方完善课程来源和课表。','en'),'2 courses detected. Complete the sources and timetable below.');
});
test('English is fallback; Chinese variants retain their distinct locales',()=>{assert.equal(detectLanguage('zh-TW'),'zh_TW');assert.equal(detectLanguage('zh-CN'),'zh');assert.equal(detectLanguage('en-MY'),'en');assert.equal(detectLanguage('fr'),'en');assert.equal(translate('等待签到码','en'),'Waiting for code');});
test('English-rendered record states restore when switching back to Chinese',()=>{
 for(const [zh,en] of [['结果待确认','Confirmation pending'],['核对提交结果','Verifying submission'],['等待签到码','Waiting for code'],['需要核对','Review required'],['提交结果尚未确认，下次运行先检查学校签到状态。','Submission is unconfirmed. The next run will check the school attendance status first.']]){
  assert.equal(translate(zh,'en'),en);assert.equal(translate(en,'zh'),zh);
 }
});
test('all verification states and repeat buttons translate as whole phrases',()=>{
 const messages=['重新登录并检测','重新登录并读取姓名','登录检测通过。','请在打开的网站完成登录，检测会自动继续。','正在保存检测结果…','检测中 · 剩余 180 秒 · 请勿关闭浏览器页面','请在新打开的 Attendance 签到系统 标签页完成学校账号登录，检测会自动继续；请勿关闭页面。','Moodle 姓名与配置不一致，请登录配置的学校账号后继续检测。'];
 for(const message of messages)assert.doesNotMatch(translate(message,'en'),/[\u3400-\u9fff]/);
 assert.equal(translate(messages[0],'en'),'Sign in and verify again');
 assert.equal(translate(messages[1],'en'),'Sign in and read name again');
 assert.equal(translate('课程检索','en'),'Course search');
 assert.equal(translate('文稿 / 签到助手归档','en'),'Documents / 签到助手归档');
});
test('repeat identity buttons never retain a Chinese prefix',()=>{
 assert.equal(translate('重新登录并读取姓名','en'),'Sign in and read name again');
 assert.equal(translate('重新登录并检测','en'),'Sign in and verify again');
});
test('recognition health status translates beside its icon',()=>{
 assert.equal(translate('暂未检测到，5 秒后自动检查','en'),'Not detected yet. Checking again in 5 seconds.');
 assert.equal(translate('检测成功','en'),'Check succeeded');
});
test('settings tabs and new actions translate and restore Chinese',()=>{
 const labels=['设置','课程来源与课表','签到记录','还有更多课程？','添加更多课程','保存设置','检查识别服务'];
 const dom=new JSDOM('<header></header>'+labels.map(label=>`<button>${label}</button>`).join(''),{url:'https://extension.test'}),doc=dom.window.document;
 const ui=installLanguageUI(doc),picker=doc.getElementById('language');
 picker.value='en';picker.dispatchEvent(new dom.window.Event('change'));
 assert.equal(doc.querySelector('body>button').textContent,'Settings');
 for(const button of doc.querySelectorAll('body>button'))assert.doesNotMatch(button.textContent,/[\u3400-\u9fff]/);
 picker.value='zh';picker.dispatchEvent(new dom.window.Event('change'));
 assert.deepEqual([...doc.querySelectorAll('body>button')].map(b=>b.textContent),labels);
 ui.disconnect();dom.window.close();
});
test('language changes translate existing and dynamic text without changing field values',async()=>{
 const dom=new JSDOM('<header></header><p>立即签到</p><input value="Example Student" placeholder="姓名">',{url:'https://extension.test'}),doc=dom.window.document;
 const ui=installLanguageUI(doc);assert.equal(doc.querySelector('p').textContent,'Check in now');assert.equal(doc.querySelector('input').value,'Example Student');
 doc.querySelector('p').textContent='已过期';await new Promise(r=>setTimeout(r,0));assert.equal(doc.querySelector('p').textContent,'Expired');
 const picker=doc.getElementById('language');picker.value='zh';picker.dispatchEvent(new dom.window.Event('change'));assert.equal(doc.querySelector('p').textContent,'已过期');assert.equal(doc.documentElement.lang,'zh-CN');ui.disconnect();dom.window.close();
});
test('English translation normalizes punctuation left around nested labels',()=>{
 const translated=translate('双击 Install Mac Recognition.command，按终端提示安装。回到此页面，等待检测通过，再点击“刷新并继续”。','en');
 assert.match(translated,/^Double-click Install Mac Recognition\.command, Follow the terminal instructions\./);
 assert.match(translated,/Return here, wait for verification, then click"Reload and continue"/);
 assert.doesNotMatch(translated,/[，。；：？！“”‘’（）]/);
});
test('recognition settings and browser archive labels are fully translated',()=>{
 for(const text of [
  '当前使用浏览器内置识别引擎，全程在本机完成、无需安装；如需更高识别精度，可安装 Mac OCR 配套程序。',
  '浏览器扩展存储（无本机归档）','开发者模式','切换模式',
  'Windows 使用浏览器内置识别，全程在本机完成。','Mac 使用 Apple Vision 在本机识别。'
 ])assert.doesNotMatch(translate(text,'en'),/[\u3400-\u9fff]/);
});
