import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuleTestRunner} from '../extension/source-rules/test-runner.js';
import {exportRuleTestReport,safeTrace} from '../extension/source-rules/trace.js';
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==';
const request={settings:{courses:['DEMO1000']},course:'DEMO1000',source:'moodle',mode:'community',stage:'locate',snapshot:{version:1,courses:{DEMO1000:{moodle:{community:{id:'demo.rule',version:'1.0.0',digest:'abc'}}}}}};
const wait=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,2));}throw new Error('test timeout');};
test('explicit range reaches collectors and excludes dated messages before downloading, retaining unknown dates',async()=>{
 let downloaded=0,range;
 const runner=createRuleTestRunner({createCollectors:io=>({collectMoodle:async context=>{range=context.dateRange;await io.onMessages([
  {sentAt:'2026-09-17',images:['old']},{sentAt:'2026-09-24',images:['current']},{sentAt:'2026-09-25',images:['future']},{images:['unknown']}
 ],{tabId:1});}}),openSourceSession:async()=>({io:{}}),downloadImage:async()=>{downloaded++;return {mimeType:'image/png',imageBase64:png};}});
 const dateRange={from:'2026-09-18',to:'2026-09-24'}, {testId}=await runner.start({...request,dateRange});
 await wait(()=>!runner.busy);const result=runner.status(testId);
 assert.deepEqual(range,dateRange);assert.equal(downloaded,2);assert.equal(result.counts.excluded,2);assert.deepEqual(result.images.map(i=>i.dateState),['inside','unknown']);await runner.clear(testId);
 await assert.rejects(runner.start({...request,dateRange:{from:'2026-09-30',to:'2026-09-01'}}),/invalid-test-date-range/);
});
function setup(options={}){
 let ocrCalls=0,released=0;
 const runner=createRuleTestRunner({createCollectors:io=>({collectMoodle:async()=>{
   await io.progress({increment:{pages:1}});
   await io.onMessages([{messageId:'m',course:'DEMO1000',sourceType:'moodle',sourceUrl:'https://learning.monash.edu/private?email=secret',textRows:['private'],sentAt:'2026-09-22',images:['https://learning.monash.edu/pic.png'],ruleTrace:[{reason:'accepted',ruleId:'demo.rule'}],imageEvidence:[]}],{tabId:1});
   return {complete:true,visited:1,truncated:false};
 }}),openSourceSession:async()=>({verifiedLogin:{},io:{},release:async()=>{released++;}}),
 downloadImage:async()=>({mimeType:'image/png',imageBase64:png}),
 connectOcr:async()=>({engine:'browser-wasm',call:async()=>{ocrCalls++;return options.ocr?options.ocr():{observations:[{text:'private text'}],cached:false};},close:async()=>{}}),
 parseObservations:()=>[{code:'AB123'}],now:Date.now});
 return {runner,get ocrCalls(){return ocrCalls;},get released(){return released;}};
}
test('locate test downloads previews but never connects OCR, then per-image OCR is explicit',async()=>{
 const s=setup(),{testId}=await s.runner.start(request);
 await wait(()=>!s.runner.busy);
 const result=s.runner.status(testId);assert.equal(result.phase,'complete');assert.equal(result.images.length,1);assert.equal(s.ocrCalls,0);assert.equal(s.released,1);
 assert.equal(s.runner.image({testId,imageId:result.images[0].id}).mimeType,'image/png');
 await s.runner.recognize({testId,imageId:result.images[0].id});await wait(()=>!s.runner.busy);
 assert.equal(s.ocrCalls,1);assert.equal(s.runner.status(testId).images[0].ocr.records[0].code,'AB123');
 const report=JSON.stringify(exportRuleTestReport(s.runner.status(testId)));
 assert.doesNotMatch(report,/private|secret|AB123|base64|monash/);
});
test('cancellation ignores a late OCR result and releases the source session',async()=>{
 let finish;const deferred=new Promise(r=>{finish=r;});const s=setup({ocr:()=>deferred});
 const {testId}=await s.runner.start({...request,stage:'recognize'});await wait(()=>s.ocrCalls===1);
 await s.runner.cancel(testId);finish({observations:[{text:'late'}]});await wait(()=>!s.runner.busy);
 assert.equal(s.runner.status(testId).phase,'cancelled');assert.equal(s.runner.status(testId).images.length,0);assert.equal(s.released,1);
 assert.throws(()=>s.runner.image({testId,imageId:'1'}),/image-unavailable/);
});
test('unknown worker sessions are interrupted and invalid stage fails before reading sources',async()=>{
 const {runner}=setup();assert.equal(runner.status('old').phase,'interrupted');
 await assert.rejects(runner.start({...request,stage:'submit'}));
});
for(const mode of ['builtin','community','combined'])test(`${mode} report lists exactly all applied rules`,async()=>{
 const {runner}=setup(),builtin={id:'builtin.moodle',version:'1',digest:'builtin'},community=[{id:'community.a',version:'1',digest:'a'},{id:'community.b',version:'2',digest:'b'}];
 const input={...request,mode,snapshot:{courses:{DEMO1000:{moodle:{builtin,community}}}}};
 const {testId}=await runner.start(input);
 community.pop();
 await wait(()=>!runner.busy);
 const report=runner.status(testId);
 assert.deepEqual(report.rules.map(r=>r.id),mode==='builtin'?['builtin.moodle']:mode==='community'?['community.a','community.b']:['builtin.moodle','community.a','community.b']);
 assert.ok(report.rules.every(r=>r.version&&r.digest));
 await runner.clear(testId);
});
test('explicit community mode rejects an empty array before opening sources',async()=>{
 const {runner}=setup();
 await assert.rejects(runner.start({...request,snapshot:{courses:{DEMO1000:{moodle:{community:[]}}}}}),/select-community-rule/);
 assert.equal(runner.busy,false);
});
test('report and trace retain validated origin identities without exporting arbitrary metadata',()=>{
 const ref={id:'community.a',key:'local:community.a',origin:'local',version:'1.0.0',digest:'a'.repeat(64)};
 const report=exportRuleTestReport({rules:[ref],trace:[{ruleId:ref.id,ruleKey:ref.key,origin:ref.origin,reason:'accepted',url:'private'}]});
 assert.deepEqual(report.rules[0],ref);
 assert.deepEqual(report.trace[0],{ruleId:ref.id,ruleKey:ref.key,origin:'local',reason:'accepted'});
 for(const value of [{ruleKey:'local:community.other',origin:'local'},{ruleKey:'remote:community.a',origin:'remote'},{ruleKey:'local:community.a?private',origin:'local'}]){
  assert.deepEqual(safeTrace({ruleId:'community.a',reason:'accepted',...value}),{ruleId:'community.a',reason:'accepted'});
 }
});
