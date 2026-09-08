import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanupOwnedTabs,processCollectedMessages,reconcileScanAlarm} from '../extension/workflow.js';
import {submitPending} from '../extension/runner.js';

test('alarm lifecycle preserves matching schedule, replaces changed period, and clears when disabled',async()=>{
  const events=[];
  let current=null;
  const alarms={
    get:async name=>current?.name===name?{...current}:undefined,
    create:async(name,options)=>{events.push(['create',name,options]);current={name,...options};},
    clear:async name=>{events.push(['clear',name]);if(current?.name===name)current=null;return true;}
  };

  await reconcileScanAlarm({enabled:true,intervalMinutes:15},alarms);
  await reconcileScanAlarm({enabled:true,intervalMinutes:15},alarms);
  assert.deepEqual(events,[['create','scan',{delayInMinutes:1,periodInMinutes:15}]]);

  await reconcileScanAlarm({enabled:true,intervalMinutes:30},alarms);
  assert.deepEqual(current,{name:'scan',delayInMinutes:1,periodInMinutes:30});
  assert.deepEqual(events.slice(1),[
    ['clear','scan'],
    ['create','scan',{delayInMinutes:1,periodInMinutes:30}]
  ]);

  await reconcileScanAlarm({enabled:false,intervalMinutes:30},alarms);
  assert.equal(current,null);
  assert.deepEqual(events.at(-1),['clear','scan']);
});

test('collection isolates timestamp, image fetch, and OCR failures while keeping valid records',async()=>{
  const message=(messageId,sentAtText,images)=>({messageId,sentAtText,images,course:'FIT5122',subject:`subject-${messageId}`,sourceUrl:`https://mail.google.com/${messageId}`});
  const state={records:[],seenMessages:{},diagnostics:[]};
  const messages=[
    message('bad-time','date unavailable',['unused']),
    message('bad-fetch','2 Sept 2026, 19:31',['fetch-error']),
    message('bad-ocr','2 Sept 2026, 19:31',['ocr-error']),
    message('good','2 Sept 2026, 19:31',['good-image'])
  ];

  await processCollectedMessages(state,messages,{
    getImage:async url=>{if(url==='fetch-error')throw new Error('download failed');return {tag:url,mimeType:'image/png'};},
    ocr:async payload=>{if(payload.tag==='ocr-error')throw new Error('OCR failed');return {imageId:'good-image-id',imagePath:'/archive/good.png',observations:[{text:'Workshop Monday,31 Aug 01 6:00PM QK28J',x:0,y:.5,width:1,height:.2,confidence:1}]};},
    save:async()=>{},
    saveDiagnostics:async()=>{},
    now:()=> '2026-09-08T01:02:03.000Z'
  });

  assert.deepEqual(state.records.map(r=>[r.messageId,r.code,r.status]),[['good','QK28J','ready']]);
  assert.deepEqual(Object.keys(state.seenMessages),['good']);
  assert.deepEqual(state.diagnostics.map(d=>d.messageId),['bad-time','bad-fetch','bad-ocr']);
  assert.match(state.diagnostics[0].error,/发送年份/);
  assert.equal(state.diagnostics.every(d=>d.at==='2026-09-08T01:02:03.000Z'),true);

  let complete=false,submissions=0;
  const activity={...state.records[0],state:'available',href:'https://attendance.monash.edu.my/student/Entry.aspx?s=1&d=31_Aug_26'};
  await submitPending(state,{list:async()=>[{...activity,state:complete?'completed':'available'}],submit:async()=>{submissions++;complete=true;},save:async()=>{}},Date.parse('2026-09-06T01:02:03+08:00'));
  assert.equal(submissions,1);
  assert.equal(state.records[0].status,'submitted');
});

test('owned tab cleanup closes redirects outside source hosts and clears tracked ids',async()=>{
  const state={ownedTabIds:[41,42]};
  const removed=[];
  let persisted;
  await cleanupOwnedTabs(state,{remove:async id=>{removed.push(id);if(id===42)throw new Error('already closed');}},async ids=>{persisted=[...ids];});
  assert.deepEqual(removed,[41,42]);
  assert.deepEqual(state.ownedTabIds,[]);
  assert.deepEqual(persisted,[]);
});

test('Moodle ISO timestamp and text rows create independent text-source records',async()=>{
  const state={records:[],seenMessages:{},diagnostics:[]};
  await processCollectedMessages(state,[{
    messageId:'moodle-post-hash',course:'FIT5122',subject:'Week 6 attendance',sourceUrl:'https://learning.monash.edu/mod/forum/discuss.php?d=1',sourceType:'moodle',sentAt:'2026-09-02T19:31:00+08:00',textRows:['Applied Wednesday,2 Sep 01 6:00PM PNK7L'],images:[]
  }],{getImage:async()=>{throw new Error('unused');},ocr:async()=>{throw new Error('unused');},save:async()=>{}});
  assert.deepEqual(state.records.map(r=>[r.code,r.status,r.sourceType,r.imageId]),[['PNK7L','ready','moodle-text','text']]);
  assert.equal(state.seenMessages['moodle-post-hash']!==undefined,true);
});

