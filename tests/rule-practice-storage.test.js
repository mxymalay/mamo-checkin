import test from 'node:test';
import assert from 'node:assert/strict';
import {createPracticeStorage} from '../extension/source-rules/practice/storage.js';
import {createRuleLibrary} from '../extension/source-rules/library.js';
import {practiceSettings} from '../extension/source-rules/practice/assets.js';
import {fixtureRule,memoryStorage} from './helpers/source-rules.js';

test('practice storage cannot touch real data, even with the same course name',async()=>{
 const raw=memoryStorage({settings:{courses:['DEMO1000']},records:[{id:'real'}],sourceRuleLibrary:{real:true}});
 raw.remove=async keys=>keys.forEach(k=>delete raw.values[k]);
 const isolated=createPracticeStorage(raw);
 await isolated.set({sourceRuleBindings:{DEMO1000:{moodle:['local:local.example']}}});
 assert.equal(raw.values.sourceRuleBindings,undefined);
 assert.deepEqual((await isolated.get(['settings'])).settings,practiceSettings);
 for(const key of ['settings','records','attendanceHistory','practice:sourceRuleLibrary','__proto__'])await assert.rejects(isolated.set(Object.fromEntries([[key,{}]])));
 await isolated.reset();
 assert.deepEqual(Object.fromEntries(Object.entries(raw.values).filter(([key])=>!key.startsWith('practice:'))),{settings:{courses:['DEMO1000']},records:[{id:'real'}],sourceRuleLibrary:{real:true}});
});
test('reset changes the edit token even when the practice store was empty',async()=>{
 const raw=memoryStorage();raw.remove=async keys=>keys.forEach(k=>delete raw.values[k]);const isolated=createPracticeStorage(raw),library=createRuleLibrary({storage:isolated,builtins:[]});
 const token=await library.editToken();await isolated.reset();assert.notEqual(await library.editToken(),token);
 await assert.rejects(library.saveGenerated({rule:fixtureRule({id:'local.practice.example'}),settings:practiceSettings,expectedToken:token}),/builder-library-changed/);
 assert.equal((await library.list()).rules.length,0);
});
test('real rule-library validation, persistence and edit tokens operate inside practice only',async()=>{
 const raw=memoryStorage();raw.remove=async keys=>keys.forEach(k=>delete raw.values[k]);
 const one=createRuleLibrary({storage:createPracticeStorage(raw),builtins:[]}),two=createRuleLibrary({storage:createPracticeStorage(raw),builtins:[]});
 const token=await one.editToken(),rule=fixtureRule({id:'local.practice.example'});
 await one.saveGenerated({rule,settings:practiceSettings,expectedToken:token,enableCourses:['DEMO1000']});
 assert.equal((await two.list()).rules.length,1);
 await assert.rejects(two.saveGenerated({rule,settings:practiceSettings,expectedToken:token}),/builder-library-changed/);
 assert.ok(Object.keys(raw.values).every(k=>k.startsWith('practice:')));
});
