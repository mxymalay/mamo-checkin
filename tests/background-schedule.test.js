import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedSessions} from '../extension/timetable.js';
import {readFile} from 'node:fs/promises';
const event=()=>({addListener(){},removeListener(){}});
async function runScenario(completed,viaAlarm=false,automatic=false,discovery=false,clear=false,reset=false,enabled=true,savedExpired=false,login=false,options={}){
 const previous=globalThis.chrome,previousFetch=globalThis.fetch,tabs=new Map(),opened=[],queries=[],removed=[],statuses=[],ruleRevisions=[];let nativeClosed=0;
 globalThis.fetch=async url=>String(url).startsWith('file:')?{ok:true,json:async()=>JSON.parse(await readFile(url,'utf8'))}:String(url).includes('/official/latest.json')?new Response(null,{status:503}):previousFetch(url);
 if(options.preflight)tabs.set(100,{id:100,url:'https://attendance.monash.edu.my/student/Default.aspx',status:'complete'});
 if(options.holdPrefetch)tabs.set(101,{id:101,url:'https://mail.google.com/mail/u/2/',status:'complete'});
 let signalPrefetch,releasePrefetch;
 const prefetchEntered=new Promise(resolve=>{signalPrefetch=resolve;});
 const prefetchHeld=new Promise(resolve=>{releasePrefetch=resolve;});
 const settings={enabled,email:'abcd1234@student.monash.edu',name:'Example Student',academicYear:2026,intervalMinutes:15,courses:['ABC1234','DEF1234'],senders:{ABC1234:'a@example.edu',DEF1234:'d@example.edu'},subjectKeywords:{ABC1234:'ABC1234',DEF1234:'DEF1234'},moodleUrls:{ABC1234:['https://learning.monash.edu/course/view.php?id=1'],DEF1234:['https://learning.monash.edu/course/view.php?id=2']},schedules:{ABC1234:[{weekday:1,time:'18:00',type:'Workshop',group:'01'}],DEF1234:[{weekday:1,time:'18:00',type:'Workshop',group:'01'}]}};
 const values={settings,records:savedExpired?[{id:'old-expired',course:'ABC1234',date:'2020-01-01',time:'18:00',status:'expired'}]:[],seenMessages:{},seenThreads:{}};let listener,alarmListener;
 const activities=settings.courses.flatMap(course=>expectedSessions(settings,course).map(slot=>{
   const [year,month,day]=slot.date.split('-');
   return {rawText:`${course} Workshop 01 6:00PM`,dateToken:`${+day}_${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+month-1]}_${year.slice(2)}`,state:completed.includes(course)?'completed':'available'};
 }));
 if(automatic)settings.schedules={};
 if(options.noMail){settings.senders={};settings.email='';}
 if(options.edOnly){settings.senders={};settings.email='';settings.moodleUrls={};settings.edUrls={ABC1234:['https://edstem.org/au/courses/123'],DEF1234:['https://edstem.org/au/courses/456']};}
 if(clear){settings.sourceModes={ABC1234:'all'};settings.edUrls={ABC1234:['https://edstem.org/au/courses/123']};}
 if(options.review){const slot=expectedSessions(settings,'ABC1234')[0];values.records=[{...slot,id:'review',course:'ABC1234',type:'Workshop',group:'01',code:'AB123',confidence:.4,status:'review'}];}
 if(discovery){settings.courses=[];}
 globalThis.chrome={
  runtime:{id:'test',getURL:path=>'chrome-extension://test/'+path,onInstalled:event(),onStartup:event(),onMessage:{addListener(fn){listener=fn;}},connectNative(){
    let onMessage;return {onMessage:{addListener(fn){onMessage=fn;},removeListener(){}},onDisconnect:event(),postMessage(payload){queueMicrotask(()=>onMessage({ok:true,binaryReady:true,archiveDir:'test',op:payload.op}));},disconnect(){nativeClosed++;}};
  }},
  alarms:{onAlarm:{addListener(fn){alarmListener=fn;}},get:async()=>({periodInMinutes:15}),create:async()=>{},clear:async()=>{}},
  action:{onClicked:event(),setBadgeText:async()=>{}},
  storage:{local:{get:async keys=>Object.fromEntries(keys.map(key=>[key,structuredClone(values[key])])),set:async update=>{Object.assign(values,structuredClone(update));if(update.status){statuses.push(structuredClone(update.status));if(options.parallelLogin&&update.status.waitingSite==='attendance')releasePrefetch();}},clear:async()=>{for(const key of Object.keys(values))delete values[key];}}},
  tabs:{create:async({url})=>{const tab={id:tabs.size+1,url:login&&url.startsWith('https://mail.google.com')?'https://accounts.google.com/v3/signin/identifier':url,status:'complete'};tabs.set(tab.id,tab);opened.push(url);return tab;},get:async id=>{if(options.closedAttendance&&id===100)throw new Error('No tab with id: 100.');return tabs.get(id);},update:async(id,update)=>Object.assign(tabs.get(id),update),remove:async id=>{removed.push(id);}},
  scripting:{executeScript:async({args,target,func})=>{
    if(func.name==='installSourceRuleRuntime')return [{result:undefined}];
    const [command,cfg]=args;
    if(command===settings.email){tabs.get(target.tabId).url='https://mail.google.com/mail/u/2/';return [{result:{selected:true}}];}
    if(command==='identity'){
     if(options.parallelLogin&&tabs.get(target.tabId).url.includes('attendance.monash'))return [{result:{name:statuses.some(s=>s.phase==='waiting')?settings.name:undefined}}];
     if(options.parallelLogin&&/google\.com/.test(tabs.get(target.tabId).url))tabs.get(target.tabId).url='https://mail.google.com/mail/u/2/';
     return [{result:{email:cfg.email||settings.email,name:settings.name,url:'https://mail.google.com/mail/u/2/'}}];
    }
    if(command==='activities'||command==='discover'){assert.equal(tabs.get(target.tabId).url,'https://attendance.monash.edu.my/student/Units.aspx');return [{result:{activities:activities.map(a=>({...a,href:'https://attendance.monash.edu.my/student/Entry.aspx?s=1&d='+a.dateToken}))}}];}
    if(command==='form'){const r=values.records.find(r=>r.id==='review'),date=new Date(r.date+'T12:00:00Z');return [{result:{inputPresent:true,submitPresent:true,url:tabs.get(target.tabId).url,heading:`ABC1234 Workshop 01 6:00 pm ${date.getUTCDate()} ${date.toLocaleString('en-US',{month:'long',timeZone:'UTC'})}`}}];}
    if(command==='submit'){assert.equal(cfg.code,'AB123');activities.find(a=>a.rawText.startsWith('ABC1234')).state='completed';return [{result:{submitted:true}}];}
    if(command==='outcome')return [{result:{rejected:false,blocked:false}}];
    if(command==='list'){queries.push(cfg.courses);ruleRevisions.push(cfg.sourceRules?.courses?.ABC1234?.gmail?.revision);if((options.holdPrefetch||options.parallelLogin)&&queries.length===1){signalPrefetch();await prefetchHeld;}return [{result:{threads:[]}}];}
    if(command==='read')return [{result:{messages:[],links:[],priorityLinks:[],pageTitle:cfg.course}}];
    throw new Error('Unexpected adapter command '+command);
  }}
 };
 globalThis.chrome.tabs.query=async()=>[];
 try{
  await import(`../extension/background.js?scenario=${completed.join('-')}&alarm=${viaAlarm}&auto=${automatic}&discover=${discovery}&clear=${clear}&reset=${reset}&enabled=${enabled}&expired=${savedExpired}&login=${login}&options=${encodeURIComponent(JSON.stringify(options))}`);
  if(options.previewRace){
   values.settings.devMode=true;const request=message=>new Promise(resolve=>listener(message,{id:'test',url:'chrome-extension://test/options.html'},resolve));
   const get=chrome.storage.local.get;let release,entered;const held=new Promise(r=>{release=r;}),reached=new Promise(r=>{entered=r;});let once=true;
   chrome.storage.local.get=async keys=>{if(once&&keys.includes('records')){once=false;entered();await held;}return get(keys);};
   const retry=request({type:'retry',course:'ABC1234'});await reached;
   const preview=await request({type:'ruleTestStart',course:'ABC1234',source:'moodle',mode:'builtin',stage:'locate'});
   await request({type:'ruleTestClear'});release();await retry;
   const deadline=Date.now()+10000;while(!values.status?.finishedAt&&Date.now()<deadline)await new Promise(r=>setTimeout(r,1));
   assert.equal(preview.ok,false);assert.match(preview.error,/rule-test-busy/);return;
  }
  if(reset){const result=await new Promise(resolve=>listener({type:'reset'},{id:'test',url:'chrome-extension://test/options.html'},resolve));assert.equal(result.ok,true);assert.deepEqual(values,{});return result;}
  if(clear){values.attendanceHistory=[{course:'ABC1234'}];values.diagnosticLog=[{event:'test'}];values.records=[{id:'saved-record',code:'ABC12'}];const result=await new Promise(resolve=>listener({type:'clearCourses'},{id:'test',url:'chrome-extension://test/options.html'},resolve));assert.equal(result.ok,true);assert.deepEqual(values.attendanceHistory,[]);assert.deepEqual(values.diagnosticLog,[]);return {settings:values.settings,records:values.records};}
  if(discovery){const result=await new Promise(resolve=>listener({type:'redetect'},{id:'test',url:'chrome-extension://test/options.html'},resolve));assert.equal(values.status,undefined);assert.equal(values.settings.courses.length,0);return result;}
  if(options.holdPrefetch){
   const result=await new Promise(resolve=>listener({type:'prefetchMail',expectedIdentity:{email:settings.email,name:settings.name},verifiedLogin:{gmail:{tabId:101}}},{id:'test',url:'chrome-extension://test/options.html'},resolve));
   assert.equal(result.ok,true);
   await Promise.race([prefetchEntered,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Gmail prefetch did not start')),2000))]);
  }
  if(options.stalePrefetch){
   const request=message=>new Promise(resolve=>listener(message,{id:'test',url:'chrome-extension://test/options.html'},resolve));
   await request({type:'prefetchMail'});
   const deadline=Date.now()+2000;while(!nativeClosed&&Date.now()<deadline)await new Promise(r=>setTimeout(r,1));
   assert.ok(nativeClosed);
   const rule={schemaVersion:1,id:'community.example.images',version:'1.0.0',name:{en:'Example'},source:'gmail',courses:['ABC1234'],images:{selectors:['img']}};
   assert.equal((await request({type:'ruleImport',text:JSON.stringify(rule)})).ok,true);
   const challenge=await request({type:'ruleTestSkipPrepare',course:'ABC1234',source:'gmail',ruleIds:[rule.id]});
   assert.equal((await request({type:'ruleTestSkipConfirm',token:challenge.token,confirmed:true})).ok,true);
   assert.equal((await request({type:'ruleBind',course:'ABC1234',source:'gmail',ruleId:rule.id})).ok,true);
  }
  if(viaAlarm)alarmListener({name:'scan'});
  else{const result=await new Promise(resolve=>listener({type:'scan',preflight:Boolean(options.parallelLogin),...(options.preflight?{verifiedLogin:{attendance:{tabId:100}}}:{})},{id:'test',url:'chrome-extension://test/options.html'},resolve));assert.equal(result.ok,true);}
  let startupStatus;
  if(options.holdPrefetch){
   const deadline=Date.now()+2000;
   while(!values.status?.running&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,1));
   startupStatus=structuredClone(values.status);
   releasePrefetch();
  }
  const deadline=Date.now()+10000;
  while(!values.status?.finishedAt&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,1));
  assert.ok(values.status?.finishedAt,'run must finish');
  assert.equal(values.status.error,Boolean(options.closedAttendance),JSON.stringify(values.diagnostics));
  await new Promise(resolve=>setTimeout(resolve,5));
  return {opened,queries,removed,settings:values.settings,summary:values.status.summary,records:values.records,status:values.status,startupStatus,statuses,ruleRevisions};
 }finally{globalThis.chrome=previous;globalThis.fetch=previousFetch;}
}
test('a pending production request reserves execution before a preview can start',async()=>{
 await runScenario(['ABC1234','DEF1234'],false,false,false,false,false,true,false,false,{previewRace:true});
});
test('an abandoned prefetch cannot replace the next run rule snapshot',async()=>{
 const result=await runScenario([],false,false,false,false,false,true,false,false,{stalePrefetch:true});
 assert.deepEqual(result.ruleRevisions,[0,1]);
});
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
test('Moodle-only background run never opens Gmail without a configured email',async()=>{
 const result=await runScenario([],false,false,false,false,false,true,false,false,{noMail:true});
 assert.deepEqual(result.queries,[]);assert.equal(result.opened.some(url=>/mail.google|accounts.google/.test(url)),false);
 assert.deepEqual(result.summary.diagnostics,[]);
});
test('Ed-only background run never opens Gmail or Moodle',async()=>{
 const result=await runScenario([],false,false,false,false,false,true,false,false,{edOnly:true});
 assert.deepEqual(result.queries,[]);assert.equal(result.opened.some(url=>/google|learning.monash/.test(url)),false);
 assert.equal(result.opened.some(url=>url.includes('edstem.org')),true);assert.deepEqual(result.summary.diagnostics,[]);
});
test('a lone complete low-confidence review reaches the portal and becomes confirmed',async()=>{
 const result=await runScenario(['DEF1234'],false,false,false,false,false,true,false,false,{review:true});
 assert.equal(result.records.find(r=>r.id==='review').status,'submitted');
 assert.equal(result.summary.submitted,1);
});
test('alarm runs the background scan without an options page or scan message',async()=>{
 const result=await runScenario(['ABC1234'],true);
 assert.deepEqual(result.queries,[['DEF1234']]);
});

