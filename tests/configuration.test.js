import test from 'node:test';
import assert from 'node:assert/strict';
import {parseConfiguration} from '../extension/configuration.js';
import {DEFAULTS} from '../extension/settings.js';
const settings={...DEFAULTS,email:'student@example.edu',name:'Example Student',enabled:true,courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'},subjectKeywords:{ABC1234:'ABC1234'},moodleUrls:{ABC1234:['https://learning.monash.edu/course/view.php?id=1']}};
test('personal configuration imports validated settings without changing blank defaults or importing records',()=>{
  const imported=parseConfiguration(JSON.stringify({format:'attendance-settings-v1',settings:{...settings,records:[{code:'ABCDE'}]}}),DEFAULTS);
  assert.equal(imported.email,settings.email);assert.equal(imported.enabled,true);assert.deepEqual(imported.moodleUrls,settings.moodleUrls);
  assert.equal(imported.records,undefined);assert.equal(DEFAULTS.email,'');assert.deepEqual(DEFAULTS.courses,[]);
});
test('import preserves the existing account-change guard and rejects unsafe source URLs',()=>{
  assert.throws(()=>parseConfiguration(JSON.stringify({format:'attendance-settings-v1',settings:{...settings,email:'another@example.edu'}}),settings,true),/切换账号/);
  assert.throws(()=>parseConfiguration(JSON.stringify({format:'attendance-settings-v1',settings:{...settings,moodleUrls:{ABC1234:['https://example.com/']}}}),DEFAULTS),/网址/);
  assert.throws(()=>parseConfiguration('{}',DEFAULTS),/个人配置/);
});
