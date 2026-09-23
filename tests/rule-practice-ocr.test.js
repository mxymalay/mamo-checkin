import test from 'node:test';
import assert from 'node:assert/strict';
import {createPracticeOcr as createOcr,isPracticeDocument} from '../extension/source-rules/practice/ocr.js';
const sender={id:'test',url:'chrome-extension://test/options.html',documentId:'p',tab:{id:1}};
const createPracticeOcr=options=>createOcr({...options,authorizeOwner:value=>value.documentId===sender.documentId&&value.tab?.id===sender.tab.id});
test('practice OCR rejects untrusted sender and arbitrary image requests before reading',async()=>{
 let reads=0;
 const control=createPracticeOcr({extensionId:'test',getAsset:async()=>{reads++;},connectOcr:async()=>{},isBusy:()=>false});
 for(const bad of [{...sender,id:'other'},{...sender,url:'chrome-extension://test/practice.html'},{...sender,documentId:undefined},{...sender,url:sender.url+'?x=1'},{...sender,tab:{id:999}}])await assert.rejects(control.handle({type:'practiceRecognize',assetId:'attendance'},bad));
 for(const assetId of ['../private','__proto__','https://example.com/a.png'])await assert.rejects(control.handle({type:'practiceRecognize',assetId},sender));
 assert.equal(reads,0);assert.equal(isPracticeDocument(sender,'test'),true);
});
test('an options URL alone is not OCR authorization',async()=>{
 let reads=0;const control=createOcr({extensionId:'test',getAsset:()=>reads++,isBusy:()=>false,connectOcr:async()=>{}});
 await assert.rejects(control.handle({type:'practiceRecognize',assetId:'attendance'},sender),/practice-owner/);assert.equal(reads,0);
});
test('practice OCR runs only preview operation and closes services',async()=>{
 const calls=[];let closed=0;
 const control=createPracticeOcr({extensionId:'test',getAsset:async()=>({mimeType:'image/png',imageBase64:'YWJj'}),connectOcr:async()=>({call:async m=>{calls.push(m);return {observations:[{text:'8YG3G'}]};},close:()=>closed++}),isBusy:()=>false});
 assert.deepEqual(await control.handle({type:'practiceRecognize',assetId:'attendance'},sender),{text:['8YG3G']});
 assert.equal(calls[0].op,'ocr-preview');assert.equal(closed,1);assert.equal(control.busy,false);
});
test('practice OCR blocks concurrent work and times out without late service leaks',async()=>{
 let resolve,closed=0;
 const control=createPracticeOcr({extensionId:'test',getAsset:async()=>({mimeType:'image/png',imageBase64:'YWJj'}),connectOcr:()=>new Promise(r=>resolve=r),isBusy:()=>false,timeoutMs:10});
 const pending=control.handle({type:'practiceRecognize',assetId:'attendance'},sender);
 await assert.rejects(control.handle({type:'practiceRecognize',assetId:'second'},sender),/builder-busy/);
 await assert.rejects(pending,/builder-timeout/);resolve({close:()=>closed++});await new Promise(r=>setTimeout(r,0));assert.equal(closed,1);
});
test('only the owning document can cancel OCR and cancellation closes the service',async()=>{
 let began,closed=0;const started=new Promise(resolve=>began=resolve);
 const control=createPracticeOcr({extensionId:'test',getAsset:async()=>({mimeType:'image/png',imageBase64:'YWJj'}),connectOcr:async()=>({call:()=>{began();return new Promise(()=>{});},close:()=>closed++}),isBusy:()=>false,timeoutMs:50});
 const pending=control.handle({type:'practiceRecognize',assetId:'attendance'},sender);
 const rejected=assert.rejects(pending,/builder-cancelled/);await started;
 await control.cancelOwner({...sender,documentId:'other'});assert.equal(control.busy,true);
 await control.handle({type:'practiceCancel'},sender);await rejected;
 assert.equal(closed,1);assert.equal(control.busy,false);
});
