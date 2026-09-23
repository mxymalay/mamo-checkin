import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const html=await readFile(new URL('../extension/popup.html',import.meta.url),'utf8');
test('popup has no rule builder footer shortcut',()=>{
 const dom=new JSDOM(html);try{assert.equal(dom.window.document.querySelector('#popup-rule-builder'),null);}finally{dom.window.close();}
});

function installDom(sendMessage,{language='zh-CN'}={}){
 const dom=new JSDOM(html,{url:'https://extension.test/popup.html'});
 Object.defineProperty(dom.window.navigator,'language',{value:language,configurable:true});
 globalThis.window=dom.window;
 globalThis.document=dom.window.document;
 const opened=[];
 let openedCount=0;
 globalThis.chrome={runtime:{id:'test',sendMessage,openOptionsPage:()=>openedCount++}};
 globalThis.setInterval=(fn,ms)=>{void fn;void ms;return 1;};
 return {dom,get opened(){return openedCount;}};
}
function cleanDom(){
 delete globalThis.chrome;delete globalThis.window;delete globalThis.document;
}
test('popup honours explicit and automatic Traditional Chinese across scene and status',async()=>{
 for(const saved of ['zh_TW','auto']){
  const env=installDom(async()=>({settings:{enabled:false,name:'Example',courses:['FIT5122']},status:{finishedAt:'now'}}),{language:'zh-TW'});
  env.dom.window.localStorage.setItem('mamo-language',saved);globalThis.chrome.i18n={getUILanguage:()=> 'zh-TW'};
  try{await import(`../extension/popup.js?traditional=${saved}`);await new Promise(r=>setTimeout(r,0));assert.equal(document.documentElement.lang,'zh-TW');assert.equal(document.querySelector('#popup-settings').textContent,'更多設定');assert.match(document.querySelector('#popup-status').textContent,/自動簽到未開啟/);}finally{env.dom.window.close();cleanDom();}
 }
});

