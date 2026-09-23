import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createBuilderPageBridge} from '../extension/source-rules/builder/page-bridge.js';
import {createBuilderSession} from '../extension/source-rules/builder/session.js';
import {createBuilderPreview} from '../extension/source-rules/builder/preview.js';
import {createRuleLibrary} from '../extension/source-rules/library.js';
import {memoryStorage} from './helpers/source-rules.js';

for(const source of ['gmail','moodle'])test(`${source}: serialized picker through real adapters, preview, OCR and atomic enable`,async()=>{
 const url=source==='gmail'?'https://mail.google.com/mail/u/0/#all/abc':'https://learning.monash.edu/course/view.php?id=1';
 const imageUrl=source==='gmail'?'https://mail.google.com/mail/u/0/image.png':'https://learning.monash.edu/image.png';
 const body=`<div class="attendance"><a href="https://example.test"><img src="${imageUrl}"></a></div>`;
 const html=source==='gmail'?`<header aria-label="Google Account: abcd1234@student.monash.edu"></header><main><h2>DEMO1000</h2><div data-legacy-message-id="1"><span email="teacher@example.test"></span><div class="a3s">${body}</div></div></main>`:`<div class="usermenu"><img alt="Example Student"></div><h1>DEMO1000 2026</h1><main><section data-sectionid="1">${body}</section></main>`;
 const dom=new JSDOM(html,{url,runScripts:'outside-only'}),doc=dom.window.document;
 const img=doc.querySelector('.attendance img');Object.defineProperties(img,{naturalWidth:{value:600},naturalHeight:{value:90},complete:{value:true}});
 const settings={name:'Example Student',email:'abcd1234@student.monash.edu',courses:['DEMO1000'],academicYear:2026,sourceModes:{DEMO1000:'email-moodle'},moodleUrls:{DEMO1000:['https://learning.monash.edu/course/view.php?id=1']}};
 const storage=memoryStorage({settings}),library=createRuleLibrary({storage,builtins:{}}),calls=[];
 const tabs={get:async()=>({id:7,url:dom.window.location.href}),update:async()=>{},query:async()=>[{id:7,url}]};
 const scripting={executeScript:async({target,func,args=[]})=>{assert.equal(target.tabId,7);if(target.documentIds)assert.deepEqual(target.documentIds,['source-document']);return [{documentId:'source-document',result:dom.window.eval('('+func.toString()+')')(...structuredClone(args))}];}};
 const preview=createBuilderPreview({downloadImage:async fetched=>{assert.equal(fetched,imageUrl);return {imageBase64:'YQ==',mimeType:'image/png'};},connectOcr:async()=>({call:async message=>{calls.push(message);return {observations:[{text:'AB123'}]};},close(){}})});
 const controller=createBuilderSession({extensionId:'ext',storage,tabs,pageBridge:createBuilderPageBridge({tabs,scripting}),getLibrary:async()=>library,preview,isBusy:()=>false});
 const sender={id:'ext',url:'chrome-extension://ext/options.html',documentId:'owner',tab:{id:1}};let state;
 const send=async(type,extra={})=>controller.handle({type,sessionId:state?.sessionId,revision:state?.revision,...extra},sender);
 try{
  state=await send('builderStart',{course:'DEMO1000',source,tabId:7});assert.equal(state.phase,'selecting');assert.ok(doc.querySelector('[data-mamo-picker]'));
  const event=new dom.window.MouseEvent('click',{bubbles:true,cancelable:true});img.dispatchEvent(event);assert.equal(event.defaultPrevented,true);
  state=await send('builderStatus');assert.equal(state.phase,'editing');assert.deepEqual(state.rule.images.selectors,['.attendance img']);
  state=await send('builderPreview');assert.equal(state.canEnable,true);assert.deepEqual((await send('builderRecognize',{imageId:state.matches[0].id})).text,['AB123']);
  await send('builderSave',{enable:true});assert.equal(controller.busy,false);assert.equal(calls[0].op,'ocr-preview');assert.equal(calls[0].meta,undefined);
  assert.equal((await library.list()).bindings.DEMO1000[source].length,1);assert.equal(storage.values.records,undefined);assert.equal(doc.querySelector('[data-mamo-picker]'),null);
  assert.doesNotMatch(JSON.stringify(storage.values.sourceRuleLibrary),/image\.png|teacher@|abcd1234/);
 }finally{await controller.cancel();dom.window.close();}
});
