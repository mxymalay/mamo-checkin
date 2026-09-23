import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuleLibrary,validateRuleBundle} from '../extension/source-rules/library.js';
import {exportConfiguration,parseConfigurationBundle} from '../extension/configuration.js';
import {fixtureRule,memoryStorage} from './helpers/source-rules.js';
const settings={name:'Example Student',academicYear:2026,courses:['DEMO1000','DEMO2000'],sourceModes:{DEMO1000:'moodle',DEMO2000:'moodle'},moodleUrls:{DEMO1000:['https://learning.monash.edu/course/view.php?id=1'],DEMO2000:['https://learning.monash.edu/course/view.php?id=2']}};
const raw=fixtureRule({id:'community.shared',courses:settings.courses});
const localKey='local:community.shared',communityKey='community:community.shared';
const setup=(initial={})=>{const storage=memoryStorage(initial);return {storage,library:createRuleLibrary({storage,builtins:{moodle:fixtureRule({id:'builtin.moodle',courses:[]})}})};};
const bind=(library,course,ruleIds)=>library.bind({course,source:'moodle',ruleIds,settings});
test('identical raw IDs produce independent origin copies without changing package digests',async()=>{
 const {library,storage}=setup();
 const local=await library.importRule(JSON.stringify(raw));
 const community=await library.importRule(JSON.stringify(raw),{origin:'community'});
 assert.equal(local.key,localKey);assert.equal(local.origin,'local');
 assert.equal(community.key,communityKey);assert.equal(community.origin,'community');
 assert.equal(local.digest,community.digest);
 assert.deepEqual((await library.list()).rules.map(r=>[r.id,r.origin,r.key]),[[raw.id,'local',localKey],[raw.id,'community',communityKey]]);
 assert.deepEqual(storage.values.sourceRuleLibrary[localKey].current,raw);
 await bind(library,'DEMO1000',[localKey,communityKey,raw.id]);
 const snapshot=await library.snapshot(settings);
 assert.deepEqual(snapshot.courses.DEMO1000.moodle.community.map(r=>r.key),[communityKey,localKey]);
 assert.deepEqual((await library.list()).bindings.DEMO1000.moodle,[communityKey,localKey]);
 assert.ok(Object.isFrozen(snapshot.courses.DEMO1000.moodle.community));
});
test('same-version local edits require confirmation and rollback/remove affect only that origin',async()=>{
 const {library}=setup();
 await library.importRule(JSON.stringify(raw));await library.importRule(JSON.stringify(raw),{origin:'community'});
 await bind(library,'DEMO1000',[localKey]);await bind(library,'DEMO2000',[communityKey]);
 const initial=await library.snapshot(settings),changed={...raw,name:{en:'Local edit'}};
 await assert.rejects(library.importRule(JSON.stringify(changed)),/replace-required/);
 await library.importRule(JSON.stringify(changed),{replace:true});
 let snapshot=await library.snapshot(settings);
 assert.equal(snapshot.courses.DEMO1000.moodle.revision,initial.courses.DEMO1000.moodle.revision+1);
 assert.equal(snapshot.courses.DEMO2000.moodle.revision,initial.courses.DEMO2000.moodle.revision);
 await assert.rejects(library.importRule(JSON.stringify(changed),{origin:'community',replace:true}),/version-conflict/);
 await library.rollback(localKey);
 assert.equal((await library.list()).rules.find(r=>r.key===localKey).name.en,raw.name.en);
 await library.remove(raw.id);
 assert.deepEqual((await library.list()).rules.map(r=>r.key),[communityKey]);
 assert.deepEqual((await library.list()).bindings.DEMO2000.moodle,[communityKey]);
});
test('legacy storage and bindings migrate to local keys without revision churn',async()=>{
 const {library,storage}=setup({sourceRuleLibrary:{[raw.id]:{current:raw,previous:null}},sourceRuleBindings:{DEMO1000:{moodle:raw.id}},sourceRuleRevisions:{DEMO1000:{moodle:3}}});
 assert.deepEqual((await library.list()).bindings.DEMO1000.moodle,[localKey]);
 await bind(library,'DEMO1000',[localKey,raw.id]);
 assert.equal((await library.snapshot(settings)).courses.DEMO1000.moodle.revision,3);
 await library.importRule(JSON.stringify(raw),{origin:'community'});
 assert.deepEqual(Object.keys(storage.values.sourceRuleLibrary).sort(),[communityKey,localKey]);
 assert.deepEqual(storage.values.sourceRuleBindings.DEMO1000.moodle,[localKey]);
});
test('config roundtrip preserves both origins including unbound copies and accepts legacy rules',async()=>{
 const {library}=setup();
 await library.importRule(JSON.stringify(raw));await library.importRule(JSON.stringify(raw),{origin:'community'});
 await bind(library,'DEMO1000',[communityKey]);
 const exported=await library.exportBundle(settings);
 assert.equal(exported.rules.length,2);
 const text=exportConfiguration(settings,exported),parsed=parseConfigurationBundle(text,settings);
 const target=setup();await target.storage.set(await target.library.configurationPatch(parsed.sourceRules,settings));
 assert.deepEqual(await target.library.exportBundle(settings),exported);
 assert.deepEqual(validateRuleBundle({rules:[raw],bindings:{DEMO1000:{moodle:raw.id}}},settings).bindings.DEMO1000.moodle,[localKey]);
 const edited={...raw,name:{en:'Restored local edit'},origin:'local'};
 await target.storage.set(await target.library.configurationPatch({rules:[edited],bindings:{}},settings));
 assert.equal((await target.library.list()).rules.find(r=>r.key===localKey).name.en,'Restored local edit');
});
test('invalid origins reserved IDs and cross-origin rollback packages are rejected atomically',async()=>{
 const {library,storage}=setup();await library.importRule(JSON.stringify(raw));
 const before=structuredClone(storage.values);
 for(const origin of ['builtin','remote','',null,1,{},[]])await assert.rejects(library.importRule(JSON.stringify(raw),{origin}));
 for(const origin of ['local','community']){
  await assert.rejects(library.importRule(JSON.stringify({...raw,id:'builtin.moodle'}),{origin}));
  await assert.rejects(library.importRule(JSON.stringify({...raw,execute:'code'}),{origin}));
 }
 for(const key of ['builtin.moodle','local:builtin.moodle','community:builtin.moodle','remote:community.shared'])await assert.rejects(library.remove(key));
 for(const rules of [[{...raw,origin:'remote'}],[{...raw,origin:'local'},raw]])await assert.rejects(library.configurationPatch({rules,bindings:{}},settings));
 assert.deepEqual(storage.values,before);
 storage.values.sourceRuleLibrary[localKey].previous={...raw,id:'community.other'};
 await assert.rejects(library.rollback(localKey));
});
test('invalid origin siblings are isolated and cannot replace a healthy copy',async()=>{
 const {library,storage}=setup();await library.importRule(JSON.stringify(raw));await library.importRule(JSON.stringify(raw),{origin:'community'});
 await bind(library,'DEMO1000',[localKey,communityKey]);
 storage.values.sourceRuleLibrary[communityKey].origin='local';
 const snapshot=await library.snapshot(settings);
 assert.deepEqual(snapshot.courses.DEMO1000.moodle.community.map(r=>r.key),[localKey]);
 assert.ok(snapshot.errors.some(e=>e.key===communityKey&&e.id===raw.id&&e.origin==='community'));
 assert.deepEqual((await library.exportBundle(settings)).rules.map(r=>r.origin),['local']);
 await library.remove(communityKey);
 assert.deepEqual((await library.list()).bindings.DEMO1000.moodle,[localKey]);
});
test('selection and storage capacities count independent origins together',async()=>{
 const {library,storage}=setup(),ids=[];
 for(let i=0;i<20;i++)for(const origin of ['local','community']){
  const rule={...raw,id:`community.copy${i}`};await library.importRule(JSON.stringify(rule),{origin});ids.push(`${origin}:${rule.id}`);
 }
 await bind(library,'DEMO1000',ids.slice(0,8));
 const before=structuredClone(storage.values);
 await assert.rejects(bind(library,'DEMO1000',ids.slice(0,9)));
 await assert.rejects(library.importRule(JSON.stringify({...raw,id:'community.extra'})),/library-size/);
 assert.deepEqual(storage.values,before);
});
