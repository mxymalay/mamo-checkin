import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {installLanguageUI} from '../extension/i18n.js';
import {installPersonalSettingsMenu} from '../extension/personal-settings-menu.js';
test('header places status before two icon popovers and preserves language and configuration actions',async()=>{
 const dom=new JSDOM(await readFile(new URL('../extension/options.html',import.meta.url),'utf8'),{url:'https://extension.test/options.html'}),doc=dom.window.document;
 const personal=installPersonalSettingsMenu(doc),language=installLanguageUI(doc);
 try{
  const tools=doc.querySelector('.header-tools');assert.equal(tools.firstElementChild.id,'mode');assert.ok(tools.children[1].classList.contains('language-action'));
  assert.equal(doc.querySelector('#language').hidden,true);assert.equal(doc.querySelector('#personal-settings').textContent,'');assert.ok(doc.querySelector('#personal-settings .header-control-icon'));
  doc.querySelector('#language-toggle').click();assert.equal(doc.querySelector('#language-menu').hidden,false);
  doc.querySelector('[data-language=zh_TW]').click();assert.equal(doc.documentElement.lang,'zh-TW');assert.equal(dom.window.localStorage.getItem('mamo-language'),'zh_TW');assert.equal(doc.querySelector('#language-menu').hidden,true);
  doc.querySelector('#personal-settings').click();assert.equal(doc.querySelector('#personal-settings-menu').hidden,false);assert.match(doc.querySelector('#personal-settings-menu').textContent,/匯入/);
  doc.querySelector('#language-toggle').click();assert.equal(doc.querySelector('#personal-settings-menu').hidden,true);
  doc.querySelector('#language-menu').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(doc.querySelector('#language-menu').hidden,true);assert.equal(doc.activeElement.id,'language-toggle');
 }finally{language.disconnect();personal.dispose();dom.window.close();}
});
