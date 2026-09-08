import test from 'node:test';
import assert from 'node:assert/strict';
import {createRunProgress} from '../extension/progress.js';
test('late OCR heartbeat cannot overwrite a completed run or mutate its counters',async()=>{
  const saved=[];const progress=createRunProgress(async value=>saved.push(value));
  await progress.update({message:'正在识别',increment:{images:1}});
  await progress.finish({message:'本次检查完成'});
  await progress.update({message:'旧识别消息',increment:{images:1},service:{busy:true}});
  assert.equal(saved.length,2);assert.equal(saved.at(-1).message,'本次检查完成');
  assert.equal(saved.at(-1).running,false);assert.equal(saved.at(-1).counts.images,1);
  assert.equal(saved[0].counts.images,1);
});
