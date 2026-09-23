import test from 'node:test';
import assert from 'node:assert/strict';
import {previewOcrService} from '../extension/source-rules/ocr-service.js';
test('old native hosts fall back to transient browser OCR without sending images',async()=>{
 const calls=[];let closed=false;
 const service=await previewOcrService({isWindows:false,nativeService:async()=>({call:async p=>{calls.push(p.op);return {binaryReady:true};},close:async()=>{closed=true;}}),browserService:async options=>{assert.equal(options.transient,true);return {call:async()=>({ok:true}),close:async()=>{}};}});
 await service.call({op:'ocr'});assert.deepEqual(calls,['ping']);assert.equal(closed,true);assert.equal(service.engine,'browser-wasm');
});
test('compatible native hosts receive only the non-archiving preview operation',async()=>{
 const calls=[];
 const service=await previewOcrService({isWindows:false,nativeService:async()=>({call:async p=>{calls.push(p.op);return {binaryReady:true,previewOcr:true};},close:async()=>{}}),browserService:()=>{throw new Error('must prefer native');}});
 await service.call({op:'ocr'});assert.deepEqual(calls,['ping','ocr-preview']);assert.equal(service.engine,'apple-vision');
});
test('preview command is translated for the transient browser OCR engine without metadata',async()=>{
 let request;const service=await previewOcrService({isWindows:true,browserService:async options=>{assert.equal(options.transient,true);return {call:async value=>{request=value;return {};},close(){}};}});
 await service.call({op:'ocr-preview',imageBase64:'YWJj',mimeType:'image/png',meta:{private:true}});
 assert.equal(request.op,'ocr');assert.equal(request.meta,undefined);
});
