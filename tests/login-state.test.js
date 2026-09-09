import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {loginRedirect,readAuthenticatedPage,pageError} from '../extension/login-state.js';
import {attendanceAdapter} from '../extension/attendance.js';
import {moodleAdapter} from '../extension/moodle.js';
import {gmailAdapter} from '../extension/gmail.js';

test('closed tabs show the source name before and during page injection',async()=>{
 for(const site of ['Gmail','Moodle','Attendance']){
  const expected=`${site==='Attendance'?'Attendance 签到系统':site} 页面已被关闭，无法执行签到`;
  const closed=()=>{throw Error('No tab with id: 12345.');};
  await assert.rejects(readAuthenticatedPage({get:closed},12345,site,async()=>{}),{message:expected});
  await assert.rejects(readAuthenticatedPage({get:async()=>({url:'https://learning.monash.edu/'})},12345,site,closed),{message:expected});
  let reads=0;
  await assert.rejects(readAuthenticatedPage({get:async()=>{if(reads++)closed();return {url:'https://learning.monash.edu/'};}},12345,site,async()=>{throw Error('Frame removed');}),{message:expected});
 }
 const unrelated=Error('Network unavailable');assert.equal(pageError(unrelated,'Gmail'),unrelated);
});

test('recognizes exact SSO hosts and Moodle login paths without matching unrelated sites',()=>{
 for(const url of ['https://monashuni.okta.com/app/template_wsfed/example/sso/wsfed/passive','https://accounts.google.com/v3/signin/identifier','https://learning.monash.edu/login/index.php'])assert.equal(loginRedirect(url),true);
 for(const url of ['https://monashuni.okta.com.example.org/login','https://learning.monash.edu/course/view.php?id=1','https://attendance.monash.edu.my/student/Units.aspx','invalid'])assert.equal(loginRedirect(url),false);
});
test('redirect prompts name the source and do not inject into login pages',async()=>{
 let calls=0;
 await assert.rejects(readAuthenticatedPage({get:async()=>({url:'https://monashuni.okta.com/app/example'})},1,'Moodle',async()=>{calls++;}),/\[LOGIN_REQUIRED\].*Moodle/);
 assert.equal(calls,0);
});
test('redirect during injection becomes a login prompt; ordinary errors remain errors',async()=>{
 let reads=0;const tabs={get:async()=>({url:++reads===1?'https://mail.google.com/':'https://accounts.google.com/signin'})};
 await assert.rejects(readAuthenticatedPage(tabs,1,'Gmail',async()=>{throw Error('Cannot access contents');}),/\[LOGIN_REQUIRED\].*Gmail/);
 await assert.rejects(readAuthenticatedPage({get:async()=>({url:'https://mail.google.com/'})},1,'Gmail',async()=>{throw Error('Network unavailable');}),/^Error: Network unavailable$/);
});
test('login form structures are rejected before identity and content parsing',()=>{
 for(const [adapter,url,command] of [[attendanceAdapter,'https://attendance.monash.edu.my/','activities'],[moodleAdapter,'https://learning.monash.edu/login/index.php','read'],[gmailAdapter,'https://accounts.google.com/signin','list']]){
  const doc=new JSDOM('<form><input name="identifier"><input type="password"><input type="submit" value="Next"></form>',{url}).window.document;
  assert.throws(()=>adapter(command,{},doc),/\[LOGIN_REQUIRED\]/);
 }
});
