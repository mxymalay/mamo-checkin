import test from 'node:test';
import assert from 'node:assert/strict';
import {checkinResult} from '../extension/checkin-result.js';
test('expired and partially completed runs cannot show full success',()=>{
 for(const submitted of [0,1]){const r=checkinResult({submitted,courses:[{expired:1,completed:1}],allCompleted:true});assert.equal(r.success,false);assert.equal(r.tone,'warning');assert.match(r.title,/过期场次提醒/);assert.doesNotMatch(r.title,/未完成/);}
});
test('failures and pending work take priority over historical expiry reminders',()=>{
 assert.equal(checkinResult({courses:[{expired:1}]},true).tone,'error');
 assert.equal(checkinResult({submitted:1,courses:[{expired:1,pending:1}]}).title,'部分签到成功');
 assert.equal(checkinResult({quiet:true,courses:[{expired:1}]}).tone,'warning');
});
test('unconfirmed results and missing data do not show green success',()=>{
 for(const summary of [{submitted:1,records:[{status:'uncertain'}]},{submitted:1,courses:[{pending:1}]},{submitted:0},{submitted:1,needsConfirmation:true}])assert.equal(checkinResult(summary).success,false);
 assert.equal(checkinResult({submitted:1,needsConfirmation:false}).success,true);
 assert.equal(checkinResult({allCompleted:true}).success,true);
});

test('quiet runs report completion without claiming a new successful check-in',()=>{const result=checkinResult({quiet:true});assert.equal(result.success,false);assert.equal(result.title,'本轮签到流程已完成。');assert.notEqual(checkinResult({quiet:true},true).tone,'success');});
