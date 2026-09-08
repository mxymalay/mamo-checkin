import test from 'node:test';
import assert from 'node:assert/strict';
import {outsideAttendanceWindow,messageOutsideWindow,scanSinceDate} from '../extension/recent-window.js';
import {eligible} from '../extension/core.js';
import {moodleAdapter} from '../extension/moodle.js';
import {JSDOM} from 'jsdom';
const now=Date.parse('2026-09-08T09:30:00+08:00');
test('Tuesday excludes last Monday but includes last Tuesday within seven days',()=>{
  assert.equal(outsideAttendanceWindow({date:'2026-08-31',time:'18:00'},now),true);
  assert.equal(outsideAttendanceWindow({date:'2026-09-01',time:'18:00'},now),false);
  assert.equal(scanSinceDate(now),'2026-09-01');
  assert.equal(eligible({status:'ready',date:'2026-08-31',time:'18:00',confidence:1,code:'ABCDE'},now),false);
});
test('live Moodle scan follows this week and last week, excluding older and future weeks',()=>{
  const doc=new JSDOM(`<div class="usermenu"><img alt="Example Student"></div><h1>ABC1234 2026</h1><main><a aria-current="page" href="?id=1&section=7">Week 7</a><a href="?id=1&section=6">Week 6</a><a href="?id=1&section=4">Week 4</a><a href="?id=1&section=8">Week 8</a></main>`,{url:'https://learning.monash.edu/course/view.php?id=1'}).window.document;
  const result=moodleAdapter('read',{name:'Example Student',course:'ABC1234',academicYear:2026,sinceDate:'2026-09-01'},doc);
  assert.deepEqual(result.links.map(url=>new URL(url).searchParams.get('section')),['7','6']);
  assert.equal(result.skipped,2);
});
test('known obsolete Moodle weeks do not download candidate images',()=>{
  const doc=new JSDOM(`<div class="usermenu"><img alt="Example Student"></div><h1>ABC1234 2026</h1><main><h4>Sun 23 Aug 26 - Sat 29 Aug 26</h4><p>attendance</p><img src="/old.png"></main>`,{url:'https://learning.monash.edu/course/view.php?id=1&section=5'}).window.document;
  const result=moodleAdapter('read',{name:'Example Student',course:'ABC1234',academicYear:2026,sinceDate:'2026-09-01'},doc);
  assert.deepEqual(result.messages,[]);assert.equal(result.skipped,1);
});
test('old known week ranges skip images, mixed weeks and undated pages remain inspectable',()=>{
  assert.equal(messageOutsideWindow({dateWindow:{from:'2026-08-23',to:'2026-08-29'}},now),true);
  assert.equal(messageOutsideWindow({dateWindow:{from:'2026-08-30',to:'2026-09-05'}},now),false);
  assert.equal(messageOutsideWindow({dateReferenceOnly:true,sentAt:'2026-01-01T00:00:00+08:00'},now),false);
});
