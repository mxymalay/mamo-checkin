import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {installRuleManager} from '../extension/source-rules/manager-ui.js';
import {ruleText} from '../extension/source-rules/strings.js';
import {fixtureRule} from './helpers/source-rules.js';

const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
function setup(t,{lang='en',official={},action}={}){
 const dom=new JSDOM(`<html lang="${lang}"><div id="manager"></div></html>`),doc=dom.window.document,calls=[],previews=[];
 const state={rules:[],builtins:[],settings:{courses:[]},official:{version:'bundled',sequence:0,lastChecked:null,lastAttempt:null,error:null,source:'bundled',canRollback:false,...official}};
 const manager=installRuleManager({root:doc.querySelector('#manager'),translate:key=>ruleText(key,lang),loadCatalog:async()=>[],onTest:p=>previews.push(p),request:async p=>{calls.push(p.type);if(p.type==='ruleList')return state;return action?action(p,state):{ok:true,official:state.official};}});
 t.after(()=>{manager.dispose();dom.window.close();});
 return {doc,dom,state,manager,calls,previews,button:key=>doc.querySelector(`[data-rule-action=${key}]`)};
}
test('official status and controls appear only in the builtin panel, localized in all languages',async t=>{
 for(const [lang,label] of [['en','Official rules'],['zh-CN','官方规则'],['zh-TW','官方規則']]){
  const h=setup(t,{lang});await h.manager.refresh();
  assert.equal(h.doc.querySelector('[data-library-tab=builtin]').textContent,label);
  const row=h.doc.querySelector('.rule-official-status');assert.ok(row);assert.equal(row.closest('[data-library-panel]').dataset.libraryPanel,'builtin');
  assert.ok(row.querySelector('.rule-official-heading strong'));assert.ok(row.querySelector('.rule-official-heading .rule-official-source'));assert.ok(row.querySelector('.rule-official-checked'));
  assert.ok(row.textContent.includes(ruleText('rules.official-bundled-version',lang)));assert.ok(row.textContent.includes(ruleText('rules.official-never-checked',lang)));
  assert.equal(row.querySelector('.rule-official-source').textContent,ruleText('rules.official-source-bundled',lang));
  assert.equal(h.button('official-check').disabled,false);assert.equal(h.button('official-rollback').disabled,true);
  h.manager.show('local');assert.equal(row.closest('[data-library-panel]').hidden,true);
 }
});
test('checking locks controls, refreshes the library and enables available rollback',async t=>{
 let release;const h=setup(t,{action:async(p,state)=>{await new Promise(resolve=>release=resolve);state.official={...state.official,version:'1.2.3',lastChecked:1700000000000,canRollback:true,source:'remote'};return {ok:true,official:state.official};}});
 await h.manager.refresh();h.button('official-check').click();h.button('official-check').click();
 assert.equal(h.button('official-check').disabled,true);assert.equal(h.calls.filter(c=>c==='officialRulesCheck').length,1);
 release();await tick();assert.deepEqual(h.calls,['ruleList','officialRulesCheck','ruleList']);
 assert.match(h.doc.querySelector('.rule-official-status').textContent,/1\.2\.3/);assert.equal(h.doc.querySelector('time').dateTime,new Date(1700000000000).toISOString());
  assert.equal(h.button('official-rollback').disabled,false);
 assert.equal(h.doc.querySelector('.rule-official-source').textContent,ruleText('rules.official-source-remote','en'));
});
test('rollback requires confirmation and refreshes after approval',async t=>{
 const h=setup(t,{official:{canRollback:true}});await h.manager.refresh();let prompt='';
 h.dom.window.confirm=text=>{prompt=text;return false;};h.button('official-rollback').click();await tick();assert.deepEqual(h.calls,['ruleList']);assert.equal(prompt,ruleText('rules.official-rollback-confirm','en'));
 h.dom.window.confirm=()=>true;h.button('official-rollback').click();await tick();assert.deepEqual(h.calls,['ruleList','officialRulesRollback','ruleList']);
});
test('persisted and returned update errors use red notices and never HTML',async t=>{
 const error='<img src=x onerror=alert(1)>';
 const h=setup(t,{official:{error},action:async(p,state)=>({ok:true,official:state.official})});await h.manager.refresh();
 const notice=()=>h.doc.querySelector('[data-library-panel=builtin] .rule-notice');assert.equal(notice().dataset.tone,'error');assert.equal(notice().getAttribute('role'),'alert');assert.ok(notice().textContent.includes(ruleText('rules.official-error','en')));assert.ok(notice().textContent.includes(ruleText('rules.official-retained','en')));assert.equal(notice().textContent.includes(error),false);assert.equal(notice().querySelector('img'),null);
 h.button('official-check').click();await tick();assert.equal(notice().dataset.tone,'error');assert.notEqual(h.doc.querySelector('.rule-feedback').textContent,'Rule library updated');
});
test('request failures show an error and unlock check without enabling unavailable rollback',async t=>{
 const h=setup(t,{action:async()=>{throw new Error('offline');}});await h.manager.refresh();h.button('official-check').click();await tick();
 assert.equal(h.doc.querySelector('.rule-feedback').dataset.tone,'error');assert.equal(h.button('official-check').disabled,false);assert.equal(h.button('official-rollback').disabled,true);
});
test('course-specific official rules show and test only compatible assigned courses',async t=>{
 const h=setup(t);h.state.settings={courses:['DEMO1000','DEMO2000','DEMO3000'],sourceModes:{DEMO1000:'moodle',DEMO2000:'moodle',DEMO3000:'email'}};
 h.state.builtins=[fixtureRule({id:'builtin.moodle',courses:[]}),fixtureRule({id:'builtin.special',courses:['DEMO2000','DEMO3000']}),fixtureRule({id:'builtin.unused',courses:['DEMO4000']})];await h.manager.refresh();
 const row=id=>h.doc.querySelector(`[data-rule-id="${id}"]`),courses=id=>[...row(id).querySelectorAll('.rule-course-tag')].map(n=>n.textContent);
 assert.deepEqual(courses('builtin.moodle'),['DEMO1000']);assert.deepEqual(courses('builtin.special'),['DEMO2000']);assert.deepEqual(courses('builtin.unused'),[]);
 row('builtin.special').querySelector('[data-rule-action=test]').click();assert.equal(h.previews[0].course,'DEMO2000');assert.equal(row('builtin.unused').querySelector('[data-rule-action=test]'),null);
});
test('generic official usage excludes only same-source official overrides and returns after removal',async t=>{
 const h=setup(t);h.state.settings={courses:['DEMO1000','DEMO2000'],sourceModes:{DEMO1000:'moodle',DEMO2000:'moodle'}};
 const generic=fixtureRule({id:'builtin.moodle',courses:[]}),override=fixtureRule({id:'builtin.special',courses:['DEMO1000']});
 h.state.rules=[fixtureRule({courses:['DEMO2000']})];
 h.state.builtins=[generic,override,fixtureRule({id:'builtin.gmail.special',source:'gmail',courses:['DEMO2000']})];
 const row=()=>h.doc.querySelector('[data-rule-id="builtin.moodle"]'),courses=()=>[...row().querySelectorAll('.rule-course-tag')].map(n=>n.textContent);
 await h.manager.refresh();assert.deepEqual(courses(),['DEMO2000']);
 row().querySelector('[data-rule-action=test]').click();assert.equal(h.previews.at(-1).course,'DEMO2000');
 override.courses.push('DEMO2000');await h.manager.refresh();assert.deepEqual(courses(),[]);
 assert.equal(row().querySelector('[data-rule-action=test]'),null);assert.ok(row().textContent.includes(ruleText('rules.not-in-use','en')));
 h.state.builtins=[generic];await h.manager.refresh();assert.deepEqual(courses(),['DEMO1000','DEMO2000']);
});
test('bundled JSON display names are official and OCR labels remain built-in',async()=>{
 for(const source of ['gmail','moodle','ed']){const rule=JSON.parse(await readFile(new URL(`../extension/source-rules/builtin/${source}.json`,import.meta.url),'utf8'));assert.match(rule.name.en,/^Official /);assert.match(rule.name.zh_CN,/^官方 /);assert.match(rule.name.zh_TW,/^官方 /);assert.equal(rule.id,'builtin.'+source);}
 assert.equal(ruleText('rules.browser-engine','en'),'Built-in browser OCR');
});
test('official error codes have actionable translations with retained-version fallback',async t=>{
 const codes=['official-download','official-signature','official-invalid','official-incompatible','official-size','official-replay','official-cache-invalid','official-timeout','official-storage','official-no-previous','official-resetting'];
 for(const lang of ['en','zh-CN','zh-TW']){
  const h=setup(t,{lang});
  for(const code of codes){
   const message=ruleText('rules.'+code,lang);assert.ok(message,`${lang}: ${code}`);assert.notEqual(message,code);
   if(lang!=='en')assert.notEqual(message,ruleText('rules.'+code,'en'));
   h.state.official.error=code;await h.manager.refresh();
   const notice=h.doc.querySelector('[data-library-panel=builtin] .rule-notice');
   assert.equal(notice.textContent,message+' '+ruleText('rules.official-retained',lang));assert.equal(notice.dataset.tone,'error');assert.equal(notice.getAttribute('role'),'alert');
  }
 }
});
test('thrown official error codes and unknown failures use the same localized messages',async t=>{
 for(const lang of ['en','zh-CN','zh-TW']){
  let failure;const h=setup(t,{lang,action:async()=>{throw failure;}});await h.manager.refresh();
  for(const [error,key] of [[Object.assign(new Error('internal detail'),{code:'official-storage'}),'official-storage'],[new Error('official-timeout'),'official-timeout'],['official-download','official-download'],[new Error('private unexpected details'),'official-error']]){
   failure=error;h.button('official-check').click();await tick();
   const notice=h.doc.querySelector('.rule-feedback');assert.equal(notice.textContent,ruleText('rules.'+key,lang)+' '+ruleText('rules.official-retained',lang));assert.equal(notice.dataset.tone,'error');
  }
 }
});
