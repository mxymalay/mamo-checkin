import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {prioritiseThreads,scoreThread} from '../extension/gmail-ranking.js';
import {gmailDateBounds} from '../extension/timetable.js';
import {gmailAdapter} from '../extension/gmail.js';

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
