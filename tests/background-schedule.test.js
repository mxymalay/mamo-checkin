import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedSessions} from '../extension/timetable.js';
const event=()=>({addListener(){},removeListener(){}});
async function runScenario(completed,viaAlarm=false,automatic=false,discovery=false,clear=false,reset=false,enabled=true,savedExpired=false,login=false,options={}){
 const previous=globalThis.chrome,tabs=new Map(),opened=[],queries=[],removed=[];
 if(options.preflight)tabs.set(100,{id:100,url:'https://attendance.monash.edu.my/student/Default.aspx',status:'complete'});
 const settings={enabled,email:'abcd1234@student.monash.edu',name:'Example Student',academicYear:2026,intervalMinutes:15,courses:['ABC1234','DEF1234'],senders:{ABC1234:'a@example.edu',DEF1234:'d@example.edu'},subjectKeywords:{ABC1234:'ABC1234',DEF1234:'DEF1234'},moodleUrls:{ABC1234:['https://learning.monash.edu/course/view.php?id=1'],DEF1234:['https://learning.monash.edu/course/view.php?id=2']},schedules:{ABC1234:[{weekday:1,time:'18:00',type:'Workshop',group:'01'}],DEF1234:[{weekday:1,time:'18:00',type:'Workshop',group:'01'}]}};
 const values={settings,records:savedExpired?[{id:'old-expired',course:'ABC1234',date:'2020-01-01',time:'18:00',status:'expired'}]:[],seenMessages:{},seenThreads:{}};let listener,alarmListener;
 const activities=settings.courses.flatMap(course=>expectedSessions(settings,course).map(slot=>{
   const [year,month,day]=slot.date.split('-');
   return {rawText:`${course} Workshop 01 6:00PM`,dateToken:`${+day}_${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+month-1]}_${year.slice(2)}`,state:completed.includes(course)?'completed':'available'};
 }));
 if(automatic)settings.schedules={};
 if(discovery){settings.courses=[];}
 globalThis.chrome={
  runtime:{id:'test',getURL:path=>'chrome-extension://test/'+path,onInstalled:event(),onStartup:event(),onMessage:{addListener(fn){listener=fn;}},connectNative(){
    let onMessage;return {onMessage:{addListener(fn){onMessage=fn;},removeListener(){}},onDisconnect:event(),postMessage(payload){queueMicrotask(()=>onMessage({ok:true,binaryReady:true,archiveDir:'test',op:payload.op}));},disconnect(){}};
  }},
  alarms:{onAlarm:{addListener(fn){alarmListener=fn;}},get:async()=>({periodInMinutes:15}),create:async()=>{},clear:async()=>{}},
  action:{onClicked:event(),setBadgeText:async()=>{}},
  storage:{local:{get:async keys=>Object.fromEntries(keys.map(key=>[key,structuredClone(values[key])])),set:async update=>Object.assign(values,structuredClone(update)),clear:async()=>{for(const key of Object.keys(values))delete values[key];}}},
  tabs:{create:async({url})=>{const tab={id:tabs.size+1,url:login&&url.startsWith('https://mail.google.com')?'https://accounts.google.com/v3/signin/identifier':url,status:'complete'};tabs.set(tab.id,tab);opened.push(url);return tab;},get:async id=>{if(options.closedAttendance&&id===100)throw new Error('No tab with id: 100.');return tabs.get(id);},update:async(id,update)=>Object.assign(tabs.get(id),update),remove:async id=>{removed.push(id);}},
  scripting:{executeScript:async({args,target})=>{
    const [command,cfg]=args;
    if(command===settings.email){tabs.get(target.tabId).url='https://mail.google.com/mail/u/2/';return [{result:{selected:true}}];}
    if(command==='identity')return [{result:{email:cfg.email||settings.email,url:'https://mail.google.com/mail/u/2/'}}];
    if(command==='activities'||command==='discover'){assert.equal(tabs.get(target.tabId).url,'https://attendance.monash.edu.my/student/Units.aspx');return [{result:{activities}}];}
    if(command==='list'){queries.push(cfg.courses);return [{result:{threads:[]}}];}
    if(command==='read')return [{result:{messages:[],links:[],priorityLinks:[],pageTitle:cfg.course}}];
    throw new Error('Unexpected adapter command '+command);
  }}
 };
 globalThis.chrome.tabs.query=async()=>[];
 try{
  await import(`../extension/background.js?scenario=${completed.join('-')}&alarm=${viaAlarm}&auto=${automatic}&discover=${discovery}&clear=${clear}&reset=${reset}&enabled=${enabled}&expired=${savedExpired}&login=${login}&preflight=${options.preflight}&closed=${options.closedAttendance}`);
  if(reset){const result=await new Promise(resolve=>listener({type:'reset'},{id:'test',url:'chrome-extension://test/options.html'},resolve));assert.equal(result.ok,true);assert.deepEqual(values,{});return result;}
  if(clear){values.records=[{id:'saved-record',code:'ABC12'}];const result=await new Promise(resolve=>listener({type:'clearCourses'},{id:'test',url:'chrome-extension://test/options.html'},resolve));assert.equal(result.ok,true);return {settings:values.settings,records:values.records};}
  if(discovery){const result=await new Promise(resolve=>listener({type:'redetect'},{id:'test',url:'chrome-extension://test/options.html'},resolve));assert.equal(values.status,undefined);assert.equal(values.settings.courses.length,0);return result;}
  if(viaAlarm)alarmListener({name:'scan'});
  else{const result=await new Promise(resolve=>listener({type:'scan',...(options.preflight?{verifiedLogin:{attendance:{tabId:100}}}:{})},{id:'test',url:'chrome-extension://test/options.html'},resolve));assert.equal(result.ok,true);}
  const deadline=Date.now()+5000;
  while(!values.status?.finishedAt&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,1));
  assert.ok(values.status?.finishedAt,'run must finish');
  assert.equal(values.status.error,Boolean(options.closedAttendance),JSON.stringify(values.diagnostics));
  await new Promise(resolve=>setTimeout(resolve,5));
  return {opened,queries,removed,settings:values.settings,summary:values.status.summary,records:values.records,status:values.status};
 }finally{globalThis.chrome=previous;}
}
test('Gmail chooser automatically selects the target and resumes the same run',async()=>{
 const result=await runScenario([],false,false,false,false,false,true,false,true);
 assert.ok(result.queries.length>0);
 assert.deepEqual(result.summary.loginRequired,[]);
 assert.equal(result.summary.quiet,false);
});
test('preflight Attendance page navigates to the timetable without closing the reused login tab',async()=>{
 const result=await runScenario(['ABC1234','DEF1234'],false,false,false,false,false,true,false,false,{preflight:true});
 assert.deepEqual(result.opened,[]);assert.equal(result.removed.includes(100),false);assert.equal(result.summary.allCompleted,true);
});
test('closed Attendance preflight page reports Attendance and never starts mail collection',async()=>{
 const result=await runScenario([],false,false,false,false,false,true,false,false,{preflight:true,closedAttendance:true});
 assert.match(result.status.message,/Attendance.*页面已被关闭/);assert.doesNotMatch(result.status.message,/Gmail|No tab|100/);assert.deepEqual(result.queries,[]);
});
test('completed timetable slots skip both Gmail and Moodle in an actual background run',async()=>{
 const result=await runScenario(['ABC1234','DEF1234']);
 assert.deepEqual(result.opened,['https://attendance.monash.edu.my/student/Units.aspx']);
 assert.deepEqual(result.queries,[]);assert.equal(result.summary.allCompleted,true);assert.equal(result.summary.courses.length,0);assert.deepEqual(result.summary.records,[]);assert.equal(result.summary.quiet,true);
});
test('only the missing course searches Gmail and then its own Moodle source',async()=>{
 const result=await runScenario(['ABC1234']);
 assert.deepEqual(result.queries,[['DEF1234']]);
 assert.equal(result.opened.some(url=>url.includes('course/view.php?id=1')),false);
 assert.equal(result.opened.some(url=>url.includes('course/view.php?id=2')),true);
});
test('alarm runs the background scan without an options page or scan message',async()=>{
 const result=await runScenario(['ABC1234'],true);
 assert.deepEqual(result.queries,[['DEF1234']]);
});

