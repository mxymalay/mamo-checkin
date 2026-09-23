import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTestDateRange,validateTestDateRange,testMessageDateState,gmailTestDateBounds} from '../extension/source-rules/test-date-range.js';
test('default test range covers fourteen local dates including today in UTC+8',()=>{
 assert.deepEqual(defaultTestDateRange(Date.parse('2026-09-23T17:00:00Z')),{from:'2026-09-11',to:'2026-09-24'});
 assert.deepEqual(defaultTestDateRange(Date.parse('2026-09-30T16:00:00Z')),{from:'2026-09-18',to:'2026-10-01'});
});
test('ranges reject invalid and reversed calendar dates',()=>{
 for(const value of [{from:'2026-02-30',to:'2026-03-01'},{from:'2026-09-24',to:'2026-09-18'},{from:'',to:'2026-09-24'},'bad'])assert.throws(()=>validateTestDateRange(value),/invalid-test-date-range/);
});
test('known publication dates and week ranges filter both bounds without guessing undated content',()=>{
 const range={from:'2026-09-18',to:'2026-09-24'};
 assert.equal(testMessageDateState({sentAt:'2026-09-17T16:00:00Z'},range),'inside');
 assert.equal(testMessageDateState({sentAt:'2026-09-17T15:59:59Z'},range),'outside');
 assert.equal(testMessageDateState({sentAt:'2026-09-24T16:00:00Z'},range),'outside');
 assert.equal(testMessageDateState({dateWindow:{from:'2026-09-14',to:'2026-09-20'}},range),'inside');
 assert.equal(testMessageDateState({dateWindow:{from:'2026-09-25',to:'2026-09-30'}},range),'outside');
 assert.equal(testMessageDateState({sentAt:'2026-01-01',dateReferenceOnly:true},range),'unknown');
 assert.equal(testMessageDateState({},range),'unknown');
 assert.match(gmailTestDateBounds(range),/^after:\d+ before:\d+$/);
});
