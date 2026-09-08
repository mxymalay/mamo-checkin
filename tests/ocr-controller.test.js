import test from 'node:test';
import assert from 'node:assert/strict';
import {createOcrController} from '../extension/ocr-controller.js';

test('health responds while OCR is blocked, and a timeout retires the worker',async()=>{
  let terminated=0;
  const controller=createOcrController({createWorker:async()=>({terminate:async()=>{terminated++;}}),recognize:async()=>new Promise(()=>{}),timeoutMs:20});
  const pending=controller.ocr({});
  await new Promise(resolve=>setTimeout(resolve,1));
  assert.equal(controller.health().busy,true);
  assert.match(controller.health().stage,/识别/);
  await assert.rejects(pending,error=>error.resetRequired&&/超时/.test(error.message));
  assert.equal(terminated,1);
  assert.equal(controller.health().busy,false);
});

test('worker failure returns a reset request and a subsequent job can recover',async()=>{
  let jobs=0,workers=0;
  const controller=createOcrController({createWorker:async()=>{workers++;return {terminate:async()=>{}};},recognize:async()=>{if(++jobs===1)throw new Error('worker failed');return [{text:'ABCDE'}];},timeoutMs:100});
  await assert.rejects(controller.ocr({}),error=>error.resetRequired&&/worker failed/.test(error.message));
  assert.deepEqual(await controller.ocr({}),[{text:'ABCDE'}]);
  assert.equal(workers,2);
});

test('health is passive and does not initialize an OCR worker',()=>{
  let created=0;
  const controller=createOcrController({createWorker:async()=>{created++;},recognize:async()=>[]});
  assert.equal(controller.health().binaryReady,false);
  assert.equal(controller.health().busy,false);
  assert.equal(created,0);
});
