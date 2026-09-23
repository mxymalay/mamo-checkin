import test from 'node:test';
import assert from 'node:assert/strict';
import {createPracticeBackground} from '../extension/source-rules/practice/background.js';
import {memoryStorage,fixtureRule} from './helpers/source-rules.js';
import {owner,port} from './helpers/rule-practice.js';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {installPracticeCourse} from '../extension/source-rules/practice/course.js';

function setup(){
 const storage=memoryStorage({settings:{courses:['REAL1000']},records:[{id:'production'}]});let control,source;const records=new Map();
 const tabs={async create(){const tab={id:10,url:'about:blank'};records.set(10,tab);return tab;},async get(id){return records.get(id);},async update(id,patch){if(patch.url){records.set(id,{id,url:patch.url});source=port({id:'test',url:patch.url,documentId:'source',tab:{id},frameId:0});control.connect(source);source.onMessage.emit({type:'ready',role:'source',sessionId:new URL(patch.url).searchParams.get('session')});}return records.get(id);}};
 control=createPracticeBackground({extensionId:'test',tabs,storage,connectOcr:async()=>{},isBusy:()=>false});const ownerPort=port(owner,'rule-practice-owner');control.connect(ownerPort);
 return {control,storage,ownerPort,get source(){return source;}};
}
test('sample matching includes imported and shared rules for both demo courses without production writes',async()=>{
 const h=setup();
 const local=fixtureRule({id:'alice.ed',source:'ed',courses:['DEMO1000']}),shared=fixtureRule({id:'shared.gmail',source:'gmail',courses:['DEMO1000','DEMO2000']}),practice=fixtureRule({id:'alice.practice'});
 await h.storage.set({sourceRuleLibrary:{'local:alice.ed':{origin:'local',current:local},'community:shared.gmail':{origin:'community',current:shared}},'practice:sourceRuleLibrary':{'local:alice.practice':{origin:'local',current:practice}}});
 const original=structuredClone(h.storage.values.sourceRuleLibrary);
 const summary=await h.control.handle({type:'practiceSummary'},owner);
 assert.deepEqual(summary.settings.courses,['DEMO1000','DEMO2000']);assert.equal(summary.settings.sourceModes.DEMO1000,'all');
 assert.equal(summary.saved.rules.length,1);assert.equal(summary.matching.rules.length,3);
 await assert.rejects(h.control.handle({type:'practiceBind',course:'DEMO1000',source:'gmail',ruleIds:['community:shared.gmail']},owner),/rule-test-required/);
 await h.storage.set({sourceRuleTests:Object.fromEntries(summary.matching.rules.map(rule=>[rule.key,Object.fromEntries(rule.courses.map(course=>[course,{digest:rule.digest,source:rule.source}]))]))});
 for(const course of ['DEMO1000','DEMO2000'])await h.control.handle({type:'practiceBind',course,source:'gmail',ruleIds:['community:shared.gmail']},owner);
 await h.control.handle({type:'practiceBind',course:'DEMO1000',source:'ed',ruleIds:['local:alice.ed']},owner);
 await assert.rejects(h.control.handle({type:'practiceBind',course:'DEMO1000',source:'moodle',ruleIds:['local:alice.ed']},owner));
 await assert.rejects(h.control.handle({type:'practiceBind',course:'DEMO2000',source:'ed',ruleIds:['local:alice.ed']},owner));
 const updated=await h.control.handle({type:'practiceSummary'},owner);assert.deepEqual(updated.matching.bindings.DEMO2000.gmail,['community:shared.gmail']);
 assert.equal(h.storage.values.sourceRuleBindings,undefined);assert.deepEqual(h.storage.values.sourceRuleLibrary,original);
 await h.control.handle({type:'practiceReset'},owner);assert.deepEqual(h.storage.values.sourceRuleLibrary,original);assert.deepEqual((await h.control.handle({type:'practiceSummary'},owner)).matching.bindings,{});
});
test('only a registered extension owner controls practice, with session/revision checks and no production writes',async()=>{
 const h=setup(),before=structuredClone(h.storage.values);
 for(const bad of [{...owner,id:'other'},{...owner,url:'https://example.com/'},{...owner,documentId:'forged'},{...owner,tab:{id:999}},{...owner,frameId:1},{...owner,url:'chrome-extension://user@test/options.html'}])await assert.rejects(h.control.handle({type:'practiceOpen'},bad),/practice-owner/);
 const opened=await h.control.handle({type:'practiceOpen'},owner);assert.equal(opened.pages[0].id,10);assert.equal(opened.revision,0);
 await assert.rejects(h.control.handle({type:'practicePages',sessionId:opened.sessionId,revision:99},owner),/builder-stale-preview/);
 await assert.rejects(h.control.handle({type:'practiceBuilder',sessionId:opened.sessionId,revision:0,command:{type:'settings'}},owner),/builder-command/);
 await h.control.handle({type:'practiceCancel',sessionId:opened.sessionId,revision:0},owner);assert.deepEqual(h.storage.values,before);
});
for(const failOcr of [false,true])test(`owned course completes isolated enable and reset after ${failOcr?'acknowledged OCR failure':'successful OCR'}`,async()=>{
 const html=await readFile(new URL('../extension/source-rules/practice/course.html',import.meta.url),'utf8');
 const storage=memoryStorage({settings:{courses:['DEMO1000']},records:[{id:'real'}],sourceRuleLibrary:{untouched:true}}),production=JSON.stringify(storage.values);
 let control,dom,course,source;const tabsById=new Map(),ocrCalls=[];let closed=0;
 const tabs={async create(){const tab={id:10,url:'about:blank'};tabsById.set(10,tab);return tab;},async get(id){return tabsById.get(id);},async update(id,patch){
  const tab=tabsById.get(id);if(tab)Object.assign(tab,patch);
  if(patch.url){
   source=port({id:'test',url:patch.url,documentId:'source-doc',tab:{id},frameId:0});const page=port({},'rule-practice-source');
   source.respond=message=>page.onMessage.emit(message);page.respond=message=>source.onMessage.emit(message);
   dom=new JSDOM(html,{url:patch.url});for(const img of dom.window.document.images){img.decode=async()=>{};Object.defineProperty(img,'naturalWidth',{value:900});Object.defineProperty(img,'naturalHeight',{value:160});}
   course=await installPracticeCourse({doc:dom.window.document,chrome:{runtime:{id:'test',connect:()=>{control.connect(source);return page;}}}});
  }return tab;
 }};
 control=createPracticeBackground({extensionId:'test',tabs,storage,isBusy:()=>false,fetchAsset:async url=>{
  const path=new URL(url).pathname;const bytes=await readFile(new URL('../extension'+path,import.meta.url));return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
 },connectOcr:async()=>({call:async message=>{ocrCalls.push(message);if(failOcr)throw new Error('engine-failed');return {observations:[{text:'8YG3G'}]};},close:()=>closed++})});
 control.connect(port(owner,'rule-practice-owner'));let response;
 const command=async(type,args={})=>response=await control.handle({type:'practiceBuilder',sessionId:response.sessionId,revision:response.revision,command:{type,...args}},owner);
 try{
  response=await control.handle({type:'practiceOpen'},owner);assert.equal(response.pages.length,1);
  await command('builderStart',{course:'DEMO1000',source:'moodle',tabId:10});const doc=dom.window.document;
  assert.equal(doc.querySelector('#session-material').hidden,false);doc.querySelector('.attendance img').click();await command('builderStatus');assert.ok(response.state.rule);
  const images=response.state.samples.flatMap(sample=>sample.images);
  const inspectedImages=globalThis.__mamoRulePicker.inspect({sessionId:response.state.sessionId}).images;
  const findImage=suffix=>images.find(image=>inspectedImages.some(raw=>raw.imageId===image.imageId&&raw.url.endsWith(suffix)));
  const second=findImage('/second.png'),excluded=findImage('/unrelated.png');
  assert.ok(second);assert.ok(excluded);
  await command('builderMark',{imageId:second.id,include:true});
  await command('builderMark',{imageId:excluded.id,include:false});
  await command('builderPreview');for(const match of response.state.matches)await command('builderConfirm',{imageId:match.id,confirmed:true});
  const matchedId=response.state.matches[0].id;
  await command('builderImage',{imageId:excluded.id});assert.equal(response.state.mimeType,'image/png');assert.ok(response.state.imageBase64);
  await assert.rejects(command('builderRecognize',{imageId:excluded.id}),/builder-preview-required/);
  await command('builderStatus');assert.equal(response.state.matches[0].id,matchedId);
  await assert.rejects(command('builderSave',{enable:true}),/builder-preview-required/);
  await assert.rejects(command('builderSave',{enable:true,acknowledgeOcrSkip:true}),/builder-preview-required/);
  const imageId=response.state.matches[0].id;
  if(failOcr){await assert.rejects(command('builderRecognize',{imageId}),/engine-failed/);await assert.rejects(command('builderSave',{enable:true}),/builder-preview-required/);}
  else{await command('builderRecognize',{imageId});assert.deepEqual(response.state.text,['8YG3G']);}
  assert.equal(ocrCalls[0].op,'ocr-preview');assert.equal(closed,1);
  await command('builderExport');assert.ok(JSON.parse(response.state.text).id.startsWith('local.generated.'));
  await command('builderSave',{enable:true,acknowledgeOcrSkip:failOcr,id:'local.practice.saved',name:'Saved practice'});assert.equal(response.state.phase,'saved');assert.equal(response.saved.rules.length,1);
  assert.equal(response.saved.rules[0].id,'local.practice.saved');assert.equal(response.saved.rules[0].name.en,'Saved practice');
  assert.deepEqual(response.saved.bindings,{});
  assert.equal((await control.handle({type:'practiceSummary'},owner)).saved.rules.length,1);
  await assert.rejects(control.handle({type:'practiceBind',course:'REAL1000',source:'moodle',ruleIds:[]},owner),/builder-source/);
  await assert.rejects(control.handle({type:'practiceBind',course:'DEMO1000',source:'moodle',ruleIds:[]},{...owner,url:'https://example.com/'}),/practice-owner/);
  const selectedKey=response.saved.rules[0].key;
  await assert.rejects(control.handle({type:'practiceBind',course:'DEMO1000',source:'moodle',ruleIds:[selectedKey]},owner),/rule-test-required/);
  assert.deepEqual((await control.handle({type:'practiceSummary'},owner)).saved.bindings,{});
  assert.equal(JSON.stringify(Object.fromEntries(Object.entries(storage.values).filter(([key])=>!key.startsWith('practice:')))),production);
  response=await control.handle({type:'practicePages',sessionId:response.sessionId,revision:response.revision},owner);assert.equal(response.saved.rules.length,1);
  await command('builderStart',{course:'DEMO1000',source:'moodle',tabId:10});await command('builderCancel');assert.deepEqual(response.state,{ok:true});
  await command('builderStart',{course:'DEMO1000',source:'moodle',tabId:10});doc.querySelector('.attendance img').click();await command('builderStatus');
  let inspected;const waiting=new Promise(resolve=>inspected=resolve),deliver=source.respond;
  source.respond=message=>{if(message.method==='inspect')inspected(message);else deliver(message);};
  const stale=command('builderSave',{enable:false}),rejected=assert.rejects(stale,/builder-(source-changed|cancelled|expired)/);const oldRequest=await waiting;
  await control.handle({type:'practiceReset'},owner);await rejected;
  assert.equal((await control.handle({type:'practiceSummary'},owner)).saved.rules.length,0);
  source.onMessage.emit({...oldRequest,type:'reply',result:{phase:'selected'}});assert.deepEqual(storage.values['practice:sourceRuleLibrary'],{});
  await assert.rejects(control.handle({type:'practicePages',sessionId:response.sessionId,revision:response.revision},owner),/builder-expired/);
  assert.equal(JSON.stringify(Object.fromEntries(Object.entries(storage.values).filter(([key])=>!key.startsWith('practice:')))),production);
 }finally{await control.cancelOwner(owner);course?.dispose();dom?.window.close();delete globalThis.__mamoSourceRules;delete globalThis.__mamoBuilderSelector;delete globalThis.__mamoRulePicker;}
});
test('reset needs no live source but invalidates every owner and preserves all production fields',async()=>{
 const h=setup(),second={...owner,documentId:'owner-two',tab:{id:2}};
 h.control.connect(port(second,'rule-practice-owner'));
 const opened=await h.control.handle({type:'practiceOpen'},owner);
 await h.control.handle({type:'practiceReset'},second);
 await assert.rejects(h.control.handle({type:'practicePages',sessionId:opened.sessionId,revision:opened.revision},owner),/builder-expired/);
 assert.deepEqual(h.storage.values.records,[{id:'production'}]);assert.deepEqual(h.storage.values['practice:sourceRuleLibrary'],{});
});
test('owner disconnect invalidates pending replies from the same tab after document reload',async()=>{
 const h=setup(),opened=await h.control.handle({type:'practiceOpen'},owner);
 const pending=h.control.handle({type:'practiceBuilder',sessionId:opened.sessionId,revision:0,command:{type:'builderStart',course:'DEMO1000',source:'moodle',tabId:10}},owner);
 const rejected=assert.rejects(pending,/builder-(cancelled|source-changed|expired)/);await new Promise(r=>setTimeout(r,0));
 const oldSource=h.source,request=oldSource.sent.at(-1),replacement={...owner,documentId:'replacement-owner'};h.control.connect(port(replacement,'rule-practice-owner'));
 oldSource.onMessage.emit({...request,type:'reply',result:{roots:[{rootId:'old-root'}]}});await rejected;
 await assert.rejects(h.control.handle({type:'practicePages',sessionId:opened.sessionId,revision:0},owner),/practice-owner/);
 assert.equal(h.storage.values['practice:sourceRuleLibrary'],undefined);
});
test('source navigation cancels ownership; a new open creates a fresh session',async()=>{
 const h=setup(),opened=await h.control.handle({type:'practiceOpen'},owner);await h.control.cancelTab(opened.pages[0].id,{url:'https://example.com/'});
 await assert.rejects(h.control.handle({type:'practicePages',sessionId:opened.sessionId,revision:0},owner),/builder-expired/);
 const next=await h.control.handle({type:'practiceOpen'},owner);assert.notEqual(next.sessionId,opened.sessionId);await h.control.cancelOwner(owner);
});
test('a same-URL tab update after source registration is not a new navigation',async()=>{
 const h=setup(),opened=await h.control.handle({type:'practiceOpen'},owner);
 try{
  await h.control.cancelTab(opened.pages[0].id,{url:h.source.sender.url});
  const current=await h.control.handle({type:'practicePages',sessionId:opened.sessionId,revision:0},owner);
  assert.equal(current.sessionId,opened.sessionId);
  h.source.onMessage.emit({type:'return',sessionId:opened.sessionId});
  assert.equal(h.source.sent.some(message=>message.type==='ended'),false);
  await h.control.cancelTab(opened.pages[0].id,{status:'loading'});
  await assert.rejects(h.control.handle({type:'practicePages',sessionId:opened.sessionId,revision:0},owner),/builder-expired/);
 }finally{await h.control.cancelOwner(owner);}
});
test('overlapping resets keep new sessions blocked until every reset commits',async()=>{
 const h=setup(),commit=h.storage.set;let release,started;
 const nextWrite=()=>new Promise(resolve=>{started=resolve;});let waiting=nextWrite();
 h.storage.set=patch=>new Promise(resolve=>{release=async()=>{await commit(patch);resolve();};started();});
 const first=h.control.handle({type:'practiceReset'},owner),second=h.control.handle({type:'practiceReset'},owner);
 await waiting;waiting=nextWrite();await release();await first;await waiting;
 try{await assert.rejects(h.control.handle({type:'practiceOpen'},owner),/builder-busy/);}
 finally{await release();await second;await h.control.cancelOwner(owner);}
});
test('same-document owner route changes retain cancellation authority without authorizing another path',async()=>{
 const h=setup(),opened=await h.control.handle({type:'practiceOpen'},owner),routed={...owner,url:owner.url+'#modules/library'};
 try{
  await h.control.cancelTab(owner.tab.id,{url:routed.url});
  const refreshed=await h.control.handle({type:'practicePages',sessionId:opened.sessionId,revision:0},routed);assert.equal(refreshed.sessionId,opened.sessionId);
  await assert.rejects(h.control.handle({type:'practiceCancel'}, {...routed,url:'chrome-extension://test/modules.html#library'}),/practice-owner/);
  await h.control.handle({type:'practiceCancel',sessionId:opened.sessionId,revision:0},routed);assert.equal(h.control.busy,false);
 }finally{await h.control.cancelOwner(owner);}
});
