import test from 'node:test';
import assert from 'node:assert/strict';
import {owner,port,harness} from './helpers/rule-practice.js';
test('record blank tab before navigating; nonce alone cannot register another tab/document',async()=>{
 let source;const h=harness({onNavigate(p){source=p;const forged=port({...p.sender,tab:{id:999}});assert.equal(h.bridge.connect(forged),false);assert.equal(h.bridge.connect(p),true);p.onMessage.emit({type:'ready',role:'source',sessionId:'session'});}});
 const context=await h.bridge.open(owner,'session');assert.equal(context.tabId,10);assert.equal(context.documentId,'source-10');
 const duplicate=port({...source.sender,documentId:'replacement'});assert.equal(h.bridge.connect(duplicate),false);
 await h.bridge.dispose(context);
});
test('transport rejects wrong revisions and duplicate replies and expires pending requests on navigation',async()=>{
 let source;const h=harness({onNavigate(p){source=p;h.bridge.connect(p);p.onMessage.emit({type:'ready',role:'source',sessionId:'session'});}});
 const context=await h.bridge.open(owner,'session');
 const pending=h.bridge.command(context,'inspect');await new Promise(r=>setTimeout(r,0));const request=source.sent.at(-1);
 source.onMessage.emit({...request,type:'reply',revision:request.revision+1,result:{phase:'bad'}});
 source.onMessage.emit({...request,type:'reply',result:{phase:'selected'}});assert.deepEqual(await pending,{phase:'selected'});
 source.onMessage.emit({...request,type:'reply',result:{phase:'duplicate'}});
 await assert.rejects(h.bridge.command(context,'settings'),/builder-command/);
 const stale=h.bridge.command(context,'inspect');h.bridge.invalidateTab(context.tabId);await assert.rejects(stale,/builder-source-changed/);
 await assert.rejects(h.bridge.command(context,'inspect'),/builder-source-changed/);
});
test('source registration and request timeouts are bounded; bad origin is denied',async()=>{
 const h=harness();assert.equal(h.bridge.connect(port({...owner,url:'https://example.com/'})),false);
 await assert.rejects(h.bridge.open({...owner,url:'https://example.com/'},'session'),/practice-owner/);
 await assert.rejects(h.bridge.open(owner,'session'),/builder-timeout/);
});
test('source document, literal URL, extension ID and frame identity are mandatory',async()=>{
 const h=harness({onNavigate(p){
  for(const changes of [{id:'other'},{documentId:undefined},{frameId:1},{url:p.sender.url+'&other=1'},{url:p.sender.url+'#fragment'},{url:p.sender.url.replace('/course.html','/frame.html')}])assert.equal(h.bridge.connect(port({...p.sender,...changes})),false);
  h.bridge.connect(p);p.onMessage.emit({type:'ready',role:'source',sessionId:'session'});
 }});
 const context=await h.bridge.open(owner,'session');await assert.rejects(h.bridge.command({...context,documentId:'old-document'},'inspect'),/builder-source-changed/);
 await assert.rejects(h.bridge.command(context,'inspect'),/builder-timeout/);await h.bridge.dispose(context);
});
test('expiry and owner cancellation invalidate a source, including a pending blank-tab creation',async()=>{
 let now=1;const h=harness({now:()=>now,onNavigate(p){h.bridge.connect(p);p.onMessage.emit({type:'ready',role:'source',sessionId:'session'});}});
 const context=await h.bridge.open(owner,'session');now=600002;await assert.rejects(h.bridge.command(context,'inspect'),/builder-source-changed/);
 let release,navigated=0;const waiting=harness({tabs:{create:()=>new Promise(resolve=>release=resolve),update:async()=>navigated++}});
 const pending=waiting.bridge.open(owner,'session');await waiting.bridge.dispose({owner});release({id:9});await assert.rejects(pending,/builder-cancelled/);assert.equal(navigated,0);
});
