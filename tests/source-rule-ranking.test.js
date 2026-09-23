import test from 'node:test';
import assert from 'node:assert/strict';
import {prioritiseThreads} from '../extension/gmail-ranking.js';
import {selectEdThreads} from '../extension/ed-ranking.js';
test('literal navigation hints boost candidates without outranking missing-session targeting',()=>{
 const threads=[{id:'a',url:'a',course:'DEMO1000',subject:'Notes',label:'Notes'}, {id:'b',url:'b',course:'DEMO1000',subject:'Notes',label:'Notes',navigationPriority:40}];
 assert.equal(prioritiseThreads(threads)[0].id,'b');
 assert.equal(selectEdThreads(threads,[])[0].id,'b');
 assert.equal(selectEdThreads([...threads,{url:'target',label:'Week 2'}],[{week:2}],{limit:1})[0].url,'target');
});
