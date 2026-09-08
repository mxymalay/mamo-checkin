import test from 'node:test';
import assert from 'node:assert/strict';
import {syncSessionRecords} from '../extension/session-records.js';
import {mergeRecords,recordKey} from '../extension/core.js';
const now=Date.parse('2026-09-08T12:00:00+08:00');
const activity={course:'ABC1234',date:'2026-09-07',time:'18:00',type:'Workshop',group:'01',state:'available'};
const make=()=>({settings:{courses:['ABC1234'],schedules:{ABC1234:[{weekday:1,time:'18:00',type:'Workshop',group:'01'}]}},records:[],activities:[{...activity}]});
test('site sessions persist without codes and reconcile without duplicates',()=>{
 const state=make();syncSessionRecords(state,now);assert.equal(state.records[0].status,'waiting_code');assert.equal(state.records[0].code,'');syncSessionRecords(state,now);assert.equal(state.records.length,1);
 state.activities[0].state='completed';syncSessionRecords(state,now);assert.equal(state.records[0].status,'submitted');assert.match(state.records[0].reason,/网站原已签到/);
});
test('expired website sessions and aged waiting rows never become signed in',()=>{
 const state=make();state.activities[0].state='expired';syncSessionRecords(state,now);assert.equal(state.records[0].status,'expired');
 const waiting=make();syncSessionRecords(waiting,now);waiting.activities=[];syncSessionRecords(waiting,now+8*86400000);assert.equal(waiting.records[0].status,'expired');
});
test('a discovered code replaces a waiting placeholder instead of causing a code conflict',()=>{
 const state=make();syncSessionRecords(state,now);const incoming={...activity,id:recordKey(activity),status:'ready',code:'AB123',confidence:1};const merged=mergeRecords(state.records,[incoming]);assert.equal(merged.length,1);assert.equal(merged[0].status,'ready');assert.equal(merged[0].sessionOnly,undefined);
});
test('future and other group sessions are not added to the personal record list',()=>{
 const state=make();state.activities=[{...activity,group:'02'},{...activity,date:'2026-09-14'}];syncSessionRecords(state,now);assert.equal(state.records.length,0);
});
