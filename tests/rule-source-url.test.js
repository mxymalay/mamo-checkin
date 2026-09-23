import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTestSourceUrl} from '../extension/source-rules/source-url.js';
const settings={moodleUrls:{DEMO1000:['https://learning.monash.edu/course/view.php?id=1']},edUrls:{DEMO1000:['https://edstem.org/au/courses/12']}};
test('test source URLs stay on a configured course and supported source page',()=>{
 assert.equal(validateTestSourceUrl('',{source:'ed',course:'DEMO1000',settings}),undefined);
 for(const [source,url] of [['ed','https://edstem.org/au/courses/12/discussion/34'],['moodle','https://learning.monash.edu/mod/forum/discuss.php?d=5'],['gmail','https://mail.google.com/mail/u/0/#all/abc123']])assert.equal(validateTestSourceUrl(url,{source,course:'DEMO1000',settings}),url);
 for(const [source,url] of [['ed','https://edstem.org/au/courses/13/discussion/34'],['moodle','https://learning.monash.edu/course/view.php?id=9'],['moodle','https://learning.monash.edu/login/index.php'],['gmail','https://mail.google.com.evil.test/mail/u/0/#all/x'],['gmail','https://u:p@mail.google.com/mail/u/0/#all/x']])assert.throws(()=>validateTestSourceUrl(url,{source,course:'DEMO1000',settings}));
});
