import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyBackgroundLogin} from '../extension/background-preflight.js';
const settings={email:'abcd1234@student.monash.edu',name:'Example Student',courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'},moodleUrls:{ABC1234:['https://learning.monash.edu/course/view.php?id=1']}};

test('Gmail work starts while Moodle is still waiting and does not block later identity checks',async()=>{
 let release,prefetch=false,moodleReads=0;
 const waiting=new Promise(resolve=>{release=resolve;});
 const phases=[];
 const done=verifyBackgroundLogin(settings,{
  request:async message=>message.type==='checkEmail'?{matched:true,email:settings.email,tabId:1}:message.type==='checkMoodle'&&moodleReads++===0?{needsLogin:true,loginRequired:true,tabId:2}:{matched:true,name:settings.name,tabId:message.type==='checkMoodle'?2:3},
  progress:async status=>{phases.push(status);},
  onGmailVerified:()=>{prefetch=true;return new Promise(()=>{});},
  pause:()=>waiting
 });
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(prefetch,true);const pending=phases.find(p=>p.waitingSite==='moodle');
 assert.equal(pending.loginRequired,true);assert.equal(pending.loginTabId,2);
 assert.ok(phases.some(p=>p.message==='开始检测 Moodle 登录状态'));
 release();assert.deepEqual(await done,{gmail:{tabId:1},moodle:{tabId:2},attendance:{tabId:3}});
 assert.equal(phases.at(-1).loginRequired,false);
});

test('unverified Gmail cannot start collection and a missing login times out',async()=>{
 let clock=0,prefetch=false;
 await assert.rejects(verifyBackgroundLogin(settings,{
  request:async()=>({matched:true,email:'other000@student.monash.edu',tabId:1}),
  progress:async()=>{},onGmailVerified:()=>{prefetch=true;},now:()=>clock,timeout:10,pause:async()=>{clock+=10;}
 }),/登录检测超时/);
 assert.equal(prefetch,false);
});
test('Moodle verification pauses prefetch before Attendance verification begins',async()=>{
 const events=[];
 await verifyBackgroundLogin(settings,{
  request:async message=>{events.push(message.type);return message.type==='checkEmail'?{matched:true,email:settings.email,tabId:1}:{matched:true,name:settings.name,tabId:2};},
  progress:async()=>{},onGmailVerified:()=>events.push('prefetch'),onSiteVerified:async site=>{if(site==='moodle')events.push('pause');}
 });
 assert.deepEqual(events,['checkEmail','prefetch','checkMoodle','pause','readIdentity']);
});
