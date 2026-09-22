import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyBackgroundLogin} from '../extension/background-preflight.js';
const settings={email:'abcd1234@student.monash.edu',name:'Example Student',courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'},moodleUrls:{ABC1234:['https://learning.monash.edu/course/view.php?id=1']}};

test('Gmail work starts while Moodle is still waiting and does not block later identity checks',async()=>{
 let release,prefetch=false,moodleReads=0;
 const waiting=new Promise(resolve=>{release=resolve;});
 const phases=[];
 const done=verifyBackgroundLogin(settings,{
  request:async message=>message.type==='checkEmail'?{matched:true,email:settings.email,tabId:1}:message.type==='checkMoodle'&&moodleReads++===0?{needsLogin:true,tabId:2}:{matched:true,name:settings.name,tabId:message.type==='checkMoodle'?2:3},
  progress:async status=>{phases.push(status);},
  onGmailVerified:()=>{prefetch=true;return new Promise(()=>{});},
  pause:()=>waiting
 });
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(prefetch,true);assert.equal(phases[0].waitingSite,'moodle');
 release();assert.deepEqual(await done,{gmail:{tabId:1},moodle:{tabId:2},attendance:{tabId:3}});
});

test('unverified Gmail cannot start collection and a missing login times out',async()=>{
 let clock=0,prefetch=false;
 await assert.rejects(verifyBackgroundLogin(settings,{
  request:async()=>({matched:true,email:'other000@student.monash.edu',tabId:1}),
  progress:async()=>{},onGmailVerified:()=>{prefetch=true;},now:()=>clock,timeout:10,pause:async()=>{clock+=10;}
 }),/登录检测超时/);
 assert.equal(prefetch,false);
});
