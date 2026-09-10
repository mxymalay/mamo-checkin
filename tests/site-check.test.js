import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSiteLogin} from '../extension/site-check.js';

test('school sign-in tabs open in the background and do not activate existing tabs',async()=>{
 for(const site of ['Moodle','Attendance 签到系统']){
  const created=[],tabs={query:async()=>[],create:async value=>{created.push(value);return {id:2,...value};}};
  const pending=await checkSiteLogin({open:true,name:'Example Student'},{tabs,readIdentity:async()=>({name:'Example Student'})},site);
  assert.equal(pending.needsLogin,true);assert.equal(created[0].active,false);
  const tab={...created[0],id:2,status:'complete'};tabs.query=async()=>[tab];
  assert.equal((await checkSiteLogin({open:true,name:'Example Student'},{tabs,readIdentity:async()=>({name:'Example Student'})},site)).matched,true);
  assert.equal(created.length,1);
 }
});

test('site checks name closed pages and never inject into sign-in redirects',async()=>{
 const tabs={get:async()=>{throw new Error('No tab with id: 99.');},query:async()=>[]};
 await assert.rejects(checkSiteLogin({tabId:99},{tabs,readIdentity:async()=>{}},'Attendance 签到系统'),/Attendance 签到系统 页面已被关闭/);
 tabs.get=async()=>({id:99,url:'https://monashuni.okta.com/login',status:'complete'});
 let reads=0;const result=await checkSiteLogin({tabId:99},{tabs,readIdentity:async()=>{reads++;}},'Moodle');
 assert.equal(result.needsLogin,true);assert.equal(reads,0);assert.match(result.message,/Moodle.*请勿关闭/);
});

test('wrong Moodle identities remain pending and permission errors remain actionable',async()=>{
 const tabs={query:async()=>[{id:3,url:'https://learning.monash.edu/my/',status:'complete'}]};
 const result=await checkSiteLogin({name:'Example Student'},{tabs,readIdentity:async()=>({name:'Different Student'})},'Moodle');
 assert.equal(result.needsLogin,true);assert.match(result.message,/姓名与配置不一致/);
 await assert.rejects(checkSiteLogin({name:'Example Student'},{tabs,readIdentity:async()=>{throw new Error('Cannot access contents of url');}},'Moodle'),/Cannot access/);
});