test('automatic timetable reads pending website sessions without manual weekly settings',async()=>{const result=await runScenario(['ABC1234'],false,true);assert.deepEqual(result.queries,[['DEF1234']]);assert.equal(result.settings.schedules.ABC1234.length,1);assert.equal(result.settings.schedules.DEF1234.length,1);});

test('first-time discovery returns all recent courses after identity setup without configured courses or submitting',async()=>{const result=await runScenario([],false,false,true);assert.equal(result.ok,true);assert.deepEqual(result.courses,['ABC1234','DEF1234']);assert.equal(result.schedules.ABC1234.length,1);});

test('clearing courses also deletes collected records and pauses automation',async()=>{const result=await runScenario([],false,false,false,true);assert.deepEqual(result.settings.courses,[]);assert.deepEqual(result.settings.schedules,{});assert.deepEqual(result.settings.sourceModes,{});assert.deepEqual(result.settings.edUrls,{});assert.equal(result.settings.enabled,false);assert.equal(result.settings.autoDiscover,false);assert.deepEqual(result.records,[]);});

test('fresh-start reset removes identity, courses, records and local state',async()=>{const result=await runScenario([],false,false,false,false,true);assert.equal(result.ok,true);});

test('manual check runs with automatic scheduling disabled and keeps it disabled',async()=>{const result=await runScenario(['ABC1234','DEF1234'],false,false,false,false,false,false);assert.equal(result.settings.enabled,false);assert.ok(result.opened.length);});

