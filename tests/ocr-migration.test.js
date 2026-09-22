import test from 'node:test';
import assert from 'node:assert/strict';
import {repairOcrState,OCR_REPAIR_VERSION} from '../extension/ocr-migration.js';
import {orderRecords} from '../extension/record-order.js';
test('old incomplete image messages are reread once without erasing records',()=>{
 const state={records:[{status:'review',imageId:'hash',messageId:'broken',date:null}],seenMessages:{broken:'seen',good:'seen'},seenThreads:{thread:'broken'}};
 const repair=repairOcrState(state);
 assert.deepEqual(repair.seenMessages,{good:'seen'});assert.deepEqual(repair.seenThreads,{});assert.equal(state.records.length,1);
 assert.equal(repairOcrState({...state,...repair}),null);assert.equal(repair.ocrRepairVersion,OCR_REPAIR_VERSION);
});
test('text-only and attempted records do not invalidate scanned threads',()=>{
 const state={records:[{status:'review',imageId:'text',messageId:'m'},{status:'review',imageId:'hash',messageId:'n',attemptedAt:'now'}],seenMessages:{m:1,n:1},seenThreads:{thread:'n'}};
 assert.deepEqual(repairOcrState(state).seenThreads,state.seenThreads);
});
test('newest weeks come first and unresolved records lead within a week',()=>{
 const records=[{id:1,date:'2026-09-20',status:'submitted'},{id:2,date:'2026-09-16',status:'waiting_code'},{id:3,date:'2026-09-09',status:'review'},{id:4,date:'2026-09-21',status:'submitted'}];
 assert.deepEqual(orderRecords(records).map(r=>r.id),[4,2,1,3]);
});
