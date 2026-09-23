import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installRuleManager} from '../extension/source-rules/manager-ui.js';
import {ruleText} from '../extension/source-rules/strings.js';
import {fixtureRule} from './helpers/source-rules.js';
import {readFile} from 'node:fs/promises';
import {parseRule} from '../extension/source-rules/format.js';
function tested(data){data.tests={};for(const rule of data.rules){rule.digest='fixture-digest';data.tests[rule.key||rule.id]=Object.fromEntries(rule.courses.map(course=>[course,{digest:rule.digest,source:rule.source}]));}return data;}
test('JSON text imports share validation, preserve invalid input and clear successful input',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document,calls=[];
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:s=>ruleText(s,'en'),request:async p=>{calls.push(p);return {rules:[],settings:{courses:[]}};}});
 const tick=()=>new Promise(r=>setTimeout(r,10));
 try{
  await manager.refresh();doc.querySelector('[data-rule-action=import]').click();doc.querySelector('[data-library-tab=import-new]').click();doc.querySelector('[data-rule-action=import-mode-json]').click();
  const input=doc.querySelector('textarea'),submit=doc.querySelector('[data-rule-action=import-json-text]');
  assert.equal(input.parentElement.hidden,false);assert.equal(submit.disabled,true);
  for(const text of ['{bad',JSON.stringify(fixtureRule({id:'local.demo'})),' '.repeat(65537)+'{}']){
   input.value=text;input.dispatchEvent(new dom.window.Event('input'));submit.click();assert.equal(input.disabled,true);await tick();
   assert.ok(doc.querySelector('dialog[open]'));assert.equal(input.value,text);assert.equal(input.disabled,false);assert.equal(calls.some(p=>p.type==='ruleImport'),false);
   assert.doesNotMatch(doc.querySelector('dialog').textContent,/undefined/);doc.querySelector('[data-rule-action=close-dialog]').click();
  }
  const text=JSON.stringify(fixtureRule());input.value=text;input.dispatchEvent(new dom.window.Event('input'));submit.click();await tick();
  assert.equal(calls.find(p=>p.type==='ruleImport').text,text);assert.equal(calls.find(p=>p.type==='ruleImport').origin,'local');assert.equal(input.value,'');assert.equal(submit.disabled,true);assert.equal(input.parentElement.hidden,false);
  const template=doc.querySelector('.rule-template-download');assert.equal(template.download,'attendance-rule-template.json');
  assert.equal(parseRule(await readFile(new URL(template.href),'utf8')).id,'local.custom.moodle-attendance');
 }finally{manager.dispose();dom.window.close();}
});
test('shared rules label is localized and create navigation has no chevron',async()=>{
 assert.equal(ruleText('rules.library-community','en'),'Shared rules');assert.equal(ruleText('rules.library-community','zh-CN'),'共享规则');assert.equal(ruleText('rules.library-community','zh-TW'),'共享規則');
 const css=await readFile(new URL('../extension/modules.css',import.meta.url),'utf8');assert.doesNotMatch(css,/\[aria-expanded(?:=true)?\]::before/);
});
test('peer creation and import pages expose a clickable dropzone in all languages',async()=>{
 for(const [lang,createLabel,importLabel] of [['en','Create rule','Import rules'],['zh-CN','创建规则','导入规则'],['zh-TW','建立規則','匯入規則']]){
  const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document;
  const manager=installRuleManager({root:doc.querySelector('#manager'),translate:s=>ruleText(s,lang),onCreate(){},request:async()=>({rules:[],settings:{courses:[]}})});
  try{
   await manager.refresh();doc.querySelector('[data-library-tab=local]').click();
   const create=doc.querySelector('[data-rule-action=create]');assert.equal(create.textContent,createLabel);create.click();
   assert.equal(doc.querySelector('.rule-create-menu').hidden,false);assert.equal(doc.querySelectorAll('.rule-create-menu button').length,2);
   const input=doc.querySelector('input[type=file]');let opened=false;input.click=()=>{opened=true;};
   const button=doc.querySelector('[data-rule-action=import]');assert.equal(button.textContent,importLabel);button.click();button.click();assert.equal(opened,false);doc.querySelector('[data-library-tab=import-new]').click();assert.equal(doc.querySelector('[data-library-panel=import-new]').hidden,false);assert.equal(doc.querySelector('[data-library-panel=local]').hidden,true);
   doc.querySelector('[data-rule-action=upload-rule]').click();assert.equal(opened,true);assert.equal(input.accept,'.json,application/json');
   assert.equal(doc.querySelector('.rule-local-children'),null);assert.equal(button.nextElementSibling.className,'rule-import-menu');assert.equal(doc.querySelectorAll('.rule-import-menu [role=tab]').length,2);
   doc.querySelector('[data-library-tab=local]').click();assert.equal(doc.querySelector('[data-library-panel=import-new]').hidden,true);assert.equal(doc.querySelector('[data-library-panel=local] .rule-import-dropzone'),null);
  }finally{manager.dispose();dom.window.close();}
 }
});
test('dropping JSON imports it once and rejects multiple or non-JSON files',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document,calls=[];
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:s=>ruleText(s,'en'),request:async p=>{calls.push(p);return {rules:[],settings:{courses:[]}};}});
 try{
  await manager.refresh();doc.querySelector('[data-rule-action=import]').click();doc.querySelector('[data-library-tab=import-new]').click();
  const zone=doc.querySelector('.rule-import-dropzone'),drop=files=>{const event=new dom.window.Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(event,'dataTransfer',{value:{files}});zone.dispatchEvent(event);assert.equal(event.defaultPrevented,true);};
  const file={name:'rule.json',size:100,text:async()=>JSON.stringify(fixtureRule())};
  drop([file,file]);assert.equal(calls.some(p=>p.type==='ruleImport'),false);assert.equal(doc.querySelector('.rule-notice').dataset.tone,'error');
  drop([{...file,name:'rule.js'}]);assert.equal(calls.some(p=>p.type==='ruleImport'),false);
  zone.dispatchEvent(new dom.window.Event('dragenter',{cancelable:true}));assert.equal(zone.dataset.dragging,'true');
  drop([file]);assert.equal(zone.dataset.dragging,undefined);await new Promise(r=>setTimeout(r,10));assert.equal(calls.filter(p=>p.type==='ruleImport').length,1);
 }finally{manager.dispose();dom.window.close();}
});
test('successful library changes use a notification instead of plain feedback',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document,state={rules:[fixtureRule()],settings:{courses:[]}};dom.window.confirm=()=>true;
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:s=>ruleText(s,'en'),request:async m=>{if(m.type==='ruleRemove')state.rules=[];return state;}});
 try{await manager.refresh();doc.querySelector('[data-rule-action=delete]').click();await new Promise(r=>setTimeout(r,5));const notice=doc.querySelector('.rule-feedback');assert.equal(notice.textContent,'Rule library updated');assert.ok(notice.classList.contains('rule-notice'));assert.equal(notice.getAttribute('role'),'status');doc.querySelector('[data-library-tab=local]').click();assert.equal(notice.textContent,'');assert.ok(doc.querySelector('.rule-empty-state'));}
 finally{manager.dispose();dom.window.close();}
});
test('navigation clears transient notices without clearing unapplied draft notices',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document,state={rules:[fixtureRule({hasPrevious:true})],settings:{courses:[]}};
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:s=>ruleText(s,'en'),request:async()=>state});
 try{
  await manager.refresh();manager.show('local');
  for(const event of ['mamo:modulechange','mamo:pagechange']){
   doc.querySelector('[data-rule-action=rollback]').click();await new Promise(r=>setTimeout(r,5));
   assert.equal(doc.querySelector('.rule-feedback').textContent,'Rule library updated');
   doc.dispatchEvent(new dom.window.CustomEvent(event));assert.equal(doc.querySelector('.rule-feedback').textContent,'');
   assert.equal(doc.querySelector('.rule-draft-notice').hidden,false);
  }
 }finally{manager.dispose();dom.window.close();}
});
test('local import collisions require confirmation while another origin does not',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document,raw=fixtureRule(),calls=[];
 const data={rules:[{...raw,origin:'community',key:'community:'+raw.id}],settings:{courses:[]}};
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:s=>ruleText(s,'en'),loadCatalog:async()=>[],request:async p=>{calls.push(p);return data;}});
 const tick=()=>new Promise(r=>setTimeout(r,10));
 const importFile=rule=>{const file=doc.querySelector('input[type=file]'),text=JSON.stringify(rule);Object.defineProperty(file,'files',{configurable:true,value:[{size:text.length,text:async()=>text}]});file.dispatchEvent(new dom.window.Event('change'));};
 try{
  await manager.update(data);importFile(raw);await tick();
  assert.equal(doc.querySelector('dialog'),null);assert.equal(calls.filter(p=>p.type==='ruleImport').length,1);
  assert.equal(calls.find(p=>p.type==='ruleImport').origin,'local');
  data.rules.push({...raw,origin:'local',key:'local:'+raw.id});await manager.refresh();
  const changed={...raw,name:{en:'Changed local name'}};
  importFile(changed);await tick();assert.ok(doc.querySelector('dialog[open]'));
  doc.querySelector('[data-rule-action=cancel-edit]').click();await tick();assert.equal(calls.filter(p=>p.type==='ruleImport').length,1);
  importFile(changed);await tick();doc.querySelector('[data-rule-action=replace]').click();await tick();
  assert.equal(calls.filter(p=>p.type==='ruleImport').length,2);assert.equal(calls.filter(p=>p.type==='ruleImport').at(-1).replace,true);
 }finally{manager.dispose();dom.window.close();}
});
test('valid import waits for creator cleanup and invalid or cancelled import keeps the current view',async()=>{
 const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document,calls=[];let release;
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:s=>ruleText(s,'en'),request:async p=>{calls.push(p.type);return {rules:[],settings:{courses:[]}};},onPrepareImport:()=>new Promise(resolve=>{release=resolve;})});
 try{await manager.refresh();const file=doc.querySelector('input[type=file]');
 const choose=value=>{Object.defineProperty(file,'files',{configurable:true,value:[{name:'rule.json',size:50,text:async()=>JSON.stringify(value)}]});file.dispatchEvent(new dom.window.Event('change'));};
 choose(fixtureRule({id:'bad.demo'}));await tick();assert.equal(release,undefined);assert.ok(doc.querySelector('dialog'));doc.querySelector('[data-rule-action=close-dialog]').click();
 choose(fixtureRule());await tick();assert.equal(typeof release,'function');assert.equal(calls.includes('ruleImport'),false);release();await tick();assert.equal(calls.includes('ruleImport'),true);assert.equal(doc.querySelector('[data-library-panel=local]').hidden,false);
 }finally{manager.dispose();dom.window.close();}
});
test('failed import does not unlock builder controls and invalid stored rules have a remove action',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document,creator=doc.createElement('section'),save=doc.createElement('button'),calls=[];save.disabled=true;creator.append(save);dom.window.confirm=()=>true;
 const data={rules:[],errors:[{key:'local:old.demo',reason:'invalid-rule'},{key:'local:old.demo',reason:'invalid-rule',course:'FIT5122'}],settings:{courses:[]}};
 const manager=installRuleManager({root:doc.querySelector('#manager'),creationPanels:{actual:creator},translate:s=>ruleText(s,'en'),request:async p=>{calls.push(p);return data;}});
 try{await manager.refresh();manager.show('actual');const file=doc.querySelector('input[type=file]');Object.defineProperty(file,'files',{value:[{name:'bad.json',size:2,text:async()=>'{x'}]});file.dispatchEvent(new dom.window.Event('change'));await new Promise(r=>setTimeout(r,5));assert.equal(save.disabled,true);
 doc.querySelector('[data-rule-action=close-dialog]').click();manager.show('local');const removals=doc.querySelectorAll('[data-invalid-rule] [data-rule-action=delete]');assert.equal(removals.length,1);removals[0].click();await new Promise(r=>setTimeout(r,5));assert.equal(calls.find(p=>p.type==='ruleRemove').ruleKey,'local:old.demo');
 }finally{manager.dispose();dom.window.close();}
});
test('library pages distinguish builtins, community downloads and local copies of the same ID',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document,raw=fixtureRule();
 const data={builtins:[fixtureRule({id:'builtin.moodle',courses:[]})],rules:[{...raw,key:'local:'+raw.id,origin:'local'},{...raw,key:'community:'+raw.id,origin:'community'}],settings:{courses:[]}};
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:s=>ruleText(s,'en'),request:async()=>data,loadCatalog:async()=>[]});
 try{
  await manager.update(data);assert.equal(doc.querySelectorAll('[data-library-tab]').length,6);
  assert.ok(doc.querySelector('[data-rule-action=import]').closest('.rule-library-tabs'));
  assert.equal(doc.querySelector('[data-rule-action=replace]'),null);
  const visible=()=>[...doc.querySelectorAll('[data-library-panel]')].filter(p=>!p.hidden).map(p=>p.dataset.libraryPanel);
  assert.deepEqual(visible(),['builtin']);doc.querySelector('[data-library-tab=local]').click();assert.deepEqual(visible(),['local']);
  assert.equal(doc.querySelectorAll('[data-library-panel=local] [data-rule-id]').length,1);
  assert.equal(doc.querySelector('[data-library-panel=local] [data-rule-id]').dataset.ruleKey,'local:'+raw.id);
  doc.querySelector('[data-library-tab=community]').click();assert.deepEqual(visible(),['community']);
  assert.equal(doc.querySelector('[data-library-panel=community] [data-rule-id]').dataset.ruleKey,'community:'+raw.id);
 }finally{manager.dispose();dom.window.close();}
});
test('create and import controls stay in the sidebar after library refresh',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document,data={rules:[],settings:{courses:[]}};let created=0;
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:s=>ruleText(s,'en'),request:async()=>data,onCreate:()=>created++,loadCatalog:async()=>[]});
 try{
  for(let i=0;i<2;i++){
   await manager.refresh();
   for(const action of ['create','import']){
    const buttons=doc.querySelectorAll(`[data-rule-action=${action}]`);
    assert.equal(buttons.length,1);
    assert.ok(buttons[0].closest('.rule-library-tabs'));
   }
   doc.querySelector('[data-library-tab=local]').click();doc.querySelector('[data-rule-action=create]').click();doc.querySelector('[data-rule-action=create-actual]').click();
   assert.equal(doc.querySelector('[data-library-panel=local]').hidden,false);
   doc.querySelector('[data-library-tab=builtin]').click();
   assert.equal(doc.querySelector('[data-rule-action=create]').closest('.rule-library-tabs').hidden,false);
  }
  assert.equal(created,2);
  assert.ok(doc.querySelector('.rule-library-layout > .rule-library-tabs'));
  const create=doc.querySelector('[data-rule-action=create]');
  assert.equal(create.querySelector('.help-icon'),null);assert.ok(create.parentElement.querySelector('.help-button[aria-describedby]'));
  const community=doc.querySelector('[data-library-panel=community]');
  assert.equal(community.firstElementChild.className,'rule-course-filters');
  assert.equal(doc.querySelectorAll('a[href="https://github.com/mxymalay/mamo-checkin-rules"]').length,1);
  assert.ok(doc.querySelector('.rule-library-tabs').contains(doc.querySelector('a[href="https://github.com/mxymalay/mamo-checkin-rules"]')));
  doc.querySelector('[data-rule-action=shared-rules]').click();
  doc.querySelector('[data-library-tab=builtin]').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
  assert.equal(community.hidden,false);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.ok(community.textContent.includes(ruleText('rules.catalog-empty','en')));
 }finally{manager.dispose();dom.window.close();}
});
test('matching and preview actions distinguish same-ID origins',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document,raw=fixtureRule(),calls=[];
 const rules=['local','community'].map(origin=>({...raw,origin,key:origin+':'+raw.id}));
 const data={rules,settings:{devMode:true,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},bindings:{DEMO1000:{moodle:rules.map(r=>r.key)}}};
 tested(data);
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:s=>ruleText(s,'en'),request:async p=>{calls.push(p);return data;},onTest:p=>calls.push(p),loadCatalog:async()=>[]});
 try{await manager.update(data);doc.querySelector('[data-rule-action=choose-rules]').click();
  const choices=[...doc.querySelectorAll('dialog input[data-rule-id]')];assert.equal(choices.filter(c=>c.checked).length,2);choices[0].click();doc.querySelector('[data-rule-action=save-binding]').click();await new Promise(r=>setTimeout(r,5));
  assert.deepEqual(calls.find(p=>p.type==='ruleBind').ruleIds,[rules[1].key]);
  doc.querySelector('[data-library-panel=local] [data-rule-action=test]').click();assert.deepEqual(calls.at(-1).ruleIds,[rules[0].key]);
 }finally{manager.dispose();dom.window.close();}
});
test('manager offers tests in normal and developer modes',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),root=dom.window.document.querySelector('#manager');
 const rule=fixtureRule(),data={rules:[rule],builtins:['gmail','moodle','ed'].map(source=>fixtureRule({id:'builtin.'+source,source,courses:[]})),bindings:{DEMO1000:{moodle:rule.id}},settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'},devMode:false}};
 const manager=installRuleManager({root,translate:s=>ruleText(s,'en'),request:async()=>data,onTest:()=>{}});
 try{
  await manager.update(data);
  assert.equal(root.querySelectorAll('[data-rule-kind=builtin]').length,3);
  assert.match(root.querySelector('[data-rule-kind=builtin] .rule-name-row .rule-status-tag').textContent,/Official/);
  assert.match(root.querySelector('[data-rule-id="builtin.moodle"]').textContent,/DEMO1000/);
  assert.match(root.querySelector('[data-rule-kind=community]').textContent,/Enabled.*DEMO1000/s);
  assert.ok(root.querySelectorAll('[data-rule-action=test]').length>0);
  data.settings.devMode=true;await manager.update(data);
  assert.ok(root.querySelectorAll('[data-rule-action=test]').length>0);
  data.rules=[];await manager.refresh();
  assert.match(root.querySelector('.rule-bindings').textContent,/unavailable.*official/i);
 }finally{manager.dispose();dom.window.close();}
});
test('manager binds only compatible course rules, renders untrusted names as text, and import stays a draft',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),calls=[];
 const data={rules:[fixtureRule({name:{en:'<img src=x onerror=alert(1)>'}})],bindings:{},settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}}};
 tested(data);
 const manager=installRuleManager({root:dom.window.document.querySelector('#manager'),translate:s=>ruleText(s,'en'),request:async m=>{calls.push(m);return data;},onTest:()=>{}});
 await manager.update(data);
 assert.equal(dom.window.document.querySelectorAll('img').length,0);
 dom.window.document.querySelector('[data-rule-action=choose-rules]').click();
 const choice=dom.window.document.querySelector('dialog input[data-rule-id]');assert.equal(choice.checked,false);choice.click();
 dom.window.document.querySelector('dialog [data-rule-action=save-binding]').click();await new Promise(r=>setTimeout(r,0));
 assert.deepEqual(calls.find(m=>m.type==='ruleBind'),{type:'ruleBind',course:'DEMO1000',source:'moodle',ruleIds:[fixtureRule().id]});
 manager.dispose();dom.window.close();
});
test('details open in a modal and close back to the invoking control without inline expansion',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document,rule=fixtureRule(),data={rules:[rule],bindings:{},settings:{courses:[]}};
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:s=>ruleText(s,'en'),request:async()=>data});
 try{
  await manager.update(data);doc.querySelector('[data-library-tab=local]').click();const button=doc.querySelector('[data-rule-action=details]');assert.ok(button);button.focus();button.click();
  const dialog=doc.querySelector('dialog[open]');assert.ok(dialog);assert.match(dialog.querySelector('pre').textContent,/schemaVersion/);
  let blob,filename;dom.window.URL.createObjectURL=value=>{blob=value;return 'blob:test';};dom.window.URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=function(){filename=this.download;};
  const download=dialog.querySelector('[data-rule-action=download-json]');assert.equal(download.previousElementSibling.dataset.ruleAction,'copy-json');download.click();
  const downloaded=await new Promise(resolve=>{const reader=new dom.window.FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(blob);});assert.equal(filename,rule.id+'.json');assert.deepEqual(JSON.parse(downloaded),rule);
  assert.equal(doc.querySelectorAll('.rule-library details').length,0);
  assert.equal(doc.querySelectorAll('.rule-library pre').length,0);
  dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(doc.querySelector('dialog'),null);assert.equal(doc.activeElement,button);
 }finally{manager.dispose();dom.window.close();}
});
test('course matching saves several compatible rules and preserves another course sharing one',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document,calls=[];
 const shared=fixtureRule({courses:['DEMO1000','DEMO2000']}),extra=fixtureRule({id:'community.extra.images'}),wrong=fixtureRule({id:'community.other.images',source:'gmail'});
 const data={rules:[shared,extra,wrong],bindings:{DEMO1000:{moodle:[shared.id]},DEMO2000:{moodle:[shared.id]}},settings:{courses:['DEMO1000','DEMO2000'],sourceModes:{DEMO1000:'moodle',DEMO2000:'moodle'}}};
 tested(data);
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:s=>ruleText(s,'en'),request:async p=>{calls.push(p);if(p.type==='ruleBind')data.bindings[p.course][p.source]=p.ruleIds;return data;}});
 try{
  await manager.update(data);doc.querySelector('[data-course=DEMO1000] [data-rule-action=choose-rules]').click();
  const choices=[...doc.querySelectorAll('dialog input[data-rule-id]')];assert.equal(choices.length,2);
  assert.equal(choices.find(c=>c.dataset.ruleId===shared.id).checked,true);
  choices.find(c=>c.dataset.ruleId===extra.id).click();doc.querySelector('[data-rule-action=save-binding]').click();await new Promise(r=>setTimeout(r,5));
  assert.deepEqual(calls.find(p=>p.type==='ruleBind').ruleIds.sort(),[shared.id,extra.id].sort());
  assert.deepEqual(data.bindings.DEMO2000.moodle,[shared.id]);
  assert.deepEqual([...doc.querySelectorAll(`[data-rule-id="${shared.id}"] .rule-usage .rule-course-tag`)].map(node=>node.textContent),['DEMO1000','DEMO2000']);
 }finally{manager.dispose();dom.window.close();}
});
