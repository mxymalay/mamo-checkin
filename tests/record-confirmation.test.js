import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmLowConfidenceRecord,fillMissingCode} from '../extension/record-confirmation.js';

const record={id:'one',status:'review',course:'FIT5120',date:'2026-09-04',time:'18:00',type:'Studio',group:'01-P2',code:'f59v7',confidence:.72};
test('manual missing code requires a complete, recent, unattempted session',()=>{
 const pending={...record,code:null,status:'waiting_code',sessionOnly:true};
 const now=Date.parse('2026-09-05T00:00:00+08:00');
 const filled=fillMissingCode(pending,' 8yg3g ',now);
 assert.equal(filled.code,'8YG3G');assert.equal(filled.status,'ready');assert.equal(filled.sessionOnly,false);
 for(const changed of [{date:null},{status:'submitted'},{attemptedAt:'now'},{code:'ABCDE'},{date:'2026-08-01'}])assert.throws(()=>fillMissingCode({...pending,...changed},'8YG3G',now));
 assert.throws(()=>fillMissingCode(pending,'12345',now));
});

test('manual confirmation normalizes a five-character code and makes the record eligible for the next run',()=>{
 const confirmed=confirmLowConfidenceRecord(record,Date.parse('2026-09-11T00:00:00+08:00'));
 assert.equal(confirmed.code,'F59V7');
 assert.equal(confirmed.status,'ready');
 assert.equal(confirmed.manualConfirmed,true);
 assert.equal(confirmed.manualConfirmedAt,'2026-09-10T16:00:00.000Z');
});

test('manual confirmation rejects incomplete or non-review records',()=>{
 assert.throws(()=>confirmLowConfidenceRecord({...record,status:'ready'}),/需要核对/);
 assert.throws(()=>confirmLowConfidenceRecord({...record,code:'BAD!'}),/5 位/);
 assert.throws(()=>confirmLowConfidenceRecord({...record,group:''}),/必须完整/);
});
