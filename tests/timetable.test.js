import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedSessions,courseNeedsSource,recordInSchedule} from '../extension/timetable.js';
const now=Date.parse('2026-09-08T19:00:00+08:00');
const settings={courses:['ABC1234'],schedules:{ABC1234:[{weekday:1,time:'18:00',type:'Workshop',group:'01'},{weekday:2,time:'18:00',type:'Applied',group:'01'}]}};
const records=expected=>expected.map(slot=>({...slot,status:'ready',confidence:1,code:'ABCDE'}));
test('weekly slots expand only into started sessions in the last seven days',()=>{
 const slots=expectedSessions(settings,'ABC1234',now);
 assert.deepEqual(slots.map(s=>[s.date,s.time]),[['2026-09-07','18:00'],['2026-09-08','18:00']]);
 assert.equal(expectedSessions({schedules:{}},'ABC1234',now),null);
});
test('one found code only closes its matching slot; other scheduled sessions keep scanning',()=>{
 const slots=expectedSessions(settings,'ABC1234',now),state={settings,records:records(slots.slice(0,1))};
 assert.equal(courseNeedsSource(state,'ABC1234',now),true);
 state.records=records(slots);assert.equal(courseNeedsSource(state,'ABC1234',now),false);
 state.records[1].status='review';assert.equal(courseNeedsSource(state,'ABC1234',now),true);
});
test('website-completed slots need no code search, while another group never closes a slot',()=>{
 const slots=expectedSessions(settings,'ABC1234',now),state={settings,records:[],activities:slots.map(s=>({...s,state:'completed'}))};
 assert.equal(courseNeedsSource(state,'ABC1234',now),false);
 state.activities[1].group='02';assert.equal(courseNeedsSource(state,'ABC1234',now),true);
});
test('timetable is also enforced immediately before submitting saved records',()=>{
 const [slot]=expectedSessions(settings,'ABC1234',now);
 assert.equal(recordInSchedule(settings,slot,now),true);
 assert.equal(recordInSchedule(settings,{...slot,time:'20:00'},now),false);
 assert.equal(recordInSchedule(settings,{...slot,group:'02'},now),false);
 assert.equal(recordInSchedule({schedules:{}},slot,now),true);
});
test('unspecified group with multiple concurrent site activities never assumes all are done',()=>{
 const cfg={schedules:{ABC1234:[{weekday:1,time:'18:00',type:'Workshop',group:''}]}};
 const [slot]=expectedSessions(cfg,'ABC1234',now);
 const state={settings:cfg,records:[],activities:[{...slot,group:'01',state:'completed'},{...slot,group:'02',state:'available'}]};
 assert.equal(courseNeedsSource(state,'ABC1234',now),true);
});

test('automatic targets exclude old, future, completed and ambiguous group sessions',async()=>{
 const {detectSessions}=await import('../extension/timetable.js');
 const now=Date.parse('2026-09-08T20:00:00+08:00');
 const base={course:'ABC1234',date:'2026-09-08',time:'18:00',type:'Studio',group:'01',state:'available'};
 assert.equal(detectSessions([base,{...base,state:'completed',date:'2026-09-07'},{...base,date:'2026-08-31'},{...base,date:'2026-09-09'}],'ABC1234',now).sessions.length,1);
 const ambiguous=detectSessions([base,{...base,group:'02'}],'ABC1234',now);
 assert.equal(ambiguous.sessions.length,0);assert.equal(ambiguous.needsConfirmation,true);
});
test('fixed weekly schedule includes completed sessions and deduplicates rows',async()=>{
 const {detectWeeklySchedule}=await import('../extension/timetable.js');
 const row={course:'ABC1234',date:'2026-09-07',time:'18:00',type:'Workshop',group:'01',state:'completed'};
 const result=detectWeeklySchedule([row,row,{...row,date:'2026-09-02',type:'Applied'}],'ABC1234',Date.parse('2026-09-08T20:00:00+08:00'));
 assert.deepEqual(result.schedule.map(r=>[r.weekday,r.type]),[[1,'Workshop'],[3,'Applied']]);
});