test('automatic timetable reads pending website sessions without manual weekly settings',async()=>{const result=await runScenario(['ABC1234'],false,true);assert.deepEqual(result.queries,[['DEF1234']]);assert.equal(result.settings.schedules.ABC1234.length,1);assert.equal(result.settings.schedules.DEF1234.length,1);});

test('first-time discovery returns all recent courses after identity setup without configured courses or submitting',async()=>{const result=await runScenario([],false,false,true);assert.equal(result.ok,true);assert.deepEqual(result.courses,['ABC1234','DEF1234']);assert.equal(result.schedules.ABC1234.length,1);});

test('clearing courses also deletes collected records and pauses automation',async()=>{const result=await runScenario([],false,false,false,true);assert.deepEqual(result.settings.courses,[]);assert.deepEqual(result.settings.schedules,{});assert.equal(result.settings.enabled,false);assert.equal(result.settings.autoDiscover,false);assert.deepEqual(result.records,[]);});

test('fresh-start reset removes identity, courses, records and local state',async()=>{const result=await runScenario([],false,false,false,false,true);assert.equal(result.ok,true);});

test('manual check runs with automatic scheduling disabled and keeps it disabled',async()=>{const result=await runScenario(['ABC1234','DEF1234'],false,false,false,false,false,false);assert.equal(result.settings.enabled,false);assert.ok(result.opened.length);});

test('unchanged expired history stays in collection records without reopening a completion warning',async()=>{const result=await runScenario(['ABC1234','DEF1234'],false,false,false,false,false,true,true);assert.equal(result.summary.submitted,0);assert.equal(result.summary.quiet,true);assert.deepEqual(result.summary.courses,[]);assert.deepEqual(result.summary.records,[]);assert.ok(result.records.some(r=>r.id==='old-expired'&&r.status==='expired'));});
