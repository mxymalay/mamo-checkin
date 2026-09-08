import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {gmailAdapter} from '../extension/gmail.js';
import {attendanceAdapter} from '../extension/attendance.js';
const dom=html=>new JSDOM(html,{url:'https://mail.google.com/mail/u/2/#search/attendance'}).window.document;
const config={email:'abcd1234@student.monash.edu',name:'Example Student',courses:['FIT5120','FIT5122'],senders:{FIT5120:'lms@example.edu',FIT5122:'teacher@example.edu'}};
test('Gmail detects wrong signed-in account before reading',()=>{
 const doc=dom('<button aria-label="Google Account: Person (wrong@example.edu)"></button>');
 assert.throws(()=>gmailAdapter('list',config,doc),/账号/);
});
test('thread list ignores unrelated sender even with matching course title',()=>{
 const doc=dom(`<button aria-label="Google Account: Person (abcd1234@student.monash.edu)"></button><main role="main"><table role="grid"><tr role="row"><td><span email="teacher@example.edu"></span><span data-legacy-thread-id="abc" data-legacy-last-message-id="new">[FIT5122_S2_2026_TUT01] Attendance Code</span></td></tr><tr role="row"><td><span email="spam@example.org"></span><span data-legacy-thread-id="xyz">FIT5120 Attendance Code</span></td></tr></table></main>`);
 assert.deepEqual(gmailAdapter('list',config,doc).threads.map(t=>[t.id,t.lastMessageId]),[['abc','new']]);
});
test('thread list uses configured course subject keywords without hardcoded attendance wording',()=>{
 const generic={...config,courses:['COMP90024'],senders:{COMP90024:'teacher@example.edu'},subjectKeywords:{COMP90024:'Weekly token'}};
 const doc=dom(`<button aria-label="Google Account: Person (abcd1234@student.monash.edu)"></button><main role="main"><table role="grid"><tr role="row"><td><span email="teacher@example.edu"></span><span data-legacy-thread-id="generic" data-legacy-last-message-id="latest">COMP90024 Weekly token</span></td></tr></table></main>`);
 assert.deepEqual(gmailAdapter('list',generic,doc).threads.map(t=>[t.id,t.course]),[['generic','COMP90024']]);
});
test('overlapping subject rules never choose the first matching course',()=>{
 const overlapping={...config,courses:['FIT5120','FIT5122'],senders:{FIT5120:'teacher@example.edu',FIT5122:'teacher@example.edu'},subjectKeywords:{FIT5120:'Weekly code',FIT5122:'Weekly code'}};
 const doc=dom(`<button aria-label="Google Account: Person (abcd1234@student.monash.edu)"></button><main role="main"><table role="grid"><tr role="row"><td><span email="teacher@example.edu"></span><span data-legacy-thread-id="ambiguous" data-legacy-last-message-id="latest">Weekly code</span></td></tr></table></main>`);
 assert.throws(()=>gmailAdapter('list',overlapping,doc),/多个课程/);
});
test('each message keeps its own timestamp and excludes quoted pictures',()=>{
 const doc=dom(`<button aria-label="Google Account: Person (abcd1234@student.monash.edu)"></button><main role="main"><h2>[FIT5122_S2_2026_TUT01] Attendance Code</h2><div data-message-id="x" data-legacy-message-id="new"><span email="teacher@example.edu"></span><span class="g3" title="2 Sept 2026, 19:31"></span><div class="a3s">Attendance Week 6<img src="https://mail.google.com/current.png" width="763" height="35"><div class="gmail_quote">Old reply<img src="https://mail.google.com/old.png" width="763" height="35"></div></div></div></main>`);
 for(const img of doc.images){Object.defineProperty(img,'naturalWidth',{value:763});Object.defineProperty(img,'naturalHeight',{value:35});}
 const messages=gmailAdapter('messages',config,doc).messages;
 assert.equal(messages.length,1); assert.equal(messages[0].sentAtText,'2 Sept 2026, 19:31');
 assert.deepEqual(messages[0].images,['https://mail.google.com/current.png']);
 assert.equal(gmailAdapter('messages',{...config,expectedSubject:'FIT5120 - Week 7 Summary'},doc).loading,true);
 assert.equal(gmailAdapter('messages',{...config,expectedSubject:'[FIT5122_S2_2026_TUT01] Attendance Code',expectedLastMessageId:'later'},doc).loading,true);
 assert.equal(gmailAdapter('messages',{...config,expectedSubject:'[FIT5122_S2_2026_TUT01] Attendance Code',expectedLastMessageId:'new'},doc).messages.length,1);
});
test('Gmail extracts table and leaf text rows, permits text-only messages, and keeps small code images',()=>{
 const doc=dom(`<button aria-label="Google Account: Person (abcd1234@student.monash.edu)"></button><main role="main"><h2>FIT5122 Attendance Code</h2><div data-legacy-message-id="text"><span email="teacher@example.edu"></span><span class="g3" title="2 Sept 2026, 19:31"></span><div class="a3s"><p>Attendance code</p><table><tr><td>Applied</td><td>Wednesday,2 Sep</td><td>01</td><td>6:00PM</td><td>PNK7L</td></tr></table><ul><li>Parent item<ul><li>Code QK28J</li></ul></li></ul><div class="gmail_quote"><p>Attendance code OLD12</p></div><div class="gmail_signature"><p>Code SIG12</p></div><img src="https://mail.google.com/small.png"><img class="avatar" alt="profile avatar" src="https://mail.google.com/avatar.png"></div></div></main>`);
 for(const image of doc.images){Object.defineProperty(image,'naturalWidth',{value:80});Object.defineProperty(image,'naturalHeight',{value:image.classList.contains('avatar')?80:25});}
 const [message]=gmailAdapter('messages',config,doc).messages;
 assert.deepEqual(message.textRows,['Attendance code','Applied Wednesday,2 Sep 01 6:00PM PNK7L','Code QK28J']);
 assert.deepEqual(message.images,['https://mail.google.com/small.png']);
 assert.equal(message.sourceType,'gmail');

 doc.querySelector('img:not(.avatar)').remove();doc.querySelector('.avatar').remove();
 const [textOnly]=gmailAdapter('messages',config,doc).messages;
 assert.equal(textOnly.images.length,0);assert.equal(textOnly.textRows.length,3);
});
test('attendance distinguishes completed, expired and available sessions across date panels',()=>{
 const doc=new JSDOM(`<h1>Choose day and activity</h1><main><span>Example Student</span><div id="dayPanel_2_Sep_26"><ul><li><img src="./img/tick.png">6:00 pm FIT5122 Applied 01</li></ul></div><div id="dayPanel_31_Aug_26"><ul><li><img src="./img/absent_code.png">6:00 pm FIT5122 Workshop 01</li></ul></div><div id="dayPanel_7_Sep_26"><ul><li><a href="Entry.aspx?s=123&d=7_Sep_26">6:00 pm FIT5122 Workshop 01</a></li></ul></div></main>`,{url:'https://attendance.monash.edu.my/student/Units.aspx'}).window.document;
 assert.deepEqual(attendanceAdapter('activities',config,doc).activities.map(a=>a.state),['completed','expired','available']);
});
test('attendance requires an exact identity element and rejects a name prefix',()=>{
 const doc=new JSDOM(`<main><span>Example Student Other</span><div id="dayPanel_7_Sep_26"><li><a href="Entry.aspx?s=1&d=7_Sep_26">6:00 pm FIT5122 Workshop 01</a></li></div></main>`,{url:'https://attendance.monash.edu.my/student/Units.aspx'}).window.document;
 assert.throws(()=>attendanceAdapter('activities',config,doc),/姓名/);
});
test('attendance collects configurable course-shaped activity identifiers',()=>{
 const doc=new JSDOM(`<main><span>Example Student</span><div id="dayPanel_7_Sep_26"><li><a href="Entry.aspx?s=1&d=7_Sep_26">6:00 pm COMP90024 Tutorial 01</a></li></div></main>`,{url:'https://attendance.monash.edu.my/student/Units.aspx'}).window.document;
 assert.equal(attendanceAdapter('activities',config,doc).activities.length,1);
});
test('form mismatch never enters a code or submits',()=>{
 const doc=new JSDOM('<h1>Enter code</h1><h2>FIT5122 Workshop 01 6:00 pm Monday 7 September</h2><input id="ctl00_ContentPlaceHolder1_sessionCode"><input type="submit" value="Submit">',{url:'https://attendance.monash.edu.my/student/Entry.aspx?s=123&d=7_Sep_26'}).window.document;
 assert.throws(()=>attendanceAdapter('submit',{expectedHeading:'FIT5120 Studio 01 6:00 pm Monday 7 September',code:'ABCDE',expectedUrl:doc.location.href},doc),/不匹配/);
 assert.equal(doc.querySelector('input').value,'');
});

