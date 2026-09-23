import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installRuleBuilderUI} from '../extension/source-rules/builder/ui.js';
import {ruleText} from '../extension/source-rules/strings.js';
import {fixtureRule} from './helpers/source-rules.js';
for(const failOcr of [false,true])test(`actual creation advances through five steps after ${failOcr?'failed':'successful'} OCR`,async()=>{
 const dom=new JSDOM('<section/>',{url:'https://extension.test/options.html'}),root=dom.window.document.querySelector('section'),calls=[];
 let state={sessionId:'s',revision:1,phase:'editing',rule:fixtureRule({id:'alice.images'}),samples:[],matches:[],canEnable:false};
 const request=async m=>{calls.push(m);if(m.type==='ruleList')return {settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}}};if(m.type==='builderTabs')return {tabs:[{id:7,label:'Moodle'}]};if(m.type==='builderPreview')state={...state,phase:'previewed',matches:[{id:'one',marked:true}],canEnable:true};if(m.type==='builderRecognize'){if(failOcr)throw new Error('builder-timeout');return {text:['8YG3G']};}return structuredClone(state);};
 let destination,imports=0;
 const ui=installRuleBuilderUI({root,request,translate:k=>ruleText(k,'en'),onSaved:result=>{destination=result.destination;},onImports:()=>imports++});
 const click=async key=>{const b=root.querySelector(`[data-builder-action=${key}]`);assert.ok(b,key);assert.equal(b.disabled,false,key);b.click();await new Promise(r=>setTimeout(r,10));};
 try{await ui.open();assert.equal(root.dataset.builderStep,'1');assert.equal(root.querySelectorAll('.practice-steps li').length,5);assert.equal(root.querySelector('[data-builder-action=preview]'),null);
 await click('context');assert.equal(root.dataset.builderStep,'2');await click('start');assert.equal(root.dataset.builderStep,'3');assert.ok(calls.some(m=>m.type==='builderPreview'));
 await click('matches-next');assert.equal(root.dataset.builderStep,'4');assert.equal(root.querySelector('[data-builder-action=ocr-next]').disabled,true);assert.equal(root.querySelector('[data-builder-action=skip]').disabled,true);
 await click('ocr');if(failOcr){assert.equal(root.querySelector('.creation-notice').dataset.tone,'error');assert.equal(root.querySelector('[data-builder-action=ocr-next]').disabled,true);await click('skip');assert.equal(root.querySelector('[data-builder-action=enable]').disabled,true);}else await click('ocr-next');
 assert.equal(root.dataset.builderStep,'5');root.querySelector('[name=authorName]').value='Alice';root.querySelector('[name=authorUrl]').value='https://example.com/alice';await click(failOcr?'draft':'enable');assert.equal(root.querySelector('.creation-notice').dataset.tone,'success');assert.equal(calls.find(m=>m.type==='builderSave').enable,false);
 assert.deepEqual(calls.find(m=>m.type==='builderSave').author,{name:'Alice',url:'https://example.com/alice'});assert.equal(destination,failOcr?'draft':'matching');await click('view-imports');assert.equal(imports,1);
 }finally{await ui.dispose();dom.window.close();}
});
test('actual creation has no repeated heading and keeps icon tools on the right',async()=>{
 const dom=new JSDOM('<section></section>'),root=dom.window.document.querySelector('section');
 const ui=installRuleBuilderUI({root,request:async()=>({settings:{courses:[]},tabs:[]}),translate:s=>ruleText(s,'en')});
 try{await ui.open();assert.equal(root.querySelector('h2'),null);for(const action of ['cancel','refresh']){const tool=root.querySelector(`.creation-toolbar [data-builder-action=${action}]`);assert.ok(tool.classList.contains('builder-tool'));assert.ok(tool.getAttribute('aria-label'));assert.equal(tool.textContent,'');}assert.equal(root.querySelectorAll('.creation-context-fields select').length,3);assert.equal(root.querySelectorAll('.creation-metadata-fields input').length,4);assert.ok(root.querySelector('.creation-ocr-row select'));assert.ok(root.querySelector('.creation-ocr-row [data-builder-action=ocr].primary'));}
 finally{await ui.dispose();dom.window.close();}
});
test('normal users can start a picker; enabling stays disabled until the actual preview passes',async()=>{
 const dom=new JSDOM('<section id="builder"></section>',{url:'https://extension.test/options.html'}),calls=[];
 const request=async message=>{calls.push(message);if(message.type==='ruleList')return {settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}}};if(message.type==='builderTabs')return {tabs:[{id:7,label:'Moodle 7'}]};return {sessionId:'s',phase:'editing',rule:{id:'local.test'},samples:[],canEnable:false};};
 const ui=installRuleBuilderUI({root:dom.window.document.querySelector('section'),request,translate:s=>ruleText(s,'en')||s,onBack(){}});
 try{await ui.open();const doc=dom.window.document;assert.equal(doc.querySelector('[data-builder-action=back]'),null);assert.equal(doc.querySelector('.builder-footer').hidden,true);doc.querySelector('[data-builder-action=context]').click();doc.querySelector('[data-builder-action=start]').click();await new Promise(r=>setTimeout(r,10));assert.equal(calls.find(c=>c.type==='builderStart').tabId,7);assert.equal(doc.querySelector('.builder-footer').hidden,true);assert.equal(doc.querySelector('[data-builder-action=enable]').disabled,true);assert.equal(doc.querySelector('[data-builder-action=matches-next]').disabled,true);assert.ok(calls.some(c=>c.type==='builderPreview'));doc.querySelector('[data-builder-action=cancel]').click();await new Promise(r=>setTimeout(r,5));assert.equal(doc.querySelector('.builder-footer').hidden,true);assert.equal(doc.querySelector('.creation-notice').dataset.tone,'success');}
 finally{await ui.dispose();dom.window.close();}
});
test('expiry purges preview image payloads and disables enable even while idle',async()=>{
 const dom=new JSDOM('<section></section>',{url:'https://extension.test/options.html'}),calls=[];
 const request=async message=>{calls.push(message);if(message.type==='ruleList')return {settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}}};if(message.type==='builderTabs')return {tabs:[{id:7,label:'Moodle'}]};if(message.type==='builderImage')return {mimeType:'image/png',imageBase64:'YWJj'};
 return {sessionId:'s',phase:'editing',expiresAt:Date.now()+40,rule:{id:'local.example',name:{en:'Example'}},samples:[{sampleId:'s0',course:'DEMO1000',images:[{id:'s0:i1',imageId:'i1',marked:true}]}]};};
 const ui=installRuleBuilderUI({root:dom.window.document.querySelector('section'),request,translate:s=>ruleText(s,'en')||s,onBack(){}});
 try{await ui.open();dom.window.document.querySelector('[data-builder-action=start]').click();await new Promise(r=>setTimeout(r,10));assert.ok(dom.window.document.querySelector('.builder-image img[src]'));await new Promise(r=>setTimeout(r,60));assert.equal(dom.window.document.querySelector('.builder-image'),null);assert.equal(dom.window.document.querySelector('[data-builder-action=enable]').disabled,true);assert.ok(calls.some(c=>c.type==='builderCancel'));}
 finally{await ui.dispose();dom.window.close();}
});
test('quiet status polling disables edits until the authoritative response arrives',async()=>{
 const dom=new JSDOM('<section></section>',{url:'https://extension.test/options.html'});let poll,release;
 const original=dom.window.setTimeout.bind(dom.window);dom.window.setTimeout=(fn,ms)=>ms===3000?(poll=fn,99):original(fn,ms);
 const state={sessionId:'s',revision:1,phase:'editing',rule:{id:'local.example',name:{en:'Example'}},samples:[]};
 const request=async message=>{if(message.type==='ruleList')return {settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}}};if(message.type==='builderTabs')return {tabs:[{id:7,label:'Moodle'}]};if(message.type==='builderStatus')return new Promise(done=>{release=()=>done(state);});return state;};
 const ui=installRuleBuilderUI({root:dom.window.document.querySelector('section'),request,translate:s=>ruleText(s,'en')||s,onBack(){}});
 try{await ui.open();dom.window.document.querySelector('[data-builder-action=start]').click();await new Promise(r=>setTimeout(r,5));const pending=poll();assert.equal(dom.window.document.querySelector('.builder-filters select').disabled,true);release();await pending;assert.equal(dom.window.document.querySelector('.builder-filters select').disabled,false);}
 finally{release?.();await ui.dispose();dom.window.close();}
});
test('a stale save automatically refreshes matching and revokes recognition results',async()=>{
 const dom=new JSDOM('<section></section>',{url:'https://extension.test/options.html'}),calls=[];let state={sessionId:'s',revision:1,phase:'editing',rule:fixtureRule({id:'local.example',name:{en:'Example'}}),samples:[]};
 const request=async message=>{calls.push(message);if(message.type==='ruleList')return {settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}}};if(message.type==='builderTabs')return {tabs:[{id:7,label:'Moodle'}]};if(message.type==='builderPreview')state={...state,phase:'previewed',matches:[{id:'one',marked:true}],canEnable:true};if(message.type==='builderRecognize')return {text:['CODE1']};if(message.type==='builderSave'){state={...state,revision:2,phase:'editing',canEnable:false};throw new Error('builder-stale-preview');}return structuredClone(state);};
 const ui=installRuleBuilderUI({root:dom.window.document.querySelector('section'),request,translate:s=>ruleText(s,'en')||s,onBack(){}});
 const click=async action=>{dom.window.document.querySelector(`[data-builder-action=${action}]`).click();await new Promise(r=>setTimeout(r,5));};
 try{await ui.open();for(const action of ['context','start','matches-next','ocr','ocr-next','enable'])await click(action);assert.equal(calls.filter(m=>m.type==='builderPreview').at(-1).revision,2);assert.equal(calls.some(m=>m.type==='builderCancel'),false);assert.equal(dom.window.document.querySelector('section').dataset.builderStep,'3');assert.equal(dom.window.document.querySelector('[data-builder-action=enable]').disabled,true);}
 finally{await ui.dispose();dom.window.close();}
});
