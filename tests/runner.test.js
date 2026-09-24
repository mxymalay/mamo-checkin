import test from 'node:test';
import assert from 'node:assert/strict';
import {submitPending} from '../extension/runner.js';
const record={id:'one',course:'FIT5122',date:'2026-09-07',type:'Workshop',group:'01',time:'18:00',code:'ABCDE',confidence:1,status:'ready'};
const anchor=Date.parse('2026-09-08T00:00:00+08:00');
const activity={...record,state:'available',href:'https://attendance.monash.edu.my/student/Entry.aspx?s=123&d=7_Sep_26'};
test('a local lookback limit skips submission without claiming the portal expired',async()=>{
 const state={records:[{...record}]};let submissions=0;
 await submitPending(state,{list:async()=>[activity],save:async()=>{},submit:async()=>{submissions++;}},anchor+8*86400000);
 assert.equal(submissions,0);assert.equal(state.records[0].status,'ready');
});
test('complete low confidence review tries candidates only after explicit rejection',async()=>{
 const state={records:[{...record,status:'review',confidence:.1,codeCandidates:['8YG3G']}]};const tried=[];let completed=false;
 await submitPending(state,{list:async()=>[{...activity,state:completed?'completed':'available'}],save:async()=>{},submit:async r=>{tried.push(r.code);completed=r.code==='8YG3G';return {rejected:!completed};}},anchor);
 assert.deepEqual(tried,['ABCDE','8YG3G']);assert.equal(state.records[0].status,'submitted');
});
test('all rejections stop automatic retries and permit manual correction',async()=>{
 const state={records:[{...record,status:'review',codeCandidates:['8YG3G']}]};let count=0;
 const adapter={list:async()=>[activity],save:async()=>{},submit:async()=>{count++;return {rejected:true};}};
 await submitPending(state,adapter,anchor);await submitPending(state,adapter,anchor);
 assert.equal(count,2);assert.equal(state.records[0].candidatesExhausted,true);
 const {fillMissingCode}=await import('../extension/record-confirmation.js');
 const updated=fillMissingCode(state.records[0],'XY123',anchor);assert.equal(updated.status,'ready');assert.equal(updated.codeCandidates,undefined);assert.equal(updated.attemptedAt,undefined);
});
test('blocked, closed and ambiguous outcomes never try another candidate',async()=>{
 for(const kind of ['blocked','expired','unknown']){
  const state={records:[{...record,codeCandidates:['8YG3G']}]};let count=0;
  await submitPending(state,{list:async()=>[{...activity,state:kind==='expired'&&count?'expired':'available'}],save:async()=>{},submit:async()=>{count++;return kind==='blocked'?{blocked:true}:{entered:true};}},anchor);
  assert.equal(count,1);assert.equal(state.records[0].status,kind==='expired'?'expired':kind==='blocked'?'review':'uncertain');assert.equal(state.records[0].candidatesExhausted,undefined);
 }
});
test('recognition-only mode keeps codes without opening a form or attempting any candidate',async()=>{
 const original={...record,codeCandidates:['ABCDE','8YG3G']},state={settings:{recognitionOnly:true},records:[{...original}]};
 const fail=async()=>assert.fail('recognition-only must not enter submission workflow');
 const events=[];
 await submitPending(state,{list:fail,submit:fail,save:fail,progress:async event=>events.push(event)},anchor);
 assert.deepEqual(state.records,[original]);assert.match(events[0].message,/不填写或提交/);
});
test('checkpoint is durable before any submit and only website tick marks success',async()=>{
 let websiteComplete=false,saved=[];
 const state={records:[{...record}]};
 const adapter={list:async()=>[{...activity,state:websiteComplete?'completed':'available'}],submit:async r=>{assert.equal(saved.at(-1),'attempting');websiteComplete=true;},save:async()=>saved.push(state.records[0].status)};
 await submitPending(state,adapter,Date.parse('2026-09-08T00:00:00+08:00'));
 assert.equal(state.records[0].status,'submitted'); assert.deepEqual(saved,['attempting','submitted']);assert.equal(state.runSubmittedIds.has(state.records[0].id),true);
});
test('interrupted attempt checks existing success without resubmitting',async()=>{
 const state={records:[{...record,status:'attempting'}]}; let submits=0;
 await submitPending(state,{list:async()=>[{...activity,state:'completed'}],submit:async()=>submits++,save:async()=>{}},anchor);
 assert.equal(submits,0); assert.equal(state.records[0].status,'submitted');assert.equal(state.runSubmittedIds?.size||0,0);
});
test('uncertain outcomes are retried on later runs; the portal arbitrates',async()=>{
 const state={records:[{...record}]};let submits=0;
 const adapter={list:async()=>[activity],submit:async()=>{submits++;throw new Error('network lost');},save:async()=>{}};
 await submitPending(state,adapter,anchor); await submitPending(state,adapter,anchor);
 assert.equal(submits,2); assert.equal(state.records[0].status,'uncertain');
});
test('already completed and past expired code entries never submit',async()=>{
 const state={records:[{...record}]};let submits=0;
 await submitPending(state,{list:async()=>[{...activity,state:'expired'}],submit:async()=>submits++,save:async()=>{}},anchor);
 assert.equal(submits,0);assert.equal(state.records[0].status,'expired');
});
test('pause detected before checkpoint leaves a ready record untouched',async()=>{
 const state={records:[{...record}]};const saved=[];let submits=0;
 await submitPending(state,{list:async()=>[activity],beforeAttempt:async()=>false,submit:async()=>submits++,save:async()=>saved.push(state.records[0].status)},anchor);
 assert.equal(state.records[0].status,'ready');assert.equal(submits,0);assert.deepEqual(saved,[]);
});
test('adapter-certified no-entry abort restores ready instead of uncertain',async()=>{
 const state={records:[{...record}]};const saved=[];
 await submitPending(state,{list:async()=>[activity],beforeAttempt:async()=>true,submit:async()=>({entered:false,reason:'自动签到已暂停'}),save:async()=>saved.push(state.records[0].status)},anchor);
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
 },anchor);
 assert.deepEqual(clicks,['two']);
 assert.equal(persisted.records[0].status,'ready');assert.equal(persisted.records[1].status,'submitted');
 assert.match(persisted.records[0].reason,/archive download failed/);
});

test('failed recovery save reports the unresolved durable checkpoint and never submits',async()=>{
 const state={records:[{...record}]};let clicks=0;
 await assert.rejects(submitPending(state,{
   list:async()=>[activity],save:async()=>{throw new Error('storage unavailable');},submit:async()=>{clicks++;}
 },anchor),/恢复.*storage unavailable/);
 assert.equal(clicks,0);assert.equal(state.records[0].status,'attempting');
 assert.match(state.records[0].reason,/恢复/);
});
