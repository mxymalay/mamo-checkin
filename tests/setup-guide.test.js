import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createSetupGuide} from '../extension/setup-guide.js';
import {normalizeIdentity} from '../extension/settings.js';
function make(){const dom=new JSDOM('<body><header></header></body>');let reloads=0,detects=0;const calls=[];const guide=createSetupGuide({doc:dom.window.document,request:async p=>{calls.push(p);},refresh:async()=>{},detect:()=>detects++,checkHealth:()=>{},reload:()=>reloads++});return {dom,guide,calls,get reloads(){return reloads;},get detects(){return detects;}};}
test('missing service gates the whole workflow and recovery explicitly requires reload',()=>{
 const e=make(),doc=e.dom.window.document;e.guide.update({setupGuide:true,settings:{}});
 assert.equal(doc.body.dataset.setup,'install');e.guide.health(null,'not installed');assert.equal(e.guide.needsHealth(),true);
 e.guide.health({binaryReady:true});assert.equal(doc.body.dataset.setup,'install');assert.equal(doc.getElementById('setup-reload').hidden,false);doc.getElementById('setup-reload').click();assert.equal(e.reloads,1);assert.equal(e.detects,0);e.dom.window.close();
});
test('fresh ready service advances through identity and courses before full dashboard',()=>{
 const e=make(),doc=e.dom.window.document;e.guide.update({setupGuide:true,settings:{}});e.guide.health({binaryReady:true});assert.equal(doc.body.dataset.setup,'identity');
 e.guide.update({setupGuide:true,settings:{email:'student@example.edu',name:'Example Student',courses:[]}});assert.equal(doc.body.dataset.setup,'courses');assert.equal(e.detects,0);
 doc.getElementById('setup-detect').click();assert.equal(e.detects,1);
 e.guide.update({setupGuide:true,settings:{email:'student@example.edu',name:'Example Student',courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'}}});assert.equal(doc.body.dataset.setup,'complete');assert.equal(doc.getElementById('setup-guide').hidden,true);e.dom.window.close();
});
test('identity can be validated before courses exist and cannot change an account with records',()=>{
 assert.deepEqual(normalizeIdentity({}, {email:' Student@Example.edu ',name:' Example Student '}),{email:'student@example.edu',name:'Example Student'});
 assert.throws(()=>normalizeIdentity({}, {email:'bad',name:'Student'}),/有效/);
 assert.throws(()=>normalizeIdentity({email:'old@example.edu',name:'Old'},{email:'new@example.edu',name:'New'},true),/记录/);
});
