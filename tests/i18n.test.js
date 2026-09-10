import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {detectLanguage,translate,installLanguageUI} from '../extension/i18n.js';
test('dynamic progress translates before shorter dictionary fragments',()=>{
 const samples=['Gmail 列表读取完成（0.7 秒），0 个待检查会话','网站签到状态读取完成（10 场）','核对 FIT5120 2026-09-08 18:00 Studio','已保存 3 条文字记录','第 1/3 张图片已识别并保存','正在下载第 1/3 张图片（最多 20 秒）','已读取 Moodle FIT5201（1.2 秒）'];
 for(const text of samples){assert.doesNotMatch(translate(text,'en'),/[\u3400-\u9fff]/);assert.equal(translate(text,'zh'),text);}
 assert.equal(translate(samples[0],'en'),'Gmail list loaded (0.7 seconds), 0 threads to check');
 assert.equal(translate(samples[1],'en'),'Website attendance loaded (10 sessions)');
});
test('English is fallback; Chinese locales select Chinese',()=>{assert.equal(detectLanguage('zh-TW'),'zh');assert.equal(detectLanguage('en-MY'),'en');assert.equal(detectLanguage('fr'),'en');assert.equal(translate('等待签到码','en'),'Waiting for code');});
test('all verification states and repeat buttons translate as whole phrases',()=>{
 const messages=['重新登录并检测','登录检测通过。','请在打开的网站完成登录，检测会自动继续。','正在保存检测结果…','检测中 · 剩余 180 秒 · 请勿关闭浏览器页面','请在新打开的 Attendance 签到系统 标签页完成学校账号登录，检测会自动继续；请勿关闭页面。','Moodle 姓名与配置不一致，请登录配置的学校账号后继续检测。'];
 for(const message of messages)assert.doesNotMatch(translate(message,'en'),/[\u3400-\u9fff]/);
 assert.equal(translate(messages[0],'en'),'Sign in and verify again');
});
test('settings tabs and new actions translate and restore Chinese',()=>{
 const labels=['设置','课程来源与课表','签到记录','还有更多课程？','添加更多课程','保存设置','检查识别服务'];
 const dom=new JSDOM('<header></header>'+labels.map(label=>`<button>${label}</button>`).join(''),{url:'https://extension.test'}),doc=dom.window.document;
 const ui=installLanguageUI(doc),picker=doc.getElementById('language');
 picker.value='en';picker.dispatchEvent(new dom.window.Event('change'));
 assert.equal(doc.querySelector('button').textContent,'Settings');
 for(const button of doc.querySelectorAll('button'))assert.doesNotMatch(button.textContent,/[\u3400-\u9fff]/);
 picker.value='zh';picker.dispatchEvent(new dom.window.Event('change'));
 assert.deepEqual([...doc.querySelectorAll('button')].map(b=>b.textContent),labels);
 ui.disconnect();dom.window.close();
});
test('language changes translate existing and dynamic text without changing field values',async()=>{
 const dom=new JSDOM('<header></header><p>立即签到</p><input value="Example Student" placeholder="姓名">',{url:'https://extension.test'}),doc=dom.window.document;
 const ui=installLanguageUI(doc);assert.equal(doc.querySelector('p').textContent,'Check in now');assert.equal(doc.querySelector('input').value,'Example Student');
 doc.querySelector('p').textContent='已过期';await new Promise(r=>setTimeout(r,0));assert.equal(doc.querySelector('p').textContent,'Expired');
 const picker=doc.getElementById('language');picker.value='zh';picker.dispatchEvent(new dom.window.Event('change'));assert.equal(doc.querySelector('p').textContent,'已过期');assert.equal(doc.documentElement.lang,'zh-CN');ui.disconnect();dom.window.close();
});
