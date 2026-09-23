import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuleLibrary,validateRuleBundle} from '../extension/source-rules/library.js';
import {messageSourceKey,threadSourceKey,pruneRuleCache} from '../extension/source-rules/cache.js';
import {fixtureRule,memoryStorage} from './helpers/source-rules.js';
import {loadBuiltinRules} from '../extension/source-rules/builtins.js';
import {readFile} from 'node:fs/promises';
test('reserved stored IDs stay invalid and removable without migration, while trusted builtins load',async()=>{
 const builtins=await loadBuiltinRules({readJson:async url=>JSON.parse(await readFile(url,'utf8'))});
 for(const source of ['gmail','moodle','ed'])assert.equal(builtins[source].id,'builtin.'+source);
 const id='community.demo1000.images',key='local:'+id,storage=memoryStorage({sourceRuleLibrary:{[key]:{origin:'local',current:fixtureRule({id})}},sourceRuleBindings:{DEMO1000:{moodle:[key]}}});
 const library=createRuleLibrary({storage,builtins}),before=structuredClone(storage.values),inventory=await library.list();
 assert.deepEqual(inventory.rules,[]);assert.ok(inventory.errors.some(e=>e.id===id&&e.reason==='invalid-rule'));
 const snapshot=await library.snapshot(settings);assert.equal(snapshot.courses.DEMO1000.moodle.builtin.id,'builtin.moodle');assert.deepEqual(snapshot.courses.DEMO1000.moodle.community,[]);
 assert.deepEqual((await library.exportBundle(settings)).rules,[]);assert.deepEqual(storage.values,before);
 await library.remove(key);assert.deepEqual(storage.values.sourceRuleLibrary,{});assert.deepEqual(storage.values.sourceRuleBindings.DEMO1000.moodle,[]);
});
const settings={courses:['DEMO1000','DEMO2000'],sourceModes:{DEMO1000:'moodle',DEMO2000:'moodle'},moodleUrls:{DEMO1000:['1'],DEMO2000:['2']}};
const setup=()=>{const storage=memoryStorage();return {storage,library:createRuleLibrary({storage,builtins:{moodle:fixtureRule({id:'builtin.moodle',courses:[]})}})};};
test('inventory includes actual built-in modules even without imports or course bindings',async()=>{
 const {library}=setup(),data=await library.list();
 assert.deepEqual(data.builtins.map(rule=>[rule.id,rule.version]),[['builtin.moodle','1.0.0']]);
 assert.deepEqual(data.rules,[]);
});
test('configuration import cannot bypass the rule library capacity',async()=>{
 const {library,storage}=setup();
 for(let i=0;i<40;i++)await library.importRule(JSON.stringify(fixtureRule({id:`community.rule${i}`})));
 const before=structuredClone(storage.values);
 await assert.rejects(library.configurationPatch({rules:[fixtureRule({id:'community.extra'})],bindings:{}},settings),/library-size/);
 assert.deepEqual(storage.values,before);
});
test('draft import never activates, bind validates course, and snapshots remain frozen after update',async()=>{
  const {library}=setup();await library.importRule(JSON.stringify(fixtureRule()));
  assert.deepEqual((await library.snapshot(settings)).courses.DEMO1000.moodle.community,[]);
  await assert.rejects(library.bind({course:'DEMO2000',source:'moodle',ruleId:fixtureRule().id,settings}));
  await library.bind({course:'DEMO1000',source:'moodle',ruleId:fixtureRule().id,settings});
  const before=await library.snapshot(settings);
  assert.equal(before.courses.DEMO1000.moodle.community[0].version,'1.0.0');
  await assert.rejects(library.importRule(JSON.stringify(fixtureRule({name:{en:'changed'}}))),/replace-required/);
  await library.importRule(JSON.stringify(fixtureRule({version:'1.0.1'})),{replace:true});
  assert.equal(before.courses.DEMO1000.moodle.community[0].version,'1.0.0');
  assert.equal((await library.snapshot(settings)).courses.DEMO2000.moodle.revision,0);
  await library.rollback(fixtureRule().id);
  assert.equal((await library.snapshot(settings)).courses.DEMO1000.moodle.community[0].version,'1.0.0');
  await library.remove(fixtureRule().id);
  assert.deepEqual((await library.snapshot(settings)).courses.DEMO1000.moodle.community,[]);
});
test('cache revisions re-read changed rules but preserve legacy message identity',()=>{
  assert.equal(messageSourceKey({course:'DEMO1000',source:'gmail',revision:0,messageId:'old'}),'old');
  assert.notEqual(messageSourceKey({course:'DEMO1000',source:'gmail',revision:1,messageId:'old'}),'old');
  assert.notEqual(threadSourceKey({course:'DEMO1000',revision:1,threadId:'x'}),threadSourceKey({course:'DEMO1000',revision:2,threadId:'x'}));
});
test('obsolete rule cache namespaces are pruned without deleting other current courses or legacy keys',()=>{
 const cache={legacy:1,'rule:DEMO1000:gmail:1:m':1,'rule:DEMO1000:gmail:2:m':2,'rule:DEMO2000:gmail:1:x':3};
 pruneRuleCache(cache,{courses:{DEMO1000:{gmail:{revision:2}},DEMO2000:{gmail:{revision:1}}}});
 assert.deepEqual(cache,{legacy:1,'rule:DEMO1000:gmail:2:m':2,'rule:DEMO2000:gmail:1:x':3});
});
test('bundle import validation is atomic, and stale bindings do not leak into old configurations',async()=>{
  const {library,storage}=setup();await library.importRule(JSON.stringify(fixtureRule()));
  await library.bind({course:'DEMO1000',source:'moodle',ruleId:fixtureRule().id,settings});
  const exported=await library.exportBundle(settings);
  assert.equal(exported.rules.length,1);
  assert.deepEqual(validateRuleBundle(exported,settings).bindings.DEMO1000.moodle,[`local:${fixtureRule().id}`]);
  const before=structuredClone(storage.values);
  await assert.rejects(library.configurationPatch({...exported,rules:[]},settings));
  assert.deepEqual(storage.values,before);
  const patch=await library.configurationPatch(undefined,settings);
  assert.deepEqual(patch.sourceRuleBindings,{});
  assert.ok(patch.sourceRuleRevisions.DEMO1000.moodle>before.sourceRuleRevisions.DEMO1000.moodle);
});
test('concurrent imports retain both drafts and corrupted stored packages fall back safely',async()=>{
  const {library,storage}=setup();
  await Promise.all([library.importRule(JSON.stringify(fixtureRule())),library.importRule(JSON.stringify(fixtureRule({id:'community.other.images'})))]);
  assert.equal((await library.list()).rules.length,2);
  storage.values.sourceRuleBindings={DEMO1000:{moodle:fixtureRule().id}};
  storage.values.sourceRuleLibrary[`local:${fixtureRule().id}`].current.execute='evil';
  const snapshot=await library.snapshot(settings);
  assert.deepEqual(snapshot.courses.DEMO1000.moodle.community,[]);
  assert.ok(snapshot.errors.length);
});
test('bindings normalize legacy strings and canonical arrays without reorder revision churn',async()=>{
 const {library,storage}=setup();
 for(const id of ['community.a','community.b'])await library.importRule(JSON.stringify(fixtureRule({id})));
 storage.values.sourceRuleBindings={DEMO1000:{moodle:'community.a'}};
 assert.deepEqual((await library.list()).bindings.DEMO1000.moodle,['local:community.a']);
 await library.bind({course:'DEMO1000',source:'moodle',ruleIds:['community.b','community.a','community.b'],settings});
 const before=await library.snapshot(settings);
 assert.deepEqual((await library.list()).bindings.DEMO1000.moodle,['local:community.a','local:community.b']);
 assert.deepEqual(before.courses.DEMO1000.moodle.community.map(r=>r.id),['community.a','community.b']);
 assert.ok(Object.isFrozen(before.courses.DEMO1000.moodle.community));
 await library.bind({course:'DEMO1000',source:'moodle',ruleIds:['community.a','community.b'],settings});
 assert.deepEqual(await library.snapshot(settings),before);
 await library.bind({course:'DEMO1000',source:'moodle',ruleIds:[],ruleId:'community.a',settings});
 assert.deepEqual((await library.snapshot(settings)).courses.DEMO1000.moodle.community,[]);
 assert.deepEqual(before.courses.DEMO1000.moodle.community.map(r=>r.id),['community.a','community.b']);
});
test('bind validates every selection and eight-rule limit before any save',async()=>{
 const {library,storage}=setup();
 const ids=Array.from({length:9},(_,i)=>`community.rule${i}`);
 for(const id of ids)await library.importRule(JSON.stringify(fixtureRule({id})));
 await library.bind({course:'DEMO1000',source:'moodle',ruleIds:ids.slice(0,8),settings});
 assert.equal((await library.snapshot(settings)).courses.DEMO1000.moodle.community.length,8);
 const before=structuredClone(storage.values);
 for(const ruleIds of [ids,['community.rule0','missing'],['community.rule0',null],'community.rule0',null]){
  await assert.rejects(library.bind({course:'DEMO1000',source:'moodle',ruleIds,settings}));
  assert.deepEqual(storage.values,before);
 }
 await assert.rejects(library.bind({course:'DEMO2000',source:'moodle',ruleIds:['community.rule0'],settings}));
 assert.deepEqual(storage.values,before);
});
test('update rollback and removal bump every affected course without losing siblings',async()=>{
 const {library}=setup(),courses=['DEMO1000','DEMO2000'];
 for(const id of ['community.a','community.b'])await library.importRule(JSON.stringify(fixtureRule({id,courses})));
 for(const course of courses)await library.bind({course,source:'moodle',ruleIds:['community.a','community.b'],settings});
 const frozen=await library.snapshot(settings);
 for(const action of [()=>library.importRule(JSON.stringify(fixtureRule({id:'community.a',courses,version:'1.0.1'})),{replace:true}),()=>library.rollback('community.a'),()=>library.remove('community.a')]){
  const before=await library.snapshot(settings);await action();const after=await library.snapshot(settings);
  for(const course of courses){assert.equal(after.courses[course].moodle.revision,before.courses[course].moodle.revision+1);assert.ok(after.courses[course].moodle.community.some(r=>r.id==='community.b'));}
 }
 assert.deepEqual((await library.list()).bindings.DEMO1000.moodle,['local:community.b']);
 assert.deepEqual(frozen.courses.DEMO1000.moodle.community.map(r=>r.version),['1.0.0','1.0.0']);
});
test('corrupt entries and invalid siblings are isolated on list snapshot and export',async()=>{
 const {library,storage}=setup();
 for(const id of ['community.a','community.b'])await library.importRule(JSON.stringify(fixtureRule({id})));
 storage.values.sourceRuleLibrary['local:community.a'].current.execute='bad';
 storage.values.sourceRuleBindings={DEMO1000:{moodle:['community.a',null,'missing','community.b','community.b']},DEMO2000:null};
 const snapshot=await library.snapshot(settings);
 assert.deepEqual(snapshot.courses.DEMO1000.moodle.community.map(r=>r.id),['community.b']);
 assert.ok(snapshot.courses.DEMO1000.moodle.builtin);
 assert.ok(snapshot.errors.some(e=>e.id==='community.a'));
 assert.deepEqual((await library.list()).bindings.DEMO1000.moodle,['local:community.b']);
 const exported=await library.exportBundle(settings);
 assert.deepEqual(exported.bindings,{DEMO1000:{moodle:['local:community.b']}});
 assert.deepEqual(exported.rules.map(r=>r.id),['community.b']);
 await library.remove('community.a');
 assert.deepEqual((await library.list()).bindings.DEMO1000.moodle,['local:community.b']);
});
test('bundle arrays round trip and legacy strings normalize; invalid bundle remains atomic',async()=>{
 const {library,storage}=setup(),rules=['community.a','community.b'].map(id=>fixtureRule({id}));
 const bundle={rules,bindings:{DEMO1000:{moodle:['community.b','community.a']}}};
 await storage.set(await library.configurationPatch(bundle,settings));
 assert.deepEqual((await library.exportBundle(settings)).bindings.DEMO1000.moodle,['local:community.a','local:community.b']);
 assert.deepEqual(validateRuleBundle({rules,bindings:{DEMO1000:{moodle:'community.a'}}},settings).bindings.DEMO1000.moodle,['local:community.a']);
 const before=structuredClone(storage.values);
 await assert.rejects(library.configurationPatch({rules,bindings:{DEMO1000:{moodle:['community.a','missing']}}},settings));
 assert.deepEqual(storage.values,before);
});
test('reordered configuration bindings do not churn revisions or destroy rollback history',async()=>{
 const {library,storage}=setup();
 for(const id of ['community.a','community.b'])await library.importRule(JSON.stringify(fixtureRule({id})));
 await library.bind({course:'DEMO1000',source:'moodle',ruleIds:['community.a','community.b'],settings});
 await library.importRule(JSON.stringify(fixtureRule({id:'community.a',version:'1.0.1'})),{replace:true});
 const before=await library.snapshot(settings),bundle=await library.exportBundle(settings);
 bundle.bindings.DEMO1000.moodle.reverse();
 await storage.set(await library.configurationPatch(bundle,settings));
 assert.deepEqual(await library.snapshot(settings),before);
 await library.rollback('community.a');
 assert.equal((await library.snapshot(settings)).courses.DEMO1000.moodle.community[0].version,'1.0.0');
});
test('source or course changes isolate a bound rule until rollback without dropping its siblings',async()=>{
 const {library,storage}=setup();
 for(const id of ['community.a','community.b'])await library.importRule(JSON.stringify(fixtureRule({id})));
 await library.bind({course:'DEMO1000',source:'moodle',ruleIds:['community.a','community.b'],settings});
 await library.importRule(JSON.stringify(fixtureRule({id:'community.a',source:'ed',version:'2.0.0'})),{replace:true});
 assert.deepEqual((await library.list()).bindings.DEMO1000.moodle,['local:community.b']);
 assert.deepEqual(storage.values.sourceRuleBindings.DEMO1000.moodle,['local:community.a','local:community.b']);
 await library.rollback('community.a');
 assert.deepEqual((await library.list()).bindings.DEMO1000.moodle,['local:community.a','local:community.b']);
});
test('malformed storage containers and revision values cannot poison subsequent valid bindings',async()=>{
 for(const value of [null,42,'broken',[],{DEMO1000:null}]){
  const storage=memoryStorage({sourceRuleLibrary:value,sourceRuleBindings:value,sourceRuleRevisions:value}),library=createRuleLibrary({storage,builtins:{moodle:fixtureRule({id:'builtin.moodle',courses:[]})}});
  assert.deepEqual((await library.snapshot(settings)).courses.DEMO1000.moodle.community,[]);
  await library.importRule(JSON.stringify(fixtureRule()));
  storage.values.sourceRuleRevisions={DEMO1000:{moodle:Infinity}};
  await library.bind({course:'DEMO1000',source:'moodle',ruleIds:[fixtureRule().id],settings});
  assert.equal((await library.snapshot(settings)).courses.DEMO1000.moodle.revision,1);
 }
});
test('rollback rejects a valid package stored under the wrong ID atomically',async()=>{
 const {library,storage}=setup();
 await library.importRule(JSON.stringify(fixtureRule({id:'community.a'})));
 await library.bind({course:'DEMO1000',source:'moodle',ruleIds:['community.a'],settings});
 storage.values.sourceRuleLibrary['local:community.a'].previous=fixtureRule({id:'community.other'});
 const before=structuredClone(storage.values);
 await assert.rejects(library.rollback('community.a'));
 assert.deepEqual(storage.values,before);
});
