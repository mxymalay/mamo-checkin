import test from 'node:test';
import assert from 'node:assert/strict';
import {popupCompletion,checkinAgo} from '../extension/popup-completion.js';
const now=Date.parse('2026-09-24T04:00:00Z');
const state=(minutes=10)=>({settings:{courses:['FIT5122'],intervalMinutes:60,enabled:false},status:{finishedAt:new Date(now-minutes*60000).toISOString(),summary:{submitted:1}}});
test('completion lasts until the interval or UTC+8 midnight, independent of auto mode',()=>{
 assert.equal(popupCompletion(state(),now).active,true);
 assert.equal(popupCompletion(state(60),now).active,false);
 assert.equal(popupCompletion(state(61),now).active,false);
 const previous=state();previous.settings.intervalMinutes=10080;
 previous.status.finishedAt='2026-09-23T15:59:59Z';assert.equal(popupCompletion(previous,now).active,false);
 previous.status.finishedAt='2026-09-23T16:00:00Z';assert.equal(popupCompletion(previous,now).active,true);
 previous.status.finishedAt='invalid';assert.equal(popupCompletion(previous,now).active,false);
 previous.status.finishedAt=new Date(now+60000).toISOString();assert.equal(popupCompletion(previous,now).active,false);
});
test('later quiet scans do not extend the last actual check-in time',()=>{
 const data=state();data.status.summary={quiet:true};
 data.records=[{course:'FIT5122',status:'submitted',attemptedAt:new Date(now-7200000).toISOString(),confirmedAt:new Date(now-7199000).toISOString()}];
 assert.equal(popupCompletion(data,now).active,false);
 data.records[0].confirmedAt=new Date(now-120000).toISOString();
 assert.equal(popupCompletion(data,now).active,true);
 assert.equal(popupCompletion(data,now).lastCheckinAt,now-120000);
 data.records[0].status='uncertain';assert.equal(popupCompletion(data,now).lastCheckinAt,0);
});
test('relative check-in text supports all UI languages',()=>{
 assert.equal(checkinAgo(now-120000,'zh',now),'上次签到时间：2分钟前');
 assert.equal(checkinAgo(now-7200000,'zh_TW',now),'上次簽到時間：2 小時前');
 assert.equal(checkinAgo(now-120000,'en',now),'Last check-in: 2 minutes ago');
});
