import './helpers/install-source-runtime.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {prioritiseThreads,scoreThread} from '../extension/gmail-ranking.js';
import {gmailDateBounds} from '../extension/timetable.js';
import {gmailAdapter} from '../extension/gmail.js';
import {createSourceCollectors} from '../extension/source-collection.js';
import {gmailQuery,DEFAULTS,normalizeSettings} from '../extension/settings.js';

test('mixed-source collection reads blank-sender keyword and course matches through the real Gmail adapter',async()=>{
 const settings=normalizeSettings(DEFAULTS,{name:'Student',email:'abcd1234@student.monash.edu',courses:['AAA1111','BBB2222','CCC3333','DDD4444','EEE5555'],sourceModes:{AAA1111:'email',BBB2222:'email-moodle',CCC3333:'moodle',DDD4444:'ed',EEE5555:'email-ed'},senders:{AAA1111:'teacher@example.edu',BBB2222:'',EEE5555:''},subjectKeywords:{BBB2222:'Studio notices'},moodleUrls:{BBB2222:['https://learning.monash.edu/course/view.php?id=2'],CCC3333:['https://learning.monash.edu/course/view.php?id=3']},edUrls:{DDD4444:['https://edstem.org/au/courses/4'],EEE5555:['https://edstem.org/au/courses/5']}});
 assert.equal(gmailQuery(settings),'newer_than:7d attendance');
 const threads=[
  {id:'restricted',subject:'AAA1111 attendance',sender:'teacher@example.edu'},
  {id:'wrong-sender',subject:'AAA1111 attendance',sender:'other@example.edu'},
  {id:'keyword',subject:'Studio notices attendance',sender:'other@example.edu'},
  {id:'course',subject:'EEE5555 attendance',sender:'third@example.edu'},
  {id:'wrong-keyword',subject:'BBB2222 attendance',sender:'other@example.edu'},
  {id:'moodle-only',subject:'CCC3333 attendance',sender:'other@example.edu'},
  {id:'ed-only',subject:'DDD4444 attendance',sender:'other@example.edu'}
 ];
 const account='<div aria-label="Google Account: abcd1234@student.monash.edu"></div>';
 const list=account+'<main><div role="grid">'+threads.map(t=>`<div role="row"><div data-legacy-thread-id="${t.id}" data-legacy-last-message-id="m-${t.id}">${t.subject}</div><span email="${t.sender}"></span></div>`).join('')+'</div></main>';
 const messages=[],navigations=[],tab={id:1,url:'https://mail.google.com/mail/u/0/',status:'complete'};
 const collectors=createSourceCollectors({
  tabs:{get:async()=>tab},navigate:async(id,url)=>{tab.url=url;navigations.push(url);},
  readAdapter:async(id,adapter,command,args)=>{
   const thread=threads.find(t=>tab.url.endsWith('#all/'+t.id));
   const content=thread?account+`<main><h2>${thread.subject}</h2><div data-legacy-message-id="m-${thread.id}"><span email="${thread.sender}"></span><div class="a3s">Workshop Monday 14 Sep 01 10:00 am ABC12</div></div></main>`:list;
   const dom=new JSDOM(content,{url:tab.url});try{return adapter(command,args,dom.window.document);}finally{dom.window.close();}
  },
  onMessages:async items=>{messages.push(...items);return {completedMessageIds:items.map(item=>item.messageId)};},
  onDiagnostic:async d=>{throw new Error(d.error);},delay:async()=>{},progress:async()=>{},persistCache:async()=>{}
 });
 const result=await collectors.collectMail({settings,cache:{seenMessages:{},seenThreads:{}},verifiedLogin:{gmail:{tabId:1}},snapshot:{courses:{}}});
 assert.equal(result.complete,true);
 assert.equal(decodeURIComponent(navigations[0].split('#search/')[1]),'newer_than:7d attendance');
 assert.deepEqual(messages.map(m=>[m.course,m.sender]),[['AAA1111','teacher@example.edu'],['BBB2222','other@example.edu'],['EEE5555','third@example.edu']]);
 assert.deepEqual(messages.map(m=>m.messageId),['m-restricted','m-keyword','m-course']);
});

test('attendance code subjects outrank noisy ones',()=>{
 assert.ok(scoreThread('Week 3 Attendance Codes')>scoreThread('Week 3 attendance consultation recording'));
 assert.ok(scoreThread('FIT1234 attendance')>scoreThread('Zoom link for this week'));
 assert.ok(scoreThread('Unit announcement: attendance')>scoreThread('general news'));
});

