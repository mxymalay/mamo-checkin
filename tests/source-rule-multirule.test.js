import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {builtins} from './helpers/install-source-runtime.js';
import {fixtureRule,memoryStorage} from './helpers/source-rules.js';
import {createRuleLibrary} from '../extension/source-rules/library.js';
import {createRuleTestRunner} from '../extension/source-rules/test-runner.js';
import {moodleAdapter} from '../extension/moodle.js';
import {exportRuleTestReport} from '../extension/source-rules/trace.js';

for(const sameId of [false,true])test(`saved multi-rule snapshot reaches OCR once per shared URL with every matching rule retained (same ID: ${sameId})`,async()=>{
 const settings={courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'},name:'Example Student',academicYear:2026};
 const storage=memoryStorage(),library=createRuleLibrary({storage,builtins});
 for(const id of ['community.a','community.b'])await library.importRule(JSON.stringify(fixtureRule({id})));
 if(sameId)await library.importRule(JSON.stringify(fixtureRule({id:'community.a'})),{origin:'community'});
 const ruleIds=sameId?['local:community.a','community:community.a']:['community.b','community.a'];
 await library.bind({course:'DEMO1000',source:'moodle',ruleIds,settings});
 const snapshot=await library.snapshot(settings);
 const doc=new JSDOM('<div class="usermenu"><img alt="Example Student"></div><h1>DEMO1000 2026</h1><main>Attendance<div class="attendance"><img src="/shared.png"><img src="/shared.png"></div><img src="/builtin.png"></main>',{url:'https://learning.monash.edu/course/view.php?id=1'}).window.document;
 let downloads=0,ocrCalls=0;
 const runner=createRuleTestRunner({
  createCollectors:io=>({collectMoodle:async request=>{
   const result=moodleAdapter('read',{...request.settings,course:'DEMO1000',sourceRules:request.snapshot,ruleMode:request.mode,ruleTrace:true},doc);
   await io.onMessages(result.messages,{tabId:1});return {complete:true};
  }}),
  openSourceSession:async()=>({io:{},release:async()=>{}}),
  downloadImage:async()=>{downloads++;return {mimeType:'image/png',imageBase64:'AAAA'};},
  connectOcr:async()=>({call:async()=>{ocrCalls++;return {observations:[{text:'sample'}]};},close:async()=>{}}),
  parseObservations:()=>[]
 });
 try{
  const {testId}=await runner.start({settings,snapshot,source:'moodle',course:'DEMO1000',mode:'combined',stage:'recognize'});
  await library.remove('community.a');
  for(let i=0;i<100&&runner.busy;i++)await new Promise(resolve=>setTimeout(resolve,2));
  assert.equal(runner.busy,false);
  const result=runner.status(testId),report=exportRuleTestReport(result);
  assert.equal(result.phase,'complete');assert.equal(result.images.length,2);
  assert.equal(downloads,2);assert.equal(ocrCalls,2);
  const expectedIds=sameId?['builtin.moodle','community.a','community.a']:['builtin.moodle','community.a','community.b'];
  assert.deepEqual(result.images[0].matches.map(rule=>rule.id),expectedIds);
  assert.deepEqual(result.images[1].matches.map(rule=>rule.id),['builtin.moodle']);
  assert.deepEqual(report.rules.map(rule=>rule.id),expectedIds);
  if(sameId){
   assert.deepEqual(report.rules.slice(1).map(r=>[r.origin,r.key]),[['community','community:community.a'],['local','local:community.a']]);
   assert.deepEqual(result.images[0].matches.slice(1).map(r=>r.key),['community:community.a','local:community.a']);
   assert.ok(report.trace.some(t=>t.ruleKey==='local:community.a'&&t.origin==='local'));
   assert.ok(report.trace.some(t=>t.ruleKey==='community:community.a'&&t.origin==='community'));
  }
  assert.ok(report.rules.every(rule=>rule.version===(Object.values(builtins).find(b=>b.id===rule.id)?.version||'1.0.0')&&rule.digest?.length===64));
 }finally{await runner.clear();doc.defaultView.close();}
});
