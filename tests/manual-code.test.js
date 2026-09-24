import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {showManualCode} from '../extension/manual-code.js';
import {translate} from '../extension/i18n.js';
import {readFile} from 'node:fs/promises';

test('manual code dialog shows the exact session and prevents duplicate saves',async()=>{
 const dom=new JSDOM('<body></body>'),doc=dom.window.document;
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 dom.window.HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new dom.window.Event('close'));};
 let saves=0,finish;
 const dialog=showManualCode({doc,record:{course:'FIT5122',date:'2026-09-16',time:'18:00',type:'Applied',group:'01'},translate:s=>s==='保存并重试'?'Save and retry':s,save:async value=>{assert.equal(value,'8YG3G');saves++;await new Promise(resolve=>{finish=resolve;});}});
 assert.match(dialog.textContent,/FIT5122 · 2026-09-16 · 18:00 · Applied · 01/);
 assert.equal(dialog.querySelector('[type=submit]').textContent,'Save and retry');
 dialog.querySelector('input').value='8YG3G';
 const submit=()=>dialog.querySelector('form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
 submit();submit();assert.equal(saves,1);assert.equal(dialog.querySelector('input').disabled,true);
 finish();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(doc.querySelector('dialog'),null);dom.window.close();
});

test('failed manual code save stays open and displays a translated error',async()=>{
 const dom=new JSDOM('<body></body>'),doc=dom.window.document;
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 const dialog=showManualCode({doc,record:{},translate:s=>'translated:'+s,save:async()=>{throw new Error('error');}});
 dialog.querySelector('input').value='8YG3G';
 dialog.querySelector('form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(dialog.querySelector('[role=alert]').textContent,'translated:error');assert.equal(dialog.querySelector('input').disabled,false);dom.window.close();
});

for(const language of ['zh','zh_TW','en'])test(`manual validation uses ${language} instead of the browser language`,()=>{
 const dom=new JSDOM('<body></body>'),doc=dom.window.document;let saves=0;
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 try{
  const dialog=showManualCode({doc,record:{},translate:s=>translate(s,language),save:async()=>saves++});
  const input=dialog.querySelector('input'),form=dialog.querySelector('form'),error=dialog.querySelector('[role=alert]');
  assert.equal(form.noValidate,true);
  for(const value of ['', '1212','12345','ABCDEFG','AB!23','９AB12']){
   input.value=value;form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
   assert.equal(saves,0);assert.equal(error.hidden,false);assert.equal(input.getAttribute('aria-invalid'),'true');
   if(language==='en')assert.doesNotMatch(error.textContent,/[\u3400-\u9fff]/);
   if(value==='1212')assert.equal(error.textContent,translate('签到码需为 5 位英文字母或数字，且至少包含一个字母。',language));
  }
  input.dispatchEvent(new dom.window.Event('input'));assert.equal(error.hidden,true);assert.equal(input.hasAttribute('aria-invalid'),false);
 }finally{dom.window.close();}
});
test('manual dialog actions override the global full-width primary button',async()=>{
 const css=await readFile(new URL('../extension/style.css',import.meta.url),'utf8');
 const dom=new JSDOM('<body></body>'),doc=dom.window.document;dom.window.HTMLDialogElement.prototype.showModal=function(){};
 try{
  const style=doc.createElement('style');style.textContent=css;doc.head.append(style);
  const dialog=showManualCode({doc,record:{},save:async()=>{}}),buttons=[...dialog.querySelectorAll('button')];
  for(const button of buttons){const computed=dom.window.getComputedStyle(button);assert.equal(computed.width,'auto');assert.equal(computed.minHeight,'40px');assert.equal(computed.marginTop,'0px');}
 }finally{dom.window.close();}
});
