import test from 'node:test';
import assert from 'node:assert/strict';
import {createRunProgress} from '../extension/progress.js';
test('parallel collection preserves the login wait while recording its counts and events',async()=>{
 const saved=[],progress=createRunProgress(async value=>saved.push(value));
 await progress.update({phase:'waiting',waitingSite:'attendance',loginDeadline:12345,message:'Waiting for Attendance',context:{sourceUrl:'attendance'}});
 await progress.update({background:true,message:'Gmail loaded',context:{sourceUrl:'gmail'},increment:{messages:2}});
 const status=saved.at(-1);
 assert.equal(status.phase,'waiting');assert.equal(status.waitingSite,'attendance');assert.equal(status.loginDeadline,12345);
 assert.equal(status.message,'Waiting for Attendance');assert.equal(status.context.sourceUrl,'attendance');
 assert.equal(status.counts.messages,2);assert.equal(status.events.at(-1).message,'Gmail loaded');assert.equal(status.events.at(-1).context.sourceUrl,'gmail');
 await progress.update({phase:'collecting',waitingSite:null,loginDeadline:null,message:'Reading courses'});
 await progress.update({background:true,message:'Gmail OCR complete',increment:{images:1}});
 assert.equal(saved.at(-1).message,'Gmail OCR complete');assert.equal(saved.at(-1).counts.messages,2);
});
test('late OCR heartbeat cannot overwrite a completed run or mutate its counters',async()=>{
  const saved=[];const progress=createRunProgress(async value=>saved.push(value));
  await progress.update({message:'正在识别',increment:{images:1}});
  await progress.finish({message:'本次检查完成'});
  await progress.update({message:'旧识别消息',increment:{images:1},service:{busy:true}});
  assert.equal(saved.length,2);assert.equal(saved.at(-1).message,'本次检查完成');
  assert.equal(saved.at(-1).running,false);assert.equal(saved.at(-1).counts.images,1);
  assert.equal(saved[0].counts.images,1);
});
