import {builtins} from './helpers/install-source-runtime.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {moodleAdapter} from '../extension/moodle.js';
import {edAdapter} from '../extension/ed-adapter.js';
import {gmailAdapter} from '../extension/gmail.js';
import {fixtureRule} from './helpers/source-rules.js';
test('Ed images from separate posts retain their own date and identity',()=>{
 const rule=fixtureRule({source:'ed',images:{selectors:['img'],minWidth:20,minHeight:20}});
 const doc=new JSDOM('<h1>DEMO1000</h1><main><article data-post-id="new"><time datetime="2026-09-22"></time><p>Attendance update</p></article><article data-post-id="old"><time datetime="2025-09-22"></time><img src="https://cdn.edusercontent.com/files/old.png"></article></main>',{url:'https://edstem.org/au/courses/1/discussion/2'}).window.document;
 const args={course:'DEMO1000',expectedCourseId:'1',ruleMode:'community',ruleTrace:true,sourceRules:{courses:{DEMO1000:{ed:{builtin:builtins.ed,community:rule}}}}};
 const result=edAdapter('read',args,doc);
 const old=result.messages.find(m=>m.images.length);
 assert.equal(old.sentAt,'2025-09-22');assert.equal(new Set(result.messages.map(m=>m.messageId)).size,result.messages.length);
 assert.equal(edAdapter('read',{...args,sinceDate:'2026-09-16'},doc).messages.flatMap(m=>m.images).length,0);
});
for(const source of ['gmail','moodle','ed'])test(`${source} uses course-selected JSON to recover an otherwise excluded small image`,()=>{
  const host=source==='gmail'?'mail.google.com':source==='ed'?'edstem.org':'learning.monash.edu';
  const src=source==='ed'?'https://cdn.edusercontent.com/files/small.png':`https://${host}/small.png`;
  const picture=`<div class="attendance"><img width="40" height="30" src="${src}"></div>`;
  const body=source==='gmail'?`<div aria-label="Google Account: abcd1234@student.monash.edu"></div><main><h2>DEMO1000 Attendance</h2><section data-legacy-message-id="a"><span email="a@example.edu"></span><span class="g3" title="21 September 2026"></span><div class="a3s">${picture}</div></section></main>`:`<div class="usermenu"><img alt="Example Student"></div><h1>DEMO1000 2026</h1><main>Attendance ${picture}</main>`;
  const doc=new JSDOM(body,{url:`https://${host}/${source==='ed'?'au/courses/1/discussion/2':''}`}).window.document;
  const img=doc.querySelector('.attendance img');Object.defineProperty(img,'naturalWidth',{value:40});Object.defineProperty(img,'naturalHeight',{value:30});Object.defineProperty(img,'complete',{value:true});
  const rule=fixtureRule({source,images:{selectors:['.attendance img'],minWidth:30,minHeight:20}});
  const args={name:'Example Student',email:'abcd1234@student.monash.edu',course:'DEMO1000',courses:['DEMO1000'],academicYear:2026,expectedCourseId:'1',sourceRules:{courses:{DEMO1000:{[source]:{builtin:builtins[source],community:rule}}}},ruleMode:'community',ruleTrace:true};
  const adapter={gmail:gmailAdapter,moodle:moodleAdapter,ed:edAdapter}[source];
  const result=adapter(source==='gmail'?'messages':'read',args,doc);
  assert.deepEqual(result.messages[0]?.images,[src]);
  assert.equal(result.messages[0].imageEvidence[0].matches[0].id,rule.id);
  const multiple=adapter(source==='gmail'?'messages':'read',{...args,sourceRules:{courses:{DEMO1000:{[source]:{builtin:builtins[source],community:[{...rule,images:{selectors:['.absent img']}},{...rule,id:'community.second'},{...rule,id:'community.third'}]}}}}},doc);
  assert.deepEqual(multiple.messages[0]?.images,[src]);
  assert.deepEqual(multiple.messages[0].imageEvidence[0].matches.map(r=>r.id),['community.second','community.third']);
  const miss=adapter(source==='gmail'?'messages':'read',{...args,sourceRules:{courses:{DEMO1000:{[source]:{builtin:builtins[source],community:{...rule,images:{selectors:['.absent img']}}}}}}},doc);
  assert.equal(miss.messages.flatMap(m=>m.images).length,0);
  doc.body.innerHTML=doc.body.innerHTML.replaceAll('Attendance','Update');
  const diagnostic=adapter(source==='gmail'?'messages':'read',{...args,sourceRules:{courses:{DEMO1000:{[source]:{builtin:builtins[source],community:{...rule,images:{selectors:['.absent img']}}}}}}},doc);
  assert.ok(diagnostic.messages.some(m=>m.ruleTrace.some(t=>t.reason==='selector-miss')));
});
for(const source of ['gmail','moodle','ed'])test(`${source} navigation uses every community rule while retaining host and course limits`,()=>{
 const community=['alpha','beta'].map(word=>fixtureRule({id:`community.${word}`,source,keywords:{navigation:[word]}}));
 const args={name:'Example Student',email:'abcd1234@student.monash.edu',course:'DEMO1000',courses:['DEMO1000'],academicYear:2026,expectedCourseId:'1',sourceRules:{courses:{DEMO1000:{[source]:{builtin:builtins[source],community}}}}};
 let body,url;
 if(source==='gmail'){
  url='https://mail.google.com/mail/u/0';body='<div aria-label="Google Account: abcd1234@student.monash.edu"></div><main><div role="grid">'+['alpha','beta','notes'].map((word,i)=>`<div role="row"><span email="a@example.edu"></span><span data-legacy-thread-id="${i}">DEMO1000 ${word}</span></div>`).join('')+'</div></main>';
 }else{
  url=source==='moodle'?'https://learning.monash.edu/course/view.php?id=1':'https://edstem.org/au/courses/1/discussion';
  const href=i=>source==='moodle'?`/mod/page/view.php?id=${i}`:`/au/courses/1/discussion/${i}`;
  body='<div class="usermenu"><img alt="Example Student"></div><h1>DEMO1000 2026</h1><main>'+['alpha','beta','notes'].map((word,i)=>`<a href="${href(i+1)}">${word}</a>`).join('')+`<a href="https://evil.test${href(4)}">beta</a>`+(source==='moodle'?'<a href="/course/view.php?id=2">beta</a>':'<a href="/au/courses/2/discussion/5">beta</a>')+'</main>';
 }
 const doc=new JSDOM(body,{url}).window.document,adapter={gmail:gmailAdapter,moodle:moodleAdapter,ed:edAdapter}[source];
 const result=adapter(source==='gmail'?'list':'read',args,doc);
 if(source==='moodle')assert.deepEqual(result.links,['https://learning.monash.edu/mod/page/view.php?id=1','https://learning.monash.edu/mod/page/view.php?id=2']);
 else {assert.deepEqual(result.threads.map(t=>t.navigationPriority),[40,40,0]);assert.equal(result.threads.length,3);}
 const builtin=adapter(source==='gmail'?'list':'read',{...args,ruleMode:'builtin'},doc);
 if(source==='moodle')assert.deepEqual(builtin.links,[]);else assert.deepEqual(builtin.threads.map(t=>t.navigationPriority),[0,0,0]);
});
