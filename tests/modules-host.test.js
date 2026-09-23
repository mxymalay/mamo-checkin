import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createPageTabs} from '../extension/page-tabs.js';
import {installModulesHost} from '../extension/modules-host.js';
import {ruleText} from '../extension/source-rules/strings.js';
import {installLanguageUI,translate} from '../extension/i18n.js';
test('deep-linked module names follow language changes even when installed before the picker',async()=>{
 const html=await readFile(new URL('../extension/options.html',import.meta.url),'utf8'),dom=new JSDOM(html,{url:'https://extension.test/options.html#modules/library'}),doc=dom.window.document,tabs=createPageTabs(doc);
 const builtin=JSON.parse(await readFile(new URL('../extension/source-rules/builtin/gmail.json',import.meta.url),'utf8'));
 const state={settings:{courses:[]},builtins:[builtin],rules:[{...builtin,id:'community.example.gmail',origin:'community',courses:['FIT5122'],name:{en:'Gmail synthetic example',zh_CN:'Gmail 合成示例',zh_TW:'Gmail 合成範例'}}]};
 const host=installModulesHost({doc,pageTabs:tabs,translate,request:async p=>p.type==='health'?{fallback:true}:state});
 const ui=installLanguageUI(doc),picker=doc.querySelector('#language');
 try{
  await host.open('library');
  for(const [lang,name,community] of [['zh','官方 Gmail','Gmail 合成示例'],['en','Official Gmail','Gmail synthetic example'],['zh_TW','官方 Gmail','Gmail 合成範例'],['en','Official Gmail','Gmail synthetic example']]){
   picker.value=lang;picker.dispatchEvent(new dom.window.Event('change'));await new Promise(r=>setTimeout(r,20));
   assert.equal(doc.querySelector('[data-rule-id="builtin.gmail"] strong').textContent,name);
   assert.equal(doc.querySelector('[data-rule-id="community.example.gmail"] strong').textContent,community);
   assert.equal(doc.querySelector('#health').textContent,ruleText('rules.browser-engine',lang));
   if(lang==='zh_TW')assert.equal(doc.querySelector('#module-tab-matching').textContent,'規則配對課程');
  }
 }finally{ui.disconnect();await host.dispose();dom.window.close();}
});
test('slow initialization never overwrites a newer module selection',async()=>{
 for(const delayed of ['health','status']){
  const html=await readFile(new URL('../extension/options.html',import.meta.url),'utf8'),dom=new JSDOM(html,{url:'https://extension.test/options.html'}),doc=dom.window.document,tabs=createPageTabs(doc);
  let release;const pending=new Promise(resolve=>{release=resolve;}),state={settings:{devMode:true,courses:[]},status:{}};
  const host=installModulesHost({doc,pageTabs:tabs,translate:key=>ruleText(key,'en')||key,request:async p=>{if(p.type===delayed)await pending;return p.type==='health'?{fallback:true}:p.type==='ruleList'?{rules:[],builtins:[],settings:state.settings}:state;}});
  try{const opened=host.open('recognition');doc.querySelector('#module-tab-library').click();release();await opened;assert.equal(doc.querySelector('#rule-manager').hidden,false,delayed);}
  finally{release();await host.dispose();dom.window.close();}
 }
});
test('embedded companion entry returns in place and preserves drafts',async()=>{
 const html=await readFile(new URL('../extension/options.html',import.meta.url),'utf8'),dom=new JSDOM(html,{url:'https://extension.test/options.html'}),doc=dom.window.document,tabs=createPageTabs(doc),calls=[];
 let installs=0;const state={settings:{devMode:true,courses:[]},status:{}};
 const host=installModulesHost({doc,pageTabs:tabs,onInstallCompanion:()=>{installs++;},translate:key=>ruleText(key,'en')||key,request:async p=>{calls.push(p);return p.type==='health'?{fallback:true}:p.type==='ruleList'?{rules:[],builtins:[],settings:state.settings}:state;}});
 try{doc.querySelector('#email').value='draft1234';await host.open('recognition');doc.querySelector('#prefer-companion').click();await new Promise(r=>setTimeout(r,5));assert.equal(doc.body.dataset.page,'settings');assert.equal(doc.querySelector('#email').value,'draft1234');assert.equal(installs,1);assert.equal(calls.filter(p=>p.type==='resetOcrPreference').length,1);}
 finally{await host.dispose();dom.window.close();}
});
test('module entry opens in the existing shell, keeps drafts, and returns without a new window',async()=>{
 const html=await readFile(new URL('../extension/options.html',import.meta.url),'utf8'),dom=new JSDOM(html,{url:'https://extension.test/options.html'}),doc=dom.window.document,header=doc.querySelector('header'),tabs=createPageTabs(doc),calls=[];
 const state={settings:{devMode:true,courses:[]},status:{}};
 const host=installModulesHost({doc,pageTabs:tabs,translate:key=>ruleText(key,'en')||key,request:async p=>{calls.push(p);return p.type==='ruleList'?{rules:[],builtins:[],settings:state.settings}:p.type==='health'?{binaryReady:true}:state;}});
 try{
  assert.equal(doc.querySelector('#rule-manager'),null);doc.querySelector('#email').value='draft1234';await host.open('library');
  assert.equal(doc.body.dataset.page,'modules');assert.equal(doc.querySelector('header'),header);assert.equal(doc.querySelectorAll('header').length,1);assert.equal(doc.querySelector('#rule-manager').hidden,false);
  doc.querySelector('#back-settings').click();assert.equal(doc.body.dataset.page,'settings');assert.equal(doc.querySelector('#email').value,'draft1234');assert.equal(doc.querySelector('#module-page').hidden,true);
  await host.open('recognition');assert.equal(doc.querySelectorAll('#rule-manager').length,1);assert.equal(calls.some(p=>p.type==='scan'),false);
 }finally{await host.dispose();dom.window.close();}
});