test('popup lists course outcomes and starts a scan with the saved identity',async()=>{
 const sent=[];
 const state={setupGuide:false,settings:{enabled:true,email:'abcd1234@student.monash.edu',name:'Example Student',courses:['ABC1234','FIT5120']},records:[],status:{finishedAt:'2026-09-19T10:00:00Z',summary:{submitted:1,courses:[{course:'ABC1234',submitted:1,pending:0,expired:0,unresolved:0,reason:'ok'},{course:'FIT5120',submitted:0,pending:1,expired:0,unresolved:0,reason:'等待签到码'}]}}};
 const env=installDom(async payload=>{sent.push(payload);if(payload.type==='scan')return {ok:true};return state;});
 try{
  await import(`../extension/popup.js?scan=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  assert.equal(document.querySelectorAll('#popup-courses li').length,2);
  assert.match(document.getElementById('popup-courses').textContent,/ABC1234/);
  assert.match(document.getElementById('popup-courses').textContent,/1 session checked in|1 场等待签到码|签到成功 1 场/);
  assert.equal(document.getElementById('popup-scan').disabled,false);
  document.getElementById('popup-scan').click();await new Promise(r=>setTimeout(r,0));
  const scan=sent.find(p=>p.type==='scan');
  assert.ok(scan);assert.equal(scan.expectedIdentity.name,'Example Student');
  assert.equal(scan.preflight,true);
  assert.equal(env.opened,0);
 }finally{env.dom.window.close();cleanDom();}
});

test('popup distinguishes login waiting, scanning, success, partial and failed results in both languages',async()=>{
 const cases=[
  [{running:true,message:'正在签到…'},'working'],
  [{running:true,phase:'waiting',waitingSite:'moodle',loginDeadline:Date.now()+120000},'waiting'],
  [{finishedAt:'now',summary:{submitted:2}},'success'],
  [{finishedAt:'now',message:'本轮签到流程已完成。：本轮签到流程已完成',summary:{quiet:true}},'success'],
  [{finishedAt:'now',summary:{submitted:1,courses:[{pending:1}]}},'waiting'],
  [{finishedAt:'now',error:true},'error']
 ];
 for(const language of ['zh-CN','en-US'])for(const [status,mode] of cases){
  const env=installDom(async()=>({settings:{enabled:true,name:'Example',courses:['ABC1234']},status}),{language});
  globalThis.chrome.i18n={getUILanguage:()=>language};
  try{
   await import(`../extension/popup.js?state=${language}-${mode}-${Math.random()}`);await new Promise(resolve=>setTimeout(resolve,0));
   assert.equal(document.getElementById('popup-scene').dataset.state,mode);
   assert.equal(document.getElementById('popup-scan').disabled,Boolean(status.running));
   if(status.waitingSite)assert.match(document.getElementById('popup-caption').textContent,/Moodle/);
   if(status.waitingSite)assert.match(document.getElementById('popup-heading').textContent,/正在检查登录状态|Checking sign-in status/);
   if(status.summary?.quiet)assert.match(document.getElementById('popup-status').textContent,/本次无需补签|No additional check-ins/);
   assert.match(document.getElementById('popup-mode').textContent,/自动签到已开启|Auto check-in on/);
   if(language==='en-US')assert.doesNotMatch(document.getElementById('popup-scene').textContent,/[\u3400-\u9fff]/);
  }finally{env.dom.window.close();cleanDom();}
 }
});

test('popup returns to ready state after a manual run when auto check-in is off',async()=>{
 const state={settings:{enabled:false,name:'Example',courses:['ABC1234']},records:[],status:{finishedAt:'now',summary:{submitted:2}}};
 const env=installDom(async()=>state);
 try{
  await import(`../extension/popup.js?manual-complete=${Date.now()}`);await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(document.getElementById('popup-scene').dataset.state,'idle');
  assert.match(document.getElementById('popup-status').textContent,/自动签到未开启|Auto check-in is off/);
  assert.doesNotMatch(document.getElementById('popup-heading').textContent,/处理完成|All done/);
 }finally{env.dom.window.close();cleanDom();}
});

test('an unconfigured popup routes the main button to the full settings page',async()=>{
 const sent=[];
 const env=installDom(async payload=>{sent.push(payload);return {setupGuide:true,settings:{email:'',name:'',courses:[]},records:[]};});
 try{
  await import(`../extension/popup.js?setup=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  assert.match(document.getElementById('popup-status').textContent,/初始设置|Finish setup/);
  document.getElementById('popup-scan').click();await new Promise(r=>setTimeout(r,0));
  assert.equal(sent.find(p=>p.type==='scan'),undefined);
  assert.equal(env.opened,1);
 }finally{env.dom.window.close();cleanDom();}
});

test('popup text follows the browser UI language automatically',async()=>{
 const env=installDom(async()=>({setupGuide:false,settings:{enabled:true,name:'X',courses:['ABC1234']},records:[]}),{language:'en-US'});
 globalThis.chrome.i18n={getUILanguage:()=>'en-US'};
 try{
  await import(`../extension/popup.js?lang=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  assert.equal(document.getElementById('popup-settings').textContent,'More settings');
  assert.equal(document.getElementById('popup-title').textContent,'Mamo Check-in');
  assert.match(document.getElementById('popup-scan').textContent,/Check in now/i);
  assert.equal(document.documentElement.lang,'en');
 }finally{env.dom.window.close();cleanDom();}
});
test('the options-page language picker also drives the popup',async()=>{
 const env=installDom(async()=>({setupGuide:false,settings:{name:'X',courses:[]},records:[]}));
 try{
  window.localStorage.setItem('mamo-language','zh');
  await import(`../extension/popup.js?langzh=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  assert.equal(document.getElementById('popup-settings').textContent,'更多设置');
  assert.equal(document.documentElement.lang,'zh-CN');
 }finally{env.dom.window.close();cleanDom();}
});
test('the settings button always opens the full options page',async()=>{
 const env=installDom(async()=>({setupGuide:false,settings:{name:'X',courses:['ABC1234']},records:[]}));
 try{
  await import(`../extension/popup.js?settings=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  document.getElementById('popup-settings').click();
  assert.equal(env.opened,1);
 }finally{env.dom.window.close();cleanDom();}
});
