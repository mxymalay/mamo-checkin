import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceCollectors} from '../extension/source-collection.js';
test('historical Gmail collection paginates and uses the requested dates without forcing OCR',async()=>{
 let page=0;const navigated=[],received=[],args=[];
 const collector=createSourceCollectors({tabs:{query:async()=>[],get:async()=>({status:'complete'})},createOwnedTab:async()=>1,
  navigate:async(id,url)=>navigated.push(url),delay:async()=>{},progress:async()=>{},persistCache:async()=>{},sourceEvent:async()=>{},onDiagnostic:async d=>{throw new Error(d.error);},
  readAdapter:async(id,fn,command,config)=>{
   args.push(config);
   if(command==='identity')return {email:'a@student.monash.edu',url:'https://mail.google.com/mail/u/0/'};
   if(command==='nextPage'){page++;return {advanced:true};}
   if(command==='list')return {pageSignature:String(page),hasMore:page===0,threads:[{id:`thread${page}`,lastMessageId:`message${page}`,course:'DEMO1000',subject:'DEMO1000 attendance'}]};
   if(command==='expand')return {};
   if(command==='messages')return {bodiesReady:true,messages:[{messageId:config.expectedLastMessageId,course:'DEMO1000'}]};
   throw new Error(command);
  },onMessages:async messages=>{received.push(...messages);return {completedMessageIds:messages.map(m=>m.messageId)};}});
 const cache={seenMessages:{},seenThreads:{},moodleProgress:{}};
 const result=await collector.collectMail({settings:{courses:['DEMO1000'],email:'a@student.monash.edu',sourceModes:{DEMO1000:'email'},senders:{},subjectKeywords:{}},cache,snapshot:{courses:{}},historyLookup:true,dateRange:{from:'2026-01-01',to:'2026-06-01'}});
 assert.equal(result.complete,true);assert.equal(received.length,2);assert.equal(page,1);assert.equal(cache.forceOcr,false);
 assert.ok(navigated.some(url=>decodeURIComponent(url).includes('after:1767196799')));
 assert.ok(args.every(a=>a.sinceDate==='2026-01-01'&&a.untilDate==='2026-06-01'));
});
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
