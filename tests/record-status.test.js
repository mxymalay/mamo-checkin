import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionWeek,sessionNotStarted,displayStatus,weekQualifier} from '../extension/record-status.js';

// Malaysia-time week anchor: 2026-09-14 is the Monday of the week containing
// 2026-09-15 and 2026-09-16; 2026-09-08 is the previous week, 2026-09-21 the next.
const now=Date.parse('2026-09-16T02:00:00Z');
const record=over=>({date:'2026-09-15',time:'18:00',...over});

test('sessionWeek anchors to Malaysia-time Monday weeks',()=>{
 assert.equal(sessionWeek(record(),now),'current');
 assert.equal(sessionWeek(record({date:'2026-09-08'}),now),'previous');
 assert.equal(sessionWeek(record({date:'2026-09-21'}),now),'upcoming');
 assert.equal(sessionWeek(record({date:''}),now),null);
 assert.equal(sessionWeek(record({date:'not-a-date'}),now),null);
});

test('sessionNotStarted uses the Malaysia-time class start',()=>{
 assert.equal(sessionNotStarted(record({time:'18:00'}),now),false);
 assert.equal(sessionNotStarted(record({time:'23:59'}),Date.parse('2026-09-15T14:00:00Z')),true);
 assert.equal(sessionNotStarted({date:'',time:''}),false);
});

test('displayStatus maps future ready and waiting_code sessions to not_started',()=>{
 assert.equal(displayStatus(record({status:'ready',time:'23:59'}),Date.parse('2026-09-15T10:00:00Z')),'not_started');
 assert.equal(displayStatus(record({status:'waiting_code',time:'23:59'}),Date.parse('2026-09-15T10:00:00Z')),'not_started');
 assert.equal(displayStatus(record({status:'ready'}),now),'ready');
 assert.equal(displayStatus(record({status:'review',time:'23:59'}),Date.parse('2026-09-15T10:00:00Z')),'review');
 assert.equal(displayStatus(record({status:'submitted'}),now),'submitted');
});

test('weekQualifier only labels unresolved statuses',()=>{
 assert.equal(weekQualifier(record({status:'waiting_code'}),now),'本周');
 assert.equal(weekQualifier(record({status:'waiting_code',date:'2026-09-08'}),now),'上周');
 assert.equal(weekQualifier(record({status:'review'}),now),'本周');
 assert.equal(weekQualifier(record({status:'uncertain',date:'2026-09-08'}),now),'上周');
 assert.equal(weekQualifier(record({status:'ready'}),now),'');
 assert.equal(weekQualifier(record({status:'submitted'}),now),'');
 assert.equal(weekQualifier(record({status:'waiting_code',date:'2026-09-21'}),now),'');
 assert.equal(weekQualifier(record({status:'waiting_code',date:''}),now),'');
});
