import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyOfficialRelease} from '../extension/source-rules/official-release.js';
import {createOfficialRules,scheduleOfficialRules,OFFICIAL_ALARM,OFFICIAL_INTERVAL} from '../extension/source-rules/official-updates.js';
import {fixtureRule,memoryStorage} from './helpers/source-rules.js';
import {createRuleLibrary} from '../extension/source-rules/library.js';
import {messageCacheKey,threadSourceKey,sourceFrontierVersion,pruneRuleCache} from '../extension/source-rules/cache.js';

const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey);
const rules=['gmail','moodle','ed'].map(source=>fixtureRule({id:'builtin.'+source,source,courses:[]}));
const bundled=Object.fromEntries(rules.map(rule=>[rule.source,rule]));
async function release(sequence=1,patch={}){
 const payload=JSON.stringify({schemaVersion:1,engineVersion:1,sequence,version:`1.0.${sequence}`,publishedAt:'2026-09-24T00:00:00Z',rules,...patch});
 const signature=Buffer.from(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,new TextEncoder().encode(payload))).toString('base64');
 return {keyId:'official-v1',payload,signature};
}
const response=value=>new Response(JSON.stringify(value));
const setup=(storage,fetchImpl)=>createOfficialRules({storage,publicKey,fetchImpl,loadBundled:async()=>bundled});
test('official alarm is independent and checks are throttled except explicit manual requests',async()=>{
 const calls=[];await scheduleOfficialRules({get:async name=>{assert.equal(name,OFFICIAL_ALARM);return undefined;},create:async(...args)=>calls.push(args)});
 assert.deepEqual(calls,[[OFFICIAL_ALARM,{delayInMinutes:1,periodInMinutes:360}]]);
 await scheduleOfficialRules({get:async()=>({periodInMinutes:360}),create:async()=>assert.fail('Do not move a scheduled alarm')});
 let time=100,downloads=0;const signed=await release(),updater=createOfficialRules({storage:memoryStorage(),publicKey,loadBundled:async()=>bundled,now:()=>time,fetchImpl:async(url,options)=>{downloads++;assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');return response(signed);}});
 await updater.check();await updater.check();assert.equal(downloads,1);await updater.check({force:true});assert.equal(downloads,2);time+=OFFICIAL_INTERVAL;await updater.check();assert.equal(downloads,3);
});
test('same sequence mutation, oversized download and storage failure never activate a release',async()=>{
 const storage=memoryStorage();let signed=await release();const updater=setup(storage,async()=>response(signed));await updater.check({force:true});
 signed=await release(1,{version:'9.0.0'});assert.equal((await updater.check({force:true})).error,'official-replay');assert.equal((await updater.status()).version,'1.0.1');
 const oversized=setup(memoryStorage(),async()=>new Response('x'.repeat(512*1024+1)));assert.equal((await oversized.check({force:true})).error,'official-size');
 const unavailable=setup({get:async()=>({}),set:async()=>{throw new Error('full');}},async()=>response(signed));assert.equal((await unavailable.check({force:true})).source,'bundled');assert.equal((await unavailable.status()).error,'official-storage');
});
test('course-specific official rules override only their own source/course and snapshots stay immutable',async()=>{
 const storage=memoryStorage(),override=fixtureRule({id:'builtin.fit5122.moodle',courses:['FIT5122']});
 let signed=await release(1,{rules:[...rules,override]});const updater=setup(storage,async()=>response(signed));await updater.check({force:true});
 const library=createRuleLibrary({storage,getBuiltins:()=>updater.rules()}),settings={courses:['FIT5122','FIT5120']};
 const first=await library.snapshot(settings);assert.equal(first.courses.FIT5122.moodle.builtin.id,override.id);assert.equal(first.courses.FIT5120.moodle.builtin.id,'builtin.moodle');
 signed=await release(2);await updater.check({force:true});const second=await library.snapshot(settings);
 assert.equal(second.courses.FIT5122.moodle.builtin.id,'builtin.moodle');assert.equal(first.courses.FIT5122.moodle.builtin.id,override.id);assert.equal(Object.isFrozen(first.courses.FIT5122.moodle.builtin),true);
 const message={course:'FIT5122',sourceType:'moodle',messageId:'message'},oldKey=messageCacheKey({sourceRules:first},message),newKey=messageCacheKey({sourceRules:second},message);assert.notEqual(oldKey,newKey);
 const cache={[oldKey]:true,[newKey]:true};pruneRuleCache(cache,second);assert.deepEqual(Object.keys(cache),[newKey]);
 assert.notEqual(threadSourceKey({course:'FIT5122',officialRevision:'a'.repeat(64),threadId:'thread'}),threadSourceKey({course:'FIT5122',officialRevision:'b'.repeat(64),threadId:'thread'}));
 assert.notEqual(sourceFrontierVersion({academicYear:2026,course:'FIT5122',officialRevision:'a'.repeat(64)}),sourceFrontierVersion({academicYear:2026,course:'FIT5122',officialRevision:'b'.repeat(64)}));
 assert.equal(storage.values.sourceRuleBindings,undefined);
});
test('signed release accepts bounded rules and rejects tampering, unknown fields, conflicts and incompatible engines',async()=>{
 const signed=await release();assert.equal((await verifyOfficialRelease(signed,{publicKey})).sequence,1);
 for(const value of [{...signed,payload:signed.payload+' '},{...signed,keyId:'unknown'},await release(1,{engineVersion:2}),await release(1,{code:'evil'}),await release(1,{rules:rules.slice(1)}),await release(1,{rules:[...rules,fixtureRule({id:'builtin.other',courses:[]})]})])await assert.rejects(verifyOfficialRelease(value,{publicKey}));
 const override=fixtureRule({id:'builtin.fit5122.moodle',courses:['FIT5122']});
 await verifyOfficialRelease(await release(2,{rules:[...rules,override]}),{publicKey});
 await assert.rejects(verifyOfficialRelease(await release(2,{rules:[...rules,override,{...override,id:'builtin.overlap'}]}),{publicKey}));
});
test('offline startup uses bundled rules; valid update survives restart; bad response keeps last good',async()=>{
 const storage=memoryStorage();let next=null;const fetchImpl=async()=>{if(!next)throw new Error('offline');return response(next);};
 const updater=setup(storage,fetchImpl);assert.equal((await updater.rules()).moodle.id,'builtin.moodle');
 assert.ok((await updater.check({force:true})).error);assert.equal((await updater.status()).source,'bundled');
 next=await release();assert.equal((await updater.check({force:true})).version,'1.0.1');
 assert.equal((await setup(storage,fetchImpl).status()).version,'1.0.1');
 next={...next,signature:'invalid'};assert.ok((await updater.check({force:true})).error);assert.equal((await updater.status()).version,'1.0.1');
});
test('replay is rejected and rollback is retained across restart without reinstalling rejected sequence',async()=>{
 const storage=memoryStorage();let next=await release();const fetchImpl=async()=>response(next),updater=setup(storage,fetchImpl);
 await updater.check({force:true});next=await release(2);await updater.check({force:true});
 assert.equal((await updater.rollback()).version,'1.0.1');
 const restarted=setup(storage,fetchImpl);assert.equal((await restarted.check({force:true})).version,'1.0.1');
 next=await release(1);assert.ok((await restarted.check({force:true})).error);
 next=await release(3);assert.equal((await restarted.check({force:true})).version,'1.0.3');
});
test('concurrent checks share one download, bad cache cannot become active, reset discards late download',async()=>{
 const signed=await release(),storage=memoryStorage();let finish,calls=0;
 const updater=setup(storage,()=>{calls++;return new Promise(resolve=>{finish=()=>resolve(response(signed));});});
 const a=updater.check({force:true}),b=updater.check({force:true});
 while(!finish)await new Promise(resolve=>setTimeout(resolve,1));finish();await Promise.all([a,b]);assert.equal(calls,1);
 storage.values.officialRuleUpdates.active.payload+=' ';
 assert.equal((await setup(storage,async()=>{throw new Error('offline');}).status()).source,'bundled');
 const repaired=setup(storage,async()=>response(signed));assert.equal((await repaired.check({force:true})).version,'1.0.1');
 const pending=updater.check({force:true});finish=null;
 while(!finish)await new Promise(resolve=>setTimeout(resolve,1));const reset=updater.reset();finish();await pending;await reset;
 assert.equal((await updater.status()).source,'bundled');
});
test('reset blocks new mutations and concurrent reads see only the cleared version',async()=>{
 const signed=await release(),storage=memoryStorage(),updater=setup(storage,async()=>response(signed));await updater.check({force:true});
 let finish;const reset=updater.reset(()=>new Promise(resolve=>{finish=()=>{storage.values.officialRuleUpdates=null;resolve();};}));
 while(!finish)await new Promise(resolve=>setTimeout(resolve,1));
 const reading=updater.status(),rulesReading=updater.rules();await assert.rejects(updater.check({force:true}),/official-resetting/);await assert.rejects(updater.rollback(),/official-resetting/);
 finish();await reset;assert.equal((await reading).source,'bundled');assert.equal((await rulesReading).moodle.digest,undefined);assert.equal(storage.values.officialRuleUpdates,null);
});
test('a paused cold initialization cannot restore pre-reset rules after reset completes',async()=>{
 const storage=memoryStorage({officialRuleUpdates:{active:await release()}}),get=storage.get;let finish,entered;
 const reached=new Promise(resolve=>{entered=resolve;});let once=true;
 storage.get=async keys=>{if(once){once=false;const old=await get(keys);entered();await new Promise(resolve=>{finish=resolve;});return old;}return get(keys);};
 const updater=setup(storage,async()=>assert.fail('No network during reset')),reading=updater.status();await reached;
 const resetting=updater.reset();finish();await resetting;assert.equal((await reading).source,'bundled');assert.equal((await updater.status()).source,'bundled');
});
