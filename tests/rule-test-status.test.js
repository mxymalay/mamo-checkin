import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuleLibrary} from '../extension/source-rules/library.js';
import {ruleWasTested,ruleCanMatch} from '../extension/source-rules/test-status.js';
import {createBackgroundRules} from '../extension/background-rules.js';
import {memoryStorage,fixtureRule} from './helpers/source-rules.js';

async function setup(){const settings={courses:['DEMO1000','DEMO2000'],sourceModes:{DEMO1000:'moodle',DEMO2000:'moodle'}},storage=memoryStorage({settings}),library=createRuleLibrary({storage,builtins:[]});await library.importRule(JSON.stringify(fixtureRule({courses:settings.courses})));const rule=(await library.list()).rules[0];return {settings,storage,library,rule};}
const report=rule=>({course:'DEMO1000',source:'moodle',phase:'complete',rules:[rule],images:[{id:'1',state:'downloaded',matches:[{key:rule.key}]}]});
test('approval is bound to current content, course and source',async()=>{
 const {library,rule,settings}=await setup();
 const binding={course:'DEMO1000',source:'moodle',ruleIds:[rule.key],settings,requireTest:true};
 await assert.rejects(library.bind(binding),/rule-test-required/);
 for(const value of [{busy:true},{truncated:true},{phase:'partial'},{images:[]},{images:[{state:'ocr-error',matches:[{key:rule.key}]}]},{images:[{state:'downloaded',matches:[]}]}])await assert.rejects(library.approveTest({...report(rule),...value}),/rule-test-not-passed/);
 await library.approveTest(report(rule));assert.equal(ruleWasTested(rule,await library.list(),'DEMO1000'),true);await library.bind(binding);
 await assert.rejects(library.bind({...binding,course:'DEMO2000'}),/rule-test-required/);
 await library.importRule(JSON.stringify(fixtureRule({version:'1.0.1',courses:settings.courses})),{replace:true});
 await assert.rejects(library.approveTest(report(rule)),/rule-test-stale/);await assert.rejects(library.bind(binding),/rule-test-required/);
});
test('skip requires a current one-use challenge and never marks a rule tested',async()=>{
 const {library,storage,rule,settings}=await setup(),service=createBackgroundRules({storage,getLibrary:async()=>library,isBusy:()=>false});
 const prepare={type:'ruleTestSkipPrepare',course:'DEMO1000',source:'moodle',ruleIds:[rule.key]};
 await assert.rejects(service.handle({type:'ruleTestSkipConfirm',confirmed:true}),/rule-test-required/);
 const {token}=await service.handle(prepare);await service.handle({type:'ruleTestSkipConfirm',token,confirmed:true});
 const state=await library.list();assert.equal(ruleWasTested(rule,state,'DEMO1000'),false);assert.equal(ruleCanMatch(rule,state,'DEMO1000'),true);assert.equal(ruleCanMatch(rule,state,'DEMO2000'),false);
 await service.handle({type:'ruleBind',course:'DEMO1000',source:'moodle',ruleIds:[rule.key]});
 await assert.rejects(service.handle({type:'ruleTestSkipConfirm',token,confirmed:true}),/rule-test-required/);
 const next=await service.handle(prepare);await library.importRule(JSON.stringify(fixtureRule({version:'1.0.1',courses:settings.courses})),{replace:true});
 await assert.rejects(service.handle({type:'ruleTestSkipConfirm',token:next.token,confirmed:true}),/rule-test-stale/);
 await assert.rejects(service.handle({type:'ruleBind',course:'DEMO1000',source:'moodle',ruleIds:[rule.key],requireTest:false}),/rule-test-required/);
});
