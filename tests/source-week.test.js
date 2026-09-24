import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceWeek} from '../extension/source-week.js';
test('week comes from title, body, scoped section or image, never guessed from dates',()=>{
 for(const context of [{subject:'Week 8 Summary'},{textRows:['Attendance for teaching week: 08']},{weekContext:['第 8 周']},{rawText:'WEEK-8 Attendance'}])assert.equal(sourceWeek(context)?.number,8);
 assert.equal(sourceWeek({subject:'Week 8',textRows:['Week 9']}),null);
 assert.equal(sourceWeek({subject:'Weeks 8-9'}),null);
 assert.equal(sourceWeek({subject:'Week 8-9'}),null);
 assert.equal(sourceWeek({date:'2026-09-24'}),null);
 assert.equal(sourceWeek({subject:'Week 800'}),null);
});
