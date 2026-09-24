import test from 'node:test';
import assert from 'node:assert/strict';
import {validateHistoryRange,runHistoryLookup,attendanceDateRange} from '../extension/history-lookup.js';
test('website coverage uses actual dates including future dates rather than a rolling fortnight',()=>{
 assert.deepEqual(attendanceDateRange(['27_Sep_26','13_Sep_26','24_Sep_26','bad']),{from:'2026-09-13',to:'2026-09-27'});
 assert.equal(attendanceDateRange([]),null);
});
test('outside-range rows do not make lookup partial and saved website observations survive',async()=>{
 const records=['2026-07-01','2026-07-02'].map(date=>({course:'DEMO1000',date,time:'18:00',type:'Workshop',group:'01',status:'ready'}));
 const io={now:()=>'',persist:async()=>{},readAttendance:async()=>({from:'2026-09-13',to:'2026-09-27'}),history:async()=>[{...records[1],websiteState:'completed',observedAt:'2026-07-03'}],collect:async()=>({complete:true}),progress:async()=>{}};
 const result=await runHistoryLookup({records,settings:{}},{from:'2026-07-01',to:'2026-09-24'},io);
 assert.equal(result.phase,'complete');assert.deepEqual(result.warnings,[]);
 assert.equal(result.rows[0].websiteState,'outside-range');assert.equal(result.rows[1].websiteState,'completed');assert.equal(result.rows[1].observedAt,'2026-07-03');
 records.push({...records[0],date:'2026-09-14'});
 const partial=await runHistoryLookup({records,settings:{}},{from:'2026-07-01',to:'2026-09-24'},io);
 assert.equal(partial.phase,'partial');assert.match(partial.warnings[0],/1 条记录/);
});
test('unobserved historical attendance makes an otherwise successful lookup partial',async()=>{
 const result=await runHistoryLookup({records:[{course:'DEMO1000',date:'2026-08-01',time:'18:00',code:'AB123',status:'ready'}],settings:{}},{from:'2026-08-01',to:'2026-09-01'},{now:()=>'',persist:async()=>{},history:async()=>[],readAttendance:async()=>{},collect:async()=>({complete:true}),progress:async()=>{}});
 assert.equal(result.phase,'partial');assert.match(result.warnings[0],/1 条记录/);assert.equal(result.rows[0].websiteState,'unknown');
});
test('history range validates actual dates, order and maximum span',()=>{
 for(const range of [{from:'2026-02-30',to:'2026-03-01'},{from:'2026-09-01',to:'2026-08-01'},{from:'2020-01-01',to:'2026-01-01'}])assert.throws(()=>validateHistoryRange(range));
 assert.deepEqual(validateHistoryRange({from:'2026-08-01',to:'2026-09-24'}),{from:'2026-08-01',to:'2026-09-24'});
});
test('history lookup keeps partial results, isolates records and never submits',async()=>{
 const persisted=[],calls=[];const range={from:'2026-08-01',to:'2026-09-24'};
 const state={records:[],settings:{courses:['DEMO1000']}};
 const result=await runHistoryLookup(state,range,{
  persist:async value=>persisted.push(structuredClone(value)),
  readAttendance:async()=>calls.push('attendance'),
  collect:async source=>{calls.push(source);if(source==='moodle')throw new Error('login required');state.records.push({course:'DEMO1000',date:'2026-08-10',time:'18:00',type:'Applied',group:'01',code:'AB123',status:'ready'});return {complete:true};},
  history:async()=>[],progress:async()=>{},now:()=> '2026-09-24T00:00:00Z'
 });
 assert.deepEqual(calls,['attendance','gmail','moodle','ed']);assert.equal(result.phase,'partial');
 assert.equal(result.rows[0].websiteState,'unknown');assert.ok(result.warnings.some(w=>w.includes('moodle')));
 assert.ok(persisted.some(p=>p.phase==='running'));assert.equal(persisted.at(-1).phase,'partial');
});
