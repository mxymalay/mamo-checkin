import test from 'node:test';
import assert from 'node:assert/strict';
import {checkinResult} from '../extension/checkin-result.js';
test('expired and partially completed runs cannot show full success',()=>{
 for(const submitted of [0,1]){const r=checkinResult({submitted,courses:[{expired:1,completed:1}],allCompleted:true});assert.equal(r.success,false);assert.equal(r.tone,'error');assert.notEqual(r.title,'签到成功');}
});
test('unconfirmed results and missing data do not show green success',()=>{
 for(const summary of [{submitted:1,records:[{status:'uncertain'}]},{submitted:1,courses:[{pending:1}]},{submitted:0},{submitted:1,needsConfirmation:true}])assert.equal(checkinResult(summary).success,false);
 assert.equal(checkinResult({submitted:1,needsConfirmation:false}).success,true);
 assert.equal(checkinResult({allCompleted:true}).success,true);
});
