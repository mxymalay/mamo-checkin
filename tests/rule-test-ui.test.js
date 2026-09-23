import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installRuleTestUI} from '../extension/source-rules/test-ui.js';
import {ruleText,RULE_STRINGS} from '../extension/source-rules/strings.js';
import {createRuleTestDemos} from '../extension/source-rules/demo.js';
import {fixtureRule} from './helpers/source-rules.js';
test('tested selection reminder follows current course, digest and selection',async()=>{
 const dom=new JSDOM('<main id="test"></main>'),doc=dom.window.document,rule={...fixtureRule(),digest:'current'};
 const data={rules:[rule],settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},tests:{[rule.id]:{DEMO1000:{digest:'current',source:'moodle'}}}};
 const ui=installRuleTestUI({root:doc.querySelector('main'),translate:k=>ruleText(k,'zh_CN'),request:async()=>data});
 try{
  await ui.open({course:'DEMO1000',source:'moodle',ruleIds:[rule.id],mode:'community'});
  const notice=doc.querySelector('.rule-tested-reminder');assert.ok(notice);assert.equal(notice.hidden,false);assert.match(notice.textContent,/已.*测试/);
  doc.querySelector('[data-test-rule]').click();assert.equal(notice.hidden,true);
  doc.querySelector('[data-test-rule]').click();assert.equal(notice.hidden,false);
  data.tests[rule.id].DEMO1000.digest='old';await ui.reload();assert.equal(notice.hidden,true);
  data.tests[rule.id].DEMO1000.digest='current';data.tests[rule.id].DEMO1000.skipped=true;await ui.reload();assert.equal(notice.hidden,true);
 }finally{await ui.dispose();dom.window.close();}
});
for(const phase of ['source','locating','recognizing','complete','partial','error','cancelled'])test(`empty image message is final-only: ${phase}`,async()=>{
 const dom=new JSDOM('<main id="test"></main>'),doc=dom.window.document,calls=[];
 const ui=installRuleTestUI({root:doc.querySelector('main'),translate:s=>ruleText(s,'en'),request:async m=>{calls.push(m);if(m.type==='ruleTestStart')return {testId:'t'};if(m.type==='ruleTestStatus')return {phase,images:[]};return {settings:{courses:['FIT5122'],sourceModes:{FIT5122:'moodle'}},rules:[]};}});
 try{
  await ui.update({});doc.querySelector('[data-rule-action=start]').click();await new Promise(r=>setTimeout(r,5));
  assert.equal(doc.querySelector('.rule-results').textContent.includes(ruleText('rules.no-images','en')),phase==='complete');
  const sent=calls.find(m=>m.type==='ruleTestStart');assert.match(sent.dateRange.from,/^\d{4}-\d{2}-\d{2}$/);
  assert.equal(doc.querySelector('[data-rule-action=test-back]'),null);
 }finally{await ui.dispose();dom.window.close();}
});
test('rules can reload in normal mode without hiding the panel',async()=>{
 const dom=new JSDOM('<div id="test"></div>'),data={settings:{devMode:true,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},rules:[]};
 const ui=installRuleTestUI({root:dom.window.document.querySelector('#test'),translate:s=>ruleText(s,'en'),request:async()=>data});
 try{
  await ui.update(data);await ui.update({settings:{...data.settings,devMode:false}});
  data.rules=[fixtureRule()];await ui.reload();assert.equal(dom.window.document.querySelector('#test').hidden,false);
  assert.equal(dom.window.document.querySelectorAll('[data-test-rule]').length,1);
 }finally{await ui.dispose();dom.window.close();}
});
test('opening a built-in module clears the previous community selection and tests built-ins only',async()=>{
 const dom=new JSDOM('<div id="test"></div>'),rule=fixtureRule();
 const data={settings:{devMode:true,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},rules:[rule]};
 const ui=installRuleTestUI({root:dom.window.document.querySelector('#test'),translate:s=>ruleText(s,'en'),request:async()=>data});
 try{
  await ui.update(data);await ui.open({course:'DEMO1000',source:'moodle',ruleId:rule.id,mode:'combined'});
  await ui.open({course:'DEMO1000',source:'moodle',ruleId:null,mode:'builtin'});
  assert.equal(dom.window.document.querySelector('input[name="test-scope"]:checked').value,'builtin');
  assert.equal(dom.window.document.querySelectorAll('[data-test-rule]:checked').length,0);
 }finally{await ui.dispose();dom.window.close();}
});
test('test controls use all saved rules, allow multi-selection, and send the exact preview combination',async()=>{
 const dom=new JSDOM('<div id="test"></div>'),calls=[],rules=[fixtureRule(),fixtureRule({id:'community.extra.images'})];
 const data={settings:{devMode:true,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},rules,bindings:{DEMO1000:{moodle:rules.map(r=>r.id)}}};
 const ui=installRuleTestUI({root:dom.window.document.querySelector('#test'),translate:s=>ruleText(s,'en'),request:async m=>{calls.push(m);return m.type==='ruleTestStart'?{testId:'t'}:m.type==='ruleTestStatus'?{phase:'complete',images:[],counts:{}}:data;}});
 try{
  await ui.update(data);
  assert.equal(dom.window.document.querySelectorAll('[data-test-rule]:checked').length,2);
  dom.window.document.querySelector('[data-rule-action=start]').click();await new Promise(r=>setTimeout(r,5));
  assert.deepEqual(calls.find(m=>m.type==='ruleTestStart').ruleIds.sort(),rules.map(r=>r.id).sort());
  await ui.open({course:'DEMO1000',source:'moodle',ruleIds:[rules[1].id],mode:'community'});
  assert.deepEqual([...dom.window.document.querySelectorAll('[data-test-rule]:checked')].map(input=>input.value),[rules[1].id]);
 }finally{await ui.dispose();dom.window.close();}
});
test('turning developer mode off preserves an in-flight test',async()=>{
 const dom=new JSDOM('<div id="test"></div>'),calls=[];let finish;
 const data={settings:{devMode:true,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},rules:[]};
 const ui=installRuleTestUI({root:dom.window.document.querySelector('#test'),translate:s=>ruleText(s,'en'),request:async m=>{calls.push(m);if(m.type==='ruleTestStart')return new Promise(resolve=>{finish=resolve;});return data;}});
 try{
  await ui.update(data);dom.window.document.querySelector('[data-rule-action=start]').click();
  await ui.update({settings:{...data.settings,devMode:false}});finish({testId:'late'});await new Promise(r=>setTimeout(r,5));
  assert.equal(calls.some(m=>m.type==='ruleTestClear'),false);
  assert.equal(calls.some(m=>m.type==='ruleTestStatus'),true);
 }finally{await ui.dispose();dom.window.close();}
});
test('cancelling a pending start clears the late session and never resumes polling',async()=>{
 const dom=new JSDOM('<div id="test"></div>'),calls=[];let finish;
 const data={settings:{devMode:true,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},rules:[]};
 const ui=installRuleTestUI({root:dom.window.document.querySelector('#test'),translate:s=>ruleText(s,'en'),request:async m=>{calls.push(m);if(m.type==='ruleTestStart')return new Promise(resolve=>{finish=resolve;});return data;}});
 await ui.update(data);dom.window.document.querySelector('[data-rule-action="start"]').click();
 await ui.cancel();finish({testId:'late'});await new Promise(resolve=>setTimeout(resolve,5));
 assert.ok(calls.some(m=>m.type==='ruleTestClear'));
 assert.ok(calls.some(m=>m.type==='ruleTestClear'&&m.testId==='late'));
 assert.equal(calls.some(m=>m.type==='ruleTestStatus'),false);
 await ui.dispose();dom.window.close();
});
test('preview toggles never scan, and explicit test uses the chosen source in isolation',async()=>{
 const dom=new JSDOM('<div id="test"></div>'),calls=[];
 const data={settings:{devMode:true,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},rules:[],bindings:{}};
 const ui=installRuleTestUI({root:dom.window.document.querySelector('#test'),translate:s=>ruleText(s,'en'),request:async m=>{calls.push(m);return m.type==='ruleTestStart'?{testId:'t'}:m.type==='ruleTestStatus'?{testId:'t',phase:'complete',images:[],trace:[],counts:{}}:data;}});
 await ui.update(data);
 dom.window.document.querySelector('[data-rule-test="show-images"]').click();assert.equal(calls.some(m=>m.type==='ruleTestStart'),false);
 dom.window.document.querySelector('[data-rule-action="start"]').click();await new Promise(r=>setTimeout(r,5));
 const start=calls.find(m=>m.type==='ruleTestStart');assert.equal(start.source,'moodle');assert.equal(start.stage,'locate');
 await ui.dispose();dom.window.close();
});
test('all rule controls and demo states have English, simplified and traditional labels',()=>{
 for(const [key,values] of Object.entries(RULE_STRINGS))for(const locale of ['en','zh_CN','zh_TW'])assert.ok(values[locale],`${key}:${locale}`);
 const demos=createRuleTestDemos();assert.equal(demos.length,8);assert.equal(new Set(demos.map(d=>d.id)).size,8);
 assert.ok(demos.some(d=>d.images.some(i=>i.state==='ocr-empty')));
});
