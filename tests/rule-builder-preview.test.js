import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuilderPreview} from '../extension/source-rules/builder/preview.js';
test('preview retains only bounded memory and sends no production metadata to OCR',async()=>{
 let sent,closed=false;const preview=createBuilderPreview({downloadImage:async()=>({mimeType:'image/png',imageBase64:'YWJj'}),connectOcr:async()=>({call:async value=>{sent=value;return {observations:[{text:'AB123'}]};},close:()=>{closed=true;}})});
 await preview.load([{id:'a',url:'https://learning.monash.edu/a.png',tabId:1}]);assert.equal(preview.image('a').imageBase64,'YWJj');
 assert.deepEqual(await preview.recognize('a'),['AB123']);assert.equal(sent.meta,undefined);assert.equal(sent.op,'ocr-preview');assert.ok(closed);
 preview.clear();assert.throws(()=>preview.image('a'),/builder-image/);
 await assert.rejects(preview.load(Array.from({length:21},(_,i)=>({id:String(i)}))),/builder-budget/);
});
test('late OCR service connections are closed after timeout',async()=>{
 let resolve,closed=0;const preview=createBuilderPreview({timeoutMs:5,downloadImage:async()=>({mimeType:'image/png',imageBase64:'YQ=='}),connectOcr:()=>new Promise(done=>{resolve=done;})});
 await preview.load([{id:'a'}]);await assert.rejects(preview.recognize('a'),/builder-timeout/);resolve({close(){closed++;}});await new Promise(done=>setTimeout(done,0));assert.equal(closed,1);
});
test('OCR has a separate budget from image downloads',async()=>{
 const preview=createBuilderPreview({timeoutMs:5,ocrTimeoutMs:100,downloadImage:async()=>({mimeType:'image/png',imageBase64:'YQ=='}),connectOcr:async()=>({call:async()=>{await new Promise(resolve=>setTimeout(resolve,20));return {observations:[{text:'AB123'}]};},close(){}})});
 await preview.load([{id:'a'}]);assert.deepEqual(await preview.recognize('a'),['AB123']);
});
