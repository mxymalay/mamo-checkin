import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {detectLanguage,translate,installLanguageUI} from '../extension/i18n.js';
test('English is fallback; Chinese locales select Chinese',()=>{assert.equal(detectLanguage('zh-TW'),'zh');assert.equal(detectLanguage('en-MY'),'en');assert.equal(detectLanguage('fr'),'en');assert.equal(translate('等待签到码','en'),'Waiting for code');});
test('language changes translate existing and dynamic text without changing field values',async()=>{
 const dom=new JSDOM('<header></header><p>立即签到</p><input value="Example Student" placeholder="姓名">',{url:'https://extension.test'}),doc=dom.window.document;
 const ui=installLanguageUI(doc);assert.equal(doc.querySelector('p').textContent,'Check in now');assert.equal(doc.querySelector('input').value,'Example Student');
 doc.querySelector('p').textContent='已过期';await new Promise(r=>setTimeout(r,0));assert.equal(doc.querySelector('p').textContent,'Expired');
 const picker=doc.getElementById('language');picker.value='zh';picker.dispatchEvent(new dom.window.Event('change'));assert.equal(doc.querySelector('p').textContent,'已过期');assert.equal(doc.documentElement.lang,'zh-CN');ui.disconnect();dom.window.close();
});
