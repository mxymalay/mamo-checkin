import './helpers/install-source-runtime.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {edAdapter} from '../extension/ed-adapter.js';
import {DEFAULTS,normalizeSettings} from '../extension/settings.js';
import {exportConfiguration,parseConfiguration} from '../extension/configuration.js';
import {gmailQuery} from '../extension/settings.js';

const base={...DEFAULTS,email:'abcd1234@student.monash.edu',name:'Example Student',courses:['FIT1234'],edUrls:{},moodleUrls:{},senders:{}};

function run(html,url,args={course:'FIT1234'}){
 const dom=new JSDOM(html,{url});
 try{return edAdapter('read',args,dom.window.document);}
 finally{dom.window.close();}
}

test('Ed adapter lists thread links with attendance threads first',()=>{
 const html=`<main><h1>FIT1234</h1><a href="/au/courses/55/discussion/102">General chat</a><a href="https://edstem.org/au/courses/55/discussion/101">Week 2 attendance code</a><a href="/au/courses/99/discussion/103">Other course</a><a href="/au/courses/55/settings">Settings</a></main>`;
 const data=run(html,'https://edstem.org/au/courses/55');
 assert.deepEqual(data.threadLinks,['https://edstem.org/au/courses/55/discussion/101','https://edstem.org/au/courses/55/discussion/102']);
 assert.equal(data.messages.length,0);
 assert.equal(data.pageTitle,'FIT1234');
});

test('Ed adapter clicks Load more across polls until the thread list is expanded',()=>{
 const dom=new JSDOM(`<main><h1>FIT1234</h1><button>加载更多</button><a href="/au/courses/55/discussion/101">Week 2 attendance code</a></main>`,{url:'https://edstem.org/au/courses/55'});
 try{
  const args={course:'FIT1234'};
  const first=edAdapter('read',args,dom.window.document);
  assert.equal(first.loading,true);
  assert.equal(dom.window.document.documentElement.dataset.edExpanded,'1');
  dom.window.document.documentElement.dataset.edExpanded='12';
  const second=edAdapter('read',args,dom.window.document);
  assert.equal(second.loading,undefined);
  assert.deepEqual(second.threadLinks,['https://edstem.org/au/courses/55/discussion/101']);
 }finally{dom.window.close();}
});
test('Ed adapter collects edusercontent attachment links as OCR candidates',()=>{
 const html=`<title>FIT1234 Studio</title><main><h1>Week 2 attendance</h1><a href="https://cdn.edusercontent.com/files/table.png">attendance table</a></main>`;
 const [msg]=run(html,'https://edstem.org/au/courses/55/discussion/101').messages;
 assert.deepEqual(msg.images,['https://cdn.edusercontent.com/files/table.png']);
});

test('Ed adapter rejects a page whose title lacks the configured course code',()=>{
 const html=`<main><h1>Studio Project S2</h1><p>attendance ABC12 Monday 14 Sep</p></main>`;
 assert.throws(()=>run(html,'https://edstem.org/au/courses/55/discussion/101'),/course_id（与 Moodle 的不同）/);
});

test('Ed adapter extracts attendance rows and posted time from a thread page',()=>{
 const html=`<title>FIT1234 Studio</title><main><h1>Week 2 attendance</h1><time datetime="2026-09-15T03:00:00Z"></time><table><tr><td>ABC12</td><td>Workshop</td><td>Monday 14 Sep</td><td>01</td><td>10:00 am</td></tr></table></main>`;
 const [msg]=run(html,'https://edstem.org/au/courses/55/discussion/101').messages;
 assert.equal(msg.messageId,'ed:FIT1234:101:2026-09-15T03:00:00Z');
 assert.equal(msg.sourceType,'ed');
 assert.equal(msg.course,'FIT1234');
 assert.equal(msg.sentAt,'2026-09-15T03:00:00Z');
 assert.equal(msg.dateBasis,'posted-at');
 assert.ok(msg.textRows.some(row=>/ABC12.*Workshop.*Monday 14 Sep.*01.*10:00 am/.test(row)));
});

