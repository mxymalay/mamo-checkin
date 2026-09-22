import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {showManualCode} from '../extension/manual-code.js';

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
 dialog.querySelector('form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(dialog.querySelector('[role=alert]').textContent,'translated:error');assert.equal(dialog.querySelector('input').disabled,false);dom.window.close();
});
