import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRecord,linkCandidates} from '../extension/record-resolution.js';
import {mergeRecords} from '../extension/core.js';
import {submitPending} from '../extension/runner.js';
const source={id:'partial',course:'FIT5122',type:'Applied',group:'01',time:'18:00',code:null,date:null,status:'review',rawText:'partial'};
const target={...source,id:'session',date:'2026-09-16',code:'8YG3G',status:'submitted'};
test('explicit code transfer completes a session without submitting it',()=>{
 const coded={...source,code:'8YG3G'},waiting={...target,code:'',status:'waiting_code',sessionOnly:true};
 const request={id:coded.id,action:'link',targetId:waiting.id};
 const unchanged=resolveRecord([coded,waiting],request,'2026-09-17T00:00:00Z');assert.equal(unchanged[1].code,'');
 const completedLater=resolveRecord(unchanged,{id:coded.id,action:'use-linked-code'},'2026-09-17T00:00:00Z');
 assert.equal(completedLater[0].status,'linked');assert.equal(completedLater[1].code,'8YG3G');assert.equal(completedLater[1].status,'ready');assert.equal(completedLater[1].ocrEvidence.length,1);
 assert.throws(()=>resolveRecord(completedLater,{id:coded.id,action:'use-linked-code'},'2026-09-17T00:00:00Z'));
 const linked=resolveRecord([coded,waiting],{...request,useCode:true},'2026-09-17T00:00:00Z');assert.equal(linked[1].code,'8YG3G');assert.equal(linked[1].status,'ready');assert.equal(linked[1].sessionOnly,false);assert.equal(linked[1].manualConfirmed,true);
 assert.throws(()=>resolveRecord([{...coded,codeCandidates:['8YG3G','ABCDE']},waiting],{...request,useCode:true},'2026-09-17T00:00:00Z'));
 assert.throws(()=>resolveRecord([coded,{...waiting,status:'expired'}],{...request,useCode:true},'2026-09-17T00:00:00Z'));
 assert.throws(()=>resolveRecord([coded,waiting],{...request,useCode:true},'2026-10-17T00:00:00Z'));
});
test('manual linking preserves evidence and never changes target code or submission state',()=>{
 const linked=resolveRecord([source,target],{id:source.id,action:'link',targetId:target.id});
 assert.equal(linked[0].status,'linked');assert.equal(linked[1].status,'submitted');assert.equal(linked[1].code,'8YG3G');assert.equal(linked[1].ocrEvidence[0].rawText,'partial');
 assert.equal(mergeRecords(linked,[source])[0].status,'linked');
 const restored=resolveRecord(linked,{id:source.id,action:'restore'});assert.equal(restored[0].status,'review');assert.equal(restored[1].ocrEvidence.length,0);
});
test('restoring a code source removes its code unless check-in succeeded',()=>{
 const coded={...source,code:'8YG3G'},waiting={...target,code:'',status:'waiting_code',sessionOnly:true,reason:'missing'};
 const linked=resolveRecord([coded,waiting],{id:coded.id,action:'link',targetId:waiting.id,useCode:true},'2026-09-17T00:00:00Z');
 for(const status of ['ready','review','uncertain','attempting','expired']){
  const restored=resolveRecord([linked[0],{...linked[1],status,attemptedAt:'test'}],{id:coded.id,action:'restore'});
  assert.equal(restored[0].status,'review');assert.equal(restored[0].code,'8YG3G');
  assert.equal(restored[1].code,'');assert.equal(restored[1].status,'waiting_code');assert.equal(restored[1].sessionOnly,true);
  assert.equal(restored[1].manualConfirmed,undefined);assert.equal(restored[1].attemptedAt,undefined);assert.equal(restored[1].ocrEvidence.length,0);
 }
 const successful=resolveRecord([linked[0],{...linked[1],status:'submitted'}],{id:coded.id,action:'restore'});
 assert.equal(successful[1].code,'8YG3G');assert.equal(successful[1].status,'submitted');
 const legacy={...linked[1]};delete legacy.codeBeforeLink;
 assert.equal(resolveRecord([linked[0],legacy],{id:coded.id,action:'restore'})[1].code,'');
});
test('conflicting courses, fields or codes cannot be linked',()=>{
 for(const override of [{course:'ABC1234'},{group:'02'},{code:'ABCDE'}])assert.equal(linkCandidates([target],{...source,...override}).length,0);
 assert.throws(()=>resolveRecord([{...source,attemptedAt:'now'},target],{id:source.id,action:'link',targetId:target.id}));
});
test('ignore is reversible, survives rereads and never submits',async()=>{
 const ignored=resolveRecord([source],{id:source.id,action:'ignore'});
 assert.equal(mergeRecords(ignored,[{...source,code:'8YG3G',status:'ready'}])[0].status,'ignored');
 await submitPending({records:[{...ignored[0],code:'8YG3G'}]},{list:async()=>[],submit:async()=>assert.fail('ignored record submitted'),save:async()=>{}});
 assert.equal(resolveRecord(ignored,{id:source.id,action:'restore'})[0].status,'review');
});
