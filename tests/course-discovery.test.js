import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {discoverCourseDraft} from '../extension/course-discovery.js';

test('setup displays a login reminder, retains the tab and resumes detection after login',async()=>{
 const dom=new JSDOM('<p id="host"></p>'),doc=dom.window.document,calls=[];let count=0;
 try{
  const done=discoverCourseDraft({host:doc.querySelector('p'),interval:40,request:async payload=>{calls.push(payload);return count++===0?{loginRequired:true,tabId:9}:{courses:['ABC1234'],schedules:{}};}});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(doc.querySelector('.login-required-notice').hidden,false);
  assert.equal(doc.querySelector('.login-required-notice button').hidden,false);
  assert.equal(doc.querySelector('.verification-activity').hidden,false);
  assert.equal(doc.querySelector('.login-required-notice p').hidden,true);
  assert.equal(doc.querySelector('.course-login-wait > p').hidden,true);
  assert.deepEqual((await done).courses,['ABC1234']);
  assert.deepEqual(calls,[{type:'redetect'},{type:'redetect',tabId:9}]);
  assert.equal(doc.querySelector('.course-login-wait'),null);
 }finally{dom.window.close();}
});
test('no courses is distinct from needing to sign in',async()=>{
 const dom=new JSDOM('<p></p>');
 try{const result=await discoverCourseDraft({host:dom.window.document.querySelector('p'),request:async()=>({courses:[],schedules:{}})});assert.deepEqual(result.courses,[]);assert.equal(dom.window.document.querySelector('.login-required-notice'),null);}finally{dom.window.close();}
});
test('login timeout ends the wait without throwing a course configuration error',async()=>{
 const dom=new JSDOM('<p></p>');
 try{const result=await discoverCourseDraft({host:dom.window.document.querySelector('p'),timeout:20,request:async()=>({loginRequired:true,tabId:9})});assert.equal(result,null);}finally{dom.window.close();}
});
test('import cancellation stops waiting and discards a late course result',async()=>{
 const dom=new JSDOM('<p></p>'),controller=new AbortController();let finish,count=0;
 try{
  const done=discoverCourseDraft({host:dom.window.document.querySelector('p'),signal:controller.signal,interval:5,request:async()=>++count===1?{loginRequired:true,tabId:9}:new Promise(resolve=>{finish=resolve;})});
  while(!finish)await new Promise(resolve=>setTimeout(resolve,5));
  controller.abort();finish({courses:['OLD1000'],schedules:{}});
  assert.equal(await done,null);assert.equal(dom.window.document.querySelector('.course-login-wait'),null);
 }finally{dom.window.close();}
});
