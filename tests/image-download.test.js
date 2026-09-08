import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {getImage} from '../extension/image-download.js';

const gmail='https://mail.google.com/mail/u/2?view=fimg&attid=0.11';
const proxy='https://ci3.googleusercontent.com/mail-image';
const bytes=Uint8Array.from([137,80,78,71,0,255,23,13,10]);
function response(body=bytes,{url=proxy,type='image/png',status=200,length}={}){
 const headers={'content-type':type};if(length!==undefined)headers['content-length']=String(length);
 const result=new Response(body,{status,headers});Object.defineProperty(result,'url',{value:url});return result;
}
function globals(t,values){for(const [key,value] of Object.entries(values)){const previous=globalThis[key];globalThis[key]=value;t.after(()=>{if(previous===undefined)delete globalThis[key];else globalThis[key]=previous;});}}

test('follows image redirects and returns exactly the original PNG bytes',async t=>{
 globals(t,{fetch:async(url,options)=>{assert.equal(url,gmail);assert.equal(options.redirect,'follow');assert.equal(options.credentials,'include');assert.ok(options.signal instanceof AbortSignal);return response();}});
 const result=await getImage(gmail+'#fragment');
 assert.equal(result.mimeType,'image/png');assert.deepEqual(Buffer.from(result.imageBase64,'base64'),Buffer.from(bytes));
});
test('rejects an unapproved final redirect host before reading bytes',async t=>{
 let reads=0;
 globals(t,{fetch:async()=>({ok:true,url:'https://unapproved.example/image.png',headers:new Headers({'content-type':'image/png'}),body:{getReader(){reads++;throw new Error('must not read');}}})});
 await assert.rejects(getImage(gmail),/跳转|许可/);assert.equal(reads,0);
});
test('invalid initial sources are rejected without network access',async t=>{
 let calls=0;globals(t,{fetch:async()=>{calls++;return response();}});
 for(const url of ['http://mail.google.com/a','https://mail.google.com.attacker.test/a','https://googleusercontent.com/a','file:///tmp/image.png'])await assert.rejects(getImage(url),/来源|网址/);
 assert.equal(calls,0);
});
test('HTML login responses and network failures have actionable Chinese errors',async t=>{
 globals(t,{fetch:async()=>response('<html>login</html>',{url:gmail,type:'text/html'})});
 await assert.rejects(getImage(gmail),/登录|HTML/);
 globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};
 await assert.rejects(getImage(gmail),error=>/网络|连接/.test(error.message)&&!error.message.includes('Failed to fetch'));
});
test('declared or streamed images over 8 MiB are cancelled before accumulation',async t=>{
 let reads=0,cancels=0;
 globals(t,{fetch:async()=>response(bytes,{length:8*1024*1024+1})});
 await assert.rejects(getImage(gmail),/8\s*M/i);
 globalThis.fetch=async()=>({ok:true,url:proxy,headers:new Headers({'content-type':'image/png'}),body:{getReader(){return {read:async()=>{reads++;return {done:false,value:new Uint8Array(5*1024*1024)};},cancel:async()=>{cancels++;},releaseLock(){}};}}});
 await assert.rejects(getImage(gmail),/8\s*M/i);assert.equal(reads,2);assert.equal(cancels,1);
});
test('same-origin page fallback verifies the visible image URL and preserves original JPEG bytes',async t=>{
 let calls=0,injections=0;
 const doc=new JSDOM(`<img src="${gmail}">`,{url:'https://mail.google.com/mail/u/2/#inbox/thread'}).window.document;
 globals(t,{document:doc,fetch:async(url,options)=>{calls++;assert.equal(options.redirect,'follow');if(calls===1)throw new TypeError('Failed to fetch');return response(bytes,{url:proxy,type:'image/jpeg'});},chrome:{scripting:{executeScript:async request=>{
   injections++;assert.deepEqual(request.target,{tabId:17});
   const isolatedFunction=Function(`return (${request.func.toString()})`)();
   return [{result:await isolatedFunction(...request.args)}];
 }}}});
 const result=await getImage(gmail,17);
 assert.equal(injections,1);assert.equal(calls,2);assert.equal(result.mimeType,'image/jpeg');assert.deepEqual(Buffer.from(result.imageBase64,'base64'),Buffer.from(bytes));
});
test('page fallback rejects a different page origin or a URL not in page images',async t=>{
 let calls=0;
 globals(t,{fetch:async()=>{calls++;throw new TypeError('Failed to fetch');},document:new JSDOM(`<img src="${gmail}">`,{url:'https://learning.monash.edu/course/view.php?id=1'}).window.document,chrome:{scripting:{executeScript:async request=>[{result:await Function(`return (${request.func.toString()})`)()(...request.args)}]}}});
 await assert.rejects(getImage(gmail,17),/页面|来源/);assert.equal(calls,1);
 globalThis.document=new JSDOM('<img src="https://mail.google.com/other">',{url:'https://mail.google.com/mail/u/2/'}).window.document;
 await assert.rejects(getImage(gmail,17),/图片|页面/);assert.equal(calls,2);
});
test('proxy URLs and invalid tab IDs never attempt page fallback',async t=>{
 let injections=0;globals(t,{fetch:async()=>{throw new TypeError('Failed to fetch');},chrome:{scripting:{executeScript:async()=>{injections++;}}}});
 for(const [url,id] of [[proxy,17],[gmail,-1],[gmail,undefined]])await assert.rejects(getImage(url,id),/网络|连接/);
 assert.equal(injections,0);
});

