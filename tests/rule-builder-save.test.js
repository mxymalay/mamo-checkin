import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuleLibrary} from '../extension/source-rules/library.js';
import {fixtureRule,memoryStorage} from './helpers/source-rules.js';
test('editing a generated ID cannot silently replace an existing local rule',async()=>{
 const storage=memoryStorage(),library=createRuleLibrary({storage,builtins:{}}),rule=fixtureRule({id:'alice.existing'}),settings={courses:['DEMO1000']};
 await library.importRule(JSON.stringify(rule));const before=structuredClone(storage.values),expectedToken=await library.editToken();
 await assert.rejects(library.saveGenerated({rule:{...rule,name:{en:'Changed'}},settings,expectedToken}),e=>e.code==='replace-required');
 assert.deepEqual(storage.values,before);
});
test('generated rules save and bind atomically, preserve other rules, and reject stale editors',async()=>{
 const storage=memoryStorage(),library=createRuleLibrary({storage,builtins:{}}),settings={courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}};
 const other=fixtureRule({id:'community.other.images'});await library.importRule(JSON.stringify(other),{origin:'community'});await library.bind({settings,course:'DEMO1000',source:'moodle',ruleIds:['community:'+other.id]});
 const token=await library.editToken();let writes=0;const set=storage.set;storage.set=async patch=>{writes++;assert.ok(patch.sourceRuleLibrary&&patch.sourceRuleBindings&&patch.sourceRuleRevisions);await set(patch);};
 const rule=fixtureRule({id:'local.generated.test'});await library.saveGenerated({rule,settings,expectedToken:token,enableCourses:['DEMO1000']});assert.equal(writes,1);
 assert.deepEqual((await library.list()).bindings.DEMO1000.moodle,['community:'+other.id,'local:'+rule.id]);
 await assert.rejects(library.saveGenerated({rule,settings,expectedToken:token,enableCourses:[]}),/builder-library-changed/);assert.equal(writes,1);
});
test('a full binding or storage failure leaves all courses unchanged',async()=>{
 const storage=memoryStorage(),library=createRuleLibrary({storage,builtins:{}}),settings={courses:['DEMO1000','DEMO2000'],sourceModes:{DEMO1000:'moodle',DEMO2000:'moodle'}},ids=[];
 for(let i=0;i<8;i++){const rule=fixtureRule({id:'local.limit.rule'+i});await library.importRule(JSON.stringify(rule));ids.push('local:'+rule.id);}
 await library.bind({settings,course:'DEMO1000',source:'moodle',ruleIds:ids});const before=structuredClone(storage.values),expectedToken=await library.editToken(),rule=fixtureRule({id:'local.generated.multi',courses:settings.courses});
 await assert.rejects(library.saveGenerated({rule,settings,expectedToken,enableCourses:['DEMO2000','DEMO1000']}));assert.deepEqual(storage.values,before);
 storage.set=async()=>{throw new Error('disk-full');};await assert.rejects(library.saveGenerated({rule,settings,expectedToken,enableCourses:['DEMO2000']}),/disk-full/);assert.deepEqual(storage.values,before);
});
test('cancellation is checked inside the library transaction immediately before commit',async()=>{
 const storage=memoryStorage(),library=createRuleLibrary({storage,builtins:{}}),settings={courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},token=await library.editToken();
 await assert.rejects(library.saveGenerated({rule:fixtureRule(),settings,expectedToken:token,enableCourses:['DEMO1000'],beforeCommit(){throw new Error('builder-cancelled');}}),/builder-cancelled/);
 assert.equal((await library.list()).rules.length,0);assert.equal(storage.values.sourceRuleBindings,undefined);
});
