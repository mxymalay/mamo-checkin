import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuilderSession} from '../extension/source-rules/builder/session.js';
import {createRuleLibrary} from '../extension/source-rules/library.js';
import {memoryStorage} from './helpers/source-rules.js';
function fixture(){
 const settings={courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'},moodleUrls:{DEMO1000:['https://learning.monash.edu/course/view.php?id=1']}},storage=memoryStorage({settings}),library=createRuleLibrary({storage,builtins:{}}),url=settings.moodleUrls.DEMO1000[0];
 const image={imageId:'i1',url:'https://learning.monash.edu/image.png',marked:true};let disposed=0;
 const pageBridge={describe:async()=>({documentId:'page1',url,roots:[{rootId:'r0'}]}),dispose:async()=>{disposed++;},command:async(ctx,method,args)=>method==='propose'?[{...args.base,images:{selectors:['.attendance img']}}]:method==='evaluate'?args.rules.map(()=>({eligible:true,reasons:[],images:[image]})):{phase:'selected',rootId:'r0',images:[image]}};
 const preview={load:async()=>{},clear(){},image:()=>({mimeType:'image/png',imageBase64:'YQ=='}),recognize:async()=>['AB123']};
 const control=createBuilderSession({extensionId:'ext',storage,tabs:{get:async()=>({url}),query:async()=>[{id:7,url}],update:async()=>{}},pageBridge,getLibrary:async()=>library,preview,isBusy:()=>false});
 return {control,storage,library,pageBridge,get disposed(){return disposed;},sender:{id:'ext',url:'chrome-extension://ext/options.html',documentId:'owner1',tab:{id:3}}};
}
test('saving an authored draft preserves attribution without binding courses',async()=>{
 const f=fixture();try{
  const state=await f.control.handle({type:'builderStart',course:'DEMO1000',source:'moodle',tabId:7},f.sender);
  await f.control.handle({type:'builderStatus',sessionId:state.sessionId},f.sender);
  const author={name:'Alice',url:'https://example.com/alice'};
  await f.control.handle({type:'builderSave',sessionId:state.sessionId,enable:false,author},f.sender);
  const saved=await f.library.list();assert.deepEqual(saved.rules[0].author,author);assert.deepEqual(saved.bindings,{});
 }finally{await f.control.cancel();}
});
test('builder is owner-bound and save-enable requires fresh preview; writes only rule storage',async()=>{
 const f=fixture();try{
 const initial=await f.control.handle({type:'builderStart',course:'DEMO1000',source:'moodle',tabId:7},f.sender),sessionId=initial.sessionId;
 await assert.rejects(f.control.handle({type:'builderStatus',sessionId},{...f.sender,documentId:'other'}),/builder-owner/);
 await f.control.handle({type:'builderStatus',sessionId},f.sender);
 await assert.rejects(f.control.handle({type:'builderSave',sessionId,enable:true},f.sender),/builder-preview-required/);
 const result=await f.control.handle({type:'builderPreview',sessionId},f.sender);assert.equal(result.canEnable,true);assert.equal(JSON.stringify(result).includes('image.png'),false);
 await assert.rejects(f.control.handle({type:'builderSave',sessionId,enable:true,revision:result.revision-1},f.sender),/builder-stale-preview/);
 await f.control.handle({type:'builderSave',sessionId,enable:true},f.sender);
 assert.equal((await f.library.list()).rules.length,1);assert.equal(f.storage.values.records,undefined);assert.equal(f.control.busy,false);
 }finally{await f.control.cancel();}
});
test('configuration changes invalidate a session before it can save',async()=>{
 const f=fixture();try{const {sessionId}=await f.control.handle({type:'builderStart',course:'DEMO1000',source:'moodle',tabId:7},f.sender);f.storage.values.settings.courses=[];
 await assert.rejects(f.control.handle({type:'builderSave',sessionId},f.sender),/builder-settings-changed/);assert.equal((await f.library.list()).rules.length,0);
 }finally{await f.control.cancel();}
});
test('draft ID edits validate atomically, invalidate preview and survive regeneration',async()=>{
 const f=fixture();try{
  const {sessionId}=await f.control.handle({type:'builderStart',course:'DEMO1000',source:'moodle',tabId:7},f.sender);
  await f.control.handle({type:'builderStatus',sessionId},f.sender);
  const preview=await f.control.handle({type:'builderPreview',sessionId},f.sender);
  await assert.rejects(f.control.handle({type:'builderDraft',sessionId,name:'Changed',id:'alice.DEMO.rule'},f.sender),e=>e.code==='id-reserved');
  const unchanged=await f.control.handle({type:'builderStatus',sessionId},f.sender);assert.deepEqual(unchanged,preview);
  const edited=await f.control.handle({type:'builderDraft',sessionId,revision:preview.revision,name:'Changed',id:'alice.fit5122.moodle'},f.sender);
  assert.equal(edited.rule.id,'alice.fit5122.moodle');assert.equal(edited.rule.name.en,'Changed');assert.equal(edited.revision,preview.revision+1);assert.equal(edited.canEnable,false);assert.deepEqual(edited.matches,[]);
  await assert.rejects(f.control.handle({type:'builderSave',sessionId,enable:true},f.sender),/builder-preview-required/);
  const regenerated=await f.control.handle({type:'builderMark',sessionId,imageId:'s0:i1',include:true},f.sender);assert.equal(regenerated.rule.id,edited.rule.id);
  const renamed=await f.control.handle({type:'builderDraft',sessionId,name:'Name only'},f.sender);assert.equal(renamed.rule.id,edited.rule.id);
 }finally{await f.control.cancel();}
});
test('saving a draft edited to an existing ID requires explicit replacement',async()=>{
 const f=fixture();try{
  const rule={schemaVersion:1,id:'alice.existing',version:'1.0.0',name:{en:'Existing'},source:'moodle',courses:['DEMO1000'],images:{selectors:['img']}};
  await f.library.importRule(JSON.stringify(rule));const before=structuredClone(f.storage.values);
  const {sessionId}=await f.control.handle({type:'builderStart',course:'DEMO1000',source:'moodle',tabId:7},f.sender);
  await f.control.handle({type:'builderStatus',sessionId},f.sender);
  await f.control.handle({type:'builderDraft',sessionId,name:'Changed',id:rule.id},f.sender);
  await assert.rejects(f.control.handle({type:'builderSave',sessionId,enable:false},f.sender),e=>e.code==='replace-required');
  assert.deepEqual(f.storage.values,before);
 }finally{await f.control.cancel();}
});
test('cancelling during an asynchronous start cannot create an orphaned session',async()=>{
 const f=fixture(),original=f.storage.get;let release;f.storage.get=()=>new Promise(resolve=>{release=()=>resolve({settings:f.storage.values.settings});});
 const pending=f.control.handle({type:'builderStart',course:'DEMO1000',source:'moodle',tabId:7},f.sender);
 await f.control.handle({type:'builderCancel'},f.sender);f.storage.get=original;release();
 try{await assert.rejects(pending,/builder-cancelled/);assert.equal(f.control.busy,false);}finally{await f.control.cancel();}
});
test('a newly visible match after preview cannot be enabled without confirmation',async()=>{
 const f=fixture();try{const {sessionId}=await f.control.handle({type:'builderStart',course:'DEMO1000',source:'moodle',tabId:7},f.sender);
 await f.control.handle({type:'builderStatus',sessionId},f.sender);await f.control.handle({type:'builderPreview',sessionId},f.sender);
 const command=f.pageBridge.command;f.pageBridge.command=async(...args)=>{const result=await command(...args);if(args[1]==='evaluate')result[0].images.push({imageId:'new',url:'https://learning.monash.edu/new.png',marked:null});return result;};
 await assert.rejects(f.control.handle({type:'builderSave',sessionId,enable:true},f.sender),/builder-stale-preview/);assert.equal((await f.library.list()).rules.length,0);
 }finally{await f.control.cancel();}
});
test('a preview match beyond the first twenty candidates is still visible for confirmation',async()=>{
 const f=fixture(),command=f.pageBridge.command;
 f.pageBridge.command=async(...args)=>{const result=await command(...args);
  if(args[1]==='inspect')result.images=Array.from({length:21},(_,i)=>({imageId:'i'+(i+1),url:'https://learning.monash.edu/'+i+'.png',marked:i===0?true:null}));
  if(args[1]==='evaluate')result[0].images.push({imageId:'i21',url:'https://learning.monash.edu/20.png',marked:null});return result;};
 try{const {sessionId}=await f.control.handle({type:'builderStart',course:'DEMO1000',source:'moodle',tabId:7},f.sender);await f.control.handle({type:'builderStatus',sessionId},f.sender);
 const result=await f.control.handle({type:'builderPreview',sessionId},f.sender);assert.ok(result.samples[0].images.some(i=>i.id==='s0:i21'));assert.equal(result.canEnable,false);
 await f.control.cancelTab(7);assert.equal(f.control.busy,false);
 }finally{await f.control.cancel();}
});
