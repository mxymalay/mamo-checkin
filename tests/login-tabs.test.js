import test from 'node:test';
import assert from 'node:assert/strict';
import {trackLoginTabs} from '../extension/login-tabs.js';

test('successful cleanup closes only helper-created, verified tabs and survives a worker restart',async()=>{
 const values={},opened=new Map([[99,{id:99,url:'https://mail.google.com/mail/u/0/'}]]),removed=[];
 let next=0;
 const tabs={create:async options=>{const tab={id:++next,...options};opened.set(tab.id,tab);return tab;},get:async id=>opened.get(id),remove:async id=>removed.push(id)};
 const storage={get:async()=>structuredClone(values),set:async update=>Object.assign(values,structuredClone(update))};
 const first=trackLoginTabs(tabs,storage);
 await Promise.all([first.tabs.create({url:'https://mail.google.com/'}),first.tabs.create({url:'https://attendance.monash.edu.my/student/Default.aspx'}),first.tabs.create({url:'https://mail.google.com/'})]);
 assert.equal(values.loginTabs.length,3);
 const resumed=trackLoginTabs(tabs,storage);
 await resumed.release({gmail:{tabId:1},attendance:{tabId:2},existing:{tabId:99}});
 assert.deepEqual(removed,[1,2]);assert.deepEqual(values.loginTabs.map(t=>t.id),[3]);
 opened.get(3).pendingUrl='https://example.com/';
 await resumed.release({gmail:{tabId:3}});
 assert.deepEqual(removed,[1,2]);assert.deepEqual(values.loginTabs,[]);
});
