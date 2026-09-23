import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installRuleTestUI} from '../extension/source-rules/test-ui.js';
import {installRuleBindings} from '../extension/source-rules/bindings-ui.js';
import {ruleText} from '../extension/source-rules/strings.js';
import {fixtureRule} from './helpers/source-rules.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
test('course and rules share step one; every image must be reviewed before approval',async()=>{
 const dom=new JSDOM('<main id="test"></main>'),doc=dom.window.document,rule={...fixtureRule(),digest:'digest'},calls=[];
 dom.window.URL.createObjectURL=()=> 'blob:preview';dom.window.URL.revokeObjectURL=()=>{};
 const ui=installRuleTestUI({root:doc.querySelector('main'),translate:s=>ruleText(s,'en'),request:async m=>{calls.push(m);if(m.type==='ruleTestStart')return {testId:'t'};if(m.type==='ruleTestStatus')return {course:'DEMO1000',source:'moodle',phase:'complete',rules:[rule],images:['1','2'].map(id=>({id,state:'downloaded',matches:[{id:rule.id}]}))};if(m.type==='ruleTestImage')return {imageBase64:'YQ==',mimeType:'image/png'};return {rules:[rule],settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}}};}});
 try{
  await ui.update({});const setup=doc.querySelector('main>section');assert.ok(setup.querySelector('[data-test-rule]'));assert.equal(setup.querySelectorAll('select').length,2);assert.equal(doc.querySelector('.rule-actions select'),null);
  doc.querySelector('[data-rule-action=start]').click();await tick();const approve=doc.querySelector('[data-rule-action=test-approve]');assert.equal(approve.disabled,true);
  doc.querySelector('.rule-image-row input[type=checkbox]').click();assert.equal(approve.disabled,true);
  const picker=doc.querySelector('[data-test-image]');picker.value='2';picker.dispatchEvent(new dom.window.Event('change'));doc.querySelector('.rule-image-row input[type=checkbox]').click();assert.equal(approve.disabled,false);
  approve.click();await tick();assert.equal(calls.filter(m=>m.type==='ruleTestApprove').length,1);assert.equal(doc.querySelectorAll('main>section')[2].hidden,false);
 }finally{await ui.dispose();dom.window.close();}
});
test('skip presents two separate confirmations, with no write on cancellation',async()=>{
 const dom=new JSDOM('<main id="test"></main>'),doc=dom.window.document,rule=fixtureRule(),calls=[];
 const ui=installRuleTestUI({root:doc.querySelector('main'),translate:s=>ruleText(s,'en'),request:async m=>{calls.push(m);return m.type==='ruleTestSkipPrepare'?{token:'challenge'}:{rules:[rule],settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}}};}});
 try{
  await ui.open({course:'DEMO1000',source:'moodle',ruleId:rule.id});doc.querySelector('[data-rule-action=test-skip]').click();assert.equal(calls.some(m=>m.type==='ruleTestSkipPrepare'),false);
  doc.querySelector('dialog [data-rule-action=cancel]').click();assert.equal(calls.some(m=>m.type==='ruleTestSkipConfirm'),false);
  doc.querySelector('[data-rule-action=test-skip]').click();doc.querySelector('dialog [data-rule-action=test-next]').click();await tick();assert.match(doc.querySelector('dialog').textContent,/Confirm again/);assert.equal(calls.some(m=>m.type==='ruleTestSkipConfirm'),false);
  doc.querySelector('dialog [data-rule-action=test-skip-final]').click();await tick();assert.deepEqual(calls.find(m=>m.type==='ruleTestSkipConfirm'),{type:'ruleTestSkipConfirm',token:'challenge',confirmed:true});
 }finally{await ui.dispose();dom.window.close();}
});
test('chooser separates tested and untested, and only explicitly skipped rules bypass the lock',()=>{
 const dom=new JSDOM('<main></main>'),doc=dom.window.document,rules=['passed','waiting','skipped'].map(id=>({...fixtureRule({id:'local.'+id}),digest:'digest'}));
 const ui=installRuleBindings({root:doc.querySelector('main'),translate:s=>ruleText(s,'en'),request:async()=>{},onSaved:async()=>{}});
 try{
  ui.update({settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},rules,tests:{'local.passed':{DEMO1000:{digest:'digest',source:'moodle'}},'local.skipped':{DEMO1000:{digest:'digest',source:'moodle',skipped:true}}}});
  doc.querySelector('[data-rule-action=choose-rules]').click();assert.equal(doc.querySelector('[data-rule-id="local.waiting"]').disabled,true);assert.equal(doc.querySelector('[data-rule-id="local.skipped"]').disabled,false);
  doc.querySelector('[data-rule-action=filter-tested]').click();assert.equal(doc.querySelector('[data-rule-id="local.passed"]').closest('.rule-choice').hidden,false);assert.equal(doc.querySelector('[data-rule-id="local.skipped"]').closest('.rule-choice').hidden,true);
  doc.querySelector('[data-rule-action=filter-untested]').click();assert.equal(doc.querySelector('[data-rule-id="local.waiting"]').closest('.rule-choice').hidden,false);
  assert.ok(doc.querySelector('.rule-choice-title .rule-choice-badge'));
  assert.equal(doc.querySelector('.rule-choice-title .rule-draft-badge'),null);
 }finally{ui.dispose();dom.window.close();}
});
