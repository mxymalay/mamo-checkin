import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {gmailAdapter} from '../extension/gmail.js';
import {moodleAdapter} from '../extension/moodle.js';
import {edAdapter} from '../extension/ed-adapter.js';
const settings={name:'Example Student',email:'abcd1234@student.monash.edu',course:'DEMO1000',courses:['DEMO1000'],academicYear:2026};
test('builder shares Moodle verified roots and rejects a different identity before registration',()=>{
 const dom=new JSDOM('<div class="usermenu"><img alt="Example Student"></div><h1>DEMO1000 2026</h1><main><section data-sectionid="1"><img></section><section data-sectionid="2"><img></section></main>',{url:'https://learning.monash.edu/course/view.php?id=1'});let captured;
 globalThis.__mamoRulePicker={registerRoots:value=>{captured=value;return {roots:value.roots.length};}};
 try{assert.deepEqual(moodleAdapter('builderDescribe',settings,dom.window.document),{roots:2});assert.equal(captured.roots[0].root.tagName,'SECTION');assert.throws(()=>moodleAdapter('builderDescribe',{...settings,name:'Other'},dom.window.document),/账号/);}
 finally{delete globalThis.__mamoRulePicker;dom.window.close();}
});
test('Gmail builder refuses ambiguous course subjects and does not borrow a caller course',()=>{
 const dom=new JSDOM('<header aria-label="Google Account: abcd1234@student.monash.edu"></header><main><h2>DEMO1000 DEMO2000</h2><div data-legacy-message-id="1"><span email="teacher@example.test"></span><div class="a3s"><img></div></div></main>',{url:'https://mail.google.com/mail/u/0/#all/abc'});
 let called=false;globalThis.__mamoRulePicker={registerRoots:()=>{called=true;return {};}};
 try{assert.throws(()=>gmailAdapter('builderDescribe',{...settings,courses:['DEMO1000','DEMO2000'],threadCourse:'DEMO1000'},dom.window.document),/多个课程/);assert.equal(called,false);dom.window.document.querySelector('h2').textContent='DEMO1000';gmailAdapter('builderDescribe',settings,dom.window.document);assert.equal(called,true);}
 finally{delete globalThis.__mamoRulePicker;dom.window.close();}
});
test('Ed builder requires positive account evidence and never clicks Load more',()=>{
 const dom=new JSDOM('<title>DEMO1000</title><main><h1>DEMO1000</h1><img></main><button>Load more</button>',{url:'https://edstem.org/au/courses/1/discussion/2'});let clicks=0;dom.window.document.querySelector('button').onclick=()=>clicks++;
 globalThis.__mamoRulePicker={registerRoots:value=>({roots:value.roots.length})};
 try{assert.throws(()=>edAdapter('builderDescribe',{...settings,expectedCourseId:'1'},dom.window.document),/builder-identity-unverified/);assert.equal(clicks,0);}
 finally{delete globalThis.__mamoRulePicker;dom.window.close();}
});
