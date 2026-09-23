import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackgroundRules} from '../extension/background-rules.js';
import {createRuleLibrary} from '../extension/source-rules/library.js';
import {memoryStorage,fixtureRule} from './helpers/source-rules.js';
import {builtins} from './helpers/install-source-runtime.js';
test('cancelling during rule snapshot preparation prevents any source tab from opening',async()=>{
 const settings={devMode:true,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}};
 const storage=memoryStorage({settings});let release,entered;
 const reached=new Promise(resolve=>{entered=resolve;});
 const pending=new Promise(resolve=>{release=resolve;});
 const service=createBackgroundRules({storage,isBusy:()=>false,getLibrary:async()=>({snapshot:async()=>{entered();await pending;return {courses:{}};}}),tabs:{create:()=>{throw new Error('must not create tabs');}}});
 const start=service.handle({type:'ruleTestStart',course:'DEMO1000',source:'moodle',mode:'builtin',stage:'locate'});
 await reached;await service.cancel();release();
 await assert.rejects(start,/cancelled/);assert.equal(service.busy,false);
});
test('developer routes read only Moodle with no production storage writes and refuse busy production',async()=>{
 const settings={devMode:true,name:'Example',academicYear:2026,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'},moodleUrls:{DEMO1000:['https://learning.monash.edu/course/view.php?id=1']}};
 const storage=memoryStorage({settings,records:[{id:'real'}],status:{message:'real'},seenMessages:{real:1}}),before=structuredClone(storage.values),tabs=new Map(),calls=[];let productionBusy=true;
 const library=createRuleLibrary({storage,builtins});
 const service=createBackgroundRules({storage,getLibrary:async()=>library,isBusy:()=>productionBusy,
  tabs:{create:async({url})=>{tabs.set(1,{id:1,url,status:'complete'});return tabs.get(1);},get:async id=>tabs.get(id),update:async(id,patch)=>Object.assign(tabs.get(id),patch),remove:async id=>tabs.delete(id)},
  readAdapter:async(tab,func,command,args)=>{calls.push(func.name);return {messages:[],links:[],priorityLinks:[],pageTitle:args.course};},
  connectOcr:()=>{throw new Error('locate must not connect OCR');},downloadImage:()=>{throw new Error('no images');}});
 const start={type:'ruleTestStart',course:'DEMO1000',source:'moodle',mode:'builtin',stage:'locate'};
 await assert.rejects(service.handle(start),/busy/);productionBusy=false;
 const {testId}=await service.handle(start);
 for(let i=0;i<200&&service.busy;i++)await new Promise(r=>setTimeout(r,10));
 assert.equal((await service.handle({type:'ruleTestStatus',testId})).phase,'complete');
 assert.deepEqual(storage.values,before);assert.ok(calls.every(name=>name==='moodleAdapter'));assert.equal(tabs.size,0);
 await service.handle({type:'ruleTestClear',testId});
 storage.values.settings.devMode=false;assert.ok((await service.handle(start)).testId);await service.cancel();
});
test('test overrides distinguish omitted saved arrays from empty arrays and legacy single IDs',async()=>{
 const settings={devMode:true,name:'Example',academicYear:2026,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'},moodleUrls:{DEMO1000:['https://learning.monash.edu/course/view.php?id=1']}};
 const storage=memoryStorage({settings}),library=createRuleLibrary({storage,builtins}),tabs=new Map();let opens=0;
 for(const id of ['community.a','community.b'])await library.importRule(JSON.stringify(fixtureRule({id})));
 await library.importRule(JSON.stringify(fixtureRule({id:'community.a'})),{origin:'community'});
 // Seed arrays directly so override failures are independent of the bind implementation.
 storage.values.sourceRuleBindings={DEMO1000:{moodle:['community.a','community.b']}};
 const before=structuredClone(storage.values);
 const service=createBackgroundRules({storage,getLibrary:async()=>library,isBusy:()=>false,
  tabs:{create:async({url})=>{opens++;tabs.set(1,{id:1,url,status:'complete'});return tabs.get(1);},get:async id=>tabs.get(id),update:async(id,patch)=>Object.assign(tabs.get(id),patch),remove:async id=>tabs.delete(id)},
  readAdapter:async()=>({messages:[],links:[],priorityLinks:[]}),connectOcr:()=>{throw new Error('no OCR');},downloadImage:()=>{throw new Error('no images');}});
 const start={type:'ruleTestStart',course:'DEMO1000',source:'moodle',mode:'combined',stage:'locate'};
 for(const [override,expected] of [[{},['builtin.moodle','community.a','community.b']],[{ruleIds:[]},['builtin.moodle']],[{ruleIds:['community.b','community.a','community.b'],mode:'community'},['community.a','community.b']],[{ruleId:'community.b',mode:'community'},['community.b']],[{ruleId:null},['builtin.moodle']],[{ruleKey:'community:community.a',mode:'community'},['community.a']],[{ruleIds:['local:community.a','community:community.a'],mode:'community'},['community.a','community.a']]]){
  const {testId}=await service.handle({...start,...override});
  for(let i=0;i<200&&service.busy;i++)await new Promise(r=>setTimeout(r,10));
  const report=await service.handle({type:'ruleTestStatus',testId});assert.equal(report.phase,'complete');
  assert.deepEqual(report.rules.map(r=>r.id),expected);
  if(override.ruleKey)assert.equal(report.rules[0].key,override.ruleKey);
  if(override.ruleIds?.includes('local:community.a'))assert.deepEqual(report.rules.map(r=>r.key),['community:community.a','local:community.a']);
  await service.handle({type:'ruleTestClear',testId});
 }
 const beforeInvalid=opens;
 for(const override of [{ruleIds:[],mode:'community'},{ruleIds:['community.a','missing']},{ruleIds:null},{ruleIds:'community.a'}])await assert.rejects(service.handle({...start,...override}));
 assert.equal(opens,beforeInvalid);assert.deepEqual(storage.values,before);
});
test('background imports validate origin and key mutations never target the other copy',async()=>{
 const settings={courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},storage=memoryStorage({settings});
 const library=createRuleLibrary({storage,builtins}),service=createBackgroundRules({storage,getLibrary:async()=>library,isBusy:()=>false});
 const text=JSON.stringify(fixtureRule({id:'community.shared'}));
 await service.handle({type:'ruleImport',text});
 const installed=await service.handle({type:'ruleImport',text,origin:'community'});
 assert.equal(installed.key,'community:community.shared');
 for(const origin of ['remote','builtin',null,{},[]])await assert.rejects(service.handle({type:'ruleImport',text,origin}));
 await assert.rejects(service.handle({type:'ruleBind',course:'DEMO1000',source:'moodle',ruleKey:installed.key}),/rule-test-required/);
 const challenge=await service.handle({type:'ruleTestSkipPrepare',course:'DEMO1000',source:'moodle',ruleIds:[installed.key]});
 await service.handle({type:'ruleTestSkipConfirm',token:challenge.token,confirmed:true});
 await service.handle({type:'ruleBind',course:'DEMO1000',source:'moodle',ruleKey:installed.key});
 assert.deepEqual((await library.list()).bindings.DEMO1000.moodle,[installed.key]);
 await service.handle({type:'ruleImport',text:JSON.stringify(fixtureRule({id:'community.shared',version:'1.0.1'})),origin:'community',replace:true});
 await service.handle({type:'ruleRollback',ruleKey:installed.key});
 assert.equal((await library.list()).rules.find(r=>r.key===installed.key).version,'1.0.0');
 await service.handle({type:'ruleRemove',ruleKey:installed.key});
 assert.deepEqual((await library.list()).rules.map(r=>r.key),['local:community.shared']);
 await service.handle({type:'ruleRemove',ruleId:'community.shared'});
 assert.deepEqual((await library.list()).rules,[]);
});
