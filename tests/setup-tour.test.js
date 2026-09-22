import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createSetupTour} from '../extension/setup-tour.js';

function fixture(options={}){
 const dom=new JSDOM('<html lang="zh-CN"><body data-setup="install"><button id="setup-skip-ocr">内置识别</button><input id="setup-name"><div class="setup-course-header"></div><button id="scan">签到</button></body></html>',{url:'https://example.test'});
 const doc=dom.window.document;
 for(const node of doc.body.children)node.getBoundingClientRect=()=>({left:30,right:230,top:100,bottom:140,width:200,height:40});
 const tour=createSetupTour({doc,...options});
 return {dom,doc,tour,close(){tour.destroy();dom.window.close();}};
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,60));

test('setup tour follows stage changes and does not reopen acknowledged bubbles on language change',async()=>{
 const env=fixture();
 try{
  env.tour.update({setupGuide:true,settings:{}});
  assert.equal(env.tour.active,true);
  env.doc.querySelector('#setup-tour-next').click();
  env.doc.documentElement.lang='en';await settle();
  assert.equal(env.tour.active,false);
  env.doc.body.dataset.setup='identity';await settle();
  assert.equal(env.doc.querySelector('#setup-tour-title').textContent,'Confirm your school identity');
  assert.equal(env.tour.active,true);
  env.doc.body.dataset.setup='complete';await settle();
  assert.equal(env.doc.querySelector('#setup-tour-title').textContent,'Ready to check in');
 }finally{env.close();}
});

test('skip survives unavailable storage and persists when storage is available',async()=>{
 for(const storage of [undefined,{getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}}]){
  const env=fixture({storage});
  try{
   env.tour.update({setupGuide:true,settings:{}});
   env.doc.querySelector('#setup-tour-skip').click();
   env.doc.body.dataset.setup='identity';env.doc.documentElement.lang='en';await settle();
   env.tour.update({setupGuide:true,settings:{}});
   assert.equal(env.tour.active,false);
   if(!storage){env.tour.destroy();env.tour=createSetupTour({doc:env.doc});env.tour.update({setupGuide:true,settings:{}});assert.equal(env.tour.active,false);}
  }finally{env.close();}
 }
});

test('configured users are not shown a tour while Mac health is still loading',()=>{
 const env=fixture();
 try{
  env.tour.update({setupGuide:true,settings:{name:'Student',courses:['FIT1000'],senders:{FIT1000:'teacher@example.edu'}}});
  assert.equal(env.tour.active,false);
 }finally{env.close();}
});

test('positioning settles without observing its own style writes, and Windows begins at identity',async()=>{
 const env=fixture({windows:true});
 try{
  env.doc.body.dataset.setup='identity';env.tour.update({setupGuide:true,settings:{}});
  assert.match(env.doc.querySelector('#setup-tour-progress').textContent,/1 \/ 3/);
  await settle();let mutations=0;
  const observer=new env.dom.window.MutationObserver(records=>{mutations+=records.length;});
  observer.observe(env.doc.querySelector('#setup-tour'),{subtree:true,attributes:true});
  await settle();observer.disconnect();assert.equal(mutations,0);
 }finally{env.close();}
});
