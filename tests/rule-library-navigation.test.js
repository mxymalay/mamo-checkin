import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installRuleManager} from '../extension/source-rules/manager-ui.js';
import {ruleText} from '../extension/source-rules/strings.js';
import {fixtureRule} from './helpers/source-rules.js';
const tick=()=>new Promise(r=>setTimeout(r,5));
test('history labels current tested rules as test again and stale rules as test',async()=>{
 const x=setup();try{
  x.data.rules[0].digest='current';x.data.tests={[x.data.rules[0].id]:{DEMO1000:{source:'moodle',digest:'current'}}};
  await x.manager.refresh();
  assert.equal(x.doc.querySelector('[data-rule-id="local.one"] [data-rule-action=test]').textContent,'Test again');
  x.data.tests[x.data.rules[0].id].DEMO1000.digest='old';await x.manager.refresh();
  assert.equal(x.doc.querySelector('[data-rule-id="local.one"] [data-rule-action=test]').textContent,'Test rule');
 }finally{x.manager.dispose();x.dom.window.close();}
});
test('shared rules expand into browsing and contribution pages without uploading',async()=>{
 const x=setup();try{
  await x.manager.refresh();const trigger=x.doc.querySelector('[data-rule-action=shared-rules]'),menu=x.doc.querySelector('.rule-shared-menu');
  assert.ok(trigger);assert.equal(menu.hidden,true);trigger.click();assert.equal(menu.hidden,false);
  x.doc.querySelector('[data-library-tab=share-new]').click();
  const panel=x.doc.querySelector('[data-library-panel=share-new]');assert.equal(panel.hidden,false);
  assert.equal(panel.querySelector('select,button,.rule-supported-courses'),null);
  assert.ok(panel.querySelector('a[href="https://github.com/mxymalay/mamo-checkin-rules/blob/main/CONTRIBUTING.md"]'));
  assert.ok(panel.querySelector('a[href="https://github.com/mxymalay/mamo-checkin-rules/compare"]'));
  trigger.click();assert.equal(menu.hidden,true);trigger.click();assert.equal(panel.hidden,false);
  menu.dispatchEvent(new x.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.hidden,true);assert.equal(x.doc.activeElement,trigger);
 }finally{x.manager.dispose();x.dom.window.close();}
});
test('library draft notice is restricted to browsing shared rules and import history after refresh',async()=>{
 const x=setup();try{for(const key of ['builtin','community','share-new','local','import-new']){
  x.manager.show(key);await x.manager.refresh();
  assert.equal(x.doc.querySelector('#manager .rule-draft-notices').hidden,!['community','local'].includes(key),key);
 }}finally{x.manager.dispose();x.dom.window.close();}
});
test('community examples expand last and any close icon collapses all and clears selection',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document;
 const catalog=[fixtureRule({id:'example.one',courses:['DEMO1000'],demo:true,path:'examples/DEMO1000/one.json'}),fixtureRule({id:'example.two',courses:['DEMO2000'],demo:true,path:'examples/DEMO2000/two.json'}),fixtureRule({id:'author.real',courses:['FIT5122'],path:'examples/FIT5122/real.json'})];
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:k=>ruleText(k,'en'),request:async()=>({rules:[],settings:{courses:['FIT5122']}}),loadCatalog:async()=>catalog});
 try{await manager.refresh();doc.querySelector('[data-library-tab=community]').click();await tick();const panel=doc.querySelector('[data-library-panel=community]');
 assert.equal(panel.querySelector('[data-filter-course=DEMO1000]'),null);const expand=panel.querySelector('[data-rule-action=expand-examples]');assert.ok(expand);assert.equal(expand.parentElement.lastElementChild,expand);expand.click();
 assert.ok(panel.querySelector('[data-filter-course=DEMO2000]'));panel.querySelector('[data-filter-course=DEMO1000]').click();panel.querySelector('[data-collapse-examples]').click();
 assert.equal(panel.querySelector('[data-filter-course=DEMO1000]'),null);assert.equal(panel.querySelector('[data-filter-course=""]').getAttribute('aria-pressed'),'true');assert.ok(panel.querySelector('[data-rule-action=expand-examples]'));
 }finally{manager.dispose();dom.window.close();}
});
test('empty community and local libraries use the same empty-state treatment',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document,manager=installRuleManager({root:doc.querySelector('#manager'),translate:k=>ruleText(k,'en'),request:async()=>({rules:[],settings:{courses:[]}}),loadCatalog:async()=>[]});
 try{await manager.refresh();doc.querySelector('[data-library-tab=community]').click();await tick();assert.ok(doc.querySelector('[data-library-panel=community] .rule-empty-state'));assert.ok(doc.querySelector('[data-library-panel=local] .rule-empty-state'));}finally{manager.dispose();dom.window.close();}
});
test('installed and downloadable rows omit demo and redundant origin labels in every locale',async()=>{
 for(const locale of ['en','zh_CN','zh_TW']){
  const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document;
  const installed=fixtureRule({origin:'community'}),available=fixtureRule({id:'community.available',demo:true,path:'examples/DEMO1000/available.json'});
  const data={builtins:[fixtureRule({id:'builtin.moodle',courses:[]})],rules:[installed,fixtureRule({id:'local.example',origin:'local'})],settings:{courses:[]}};
  const manager=installRuleManager({root:doc.querySelector('#manager'),translate:k=>ruleText(k,locale),request:async()=>data,loadCatalog:async()=>[{...installed,demo:true},available]});
  try{
   await manager.refresh();doc.querySelector('[data-library-tab=community]').click();await tick();
   const panel=doc.querySelector('[data-library-panel=community]');
   assert.equal(panel.querySelectorAll('.rule-library-row').length,0);assert.ok(panel.querySelector('.rule-empty-state'));
   panel.querySelector('[data-rule-action=expand-examples]').click();
   const rows=[...doc.querySelectorAll('.rule-library-row')];assert.equal(rows.length,4);
   for(const row of rows){assert.equal(row.querySelector('.rule-origin'),null);assert.ok(!row.textContent.includes(ruleText('rules.catalog-demo',locale)));}
   assert.ok(doc.querySelector('[data-rule-id="builtin.moodle"] .rule-name-row .rule-status-tag'));
   assert.ok(doc.querySelector('[data-rule-id="'+installed.id+'"] .rule-draft-badge'));
  }finally{manager.dispose();dom.window.close();}
 }
});
function setup(){
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document;let created=0;
 const rules=[fixtureRule({id:'local.one',origin:'local'}),fixtureRule({id:'local.shared',origin:'local',courses:['DEMO1000','DEMO2000']}),fixtureRule({id:'community.other',origin:'community',courses:['DEMO2000']})];
 const data={rules,settings:{devMode:true,courses:['REAL1000'],sourceModes:{REAL1000:'moodle'}}};
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:k=>ruleText(k,'en'),request:async()=>data,onCreate:()=>created++,onTest:()=>{},loadCatalog:async()=>[fixtureRule({id:'community.new',path:'examples/DEMO1000/new.json',demo:true})]});
 return {dom,doc,manager,data,created:()=>created};
}
test('sidebar expands creation modes inline and keeps import alongside library navigation',async()=>{
 const x=setup();try{
  await x.manager.refresh();x.doc.querySelector('[data-library-tab=local]').click();
  const trigger=x.doc.querySelector('[data-rule-action=create]');trigger.click();assert.equal(x.created(),0);
  const menu=x.doc.querySelector('.rule-create-menu');assert.equal(menu.hidden,false);assert.ok(menu.closest('.rule-library-tabs'));assert.equal(menu.querySelector('a'),null);
  menu.dispatchEvent(new x.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.hidden,true);assert.equal(x.doc.activeElement,trigger);
  trigger.click();x.doc.querySelector('[data-rule-action=create-actual]').click();assert.equal(x.created(),1);assert.equal(menu.hidden,false);
  x.doc.body.click();assert.equal(menu.hidden,false);
  x.doc.querySelector('[data-rule-action=create-practice]').click();assert.equal(x.created(),2);
  assert.ok(x.doc.querySelector('[data-rule-action=import]').closest('.rule-library-tabs'));
  assert.ok(x.doc.querySelector('[data-rule-action=import]').closest('[role=tablist]'));
  assert.equal(x.doc.querySelector('.rule-practice-link'),null);
 }finally{x.manager.dispose();x.dom.window.close();}
});
test('creation is a peer navigation group with a separate help control and import last',async()=>{
 const x=setup();try{await x.manager.refresh();const local=x.doc.querySelector('[data-library-tab=local]'),create=x.doc.querySelector('[data-rule-action=create]'),children=x.doc.querySelector('.rule-local-children');
 assert.equal(children,null);assert.equal(local.getAttribute('aria-expanded'),null);assert.equal(local.parentElement.className,'rule-import-menu');assert.equal(create.closest('.rule-create-action').parentElement,local.closest('.rule-import-nav').parentElement);assert.equal(local.closest('.rule-import-nav').parentElement.lastElementChild,local.closest('.rule-import-nav'));
 const menu=x.doc.querySelector('.rule-create-menu');assert.equal(menu.hidden,true);const help=x.doc.querySelector('.rule-create-heading .help-button');assert.ok(help);assert.ok(!create.contains(help));help.click();assert.equal(menu.hidden,true);
 create.click();assert.equal(menu.hidden,false);x.doc.querySelector('[data-library-tab=community]').click();assert.equal(menu.hidden,false);
 local.click();assert.equal(x.doc.querySelector('[data-library-panel=local]').hidden,false);assert.equal(menu.hidden,false);create.click();assert.equal(menu.hidden,true);
 }finally{x.manager.dispose();x.dom.window.close();}
});
test('download failures use error notification tone and clear on navigation',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document;
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:k=>ruleText(k,'en'),request:async()=>({rules:[],settings:{courses:[]}}),loadCatalog:async()=>[fixtureRule({path:'examples/DEMO1000/one.json'})],downloadRule:async()=>{throw new Error('catalog-integrity');}});
 try{await manager.refresh();doc.querySelector('[data-library-tab=community]').click();await tick();doc.querySelector('[data-rule-action=download-install]').click();await tick();const notice=doc.querySelector('.rule-notice');assert.equal(notice.dataset.tone,'error');assert.equal(notice.getAttribute('role'),'alert');assert.equal(notice.textContent,ruleText('rules.catalog-integrity','en'));doc.querySelector('[data-library-tab=local]').click();assert.equal(notice.textContent,'');assert.notEqual(notice.dataset.tone,'error');}finally{manager.dispose();dom.window.close();}
});
test('community failure and retry survive filtering; load completion preserves filter focus',async()=>{
 const dom=new JSDOM('<div id="manager"></div>'),doc=dom.window.document;let complete,fail=true;
 const data={rules:[],settings:{courses:['DEMO1000']}};
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:k=>ruleText(k,'en'),request:async()=>data,loadCatalog:()=>fail?Promise.reject(new Error('offline')):new Promise(resolve=>{complete=resolve;})});
 try{
  await manager.refresh();doc.querySelector('[data-library-tab=community]').click();await tick();
  doc.querySelector('[data-library-panel=community] [data-filter-course=DEMO1000]').click();assert.ok(doc.querySelector('[data-rule-action=catalog-retry]'));
  fail=false;doc.querySelector('[data-rule-action=catalog-retry]').click();
  const filter=doc.querySelector('[data-library-panel=community] [data-filter-course=DEMO1000]');filter.focus();complete([]);await tick();
  assert.equal(doc.activeElement.dataset.filterCourse,'DEMO1000');assert.equal(doc.querySelector('[data-rule-action=catalog-retry]'),null);
 }finally{manager.dispose();dom.window.close();}
});
test('course filters include shared rules, persist refresh and provide an empty state',async()=>{
 const x=setup();try{
  await x.manager.refresh();const panel=x.doc.querySelector('[data-library-panel=local]');
  panel.querySelector('[data-filter-course=DEMO2000]').click();assert.deepEqual([...panel.querySelectorAll('[data-rule-id]')].map(e=>e.dataset.ruleId),['local.shared']);
  await x.manager.refresh();assert.equal(panel.querySelector('[data-filter-course=DEMO2000]').getAttribute('aria-pressed'),'true');
  panel.querySelector('[data-filter-course=REAL1000]').click();assert.ok(panel.querySelector('.rule-empty-state'));
  x.doc.querySelector('[data-library-tab=community]').click();await tick();const community=x.doc.querySelector('[data-library-panel=community]');
  community.querySelector('[data-rule-action=expand-examples]').click();assert.ok(community.querySelector('[data-filter-course=DEMO1000]'));assert.ok(community.querySelector('[data-filter-course=DEMO2000]'));
  community.querySelector('[data-filter-course=DEMO1000]').click();assert.equal(community.querySelectorAll('[data-rule-id]').length,0);assert.ok(community.querySelector('[data-rule-action=download-install]'));
 }finally{x.manager.dispose();x.dom.window.close();}
});
test('repository icon is beside the community tab and all imported rules can open test or skip',async()=>{
 const x=setup();try{
  await x.manager.refresh();const link=x.doc.querySelector('a[href="https://github.com/mxymalay/mamo-checkin-rules"]');
  assert.ok(link.closest('.rule-library-tabs'));assert.ok(link.parentElement.querySelector('[data-rule-action=shared-rules]'));assert.ok(link.getAttribute('aria-label'));
  const row=x.doc.querySelector('[data-rule-id="community.other"]');assert.ok(row.querySelector('[data-rule-action=test]'));
 }finally{x.manager.dispose();x.dom.window.close();}
});
test('course matching excludes rules for a different course even when the source is identical',async()=>{
 const x=setup();try{
  x.data.settings.courses=['DEMO1000'];x.data.settings.sourceModes={DEMO1000:'moodle'};await x.manager.refresh();
  x.doc.querySelector('[data-rule-action=choose-rules]').click();
  assert.deepEqual([...x.doc.querySelectorAll('dialog input[data-rule-id]')].map(e=>e.dataset.ruleId),['local.one','local.shared']);
 }finally{x.manager.dispose();x.dom.window.close();}
});
