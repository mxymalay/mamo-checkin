import test from 'node:test';
import assert from 'node:assert/strict';
import {parseConfiguration,exportConfiguration} from '../extension/configuration.js';
import {DEFAULTS} from '../extension/settings.js';
const settings={...DEFAULTS,email:'abcd1234@student.monash.edu',name:'Example Student',enabled:true,courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'},subjectKeywords:{ABC1234:'ABC1234'},moodleUrls:{ABC1234:['https://learning.monash.edu/course/view.php?id=1']}};
test('personal configuration imports validated settings without changing blank defaults or importing records',()=>{
  const imported=parseConfiguration(JSON.stringify({format:'attendance-settings-v1',settings:{...settings,records:[{code:'ABCDE'}]}}),DEFAULTS);
  assert.equal(imported.email,settings.email);assert.equal(imported.enabled,true);assert.deepEqual(imported.moodleUrls,settings.moodleUrls);
  assert.equal(imported.records,undefined);assert.equal(DEFAULTS.email,'');assert.deepEqual(DEFAULTS.courses,[]);
});
test('import preserves the existing account-change guard and rejects unsafe source URLs',()=>{
  assert.throws(()=>parseConfiguration(JSON.stringify({format:'attendance-settings-v1',settings:{...settings,email:'othr1234@student.monash.edu'}}),settings,true),/切换账号/);
  assert.throws(()=>parseConfiguration(JSON.stringify({format:'attendance-settings-v1',settings:{...settings,moodleUrls:{ABC1234:['https://example.com/']}}}),DEFAULTS),/网址/);
  assert.throws(()=>parseConfiguration('{}',DEFAULTS),/个人配置/);
});

test('exported configuration round trips through import without records or runtime data',()=>{
 const original={...settings,schedules:{ABC1234:[{weekday:2,time:'18:00',type:'Studio',group:'01'}]},records:[{code:'PRIVATE'}],token:'secret',detectedSessions:{ABC1234:[]}};
 const text=exportConfiguration(original),output=JSON.parse(text);
 assert.equal(output.format,'attendance-settings-v1');assert.equal(text.includes('PRIVATE'),false);assert.equal(text.includes('secret'),false);assert.equal(output.settings.detectedSessions,undefined);
 const restored=parseConfiguration(text,DEFAULTS);assert.equal(restored.email,settings.email);assert.deepEqual(restored.schedules,original.schedules);assert.deepEqual(restored.senders,settings.senders);assert.equal(restored.enabled,true);
});
