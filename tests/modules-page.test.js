import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {ruleText} from '../extension/source-rules/strings.js';
import {fixtureRule} from './helpers/source-rules.js';

async function setup({windows=false,healthResponse,settings={},practiceSaved={rules:[],bindings:{}}}={}){
 const html=await readFile(new URL('../extension/modules.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://extension.test/modules.html'}),calls=[],listeners=[],rules=[];
 const state={settings:{devMode:false,courses:[],...settings},status:{},ocrPreference:''};
 const chrome={storage:{onChanged:{addListener(fn){listeners.push(fn);},removeListener(fn){listeners.splice(listeners.indexOf(fn),1);}}}};
 const proofs=()=>Object.fromEntries(practiceSaved.rules.map(rule=>{rule.digest='fixture-digest';return [rule.key||rule.id,Object.fromEntries(rule.courses.map(course=>[course,{digest:rule.digest,source:rule.source}]))];}));
 const request=async payload=>{calls.push(payload);if(payload.type==='practiceSummary')return {saved:practiceSaved,matching:{tests:proofs(),rules:[...practiceSaved.rules,...rules],bindings:practiceSaved.bindings},settings:{courses:['DEMO1000','DEMO2000'],sourceModes:{DEMO1000:'all',DEMO2000:'all'}}};if(payload.type==='practiceReset'){practiceSaved={rules:[],bindings:{}};return {ok:true};}if(payload.type==='settings'){Object.assign(state.settings,payload.settings);return {ok:true};}if(['ruleList','ruleTestList'].includes(payload.type))return {rules,builtins:[],settings:state.settings};if(payload.type==='ruleTestStart')return {testId:'test'};if(payload.type==='ruleTestStatus')return {phase:'complete',images:[],counts:{}};if(payload.type==='resetOcrPreference')state.ocrPreference='';if(payload.type==='health')return healthResponse||{binaryReady:true,fallback:windows};return state;};
 const {installModulesPage}=await import('../extension/modules-page.js');
 const ui=installModulesPage({doc:dom.window.document,request,translate:s=>ruleText(s,'en')||s,chrome,isWindows:windows});
 await ui.ready;
 return {dom,calls,listeners,state,ui,rules};
}
test('switching creation modes never expands the import menu',async()=>{
 const h=await setup(),doc=h.dom.window.document;
 try{
  for(const mode of ['practice','actual','practice','actual']){
   h.ui.show('create/'+mode);await new Promise(r=>setTimeout(r,5));
   assert.equal(doc.querySelector('.rule-import-menu').hidden,true);
   assert.equal(doc.querySelector('[data-rule-action=import]').getAttribute('aria-expanded'),'false');
   assert.equal(doc.querySelector('.rule-create-menu').hidden,false);
  }
 }finally{await h.ui.dispose();h.dom.window.close();}
});
test('sample matching precedes real courses, persists across tabs, and deleting it resets practice',async()=>{
 const rule=fixtureRule({id:'alice.practice',courses:['DEMO1000'],source:'moodle'});
 const h=await setup({settings:{courses:['FIT5122'],sourceModes:{FIT5122:'moodle'}},practiceSaved:{rules:[rule],bindings:{}}}),doc=h.dom.window.document;
 try{
  h.ui.show('matching');assert.equal(doc.querySelector('.practice-matching').hidden,false);
  assert.equal(doc.querySelector('.practice-real-heading').hidden,false);
  assert.equal(doc.querySelector('#rule-bindings tr[data-course]').dataset.course,'DEMO1000');
  assert.ok(doc.querySelector('#rule-bindings tr[data-course="FIT5122"]'));
  assert.equal(doc.querySelector('#rule-bindings').firstElementChild.className,'rule-matching-notices');
  assert.ok(doc.querySelector('.practice-matching tr[data-course="DEMO2000"]'));
  const choose=doc.querySelector('.practice-matching [data-course="DEMO1000"] [data-source="moodle"] [data-rule-action="choose-rules"]');assert.ok(choose);choose.click();
  assert.equal(doc.querySelectorAll('dialog input[type=checkbox]').length,1);assert.equal(doc.querySelector('dialog input[type=checkbox]').checked,false);
  const check=doc.querySelector('dialog input[type=checkbox]');check.checked=true;check.dispatchEvent(new h.dom.window.Event('change'));
  doc.querySelector('[data-rule-action=save-binding]').click();await new Promise(r=>setTimeout(r,10));assert.ok(h.calls.some(m=>m.type==='practiceBind'&&m.course==='DEMO1000'&&m.ruleIds.includes(rule.id)));
  h.ui.show('create/practice');await new Promise(r=>setTimeout(r,10));assert.equal(doc.querySelector('#rule-practice').dataset.practiceStep,'6');
  h.ui.show('matching');await new Promise(r=>setTimeout(r,10));doc.querySelector('[data-practice-action="remove-sample"]').click();await new Promise(r=>setTimeout(r,20));
  assert.equal(doc.querySelector('.practice-matching').hidden,true);assert.equal(doc.querySelector('.practice-real-heading').hidden,true);
  h.ui.show('create/practice');await new Promise(r=>setTimeout(r,10));assert.equal(doc.querySelector('#rule-practice').dataset.practiceStep,'1');
  assert.equal(h.calls.some(m=>['ruleBind','settings'].includes(m.type)),false);
 }finally{await h.ui.dispose();h.dom.window.close();}
});
test('an unhealthy Mac companion is not presented as a working Apple Vision engine',async()=>{
 const {dom,ui}=await setup({healthResponse:{binaryReady:false,nativeBlocked:true}}),doc=dom.window.document;
 try{assert.match(doc.querySelector('#health').textContent,/Could not check/);assert.equal(doc.querySelector('#prefer-companion').hidden,false);assert.doesNotMatch(doc.querySelector('#engine-desc').textContent,/Uses the installed/);}
 finally{await ui.dispose();dom.window.close();}
});
test('import changes refresh sample choices and keep courses and sources separate',async()=>{
 const h=await setup({practiceSaved:{rules:[fixtureRule({id:'alice.practice'})],bindings:{}}}),doc=h.dom.window.document;
 try{
  h.rules.push(fixtureRule({id:'alice.ed',source:'ed',courses:['DEMO1000']}),fixtureRule({id:'shared.gmail',origin:'community',source:'gmail',courses:['DEMO1000','DEMO2000']}));
  for(const listener of h.listeners)listener({sourceRuleLibrary:{newValue:{}}},'local');await new Promise(r=>setTimeout(r,20));
  for(const [course,source,ids] of [['DEMO1000','ed',['alice.ed']],['DEMO2000','ed',[]],['DEMO2000','gmail',['shared.gmail']],['DEMO1000','moodle',['alice.practice']]]){
   doc.querySelector(`.practice-matching [data-course="${course}"] [data-source="${source}"] button`).click();
   assert.deepEqual([...doc.querySelectorAll('dialog input[type=checkbox]')].map(n=>n.dataset.ruleId),ids);
   doc.querySelector('[data-rule-action=cancel-binding]').click();
  }
 }finally{await h.ui.dispose();h.dom.window.close();}
});
test('untested draft notification opens and expands import history',async()=>{
 const {dom,ui,rules,listeners}=await setup({settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}}}),doc=dom.window.document;
 try{
  rules.push(fixtureRule());listeners[0]({sourceRuleLibrary:{newValue:{}}},'local');await new Promise(r=>setTimeout(r,5));
  doc.querySelector('#module-tab-library').click();const link=doc.querySelector('#rule-manager .rule-draft-notice a');link.focus();link.click();
  assert.equal(doc.querySelector('#module-test').hidden,true);assert.equal(doc.querySelector('#rule-manager').hidden,false);
  assert.equal(doc.querySelector('[data-library-panel=local]').hidden,false);assert.equal(doc.querySelector('.rule-import-menu').hidden,false);
  assert.equal(doc.querySelector('#module-recognition>h2,#rule-manager>h2,#rule-bindings>h2'),null);
 }finally{await ui.dispose();dom.window.close();}
});
test('matching untested notice opens import history without binding any course',async()=>{
 const h=await setup({settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}}}),doc=h.dom.window.document;
 try{
  h.rules.push(fixtureRule({id:'alice.new',origin:'local'}));
  h.listeners[0]({sourceRuleLibrary:{newValue:{}}},'local');await new Promise(r=>setTimeout(r,10));
  h.ui.show('matching');
  const notice=doc.querySelector('.rule-matching-notices .rule-draft-notices:not([hidden]) [data-draft-state=untested]');
  assert.equal(notice.hidden,false);notice.querySelector('a').click();
  assert.equal(doc.querySelector('#rule-manager').hidden,false);assert.equal(doc.querySelector('[data-library-panel=local]').hidden,false);assert.equal(doc.querySelector('.rule-import-menu').hidden,false);
  assert.equal(h.calls.some(m=>m.type==='ruleBind'),false);
 }finally{await h.ui.dispose();h.dom.window.close();}
});
test('library changes immediately refresh the developer test selector without clearing the preview',async()=>{
 const {dom,ui,rules,listeners}=await setup({settings:{devMode:true,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}}}),doc=dom.window.document;
 try{
  doc.querySelector('#rule-test [data-rule-action=start]').click();await new Promise(r=>setTimeout(r,5));
  const output=doc.querySelector('.rule-results').textContent;
  rules.push(fixtureRule());listeners[0]({sourceRuleLibrary:{newValue:{}}},'local');await new Promise(r=>setTimeout(r,5));
  assert.equal(doc.querySelectorAll('#rule-test [data-test-rule]').length,1);
  rules.length=0;listeners[0]({sourceRuleLibrary:{newValue:{}}},'local');await new Promise(r=>setTimeout(r,5));
  assert.equal(doc.querySelectorAll('#rule-test [data-test-rule]').length,0);
  assert.equal(doc.querySelector('.rule-results').textContent,output);
 }finally{await ui.dispose();dom.window.close();}
});
test('separate page owns recognition and modules, rechecks health, and reacts to developer settings',async()=>{
 const {dom,calls,listeners,state,ui}=await setup(),doc=dom.window.document;
 try{
  assert.equal(doc.querySelector('#back-settings').getAttribute('href'),'options.html');
  assert.equal(doc.querySelector('#health').textContent,'Apple Vision');
  assert.ok(doc.querySelector('#rule-manager'));assert.equal(doc.querySelector('#rule-test').hidden,false);
  const checks=calls.filter(c=>c.type==='health').length;
  doc.querySelector('#check-health').click();await new Promise(r=>setTimeout(r,10));
  assert.equal(calls.filter(c=>c.type==='health').length,checks+1);
  state.settings.devMode=true;listeners[0]({settings:{newValue:state.settings}},'local');await new Promise(r=>setTimeout(r,10));
  assert.equal(doc.querySelector('#rule-test').hidden,false);
  assert.equal(doc.querySelector('#open-advanced').textContent,'Switch to normal mode');
  doc.querySelector('#open-advanced').click();await new Promise(r=>setTimeout(r,10));
  assert.equal(doc.querySelector('#rule-test').hidden,false);
  assert.equal(state.settings.devMode,false);
  assert.equal(state.settings.recognitionOnly,false);
 }finally{await ui.dispose();dom.window.close();}
});
test('module pages retain the active test page across mode changes',async()=>{
 const {dom,ui,state,listeners}=await setup(),doc=dom.window.document;
 try{
  const visible=()=>[...doc.querySelectorAll('[data-module-panel]')].filter(p=>!p.hidden).map(p=>p.dataset.modulePanel);
  assert.deepEqual(visible(),['recognition']);
  assert.equal(doc.querySelector('#module-tab-test').hidden,false);
  doc.querySelector('#module-tab-library').click();assert.deepEqual(visible(),['library']);
  doc.querySelector('#module-tab-matching').click();assert.deepEqual(visible(),['matching']);
  state.settings.devMode=true;listeners[0]({settings:{newValue:state.settings}},'local');await new Promise(r=>setTimeout(r,5));
  assert.equal(doc.querySelector('#module-tab-test').hidden,false);
  doc.querySelector('#module-tab-test').click();assert.deepEqual(visible(),['test']);
  state.settings.devMode=false;listeners[0]({settings:{newValue:state.settings}},'local');await new Promise(r=>setTimeout(r,5));
  assert.deepEqual(visible(),['test']);assert.equal(doc.querySelector('#module-tab-test').hidden,false);
  doc.querySelector('#module-tab-library').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.deepEqual(visible(),['test']);
 }finally{await ui.dispose();dom.window.close();}
});
test('Windows recognition never offers the Mac companion',async()=>{
 const {dom,ui}=await setup({windows:true});
 try{const doc=dom.window.document;assert.equal(doc.querySelector('#prefer-companion').hidden,true);assert.equal(doc.querySelector('#health').textContent,'Built-in browser OCR');assert.equal(doc.querySelector('#module-tab-recognition').hidden,true);assert.equal(doc.querySelector('#rule-manager').hidden,false);ui.show('recognition');assert.equal(doc.querySelector('#module-recognition').hidden,true);}
 finally{await ui.dispose();dom.window.close();}
});
test('creation modes stay inside the library with persistent sidebar and cancel when leaving',async()=>{
 const {dom,ui,calls}=await setup(),doc=dom.window.document;
 try{ui.show('create/actual');await new Promise(r=>setTimeout(r,5));
 assert.equal(doc.querySelector('#rule-manager').hidden,false);assert.equal(doc.querySelector('#rule-builder').hidden,false);assert.ok(doc.querySelector('#rule-builder').closest('.rule-library-content'));
 assert.equal(doc.querySelector('#module-tab-library').getAttribute('aria-selected'),'true');
 doc.querySelector('[data-rule-action=create-practice]').click();await new Promise(r=>setTimeout(r,5));
 assert.equal(doc.querySelector('#rule-builder').hidden,true);assert.equal(doc.querySelector('#rule-practice').hidden,false);assert.equal(dom.window.location.hash,'#create/practice');
 assert.equal(calls.some(c=>c.type==='practiceOpen'),false);
 doc.querySelector('[data-library-tab=builtin]').click();await new Promise(r=>setTimeout(r,5));assert.equal(doc.querySelector('#rule-practice').hidden,true);assert.equal(doc.querySelector('[data-library-panel=builtin]').hidden,false);assert.ok(calls.some(c=>c.type==='practiceCancel'));
 }finally{await ui.dispose();dom.window.close();}
});
test('recognition check is blue until an explicit successful check and white afterward',async()=>{
 const {dom,ui}=await setup(),button=dom.window.document.querySelector('#check-health');
 try{assert.equal(button.classList.contains('primary'),true);button.click();await new Promise(r=>setTimeout(r,5));assert.equal(button.classList.contains('primary'),false);assert.equal(button.classList.contains('subtle'),true);}
 finally{await ui.dispose();dom.window.close();}
});
test('an unsuccessful explicit recognition check remains blue',async()=>{
 const {dom,ui}=await setup({healthResponse:{binaryReady:false}}),button=dom.window.document.querySelector('#check-health');
 try{button.click();await new Promise(r=>setTimeout(r,5));assert.equal(button.classList.contains('primary'),true);}
 finally{await ui.dispose();dom.window.close();}
});
test('opening a rule test moves focus out of the hidden library panel',async()=>{
 const {dom,ui,rules,listeners}=await setup({settings:{devMode:true,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}}}),doc=dom.window.document;
 try{
  rules.push(fixtureRule());listeners[0]({sourceRuleLibrary:{newValue:{}}},'local');await new Promise(r=>setTimeout(r,5));doc.querySelector('#module-tab-library').click();
  const button=doc.querySelector('#rule-manager [data-rule-action=test]');button.focus();button.click();
  await new Promise(r=>setTimeout(r,5));
  assert.equal(doc.querySelector('#rule-manager').hidden,true);
  assert.equal(doc.activeElement,doc.querySelector('#module-tab-test'));
 }finally{await ui.dispose();dom.window.close();}
});