test('background and page fallback share one 20-second budget including script dispatch',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:100000});
 let remaining,dispatches=0;
 globals(t,{fetch:async()=>{await new Promise(resolve=>setTimeout(resolve,12000));throw new TypeError('Failed to fetch');},chrome:{scripting:{executeScript:async request=>{dispatches++;remaining=request.args[1];return new Promise(()=>{});}}}});
 let completed=false;
 const outcome=assert.rejects(getImage(gmail,17),/超时.*20/).then(()=>{completed=true;});
 t.mock.timers.tick(12000);await new Promise(setImmediate);
 assert.equal(dispatches,1);assert.equal(remaining,8000);assert.equal(completed,false);
 t.mock.timers.tick(7999);await new Promise(setImmediate);assert.equal(completed,false);
 t.mock.timers.tick(1);await outcome;assert.equal(completed,true);
});

test('fallback also validates its final redirect target',async t=>{
 let calls=0;
 globals(t,{document:new JSDOM(`<img src="${gmail}">`,{url:'https://mail.google.com/mail/u/2/'}).window.document,fetch:async()=>{calls++;if(calls===1)throw new TypeError('Failed to fetch');return response(bytes,{url:'https://unapproved.example/image.png'});},chrome:{scripting:{executeScript:async request=>[{result:await Function(`return (${request.func.toString()})`)()(...request.args)}]}}});
 await assert.rejects(getImage(gmail,17),/跳转.*许可/);assert.equal(calls,2);
});

test('script dispatch time is deducted from the fallback fetch cancellation deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:100000});
 let calls=0,pageSignal;
 globals(t,{document:new JSDOM(`<img src="${gmail}">`,{url:'https://mail.google.com/mail/u/2/'}).window.document,fetch:async(url,options)=>{
   calls++;if(calls===1){await new Promise(resolve=>setTimeout(resolve,12000));throw new TypeError('Failed to fetch');}
   pageSignal=options.signal;return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}));
 },chrome:{scripting:{executeScript:async request=>{await new Promise(resolve=>setTimeout(resolve,3000));return [{result:await Function(`return (${request.func.toString()})`)()(...request.args)}];}}}});
 const outcome=assert.rejects(getImage(gmail,17),/超时.*20/);
 t.mock.timers.tick(12000);await new Promise(setImmediate);
 t.mock.timers.tick(3000);await new Promise(setImmediate);assert.equal(pageSignal.aborted,false);
 t.mock.timers.tick(5000);await outcome;assert.equal(pageSignal.aborted,true);
});
