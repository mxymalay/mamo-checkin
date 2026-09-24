import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {ruleText} from '../extension/source-rules/strings.js';

const read=name=>readFile(new URL('../extension/'+name,import.meta.url),'utf8');
test('records keep the empty prompt without a duplicate log entry or dashed divider',async()=>{
 const dom=new JSDOM(await read('options.html'));
 try{
  const doc=dom.window.document,style=doc.createElement('style');style.textContent=await read('dashboard.css');doc.head.append(style);
  const empty=doc.querySelector('#empty'),log=doc.querySelector('#run-log');
  assert.ok(empty);assert.equal(log,null);assert.ok(doc.querySelector('#run-events-details'));
  assert.notEqual(dom.window.getComputedStyle(empty).borderTopStyle,'dashed');
 }finally{dom.window.close();}
});
test('module tabs share width and primary module actions are content-sized',async()=>{
 const dom=new JSDOM('<main class="modules-shell"><nav class="module-tabs"><button>Tab</button></nav><div class="recognition-actions"><button id="check-health" class="primary">Check</button></div><div class="rule-local-actions"><button class="primary">Create</button></div></main>');
 try{
  const doc=dom.window.document,style=doc.createElement('style');style.textContent=await read('style.css')+'\n'+await read('modules.css');doc.head.append(style);
  const css=selector=>dom.window.getComputedStyle(doc.querySelector(selector));
  assert.equal(css('.module-tabs button').flexGrow,'1');
  assert.equal(css('.module-tabs button').flexBasis,'0px');
  assert.equal(css('#check-health').width,'auto');
  assert.equal(css('.rule-local-actions .primary').width,'auto');
 }finally{dom.window.close();}
});
test('course rule headings are localized in all supported languages',()=>{
 for(const [locale,library,matching] of [
  ['en','Recognition rule repository','Assign rules to courses'],
  ['zh_CN','规则识别仓库','规则匹配课程'],
  ['zh_TW','規則辨識倉庫','規則配對課程']
 ]){
  assert.equal(ruleText('rules.library',locale),library);
  assert.equal(ruleText('rules.matching',locale),matching);
 }
});
test('main tabs match module tab typography and the recognition entry uses rules terminology',async()=>{
 const dom=new JSDOM('<nav class="page-tabs"><button>Settings</button></nav><nav class="module-tabs"><button>Recognition</button></nav>');
 try{
  const style=dom.window.document.createElement('style');style.textContent=await read('style.css')+'\n'+await read('dashboard.css')+'\n'+await read('modules.css');dom.window.document.head.append(style);
  const main=dom.window.getComputedStyle(dom.window.document.querySelector('.page-tabs button')),modules=dom.window.getComputedStyle(dom.window.document.querySelector('.module-tabs button'));
  assert.equal(main.fontSize,modules.fontSize);assert.equal(main.padding,modules.padding);
  assert.equal(ruleText('rules.page-title','en'),'Recognition and rules');
  assert.equal(ruleText('rules.page-title','zh_CN'),'识别与规则');assert.equal(ruleText('rules.page-title','zh_TW'),'辨識與規則');
  assert.doesNotMatch(await read('options.html'),/识别与模块/);
 }finally{dom.window.close();}
});
test('recognition engine name is readable at normal interface scale',async()=>{
 const dom=new JSDOM('<main class="modules-shell"><strong id="health">Built-in browser OCR</strong></main>');
 try{const style=dom.window.document.createElement('style');style.textContent=await read('style.css')+'\n'+await read('modules.css');dom.window.document.head.append(style);assert.equal(dom.window.getComputedStyle(dom.window.document.querySelector('#health')).fontSize,'18px');}
 finally{dom.window.close();}
});