test('Ed adapter keeps undated content as reference-year evidence',()=>{
 const html=`<title>FIT1234 Studio</title><main><h1>Attendance code</h1><table><tr><td>XYZ99</td><td>Studio</td><td>Tuesday 8 Sep</td><td>02</td><td>2:00 pm</td></tr></table></main>`;
 const [msg]=run(html,'https://edstem.org/au/courses/55/discussion/101',{course:'FIT1234',academicYear:2026}).messages;
 assert.equal(msg.dateReferenceOnly,true);
 assert.equal(msg.dateBasis,'reference-year');
 assert.equal(msg.sentAt,'2026-01-01T00:00:00+08:00');
});

test('Ed adapter skips threads older than the requested window',()=>{
 const html=`<title>FIT1234 Studio</title><main><h1>Old attendance</h1><time datetime="2026-09-01T03:00:00Z"></time><p>attendance ABC12 Monday 14 Sep</p></main>`;
 const data=run(html,'https://edstem.org/au/courses/55/discussion/101',{course:'FIT1234',sinceDate:'2026-09-16'});
 assert.deepEqual(data.messages,[]);
});

test('Ed adapter requires a signed-in Ed session on the configured course',()=>{
 assert.throws(()=>run('<html><body><form><input type="password"></form><main>content</main></body></html>','https://edstem.org/au/courses/55/discussion/101'),/LOGIN_REQUIRED/);
 assert.throws(()=>run('<main>content</main>','https://edstem.org/login'),/LOGIN_REQUIRED/);
 assert.throws(()=>run('<main>content</main>','https://edstem.org/au/courses/99/discussion/1',{course:'FIT1234',expectedCourseId:'55'}),/不匹配/);
 assert.throws(()=>run('<main>content</main>','https://edstem.org/au/settings'),/不匹配|未知/);
});

test('Ed course URLs validate, canonicalize and satisfy the source requirement alone',()=>{
 const settings=normalizeSettings(base,{courses:['FIT1234'],edUrls:{FIT1234:['https://edstem.org/au/courses/123']}});
 assert.deepEqual(settings.edUrls.FIT1234,['https://edstem.org/au/courses/123']);
 assert.deepEqual(normalizeSettings(base,{courses:['FIT1234'],edUrls:{FIT1234:[' 37233 ']}}).edUrls.FIT1234,['https://edstem.org/au/courses/37233']);
 const canonical=normalizeSettings(base,{courses:['FIT1234'],edUrls:{FIT1234:['https://edstem.org/au/courses/123/discussion?category=abc']}});
 assert.deepEqual(canonical.edUrls.FIT1234,['https://edstem.org/au/courses/123']);
 assert.throws(()=>normalizeSettings(base,{courses:['FIT1234'],edUrls:{FIT1234:['https://example.com/au/courses/123']}}),/Ed course_id 或课程网址/);
 assert.throws(()=>normalizeSettings(base,{courses:['FIT1234'],edUrls:{FIT1234:['https://edstem.org/au/courses/abc']}}),/课程网址/);
 assert.throws(()=>normalizeSettings(base,{courses:['FIT1234'],edUrls:{FIT1234:['https://edstem.org/au/courses/1','https://edstem.org/au/courses/2']}}),/最多配置 1 个/);
 test('email source with an empty sender falls back to keyword-only Gmail search',()=>{
  const cfg=normalizeSettings(base,{courses:['FIT1234'],sourceModes:{FIT1234:'email'},senders:{FIT1234:''}});
  assert.equal(cfg.senders.FIT1234,'');
  assert.equal(gmailQuery(cfg),'newer_than:7d attendance');
 });
});

test('Ed sources round trip through the personal configuration export',()=>{
 const settings=normalizeSettings(base,{courses:['FIT1234'],edUrls:{FIT1234:['https://edstem.org/au/courses/123']}});
 const restored=parseConfiguration(exportConfiguration(settings),DEFAULTS);
 assert.deepEqual(restored.edUrls.FIT1234,['https://edstem.org/au/courses/123']);
});
