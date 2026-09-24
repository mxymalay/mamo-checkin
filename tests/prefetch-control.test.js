import test from 'node:test';
import assert from 'node:assert/strict';
import {prefetchCall} from '../extension/prefetch-control.js';

test('pausing releases an unfinished OCR without accepting its late result',async()=>{
 const controller=new AbortController();let finish,accepted=false;
 const pending=prefetchCall(controller.signal,()=>new Promise(resolve=>{finish=resolve;}));
 pending.then(()=>{accepted=true;},()=>{});
 await Promise.resolve();controller.abort();
 await assert.rejects(pending,{name:'AbortError'});
 finish({code:'AB123'});await Promise.resolve();assert.equal(accepted,false);
});
test('no new OCR can start after pause; completed OCR remains available',async()=>{
 const controller=new AbortController();let count=0;
 const result=await prefetchCall(controller.signal,async()=>{count++;return 'AB123';});
 controller.abort();assert.equal(result,'AB123');
 assert.throws(()=>prefetchCall(controller.signal,()=>{count++;}),{name:'AbortError'});assert.equal(count,1);
});
