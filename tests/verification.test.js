import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {bindVerification,configuredLoginSites} from '../extension/verification.js';
import {createLoginPreflight} from '../extension/login-preflight.js';
import {installLanguageUI} from '../extension/i18n.js';
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));

test('verification stops its countdown before saving and marks success only after save',async()=>{
 const dom=new JSDOM('<button></button><p></p>'),doc=dom.window.document;
 let save;const saving=new Promise(resolve=>{save=resolve;});
 const button=doc.querySelector('button'),status=doc.querySelector('p');
 const binding=bindVerification({button,status,timeout:20,check:async()=>({verified:true,tabId:3}),onVerified:()=>saving});
 try{
  const done=binding.start();await flush();
  assert.equal(binding.activity.hidden,true);assert.equal(binding.verified,false);assert.equal(button.disabled,true);
  assert.match(status.textContent,/保存检测结果/);
  await new Promise(resolve=>setTimeout(resolve,30));assert.doesNotMatch(status.textContent,/超时/);
  save();assert.deepEqual(await done,{verified:true,tabId:3});
  assert.equal(binding.activity.hidden,true);assert.equal(button.disabled,false);assert.equal(button.classList.contains('verified'),true);
  assert.equal(button.textContent,'重新登录并检测');assert.equal(status.textContent,'登录检测通过。');
 }finally{binding.stop();dom.window.close();}
});

test('failed verification and save both allow retry without a false success style',async()=>{
 for(const saveFails of [false,true]){
  const dom=new JSDOM('<button></button><p></p>'),doc=dom.window.document;
  const binding=bindVerification({button:doc.querySelector('button'),status:doc.querySelector('p'),check:async()=>{if(!saveFails)throw new Error('页面已被关闭，无法执行签到');return {verified:true};},onVerified:async()=>{throw new Error('保存失败');}});
  try{
   assert.equal(await binding.start(),null);assert.equal(binding.running,false);assert.equal(binding.verified,false);assert.equal(binding.activity.hidden,true);
   assert.equal(doc.querySelector('button').disabled,false);assert.match(doc.querySelector('p').textContent,saveFails?/保存失败/:/页面已被关闭，检测已停止/);
  }finally{binding.stop();dom.window.close();}
 }
});

test('stopped checks ignore late replies and timeout checks stop polling',async()=>{
 const dom=new JSDOM('<button></button><p></p>'),doc=dom.window.document;let reply;
 const binding=bindVerification({button:doc.querySelector('button'),status:doc.querySelector('p'),timeout:20,interval:5,check:()=>new Promise(resolve=>{reply=resolve;})});
 try{
  const first=binding.start();binding.reset();reply({verified:true});await flush();assert.equal(await first,null);assert.equal(binding.verified,false);
  const second=binding.start();assert.equal(await second,null);assert.match(doc.querySelector('p').textContent,/超时/);assert.equal(binding.activity.hidden,true);
  reply({verified:true});await flush();assert.equal(binding.verified,false);
 }finally{binding.stop();dom.window.close();}
});

test('preflight checks only configured sites sequentially and keeps completion visible before closing',async()=>{
 const dom=new JSDOM('<header></header>',{url:'https://extension.test'}),doc=dom.window.document,calls=[],feedback=[];
 const original=dom.window.setTimeout;dom.window.setTimeout=(fn,ms,...args)=>ms===900?(feedback.push(fn),0):original(fn,ms,...args);
 const settings={email:'abcd1234@student.monash.edu',name:'Example Student',courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'},moodleUrls:{ABC1234:['https://learning.monash.edu/course/view.php?id=1']}};
 const flow=createLoginPreflight({doc,request:async payload=>{calls.push(payload.type);return {matched:true,email:settings.email,name:settings.name,tabId:calls.length};}});
 const ui=installLanguageUI(doc);
 try{
  const done=flow.run(settings);await flush();
  assert.deepEqual(calls,['checkEmail','checkMoodle','readIdentity']);assert.equal(flow.active,true);
  assert.equal(doc.querySelector('.preflight-complete').hidden,false);assert.equal(doc.querySelector('.preflight-complete').textContent,'Initial checks passed. Starting check-in…');
  for(const button of doc.querySelectorAll('#login-preflight button'))assert.equal(button.hidden,true);
  for(const activity of doc.querySelectorAll('.verification-activity'))assert.equal(activity.hidden,true);
  assert.doesNotMatch(doc.querySelector('#login-preflight').textContent,/[\u3400-\u9fff]/);
  feedback.shift()();assert.deepEqual(await done,{verifiedLogin:{gmail:{tabId:1},moodle:{tabId:2},attendance:{tabId:3}}});assert.equal(flow.active,false);
  const next=flow.run(settings);assert.equal(doc.querySelector('.preflight-complete').hidden,true);flow.cancel();assert.equal(await next,false);
  assert.deepEqual(configuredLoginSites({...settings,senders:{}}),['moodle','attendance']);
 }finally{flow.cancel();ui.disconnect();dom.window.close();}
});

test('a failed buttonless preflight closes and returns its actionable error',async()=>{
 const dom=new JSDOM(''),doc=dom.window.document;
 const flow=createLoginPreflight({doc,request:async()=>{throw new Error('Attendance 页面已被关闭，无法执行签到');}});
 try{
  const result=await flow.run({name:'Example Student'});
  assert.match(result.error,/Attendance 页面已被关闭，检测已停止/);assert.equal(flow.active,false);assert.equal(doc.querySelector('dialog').open,false);
 }finally{flow.cancel();dom.window.close();}
});
