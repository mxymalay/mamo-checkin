import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {googleAccountChooser,listGoogleAccounts,selectGoogleAccount} from '../extension/google-account.js';
import {checkEmailLogin} from '../extension/email-check.js';
import {openVerifiedGmail} from '../extension/gmail-session.js';
const email='abcd1234@student.monash.edu';
test('account list returns visible email identifiers only',()=>{
 const dom=new JSDOM(`<div data-identifier="personal@example.com"></div><div data-identifier="${email}"></div><div hidden data-identifier="hidden@student.monash.edu"></div><div data-identifier="not-an-email"></div>`,{url:'https://accounts.google.com/v3/signin/accountchooser'});
 assert.deepEqual(listGoogleAccounts(dom.window.document),{accounts:['personal@example.com',email]});dom.window.close();
});
test('account chooser uses the Google-compatible entry point',()=>{
 const url=new URL(googleAccountChooser());
 assert.equal(url.pathname,'/AccountChooser');assert.equal(url.searchParams.get('service'),'mail');
});
test('chooser activates only the exact requested account',()=>{
 const dom=new JSDOM(`<div role="link" data-identifier="other@example.com"></div><div role="link" data-identifier="${email}"></div>`,{url:'https://accounts.google.com/v3/signin/accountchooser'}),clicked=[];
 for(const row of dom.window.document.querySelectorAll('[data-identifier]'))row.onclick=()=>clicked.push(row.dataset.identifier);
 assert.equal(selectGoogleAccount(email,dom.window.document).selected,true);assert.deepEqual(clicked,[email]);dom.window.close();
});
test('preflight routes wrong accounts to chooser without reading messages',async()=>{
 let destination;
 const result=await checkEmailLogin({email,tabId:1,open:false},{tabs:{get:async()=>({id:1,url:'https://mail.google.com/mail/u/0/',status:'complete'}),update:async(id,options)=>{destination=options.url;}},readIdentity:async()=>({email:'other@example.com'})});
 assert.equal(result.switchAttempted,true);assert.equal(new URL(destination).hostname,'accounts.google.com');
});
test('collection resumes after automatic account recovery and only then searches',async()=>{
 const events=[];
 await openVerifiedGmail({email,search:'attendance',tabs:{query:async()=>[]},create:async()=>1,readIdentity:async()=>({email:'other@example.com',url:'https://mail.google.com/mail/u/0/'}),recoverAccount:async()=>{events.push('switch');return {email,url:'https://mail.google.com/mail/u/2/'};},navigate:async(id,url)=>events.push(url)});
 assert.deepEqual(events,['switch','https://mail.google.com/mail/u/2/#search/attendance']);
});
