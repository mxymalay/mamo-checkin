import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {installPracticeCourse} from '../extension/source-rules/practice/course.js';
import {installSourceRuleRuntime} from '../extension/source-rules/runtime.js';
import {fixtureRule} from './helpers/source-rules.js';
import {port} from './helpers/rule-practice.js';

test('bundled course uses real picker: expand while picking, select images not text, exclude unrelated content',async()=>{
 const html=await readFile(new URL('../extension/source-rules/practice/course.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'chrome-extension://test/source-rules/practice/course.html?session=course-session'}),doc=dom.window.document;
 const channel=port({},'rule-practice-source');
 for(const img of doc.images){img.decode=async()=>{};Object.defineProperty(img,'naturalWidth',{value:900});Object.defineProperty(img,'naturalHeight',{value:200});}
 const course=await installPracticeCourse({doc,chrome:{runtime:{id:'test',connect:()=>channel}}});
 try{
  assert.equal(channel.sent[0].type,'ready');channel.onMessage.emit({type:'registered',sessionId:'course-session',documentId:'source-doc',expiresAt:Date.now()+60000});
  let revision=0;
  const command=(method,args={})=>{const requestId=String(++revision);channel.onMessage.emit({type:'command',sessionId:'course-session',requestId,revision,method,args});return channel.sent.at(-1);};
  command('begin',{initialize:true,context:{sessionId:'builder-session',expiresAt:Date.now()+60000}});command('begin',{sessionId:'builder-session'});
  const picker=globalThis.__mamoRulePicker,attendance=doc.querySelector('.attendance img');assert.ok([...doc.querySelectorAll('.activity-toggle')].every(button=>button.getAttribute('aria-expanded')==='true'));doc.querySelector('[aria-controls="session-material"]').click();attendance.click();assert.equal(picker.inspect({sessionId:'builder-session'}).phase,'picking');
  doc.querySelector('[aria-controls="session-material"]').click();assert.equal(doc.querySelector('#session-material').hidden,false);
  doc.querySelector('#session-material p').click();assert.equal(picker.inspect({sessionId:'builder-session'}).phase,'picking');
  doc.querySelector('blockquote img').click();const state=picker.inspect({sessionId:'builder-session'});assert.equal(state.phase,'selected');assert.equal(state.images.length,4);assert.ok(state.images.find(image=>image.url.endsWith('/quoted.png')).marked);
  doc.querySelector('#session-status').textContent='Transport status';assert.equal(picker.inspect({sessionId:'builder-session'}).phase,'selected');
  const unrelated=state.images.find(image=>image.url.endsWith('/unrelated.png'));picker.mark({sessionId:'builder-session',imageId:unrelated.imageId,include:false});
  const rules=picker.propose({sessionId:'builder-session',base:fixtureRule({id:'local.practice.example'})});assert.ok(picker.evaluate({sessionId:'builder-session',rules}).some(result=>result.eligible&&!result.images.some(image=>image.imageId===unrelated.imageId)));
  channel.onDisconnect.emit();assert.equal(doc.querySelector('#session-status').dataset.state,'ended');assert.equal(doc.querySelector('#return-to-creation').disabled,false);
 }finally{course.dispose();dom.window.close();delete globalThis.__mamoSourceRules;delete globalThis.__mamoBuilderSelector;delete globalThis.__mamoRulePicker;}
});
test('ended sources can return to an existing creation tab without reviving the old session',async()=>{
 const html=await readFile(new URL('../extension/source-rules/practice/course.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'chrome-extension://test/source-rules/practice/course.html?session=ended-session'}),channel=port({}),updates=[];
 for(const img of dom.window.document.images)img.decode=async()=>{};
 const course=await installPracticeCourse({doc:dom.window.document,chrome:{runtime:{id:'test',connect:()=>channel},tabs:{query:async()=>[{id:7,url:'chrome-extension://test/options.html#settings'}],update:async(id,patch)=>updates.push({id,patch}),create:async()=>assert.fail('should reuse settings tab')}}});
 try{channel.onDisconnect.emit();dom.window.document.querySelector('#return-to-creation').click();await new Promise(r=>setTimeout(r,0));assert.equal(updates[0].id,7);assert.equal(updates[0].patch.url,'chrome-extension://test/options.html#modules/create/practice');assert.equal(dom.window.document.querySelector('#session-status').dataset.state,'ended');}
 finally{course.dispose();dom.window.close();}
});
test('authenticated registration localizes source status and return controls in all three locales',async()=>{
 const html=await readFile(new URL('../extension/source-rules/practice/course.html',import.meta.url),'utf8');
 for(const [language,back,ready,ended] of [['en','Return to creation','Sample page ready','This practice session has ended.'],['zh-CN','返回创建','示例页面已准备好','本次练习已结束。'],['zh-TW','返回建立','範例頁面已準備好','本次練習已結束。']]){
  const dom=new JSDOM(html,{url:'chrome-extension://test/source-rules/practice/course.html?session=locale-session'}),channel=port({});for(const img of dom.window.document.images)img.decode=async()=>{};
  const course=await installPracticeCourse({doc:dom.window.document,chrome:{runtime:{id:'test',connect:()=>channel}}});
  channel.onMessage.emit({type:'registered',sessionId:'locale-session',documentId:'doc',expiresAt:Date.now()+1000,language});
  assert.equal(dom.window.document.querySelector('#return-to-creation').textContent,back);assert.equal(dom.window.document.querySelector('#session-status').textContent,ready);
  channel.onDisconnect.emit();assert.ok(dom.window.document.querySelector('#session-status').textContent.startsWith(ended));course.dispose();dom.window.close();
 }
});
test('production runtime denies extension images and trusted course capability must match literal session URL',()=>{
 const dom=new JSDOM('<article><img src="assets/attendance.png"></article>',{url:'chrome-extension://test/source-rules/practice/course.html?session=course-session'}),doc=dom.window.document;
 const args={root:doc.querySelector('article'),source:'moodle',course:'DEMO1000',rules:[fixtureRule({images:{selectors:['img']}})]};
 try{
  installSourceRuleRuntime();assert.equal(globalThis.__mamoSourceRules.locate(args).images.length,0);
  installSourceRuleRuntime({},{extensionOrigin:'chrome-extension://test',sessionId:'other',documentId:'source'});assert.equal(globalThis.__mamoSourceRules.locate(args).images.length,0);
  installSourceRuleRuntime({},{extensionOrigin:'chrome-extension://test',sessionId:'course-session',documentId:'source'});assert.equal(globalThis.__mamoSourceRules.locate(args).images.length,1);
  doc.querySelector('img').src='chrome-extension://test/icons/icon-128.png';assert.equal(globalThis.__mamoSourceRules.locate(args).images.length,0);
 }finally{dom.window.close();delete globalThis.__mamoSourceRules;}
});
