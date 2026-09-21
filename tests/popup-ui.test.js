import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const html=await readFile(new URL('../extension/popup.html',import.meta.url),'utf8');

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
  assert.equal(env.opened,0);
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
