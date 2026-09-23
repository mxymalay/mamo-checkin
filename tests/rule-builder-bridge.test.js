import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuilderPageBridge} from '../extension/source-rules/builder/page-bridge.js';
test('bridge pins later injections to the original document and rejects changed tab URLs',async()=>{
 const calls=[],tab={id:7,url:'https://learning.monash.edu/course/view.php?id=1'};
 const bridge=createBuilderPageBridge({tabs:{get:async()=>tab},scripting:{executeScript:async options=>{calls.push(options);return [{documentId:'doc1',result:{roots:[{rootId:'r0'}]}}];}}});
 const context={sessionId:'s1',tabId:7,source:'moodle',course:'DEMO1000',settings:{},expiresAt:Date.now()+600000};
 const result=await bridge.describe(context);assert.equal(result.documentId,'doc1');assert.ok(calls.slice(1).every(c=>c.target.documentIds?.[0]==='doc1'));
 tab.url='https://learning.monash.edu/course/view.php?id=2';await assert.rejects(bridge.command({...context,...result},'inspect'),/builder-source-changed/);
});
test('a removed source tab reports a terminal error instead of leaking a Chrome API message',async()=>{
 const bridge=createBuilderPageBridge({tabs:{get:async()=>{throw new Error('No tab with id: 7');}},scripting:{executeScript:async()=>{throw new Error('must not inject');}}});
 await assert.rejects(bridge.command({tabId:7,url:'https://learning.monash.edu/course/view.php?id=1',documentId:'gone'},'inspect'),/builder-source-changed/);
});