test('academic-year-only Moodle reference forces even complete text rows to review',async()=>{
  const state={records:[],seenMessages:{},diagnostics:[]};
  await processCollectedMessages(state,[{
    messageId:'old-page-hash',course:'FIT5120',subject:'Old attendance page',sourceUrl:'https://learning.monash.edu/course/view.php?id=1',sourceType:'moodle',sentAt:'2026-09-04T00:00:00+08:00',dateReferenceOnly:true,textRows:['Studio Friday,4 Sep 01-P2 6:00PM ZQSB3'],images:[]
  }],{getImage:async()=>{},ocr:async()=>{},save:async()=>{}});
  assert.equal(state.records[0].status,'review');
  assert.match(state.records[0].reason,/年份仅为参考/);
});

test('academic-year-only Moodle reference also forces complete image OCR to review',async()=>{
  const state={records:[],seenMessages:{},diagnostics:[]};
  await processCollectedMessages(state,[{
    messageId:'old-image-hash',course:'FIT5120',subject:'Old attendance image',sourceUrl:'https://learning.monash.edu/course/view.php?id=1',sourceType:'moodle',sentAt:'2026-09-04T00:00:00+08:00',dateReferenceOnly:true,textRows:[],images:['image']
  }],{getImage:async()=>({mimeType:'image/png'}),ocr:async()=>({imageId:'old-image',imagePath:'/archive/old.png',observations:[{text:'Studio Friday,4 Sep 01-P2 6:00PM ZQSB3',x:0,y:.5,width:1,height:.2,confidence:1}]}),save:async()=>{}});
  assert.equal(state.records[0].status,'review');
  assert.match(state.records[0].reason,/年份仅为参考/);
});

test('incomplete text and image sources preserve a unique code candidate as review',async()=>{
  const state={records:[],seenMessages:{},diagnostics:[]};
  await processCollectedMessages(state,[{
    messageId:'mixed',course:'FIT5122',subject:'Attendance code',sourceUrl:'https://mail.google.com/mixed',sourceType:'gmail',sentAt:'2026-09-02T19:31:00+08:00',textRows:['Attendance information','QK28J'],images:['image']
  }],{
    getImage:async()=>({mimeType:'image/png'}),
    ocr:async()=>({imageId:'image-hash',imagePath:'/archive/image.png',observations:[{text:'Attendance code PNK7L',x:0,y:.5,width:1,height:.2,confidence:.9}]}),
    save:async()=>{}
  });
  assert.deepEqual(state.records.map(r=>[r.code,r.status,r.sourceType,r.imageId]),[
    ['QK28J','review','gmail-text','text'],
    ['PNK7L','review','gmail','image-hash']
  ]);
  assert.equal(state.records.every(r=>!r.date&&!r.group),true);
});
test('a weekly section accepts only dates within its published range',async()=>{
 const state={records:[],seenMessages:{},diagnostics:[]};
 await processCollectedMessages(state,[{messageId:'week6',course:'FIT5120',subject:'Week 6',sourceUrl:'https://learning.monash.edu/course/view.php?id=1&section=28',sourceType:'moodle',sentAt:'2026-09-05T23:59:00+08:00',dateBasis:'week-range',dateWindow:{from:'2026-08-30',to:'2026-09-05'},textRows:['Studio Friday,4 Sep 01-P2 6:00PM ZQSB3','Studio Friday,11 Sep 01-P2 6:00PM ABC12'],images:[]}],{getImage:async()=>{},ocr:async()=>{},save:async()=>{}});
 assert.deepEqual(state.records.map(r=>[r.code,r.status]),[['ZQSB3','ready'],['ABC12','review']]);
 assert.match(state.records[1].reason,/日期范围/);
});

test('scheduled refresh fetches only needed images and leaves partial sources resumable',async()=>{
 const state={records:[],seenMessages:{source:'previous'},diagnostics:[]},fetched=[];
 const msg={messageId:'source',course:'FIT5122',sentAt:'2026-09-02T19:31:00+08:00',sourceType:'moodle',images:['first','second']};
 const adapters={refresh:true,shouldContinue:()=>state.records.length<1,getImage:async image=>{fetched.push(image);return {};},ocr:async()=>({imageId:'one',observations:[{text:'Applied Wednesday,2 Sep 01 6:00PM PNK7L',x:0,y:.5,width:1,height:.2,confidence:1}]}),save:async()=>{}};
 await processCollectedMessages(state,[msg],adapters);
 assert.deepEqual(fetched,['first']);assert.equal(state.seenMessages.source,undefined);assert.equal(state.records.length,1);
});
