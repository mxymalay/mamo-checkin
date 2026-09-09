import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMoodleTableRow} from '../extension/moodle-table.js';
import {processCollectedMessages} from '../extension/workflow.js';
const meta={course:'ABC1234',messageId:'synthetic-week',sentAt:'2025-08-02T23:59:00+08:00'};
test('date-first Moodle rows preserve date, start/end time and code without inventing group',()=>{
 const r=parseMoodleTableRow('Workshop 31 Jul 2025, Thursday 8 p.m. to 10 p.m. ABC12',meta,0);
 assert.equal(r.date,'2025-07-31');assert.equal(r.time,'20:00');assert.equal(r.endTime,'22:00');assert.equal(r.code,'ABC12');assert.equal(r.group,null);assert.equal(r.status,'review');
 const noon=parseMoodleTableRow('Tutorial 1 Aug 2025, Friday 12 p.m. to 2 p.m. XYZ34',meta,1);assert.equal(noon.time,'12:00');
});
test('invalid date, weekday and time range cannot become ready',()=>{
 for(const row of ['Workshop 31 Feb 2025, Thursday 8 p.m. to 10 p.m. ABC12','Workshop 31 Jul 2025, Friday 8 p.m. to 10 p.m. ABC12','Workshop 31 Jul 2025, Thursday 13 p.m. to 2 p.m. ABC12'])assert.equal(parseMoodleTableRow(row,meta,0).status,'review');
 assert.equal(parseMoodleTableRow('Workshop 31 Jul 2025, Thursday 8 p.m. to 10 p.m. ABC12 XYZ34',meta,0),null);
});
test('real processing pipeline handles date-first tables without OCR or submission',async()=>{
 const state={records:[],seenMessages:{},diagnostics:[]};
 await processCollectedMessages(state,[{...meta,sourceType:'moodle',dateWindow:{from:'2025-07-27',to:'2025-08-02'},textRows:['Type Date Time Code','Workshop 31 Jul 2025, Thursday 8 p.m. to 10 p.m. ABC12'],images:[]}],{save:async()=>{},getImage:async()=>{throw Error('No images');},ocr:async()=>{throw Error('No OCR');}});
 assert.equal(state.records.length,1);assert.equal(state.records[0].date,'2025-07-31');assert.equal(state.records[0].status,'review');
});