test('first run shows Gmail prefetch while the background scan waits for it',async()=>{
 const result=await runScenario(['ABC1234','DEF1234'],false,false,false,false,false,false,false,false,{holdPrefetch:true});
 assert.match(result.startupStatus?.message||'',/Gmail/);
 assert.equal(result.startupStatus?.running,true);
});
test('popup Gmail prefetch cannot replace Attendance login waiting state',async()=>{
 const result=await runScenario(['ABC1234','DEF1234'],false,false,false,false,false,false,false,false,{parallelLogin:true});
 const start=result.statuses.findIndex(s=>s.phase==='waiting'&&s.waitingSite==='attendance');
 assert.ok(start>=0);
 const waiting=result.statuses.slice(start,result.statuses.findIndex((s,i)=>i>start&&s.phase==='collecting'));
 assert.ok(waiting.length>1,'Gmail must report progress during the login wait: '+JSON.stringify(result.statuses.map(s=>({phase:s.phase,site:s.waitingSite,message:s.message}))));
 assert.ok(waiting.every(s=>s.phase==='waiting'&&s.waitingSite==='attendance'));
 assert.ok(waiting.at(-1).counts.pages>0,'parallel collection counters are retained');
 assert.ok(result.status.counts.pages>0,'final state retains prefetch counters');
});

test('unchanged expired history stays in collection records without reopening a completion warning',async()=>{const result=await runScenario(['ABC1234','DEF1234'],false,false,false,false,false,true,true);assert.equal(result.summary.submitted,0);assert.equal(result.summary.quiet,true);assert.deepEqual(result.summary.courses,[]);assert.deepEqual(result.summary.records,[]);assert.ok(result.records.some(r=>r.id==='old-expired'&&r.status==='expired'));});
