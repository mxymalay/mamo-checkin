import test from 'node:test';
import assert from 'node:assert/strict';
import {exportConfiguration,parseConfigurationBundle} from '../extension/configuration.js';
import {fixtureRule} from './helpers/source-rules.js';
import {memoryStorage} from './helpers/source-rules.js';
import {createRuleLibrary} from '../extension/source-rules/library.js';
test('invalid IDs reject local/community imports, generated saves and configurations atomically',async()=>{
 const storage=memoryStorage(),library=createRuleLibrary({storage,builtins:{}}),valid=fixtureRule({id:'alice.valid'});
 await library.importRule(JSON.stringify(valid));const before=structuredClone(storage.values),expectedToken=await library.editToken();
 for(const id of ['demo.alice','alice.mydemo.rule','alice.builtin-rule','ALICE.rule',null,'a.'.padEnd(257,'a')]){
  const rule=fixtureRule({id});
  for(const origin of ['local','community'])await assert.rejects(library.importRule(JSON.stringify(rule),{origin}),e=>e.path==='$.id');
  await assert.rejects(library.saveGenerated({rule,settings,expectedToken}),e=>e.path==='$.id');
  const bundle={rules:[valid,rule],bindings:{}};
  await assert.rejects(library.configurationPatch(bundle,settings),e=>e.path==='$.id');
  const config=JSON.parse(exportConfiguration(settings));config.sourceRules=bundle;
  assert.throws(()=>parseConfigurationBundle(JSON.stringify(config),settings),e=>e.path==='$.id');
  assert.deepEqual(storage.values,before);
 }
});
const settings={name:'Example',email:'',academicYear:2026,courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'},moodleUrls:{DEMO1000:['https://learning.monash.edu/course/view.php?id=1']}};
test('personal configuration carries enabled rules and rejects invalid bindings before saving settings',()=>{
 const rules={rules:[fixtureRule()],bindings:{DEMO1000:{moodle:fixtureRule().id}}};
 const exported=exportConfiguration(settings,rules);
 assert.equal(parseConfigurationBundle(exported,settings).sourceRules.rules[0].id,fixtureRule().id);
 const invalid=JSON.parse(exported);invalid.sourceRules.rules[0].execute='bad';
 assert.throws(()=>parseConfigurationBundle(JSON.stringify(invalid),settings));
 assert.deepEqual(parseConfigurationBundle(exportConfiguration(settings),settings).sourceRules,{rules:[],bindings:{}});
});
test('configuration restores complete local and community JSON without downloading or accepting missing IDs',()=>{
 const rule=fixtureRule(),rules=['local','community'].map(origin=>({...rule,origin}));
 const exported=exportConfiguration(settings,{rules,bindings:{DEMO1000:{moodle:rules.map(r=>r.origin+':'+r.id)}}});
 const restored=parseConfigurationBundle(exported,settings).sourceRules;
 assert.deepEqual(restored.rules,rules);assert.deepEqual(restored.rules[0].images,rule.images);
 const broken=JSON.parse(exported);broken.sourceRules.rules=[];assert.throws(()=>parseConfigurationBundle(JSON.stringify(broken),settings));
 const wrong=JSON.parse(exported);wrong.sourceRules.rules.forEach(r=>r.courses=['DEMO2000']);assert.throws(()=>parseConfigurationBundle(JSON.stringify(wrong),settings));
});
