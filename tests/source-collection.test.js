import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceCollectors} from '../extension/source-collection.js';
test('isolated Moodle collector reads through shared navigation without a storage or OCR dependency',async()=>{
  const visited=[],messages=[],writes=[],tabs=new Map(),adapterArgs=[];let next=1;
  const io={tabs:{get:async id=>tabs.get(id),update:async(id,patch)=>Object.assign(tabs.get(id),patch)},
    readAdapter:async(id,func,command,args)=>{adapterArgs.push(args);return {messages:[{messageId:'m',course:args.course,sourceType:'moodle',images:[],textRows:[]}],links:[],priorityLinks:[],pageTitle:'DEMO1000'};},
    createOwnedTab:async url=>{tabs.set(next,{url,status:'complete'});return next++;},
    navigate:async(id,url)=>Object.assign(tabs.get(id),{url}),delay:async()=>{},now:Date.now,
    onMessages:async(msgs)=>{messages.push(...msgs);return {completedMessageIds:msgs.map(m=>m.messageId)};},
    onDiagnostic:async d=>{throw new Error(d.error);},progress:async()=>{},persistCache:async patch=>writes.push(patch),sourceEvent:async()=>{}};
  const collectors=createSourceCollectors(io);
  const result=await collectors.collectMoodle({settings:{name:'Example',academicYear:2026,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'},moodleUrls:{DEMO1000:['https://learning.monash.edu/course/view.php?id=1']}},cache:{seenMessages:{},seenThreads:{},moodleProgress:{}},forceRead:true,shouldContinue:()=>true,snapshot:{courses:{}},verifiedLogin:{}});
  assert.equal(messages[0].course,'DEMO1000');assert.equal(result.complete,true);assert.ok(writes.length);
  await collectors.collectMoodle({settings:{name:'Example',academicYear:2026,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'},moodleUrls:{DEMO1000:['https://learning.monash.edu/course/view.php?id=1']}},cache:{seenMessages:{},seenThreads:{},moodleProgress:{}},forceRead:true,snapshot:{courses:{}},dateRange:{from:'2026-06-01',to:'2026-06-07'}});
  assert.equal(adapterArgs.at(-1).sinceDate,'2026-06-01');assert.equal(adapterArgs.at(-1).untilDate,'2026-06-07');assert.equal(adapterArgs.at(-1).testDateRange,true);
});
test('Moodle page budget reports a partial scan when there are unvisited pages',async()=>{
 const tabs=new Map();
 const collectors=createSourceCollectors({tabs:{get:async id=>tabs.get(id),update:async(id,p)=>Object.assign(tabs.get(id),p)},createOwnedTab:async url=>{tabs.set(1,{url,status:'complete'});return 1;},
  readAdapter:async()=>({messages:[],links:Array.from({length:8},(_,i)=>`https://learning.monash.edu/mod/page/view.php?id=${i}`),priorityLinks:[],pageTitle:'DEMO1000'}),
  navigate:async()=>{},delay:async()=>{},progress:async()=>{},persistCache:async()=>{},sourceEvent:async()=>{},onMessages:async()=>({completedMessageIds:[]}),onDiagnostic:async()=>{}});
 const result=await collectors.collectMoodle({settings:{courses:['DEMO1000'],academicYear:2026,moodleUrls:{DEMO1000:['https://learning.monash.edu/course/view.php?id=1']}},cache:{seenMessages:{},seenThreads:{},moodleProgress:{}},snapshot:{courses:{}},forceRead:true});
 assert.equal(result.truncated,true);assert.equal(result.complete,false);
});
