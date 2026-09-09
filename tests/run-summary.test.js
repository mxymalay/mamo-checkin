import test from 'node:test';
import assert from 'node:assert/strict';
import {runSummaryRecords,summaryFingerprint} from '../extension/run-summary.js';
const now=Date.parse('2026-09-09T20:00:00+08:00');
const row=(id,status)=>({id,status,date:'2026-09-08',time:'18:00',code:''});
test('existing successes and unchanged historical failures are omitted; waiting sessions remain',()=>{
 const rows=[row('signed','submitted'),row('expired','expired'),row('waiting','waiting_code'),row('review','review')];
 const before=new Map(rows.map(r=>[r.id,summaryFingerprint(r)]));
 assert.deepEqual(runSummaryRecords(rows,before,new Set(),now).map(r=>r.id),['waiting']);
});
test('new submissions and changed failed attempts are shown, website-only confirmations are omitted',()=>{
 const rows=[row('new','submitted'),row('site','submitted'),{...row('failed','uncertain'),attemptedAt:'new'},row('expired','expired')];
 const before=new Map([['failed',summaryFingerprint(row('failed','ready'))]]);
 assert.deepEqual(runSummaryRecords(rows,before,new Set(['new']),now).map(r=>r.id),['new','failed','expired']);
});
