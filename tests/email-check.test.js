import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {checkEmailLogin} from '../extension/email-check.js';
import {bindEmailReader,installIdentityChecks} from '../extension/email-input.js';
const email='abcd1234@student.monash.edu';
test('preflight verifies a matching secondary mailbox without opening or searching mail',async()=>{
 const calls=[];
 const result=await checkEmailLogin({email,open:true},{tabs:{query:async()=>[{id:1,url:'https://mail.google.com/mail/u/0/',status:'complete'},{id:2,url:'https://mail.google.com/mail/u/2/',status:'complete'}],create:async()=>{throw Error('Must not create');}},readIdentity:async id=>{calls.push(id);return {email:id===2?email:'other@example.com'};}});
 assert.equal(result.matched,true);assert.deepEqual(calls,[1,2]);
});
test('login redirects remain pending and never execute an identity read on another host',async()=>{
 const result=await checkEmailLogin({email,tabId:3},{tabs:{get:async()=>({id:3,status:'complete',url:'https://accounts.google.com/signin'})},readIdentity:async()=>{throw Error('Must not read');}});
 assert.equal(result.needsLogin,true);assert.match(result.message,/abcd1234/);
});
test('wrong account explicitly reports current and requested mailboxes',async()=>{
 const result=await checkEmailLogin({email,tabId:3},{tabs:{get:async()=>({id:3,status:'complete',url:'https://mail.google.com/mail/u/0/'})},readIdentity:async()=>({email:'other@example.com'})});
 assert.equal(result.matched,false);assert.match(result.message,/other@example.com.*abcd1234/);
});
test('email edits invalidate an in-flight successful check',async()=>{
 const dom=new JSDOM('<input value="abcd1234"><button></button><p></p>'),doc=dom.window.document;
 let resolve;const calls=[];
 const binding=bindEmailReader({input:doc.querySelector('input'),button:doc.querySelector('button'),status:doc.querySelector('p'),doc,request:message=>{calls.push(message);return new Promise(r=>{resolve=r;});}});
 doc.querySelector('button').click();doc.querySelector('input').value='efgh5678';doc.querySelector('input').dispatchEvent(new dom.window.Event('input'));
 resolve({matched:true,email});await new Promise(r=>setTimeout(r,0));
 assert.match(doc.querySelector('p').textContent,/邮箱已修改/);assert.equal(doc.querySelector('button').disabled,false);assert.equal(calls[0].email,email);binding.stop();dom.window.close();
});
test('both fields use matching buttons below inputs without the old link hint',()=>{
 const dom=new JSDOM('<form><label>Email<input id="email"></label><label>Name<input id="name" aria-describedby="hint"><small id="hint"><a>Attendance系统</a></small></label><button id="read"></button><p id="status"></p><button type="submit">Save</button></form>'),doc=dom.window.document;
 const binding=installIdentityChecks({email:doc.querySelector('#email'),name:doc.querySelector('#name'),nameButton:doc.querySelector('#read'),nameStatus:doc.querySelector('#status'),request:async()=>({}),doc});
 assert.equal(doc.querySelector('#hint'),null);
 assert.equal(doc.querySelectorAll('button.identity-check').length,2);
 for(const b of doc.querySelectorAll('button.identity-check'))assert.equal(b.textContent,'登录并检测');
 assert.equal(doc.querySelector('#email').closest('label').nextElementSibling.id,'email-check');
 assert.equal(doc.querySelector('#name').closest('label').nextElementSibling.id,'read');binding.stop();dom.window.close();
});
