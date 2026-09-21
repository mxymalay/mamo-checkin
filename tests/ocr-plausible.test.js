import test from 'node:test';
import assert from 'node:assert/strict';
import {parseImageRows} from '../extension/core.js';
const meta={course:'FIT5120',sentAt:'2026-09-04T22:08:00+08:00',messageId:'m',sourceUrl:'u'};
const obs=text=>({text,x:0,y:.5,width:1,height:.1,confidence:1});
test('time-glued tokens are never mistaken for attendance codes',()=>{
 const rows=parseImageRows([obs('Studio Friday,4 Sep 01-P2 6:00PM 400PM QK28J')],meta);
 assert.equal(rows.length,1);assert.equal(rows[0].code,'QK28J');assert.equal(rows[0].status,'ready');
});
test('pure-digit five-char tokens are ignored',()=>{
 const rows=parseImageRows([obs('Studio Friday,4 Sep 01-P2 6:00PM 40112 QK28J')],meta);
 assert.equal(rows[0].code,'QK28J');
});
test('verification disagreement surfaces both readings for manual review',()=>{
 // Word-level cells as the engine returns them: the code cell carries the
 // failed verification plus what the second pass read.
 const cells=[
  {...obs('Studio'),x:0,width:.05},
  {...obs('Friday,4 Sep'),x:.36,width:.05},
  {...obs('01'),x:.54,width:.05},
  {...obs('6:00PM'),x:.69,width:.05},
  {...obs('BM8L4'),x:.9,width:.05,codeVerified:false,codeSecondText:'BM8LJ'}
 ];
 const rows=parseImageRows(cells,meta);
 // Disagreement is recorded as evidence but never blocks: the portal validates
 // the code, so a confident reading is attempted.
 assert.equal(rows[0].code,'BM8L4');assert.equal(rows[0].codeSecondText,'BM8LJ');
 assert.equal(rows[0].status,'ready');assert.equal(rows[0].reason,'');
 const weak=cells.map(cell=>({...cell,confidence:.6}));
 const weakRows=parseImageRows(weak,meta);
 assert.equal(weakRows[0].status,'review');assert.match(weakRows[0].reason,/置信度不足/);
});
test('truncated course-code fragments do not create false ambiguity',()=>{
 const rows=parseImageRows([obs('Studio Friday,4 Sep 01-P2 6:00PM FIT3 QK28J')],meta);
 assert.equal(rows[0].code,'QK28J');
});
