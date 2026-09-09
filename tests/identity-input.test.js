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