test('final Gmail extraction waits for every allowed message body after navigation is ready',()=>{
 const subject='FIT5122 Attendance Code';
 const message=(id,body)=>`<div data-legacy-message-id="${id}"><span email="teacher@example.edu"></span><span class="g3" title="7 Sept 2026, 19:31"></span>${body}</div>`;
 const doc=dom(`<button aria-label="Google Account: Person (abcd1234@student.monash.edu)"></button><main><h2>${subject}</h2>${message('old','<div class="a3s"><p>Attendance old</p></div>')}${message('new','<div class="a3s" hidden><p>Attendance new</p></div>')}</main>`);
 const bound={...config,expectedSubject:subject,expectedLastMessageId:'new'};
 const navigation=gmailAdapter('messages',bound,doc);
 assert.notEqual(navigation.loading,true);assert.equal(navigation.bodiesReady,false);
 const pending=gmailAdapter('messages',{...bound,requireBodiesReady:true},doc);
 assert.equal(pending.loading,true);assert.equal(pending.bodiesReady,false);
 doc.querySelector('[data-legacy-message-id="new"] .a3s').hidden=false;
 const complete=gmailAdapter('messages',{...bound,requireBodiesReady:true},doc);
 assert.equal(complete.bodiesReady,true);assert.deepEqual(complete.messages.map(m=>m.messageId),['old','new']);
 doc.querySelector('[data-legacy-message-id="old"] .a3s').remove();
 assert.equal(gmailAdapter('messages',{...bound,requireBodiesReady:true},doc).loading,true);
});

