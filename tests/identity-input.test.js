import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {attendanceAdapter} from '../extension/attendance.js';import {bindIdentityReader} from '../extension/identity-input.js';
test('reads only the dedicated Attendance name field and rejects login redirects',()=>{
 const doc=new JSDOM('<span id="ctl00_ContentPlaceHolder1_userName">Example Student</span><p>Another name</p>',{url:'https://attendance.monash.edu.my/student/Default.aspx'}).window.document;
 assert.deepEqual(attendanceAdapter('identity',{},doc),{name:'Example Student'});
 doc.querySelector('span').remove();assert.throws(()=>attendanceAdapter('identity',{},doc));
 const login=new JSDOM('<span id="ctl00_ContentPlaceHolder1_userName">Example Student</span>',{url:'https://example.com/login'}).window.document;assert.throws(()=>attendanceAdapter('identity',{},login));
});
test('reading fills a draft name but never saves identity automatically',async()=>{
 const doc=new JSDOM('<input><button></button><p></p>').window.document,calls=[];
 bindIdentityReader({doc,input:doc.querySelector('input'),button:doc.querySelector('button'),status:doc.querySelector('p'),request:async message=>{calls.push(message);return {name:'Example Student'};}});
 doc.querySelector('button').click();await new Promise(r=>setTimeout(r,0));assert.equal(doc.querySelector('input').value,'Example Student');assert.deepEqual(calls,[{type:'readIdentity',open:true}]);assert.match(doc.querySelector('p').textContent,/确认后保存/);assert.equal(doc.querySelector('button').disabled,false);
});
test('real background identity route passes JSON-serializable injection arguments',async()=>{
 const previous=globalThis.chrome;let listener,injection;
 const event={addListener(){}};
 globalThis.chrome={runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onInstalled:event,onStartup:event,onMessage:{addListener(fn){listener=fn;}}},storage:{local:{get:async()=>({})}},alarms:{onAlarm:event,get:async()=>null,clear:async()=>{}},action:{onClicked:event},tabs:{query:async()=>[{id:1,url:'https://attendance.monash.edu.my/student/Default.aspx',status:'complete'}]},scripting:{executeScript:async value=>{injection=value;if(value.args.some(v=>v===undefined))throw new Error('Value is unserializable');return [{result:{name:'Example Student'}}];}}};
 try{
  globalThis.chrome.tabs.get=async()=>({url:'https://attendance.monash.edu.my/student/Default.aspx'});
  await import('../extension/background.js?identity-regression');
  const result=await new Promise(resolve=>listener({type:'readIdentity'},{id:'test',url:'chrome-extension://test/options.html'},resolve));
  assert.equal(result.name,'Example Student');assert.deepEqual(injection.args,['identity',{}]);
 }finally{globalThis.chrome=previous;}
});
