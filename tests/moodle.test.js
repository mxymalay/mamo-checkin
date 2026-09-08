import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {moodleAdapter} from '../extension/moodle.js';
import {existsSync,readFileSync} from 'node:fs';
const cfg={name:'Test Student',course:'FIT5120',academicYear:2026};
function page(body,url='https://learning.monash.edu/mod/forum/discuss.php?d=123'){
 const doc=new JSDOM(`<div class="usermenu"><span role="img" title="Test Student"></span></div><nav aria-label="Breadcrumb"><a href="/course/view.php?id=12345">FIT5120 - MUM S2 2026</a></nav><main>${body}</main>`,{url}).window.document;
 for(const img of doc.querySelectorAll('img')){Object.defineProperties(img,{naturalWidth:{value:1000},naturalHeight:{value:43},complete:{value:true}});}
 return doc;
}
test('Moodle forum reads the original dated post, excluding reply and avatar images',()=>{
 const doc=page('<article data-post-id="123"><div class="starter"><header><img src="/avatar.png"><time datetime="2026-09-04T15:08:00+01:00"></time></header><div class="post-content-container"><h3>Attendance Code</h3><table><tr><td>Seminar</td><td>Friday 4 Sep</td><td>01</td><td>5:00 PM</td><td>8RAJ8</td></tr></table><img src="/pluginfile.php/1/image.png"></div></div></article><article data-post-id="124"><div class="post-content-container">Attendance <img src="/reply.png"></div></article>');
 const result=moodleAdapter('read',cfg,doc);
 assert.equal(result.messages.length,1);assert.equal(result.messages[0].sentAt,'2026-09-04T15:08:00+01:00');
 assert.deepEqual(result.messages[0].images,['https://learning.monash.edu/pluginfile.php/1/image.png']);
 assert.ok(result.messages[0].textRows.includes('Seminar Friday 4 Sep 01 5:00 PM 8RAJ8'));
});
test('Moodle course pages yield only safe content links and preserve undated text for review',()=>{
 const doc=page('<section>Attendance code: ABC12</section><a href="/mod/forum/discuss.php?d=3">Week 6 Summary</a><a href="/mod/quiz/view.php?id=4">Attendance quiz</a><a href="/login/logout.php">Logout</a><a href="https://example.com/attendance">Attendance</a>','https://learning.monash.edu/course/view.php?id=12345');
 const result=moodleAdapter('read',cfg,doc);
 assert.equal(result.messages.length,1);assert.equal(result.messages[0].dateReferenceOnly,true);
 assert.deepEqual(result.links,['https://learning.monash.edu/mod/forum/discuss.php?d=3']);
});
test('Moodle refuses wrong identity, wrong course, and an old academic year',()=>{
 assert.throws(()=>moodleAdapter('read',{...cfg,name:'Test'},page('Attendance code ABC12')),/账号/);
 assert.throws(()=>moodleAdapter('read',{...cfg,course:'FIT5122'},page('Attendance code ABC12')),/课程/);
 assert.throws(()=>moodleAdapter('read',{...cfg,academicYear:2025},page('Attendance code ABC12')),/年份/);
});

test('Week cards and section links are discovered, prioritizing the current week',()=>{
 const doc=page('<a href="/course/view.php?id=12345&section=24">Week 5 — Studio</a><div class="mst-current-focus-nav-item-current" onclick="location.href=\'https://learning.monash.edu/course/view.php?id=12345&section=28\';"><h5>Current Week 6</h5></div><a href="/course/view.php?id=12345&section=32">Week 7 — Studio</a><a href="/mod/page/view.php?id=9">Attendance code</a>','https://learning.monash.edu/course/view.php?id=12345');
 const result=moodleAdapter('read',cfg,doc);
 assert.equal(result.links[0],'https://learning.monash.edu/course/view.php?id=12345&section=28');
 assert.ok(result.links.includes('https://learning.monash.edu/course/view.php?id=12345&section=24'));
 assert.ok(result.links.includes('https://learning.monash.edu/mod/page/view.php?id=9'));
});
test('Week section reads inline images and text using its explicit date range',()=>{
 const doc=page('<h3>Week 6</h3><h4>Sun 30 Aug 26 - Sat 5 Sept 26</h4><div>Attendance code<br>Studio Friday,4 Sep 01-P2 6:00PM ZQSB3</div><p><img src="/pluginfile.php/123/code.png"></p>','https://learning.monash.edu/course/view.php?id=12345&section=28');
 const msg=moodleAdapter('read',cfg,doc).messages[0];
 assert.equal(msg.images.length,1);assert.equal(msg.dateReferenceOnly,false);
 assert.deepEqual(msg.dateWindow,{from:'2026-08-30',to:'2026-09-05'});
 assert.ok(msg.textRows.includes('Studio Friday,4 Sep 01-P2 6:00PM ZQSB3'));
});
test('undated page references and image-only weekly tables have stable metadata',()=>{
 const doc=page('<h3>Week 6</h3><p><img src="/pluginfile.php/123/code.png"></p>','https://learning.monash.edu/course/view.php?id=12345&section=28');
 const a=moodleAdapter('read',cfg,doc),b=moodleAdapter('read',cfg,doc);
 assert.deepEqual(a.messages,b.messages);assert.equal(a.messages[0].dateReferenceOnly,true);assert.equal(a.messages[0].images.length,1);
});
test('unloaded lazy images cannot block discovery of the current Week',()=>{
 const doc=page('<img loading="lazy" src="/course-banner.png"><a aria-current="page" href="/course/view.php?id=12345&section=28">Week 6</a>','https://learning.monash.edu/course/view.php?id=12345');
 const img=doc.createElement('img');img.src='/not-loaded.png';img.loading='lazy';doc.querySelector('main').append(img);
 const result=moodleAdapter('read',cfg,doc);assert.equal(result.loading,undefined);assert.ok(result.priorityLinks.includes('https://learning.monash.edu/course/view.php?id=12345&section=28'));
});
test('a sibling section cannot lend its week dates to an undated code',()=>{
 const doc=page('<section data-sectionid="1"><h4>Sun 30 Aug 26 - Sat 5 Sept 26</h4>Week 6 overview</section><section data-sectionid="2">Attendance code: ABC12</section>','https://learning.monash.edu/course/view.php?id=12345');
 const msg=moodleAdapter('read',cfg,doc).messages[0];assert.equal(msg.dateReferenceOnly,true);assert.equal(msg.dateWindow,null);
});
test('quoted table rows do not become Moodle code candidates',()=>{
 const doc=page('<h4>Sun 30 Aug 26 - Sat 5 Sept 26</h4>Attendance<blockquote><table><tr><td>Studio Friday,4 Sep 01-P2 6:00PM OLD12</td></tr></table></blockquote>','https://learning.monash.edu/course/view.php?id=12345');
 const result=moodleAdapter('read',cfg,doc);assert.ok(result.messages.every(m=>m.textRows.every(r=>!r.includes('OLD12'))));
});
test('quoted content inside an otherwise visible table cell is also excluded',()=>{
 const doc=page('<h4>Sun 30 Aug 26 - Sat 5 Sept 26</h4>Attendance<table><tr><td><blockquote>Studio Friday,4 Sep 01-P2 6:00PM OLD12</blockquote><span hidden>Studio Friday,4 Sep 01-P2 6:00PM HIDE1</span></td></tr></table>','https://learning.monash.edu/course/view.php?id=12345');
 const result=moodleAdapter('read',cfg,doc);assert.ok(result.messages.every(m=>m.textRows.every(r=>!r.includes('OLD12')&&!r.includes('HIDE1'))));
});
