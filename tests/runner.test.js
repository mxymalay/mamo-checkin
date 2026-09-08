import test from 'node:test';
import assert from 'node:assert/strict';
import {submitPending} from '../extension/runner.js';
const record={id:'one',course:'FIT5122',date:'2026-09-07',type:'Workshop',group:'01',time:'18:00',code:'ABCDE',confidence:1,status:'ready'};
const activity={...record,state:'available',href:'https://attendance.monash.edu.my/student/Entry.aspx?s=123&d=7_Sep_26'};
test('checkpoint is durable before any submit and only website tick marks success',async()=>{
 let websiteComplete=false,saved=[];
 const state={records:[{...record}]};
 const adapter={list:async()=>[{...activity,state:websiteComplete?'completed':'available'}],submit:async r=>{assert.equal(saved.at(-1),'attempting');websiteComplete=true;},save:async()=>saved.push(state.records[0].status)};
 await submitPending(state,adapter,Date.parse('2026-09-08T00:00:00+08:00'));
 assert.equal(state.records[0].status,'submitted'); assert.deepEqual(saved,['attempting','submitted']);assert.equal(state.runSubmittedIds.has(state.records[0].id),true);
});
test('interrupted attempt checks existing success without resubmitting',async()=>{
 const state={records:[{...record,status:'attempting'}]}; let submits=0;
 await submitPending(state,{list:async()=>[{...activity,state:'completed'}],submit:async()=>submits++,save:async()=>{}},Date.now());
 assert.equal(submits,0); assert.equal(state.records[0].status,'submitted');assert.equal(state.runSubmittedIds?.size||0,0);
});
test('unknown submit outcome is retained and does not automatically retry',async()=>{
 const state={records:[{...record}]};let submits=0;
 const adapter={list:async()=>[activity],submit:async()=>{submits++;throw new Error('network lost');},save:async()=>{}};
 await submitPending(state,adapter,Date.now()); await submitPending(state,adapter,Date.now());
 assert.equal(submits,1); assert.equal(state.records[0].status,'uncertain');
});
test('already completed and past expired code entries never submit',async()=>{
 const state={records:[{...record}]};let submits=0;
 await submitPending(state,{list:async()=>[{...activity,state:'expired'}],submit:async()=>submits++,save:async()=>{}},Date.now());
 assert.equal(submits,0);assert.equal(state.records[0].status,'expired');
});
test('pause detected before checkpoint leaves a ready record untouched',async()=>{
 const state={records:[{...record}]};const saved=[];let submits=0;
 await submitPending(state,{list:async()=>[activity],beforeAttempt:async()=>false,submit:async()=>submits++,save:async()=>saved.push(state.records[0].status)},Date.now());
 assert.equal(state.records[0].status,'ready');assert.equal(submits,0);assert.deepEqual(saved,[]);
});
test('adapter-certified no-entry abort restores ready instead of uncertain',async()=>{
 const state={records:[{...record}]};const saved=[];
 await submitPending(state,{list:async()=>[activity],beforeAttempt:async()=>true,submit:async()=>({entered:false,reason:'自动签到已暂停'}),save:async()=>saved.push(state.records[0].status)},Date.now());
 assert.equal(state.records[0].status,'ready');assert.equal(state.records[0].reason,'自动签到已暂停');assert.deepEqual(saved,['attempting','ready']);
});

test('failed checkpoint restores ready durably without clicking and continues other records',async()=>{
 const second={...record,id:'two',group:'02'};
 const state={records:[{...record},{...second}]};
 let persisted,firstFailure=true,complete=false;
 const clicks=[];
 await submitPending(state,{
   list:async()=>[activity,{...activity,...second,state:complete?'completed':'available'}],
   save:async()=>{persisted=structuredClone(state);if(firstFailure){firstFailure=false;throw new Error('archive download failed');}},
   submit:async r=>{clicks.push(r.id);complete=true;}
 });
 assert.deepEqual(clicks,['two']);
 assert.equal(persisted.records[0].status,'ready');assert.equal(persisted.records[1].status,'submitted');
 assert.match(persisted.records[0].reason,/archive download failed/);
});

test('failed recovery save reports the unresolved durable checkpoint and never submits',async()=>{
 const state={records:[{...record}]};let clicks=0;
 await assert.rejects(submitPending(state,{
   list:async()=>[activity],save:async()=>{throw new Error('storage unavailable');},submit:async()=>{clicks++;}
 }),/恢复.*storage unavailable/);
 assert.equal(clicks,0);assert.equal(state.records[0].status,'attempting');
 assert.match(state.records[0].reason,/恢复/);
});
