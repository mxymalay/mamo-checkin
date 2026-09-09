import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {moodleCourseId,displayMoodleEntries,bindMoodleCourseInput} from '../extension/moodle-course-id.js';
import {DEFAULTS,normalizeSettings} from '../extension/settings.js';

test('course IDs accept full course links but never reinterpret forum IDs',()=>{
 for(const value of ['35417',' https://learning.monash.edu/course/view.php?id=35417&section=7 '])assert.equal(moodleCourseId(value),'35417');
 for(const value of ['0','-2','https://learning.monash.edu/mod/forum/view.php?id=35417','https://example.org/course/view.php?id=35417','https://learning.monash.edu/course/view.php?id=1&id=2'])assert.throws(()=>moodleCourseId(value));
 const legacy='https://learning.monash.edu/mod/forum/view.php?id=42';
 assert.equal(displayMoodleEntries(['https://learning.monash.edu/course/view.php?id=35417',legacy]),`35417\n${legacy}`);
});
test('pasting a course URL updates both ID input and course link',()=>{
 const dom=new JSDOM('<textarea></textarea><a></a>');
 const input=dom.window.document.querySelector('textarea'),link=dom.window.document.querySelector('a');
 bindMoodleCourseInput(input,link);
 input.value='https://learning.monash.edu/course/view.php?id=35417';input.dispatchEvent(new dom.window.Event('input'));
 assert.equal(input.value,'35417');assert.equal(link.href,'https://learning.monash.edu/course/view.php?id=35417');
});
test('settings deduplicate equivalent IDs and URLs and preserve legacy sources',()=>{
 const url='https://learning.monash.edu/course/view.php?id=35417',legacy='https://learning.monash.edu/mod/forum/view.php?id=42';
 const cfg=normalizeSettings(DEFAULTS,{email:'abcd1234@student.monash.edu',name:'Example Student',courses:['FIT5201'],moodleUrls:{FIT5201:['35417',url,legacy]}});
 assert.deepEqual(cfg.moodleUrls.FIT5201,[url,legacy]);
 assert.deepEqual(normalizeSettings(cfg,{}).moodleUrls,cfg.moodleUrls);
});
