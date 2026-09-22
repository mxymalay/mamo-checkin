import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoRecords} from '../extension/demo-records.js';
import {displayStatus} from '../extension/record-status.js';
import {resolveRecord} from '../extension/record-resolution.js';
test('demo covers lifecycle states and complementary missing fields',()=>{
 const now=Date.parse('2026-09-22T09:00:00+08:00'),records=createDemoRecords(now);
 const statuses=new Set(records.map(r=>displayStatus(r,now)));
 for(const status of ['ready','submitted','review','uncertain','attempting','expired','waiting_code','not_started'])assert.ok(statuses.has(status));
 assert.equal(records.length,13);assert.ok(records.every(r=>r.demo));
 assert.equal(records.find(r=>r.id==='demo-all-rejected').candidatesExhausted,true);
 assert.equal(records.find(r=>r.id==='demo-attempt-blocked').attemptBlocked,true);
 const linked=resolveRecord(records,{id:'demo-partial',action:'link',targetId:'demo-session',useCode:true},new Date(now).toISOString());
 assert.equal(linked.find(r=>r.id==='demo-session').code,'8YG3G');assert.equal(linked.find(r=>r.id==='demo-session').status,'ready');assert.equal(linked.find(r=>r.id==='demo-partial').status,'linked');
 assert.equal(records[0].code,'');
});
