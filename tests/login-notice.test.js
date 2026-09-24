import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createLoginNotice} from '../extension/login-notice.js';
import {bindVerification} from '../extension/verification.js';

test('confirmed sign-out reveals an alert and focuses the existing login tab',async()=>{
 const dom=new JSDOM('<body></body>'),notice=createLoginNotice(dom.window.document),calls=[];
 globalThis.chrome={tabs:{update:async(...args)=>{calls.push(args);return {windowId:4};}},windows:{update:async(...args)=>calls.push(args)}};
 try{
  notice.update({needsLogin:true,tabId:8});assert.equal(notice.element.hidden,true);
  notice.update({loginRequired:true,loginTabId:8});assert.equal(notice.element.hidden,false);assert.equal(notice.element.getAttribute('role'),'alert');
  await notice.element.querySelector('button').onclick();assert.deepEqual(calls,[[8,{active:true}],[4,{focused:true}]]);
  notice.update(null);assert.equal(notice.element.hidden,true);
 }finally{delete globalThis.chrome;dom.window.close();}
});
test('main-page identity verification alerts during polling and clears after login',async()=>{
 const dom=new JSDOM('<button></button><p></p>'),doc=dom.window.document;let reads=0;
 const binding=bindVerification({button:doc.querySelector('button'),status:doc.querySelector('p'),doc,interval:40,check:async()=>++reads===1?{loginRequired:true,tabId:2}:{verified:true,tabId:2}});
 try{
  const done=binding.start();await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(doc.querySelector('.login-required-notice').hidden,false);
  await done;assert.equal(doc.querySelector('.login-required-notice').hidden,true);
 }finally{binding.stop();dom.window.close();}
});
