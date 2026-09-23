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
test('setup tour switches all visible copy to Traditional Chinese',()=>{
 const env=fixture();try{env.doc.documentElement.lang='zh-TW';env.tour.update({setupGuide:true,settings:{}});assert.equal(env.doc.querySelector('#setup-tour-title').textContent,'先選擇辨識方式');assert.match(env.doc.querySelector('#setup-tour-text').textContent,/內建辨識/);assert.equal(env.doc.querySelector('#setup-tour-skip').textContent,'略過引導');}finally{env.close();}
});

// Capture focus before each DOM operation; checking only afterward misses the warning.
function watchConcealment(doc){
 const root=doc.querySelector('#setup-tour'),checks=[];
 const hidden=Object.getOwnPropertyDescriptor(doc.defaultView.HTMLElement.prototype,'hidden');
 const record=operation=>checks.push({operation,inside:root.contains(doc.activeElement)});
 Object.defineProperty(root,'hidden',{get(){return hidden.get.call(this);},set(value){if(value)record('hidden');hidden.set.call(this,value);}});
 const setAttribute=root.setAttribute.bind(root),remove=root.remove.bind(root);
 root.setAttribute=(name,value)=>{if(name==='aria-hidden'&&value==='true')record('aria-hidden');setAttribute(name,value);};
 root.remove=()=>{record('remove');remove();};
 return ()=>{
  assert.ok(checks.length>0,'tour was hidden or removed');
  for(const check of checks)assert.equal(check.inside,false,`focus must leave before ${check.operation}`);
 };
}

for(const action of ['Got it','skip','Escape','finish','hide','reset','destroy']){
 test(`${action} moves tour focus to the current target before hiding or removing it`,()=>{
  const env=fixture(),{doc,tour}=env;
  try{
   tour.update({setupGuide:true,settings:{}});
   if(action==='finish'){doc.body.dataset.setup='complete';tour.update({setupGuide:true,settings:{}});}
   const button=doc.querySelector(action==='skip'?'#setup-tour-skip':'#setup-tour-next');
   button.focus();assert.equal(doc.activeElement,button);
   const verify=watchConcealment(doc);
   if(action==='Escape')button.dispatchEvent(new env.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   else if(['hide','reset','destroy'].includes(action))tour[action]();
   else button.click();
   verify();
   assert.equal(doc.activeElement,doc.querySelector(action==='finish'?'#scan':'#setup-skip-ocr'));
   assert.equal(tour.active,false);
  }finally{env.close();}
 });
}

for(const unavailable of ['removed','hidden','ancestor display','visibility','inert','aria-hidden','disabled','zero size']){
 test(`a ${unavailable} target falls back to the focus from before the tour`,()=>{
  const env=fixture(),{doc,tour}=env;
  try{
   const previous=doc.querySelector('#scan'),target=doc.querySelector('#setup-skip-ocr');
   previous.focus();tour.update({setupGuide:true,settings:{}});
   doc.querySelector('#setup-tour-next').focus();
   tour.update({setupGuide:true,settings:{}});
   if(unavailable==='removed')target.remove();
   if(unavailable==='hidden')target.hidden=true;
   if(unavailable==='ancestor display'){
    const parent=doc.createElement('div');target.before(parent);parent.append(target);parent.style.display='none';
   }
   if(unavailable==='visibility')target.style.visibility='hidden';
   if(unavailable==='inert')target.setAttribute('inert','');
   if(unavailable==='aria-hidden')target.setAttribute('aria-hidden','true');
   if(unavailable==='disabled')target.disabled=true;
   if(unavailable==='zero size')target.getBoundingClientRect=()=>({width:0,height:0});
   const verify=watchConcealment(doc);tour.hide();verify();
   assert.equal(doc.activeElement,previous);
  }finally{env.close();}
 });
}

for(const tabindex of [null,'0','-1']){
 test(`a non-interactive course target receives focus without changing its ${tabindex} tabindex`,()=>{
  const env=fixture(),{doc,tour}=env;
  try{
   doc.body.dataset.setup='courses';
   const target=doc.querySelector('.setup-course-header');
   if(tabindex!==null)target.setAttribute('tabindex',tabindex);
   tour.update({setupGuide:true,settings:{}});
   doc.querySelector('#setup-tour-next').focus();
   const verify=watchConcealment(doc);doc.querySelector('#setup-tour-next').click();verify();
   assert.equal(doc.activeElement,target);
   assert.equal(target.getAttribute('tabindex'),tabindex);
  }finally{env.close();}
 });
}

test('missing target and stale previous focus fall back to the page before concealment',()=>{
 const env=fixture(),{doc,tour}=env;
 try{
  const previous=doc.querySelector('#scan');previous.focus();
  tour.update({setupGuide:true,settings:{}});doc.querySelector('#setup-tour-next').focus();
  previous.hidden=true;doc.querySelector('#setup-skip-ocr').remove();
  const verify=watchConcealment(doc);tour.update({setupGuide:false});verify();
  assert.equal(doc.activeElement,doc.body);
  assert.equal(doc.body.hasAttribute('tabindex'),false);
 }finally{env.close();}
});

test('focus return uses the visible onboarding stage when the old target disappears',()=>{
 const env=fixture(),{doc,tour}=env;
 try{
  tour.update({setupGuide:true,settings:{}});doc.querySelector('#setup-tour-next').focus();
  doc.body.dataset.setup='identity';doc.querySelector('#setup-skip-ocr').hidden=true;
  const verify=watchConcealment(doc);tour.hide();verify();
  assert.equal(doc.activeElement,doc.querySelector('#setup-name'));
 }finally{env.close();}
});

for(const elsewhere of ['page','modal']){
 test(`hiding the tour preserves focus already in the ${elsewhere}`,()=>{
  const env=fixture(),{doc,tour}=env;
  try{
   tour.update({setupGuide:true,settings:{}});doc.querySelector('#setup-tour-next').focus();
   let other=doc.querySelector('#scan');
   if(elsewhere==='modal'){
    const dialog=doc.createElement('dialog');dialog.setAttribute('open','');
    other=doc.createElement('button');dialog.append(other);doc.body.append(dialog);
   }
   other.focus();
   const verify=watchConcealment(doc);
   if(elsewhere==='modal')tour.update({setupGuide:true,settings:{}});
   else tour.hide();
   verify();assert.equal(doc.activeElement,other);
   tour.reset();assert.equal(doc.activeElement,other);
   tour.destroy();assert.equal(doc.activeElement,other);
  }finally{env.close();}
 });
}

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
