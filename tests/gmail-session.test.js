import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {gmailAdapter} from '../extension/gmail.js';
import {openVerifiedGmail,gmailMailbox} from '../extension/gmail-session.js';
const email='abcd1234@student.monash.edu';
test('failed page access stops scanning instead of starting an account recovery loop',async()=>{
 let recovery=0;
 await assert.rejects(openVerifiedGmail({email,search:'attendance',tabs:{query:async()=>[]},create:async()=>1,readIdentity:async()=>{throw Error('Cannot access contents of url');},recoverAccount:async()=>{recovery++;},navigate:async()=>{throw Error('Must not navigate');}}),/Cannot access/);
 assert.equal(recovery,0);
});
test('Chinese and English account labels identify the current mailbox',()=>{
 for(const label of ['Google Account: Student (','Google 账号：学生（','Google 帳戶：學生（']){
  const doc=new JSDOM(`<button aria-label="${label}${email})"></button>`,{url:'https://mail.google.com/mail/u/2/'}).window.document;
  assert.equal(gmailAdapter('identity',{},doc).email,email);
 }
});
test('hidden, message-body, and ambiguous account labels cannot authorize mail access',()=>{
 for(const body of [`<main><button aria-label="Google Account: (${email})"></button></main>`,`<button hidden aria-label="Google Account: (${email})"></button>`,`<button aria-label="Google Account: (${email})"></button><button aria-label="Google Account: (other@example.com)"></button>`]){
  const doc=new JSDOM(body,{url:'https://mail.google.com/mail/u/0/'}).window.document;
  assert.throws(()=>gmailAdapter('list',{email},doc),/无法唯一确认/);
 }
});
test('wrong default account never triggers search navigation',async()=>{
 const created=[],navigated=[];
 await assert.rejects(openVerifiedGmail({email,search:'private query',tabs:{query:async()=>[]},create:async url=>{created.push(url);return 1;},readIdentity:async()=>({email:'personal@example.com',url:'https://mail.google.com/mail/u/0/'}),navigate:async(...args)=>navigated.push(args)}),/personal@example.com.*abcd1234/);
 assert.equal(created.length,1);assert.ok(!created[0].includes('#search'));assert.deepEqual(navigated,[]);
});
test('selects a matching secondary mailbox and rechecks the new tab before searching',async()=>{
 const created=[],navigated=[],read=[];
 const identities={1:{email:'personal@example.com',url:'https://mail.google.com/mail/u/0/'},2:{email,url:'https://mail.google.com/mail/u/3/#inbox'},3:{email,url:'https://mail.google.com/mail/u/3/'}};
 await openVerifiedGmail({email,search:'attendance',tabs:{query:async()=>[{id:1,status:'complete'},{id:2,status:'complete'}]},create:async url=>{created.push(url);return 3;},readIdentity:async id=>{read.push(id);return identities[id];},navigate:async(...args)=>navigated.push(args)});
 assert.deepEqual(read,[1,2,3]);assert.deepEqual(created,['https://mail.google.com/mail/u/3/']);assert.deepEqual(navigated,[[3,'https://mail.google.com/mail/u/3/#search/attendance']]);
});
test('stale mailbox index never authorizes a switched account',async()=>{
 let calls=0,navigated=false;
 await assert.rejects(openVerifiedGmail({email,search:'attendance',tabs:{query:async()=>[{id:1,status:'complete'}]},create:async()=>2,readIdentity:async()=>({email:++calls===1?email:'other@example.com',url:'https://mail.google.com/mail/u/2/'}),navigate:async()=>{navigated=true;}}),/目标账号/);
 assert.equal(navigated,false);
 assert.equal(gmailMailbox('https://mail.google.com.evil.test/mail/u/0/'),null);
});
test('a preflight-verified Gmail tab is reused without a second identity read',async()=>{
 const reads=[],navigated=[];
 const result=await openVerifiedGmail({email,search:'attendance',verifiedTabId:7,tabs:{get:async id=>({id,url:'https://mail.google.com/mail/u/2/#inbox',status:'complete'}),query:async()=>[]},readIdentity:async id=>{reads.push(id);return {email};},create:async()=>{throw Error('must not create a second tab');},navigate:async(...args)=>navigated.push(args)});
 assert.deepEqual(reads,[]);
 assert.deepEqual(navigated,[[7,'https://mail.google.com/mail/u/2/#search/attendance']]);
 assert.deepEqual(result,{tabId:7,searchUrl:'https://mail.google.com/mail/u/2/#search/attendance'});
});
