import test from 'node:test';
import assert from 'node:assert/strict';
import {crawlMoodle} from '../extension/moodle-frontier.js';
test('three roots still reserve the remaining page for current-week refresh',async()=>{
 const roots=['root1','root2','root3'],visits=[];
 const previous={signature:JSON.stringify([roots,'']),visited:['current'],pending:[{url:'old',depth:1}]};
 await crawlMoodle({roots,previous,maxPages:4,read:async url=>{visits.push(url);return roots.includes(url)?{links:['current'],priorityLinks:['current']}:[];},persist:async()=>{}});
 assert.ok(visits.includes('current'));assert.equal(visits.length,4);
});
test('weekly crawl resumes after its page limit and still refreshes the course entry',async()=>{
 let previous;const visits=[];const roots=['course'];
 for(let i=0;i<5;i++)previous=await crawlMoodle({roots,previous,maxPages:4,read:async url=>{visits.push(url);return url==='course'?Array.from({length:12},(_,i)=>'week'+(12-i)):url==='week12'?['attendance-page']:[];},persist:async()=>{}});
 assert.equal(visits.filter(v=>v==='course').length,5);
 for(let i=1;i<=12;i++)assert.ok(visits.includes('week'+i),'Week '+i+' must eventually be visited');
 assert.ok(visits.includes('attendance-page'));
});
test('current week is refreshed ahead of a saved backlog without starving older weeks',async()=>{
 let previous={signature:JSON.stringify([['course'],'']),visited:['currentWeek'],pending:[{url:'old2',depth:1},{url:'old3',depth:1}]};const visits=[];
 previous=await crawlMoodle({roots:['course'],previous,maxPages:3,read:async url=>{visits.push(url);return url==='course'?{links:['currentWeek','old2','old3'],priorityLinks:['currentWeek']}:[];},persist:async()=>{}});
 assert.deepEqual(visits,['course','currentWeek','old2']);
 await crawlMoodle({roots:['course'],previous,maxPages:3,read:async url=>{visits.push(url);return url==='course'?{links:['currentWeek','old2','old3'],priorityLinks:['currentWeek']}:[];},persist:async()=>{}});
 assert.deepEqual(visits.slice(3),['course','currentWeek','old3']);
});

test('satisfying a schedule stops pages while retaining the pending frontier',async()=>{
 let needed=true;const visits=[];
 const result=await crawlMoodle({roots:['course'],shouldContinue:()=>needed,read:async url=>{visits.push(url);needed=false;return ['week','other'];},persist:async()=>{}});
 assert.deepEqual(visits,['course']);assert.deepEqual(result.pending.map(item=>item.url),['week','other']);
});