test('threads are round-robined per course before score order fills the rest',()=>{
 const threads=[];
 for(let i=0;i<6;i++)threads.push({id:`a${i}`,course:'AAA1111',subject:'Attendance Codes week '+i});
 for(let i=0;i<6;i++)threads.push({id:`b${i}`,course:'BBB2222',subject:'Attendance Codes week '+i});
 threads.push({id:'noise',course:'AAA1111',subject:'reminder: quiz tomorrow'});
 const picked=prioritiseThreads(threads,{limit:40,perCourse:4});
 // First four rounds alternate between both courses; the noisy thread only
 // appears after every fair-share slot is taken.
 assert.deepEqual(picked.slice(0,2).map(t=>t.course),['AAA1111','BBB2222']);
 assert.equal(picked.filter(t=>t.course==='AAA1111').length,7);
 assert.equal(picked.filter(t=>t.course==='BBB2222').length,6);
 assert.equal(picked.at(-1).id,'noise');
 assert.equal(prioritiseThreads(threads,{limit:5,perCourse:4}).length,5);
});

test('gmail search bounds wrap the session dates with an early and late margin',()=>{
 const settings={courses:['ABC1234'],schedules:{ABC1234:[{weekday:3,time:'18:00',type:'',group:''}]}};
 // 2026-09-16 is a Wednesday; the 7-day window holds exactly one session, and
 // the mail window still reaches 8 days before and 4 days after its date.
 const bounds=gmailDateBounds(settings,Date.parse('2026-09-16T12:00:00Z'));
 assert.equal(bounds,'after:2026/09/08 before:2026/09/20');
 assert.equal(gmailDateBounds({courses:[]},Date.now()),'');
});

const manifest=JSON.parse(await readFile(new URL('../extension/manifest.json',import.meta.url),'utf8'));

function runGmail(html,args){
 const dom=new JSDOM(html,{url:'https://mail.google.com/mail/u/0/#search/test'});
 try{return gmailAdapter('list',args,dom.window.document);}
 finally{dom.window.close();}
}
const cfg={email:'abcd1234@student.monash.edu',courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'},subjectKeywords:{ABC1234:'ABC1234'}};
const page=`<div aria-label="Google Account: abcd1234@student.monash.edu"></div><div role="menuitem" hidden>Most recent</div>
<main><div role="button">Showing most relevant</div>
<div role="grid"><div role="row"><div data-legacy-thread-id="t1" data-legacy-last-message-id="m1">ABC1234 week 2 attendance codes</div><span email="teacher@example.edu"></span></div></div></main>`;

function runGmailCommand(command,html,url,args){
 const dom=new JSDOM(html,{url});
 try{return gmailAdapter(command,args,dom.window.document);}
 finally{dom.window.close();}
}
test('thread content is identified by message id, tolerating truncated list subjects',()=>{
 const threadPage=`<div aria-label="Google Account: abcd1234@student.monash.edu"></div>
 <main><h2>FIT1234 week 3 attendance codes for lab and studio sessions (full subject)</h2>
 <div data-legacy-message-id="m9"><span email="teacher@example.edu"></span><div class="a3s">FIT1234 Workshop Monday 14 Sep 01 10:00 am ABC12</div></div></main>`;
 const cfgThread={email:'abcd1234@student.monash.edu',courses:['FIT1234'],senders:{FIT1234:'teacher@example.edu'},subjectKeywords:{FIT1234:'FIT1234'}};
 const args={...cfgThread,expectedLastMessageId:'m9',threadCourse:'FIT1234'};
 const first=runGmailCommand('messages',threadPage,'https://mail.google.com/mail/u/0/#all/t1',args);
 assert.equal(first.loading,undefined);
 assert.equal(first.messages.length,1);
 const other=runGmailCommand('messages',threadPage,'https://mail.google.com/mail/u/0/#all/t1',{...args,expectedLastMessageId:'missing'});
 assert.equal(other.loading,true);
});
test('gmail list flips most-relevant to most-recent once, then reads threads',()=>{
 const first=runGmail(page,cfg);
 assert.equal(first.loading,true);
 // The flag lives on documentElement inside that throwaway DOM, so simulate the
 // settled second poll with a fresh DOM marked as already flipped.
 const dom=new JSDOM(page,{url:'https://mail.google.com/mail/u/0/#search/test'});
 try{
  dom.window.document.documentElement.dataset.mamoRankedFlipped='1';
  const second=gmailAdapter('list',cfg,dom.window.document);
  assert.equal(second.loading,undefined);
  assert.equal(second.threads.length,1);
  assert.equal(second.threads[0].id,'t1');
 }finally{dom.window.close();}
});