test('Gmail preserves div, br and direct-text row boundaries without quoted or hidden text',()=>{
 const doc=dom(`<button aria-label="Google Account: Person (abcd1234@student.monash.edu)"></button><main><h2>FIT5122 Attendance Code</h2><div data-legacy-message-id="plain"><span email="teacher@example.edu"></span><span class="g3" title="7 Sept 2026, 19:31"></span><div class="a3s">Attendance<br>Workshop Monday,7 Sep 01 6:00PM ABCDE<div>Applied Wednesday,9 Sep 01 6:00PM FG123<br>Code <span>HI456</span></div>Direct line one\nDirect line two<div class="gmail_quote">Attendance OLD12</div><blockquote><p>QUOTE</p></blockquote><div class="gmail_signature">SIG12</div><div style="display:none">HIDE1</div></div></div></main>`);
 const result=gmailAdapter('messages',{...config,requireBodiesReady:true},doc);
 assert.equal(result.messages.length,1);
 assert.deepEqual(result.messages[0].textRows,['Attendance','Workshop Monday,7 Sep 01 6:00PM ABCDE','Applied Wednesday,9 Sep 01 6:00PM FG123','Code HI456','Direct line one','Direct line two']);
 assert.equal(result.bodiesReady,true);
});
test('a course summary can contain only a table image without an attendance caption',()=>{
 const doc=dom('<button aria-label="Google Account: Person (abcd1234@student.monash.edu)"></button><main><h2>FIT5120 Week 6 Summary</h2><div data-legacy-message-id="image-only"><span email="lms@example.edu"></span><span class="g3" title="4 Sept 2026, 22:08"></span><div class="a3s"><img src="https://mail.google.com/table.png"></div></div></main>');
 Object.defineProperties(doc.images[0],{naturalWidth:{value:1000},naturalHeight:{value:43},complete:{value:true}});
 const result=gmailAdapter('messages',{...config,requireBodiesReady:true},doc);
 assert.deepEqual(result.messages[0].images,['https://mail.google.com/table.png']);assert.equal(result.bodiesReady,true);
});
