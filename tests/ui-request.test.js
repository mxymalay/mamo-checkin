import test from 'node:test';
import assert from 'node:assert/strict';
import {uiRequest,requestTimeoutMs} from '../extension/ui-request.js';

test('practice OCR outlives nested OCR deadlines without slowing ordinary requests',()=>{
 assert.equal(requestTimeoutMs({type:'settings'}),10000);
 assert.equal(requestTimeoutMs({type:'redetect'}),30000);
 assert.equal(requestTimeoutMs({type:'practiceBuilder',command:{type:'builderPreview'}}),60000);
 assert.ok(requestTimeoutMs({type:'practiceBuilder',command:{type:'builderRecognize'}})>300000);
});
test('practice error codes survive transport without attendance advice',async()=>{
 const original=globalThis.chrome;
 try{
  globalThis.chrome={runtime:{sendMessage:async()=>({ok:false,error:'builder-timeout'})}};
  await assert.rejects(uiRequest({type:'practiceBuilder',command:{type:'builderRecognize'}}),error=>error.message==='builder-timeout');
  globalThis.chrome.runtime.sendMessage=async()=>({ok:true,text:['AB123']});
  assert.deepEqual(await uiRequest({type:'practiceBuilder',command:{type:'builderRecognize'}}),{ok:true,text:['AB123']});
 }finally{globalThis.chrome=original;}
});
