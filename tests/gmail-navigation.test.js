import './helpers/install-source-runtime.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {gmailAdapter} from '../extension/gmail.js';
import {createSourceCollectors} from '../extension/source-collection.js';

const email='abcd1234@student.monash.edu';
const account=`<div aria-label="Google Account: ${email}"></div>`;
const settings={email,mailQuery:'attendance',courses:['FIT5120','FIT5122'],senders:{},sourceModes:{FIT5120:'email',FIT5122:'email'}};
const rows=[['a','FIT5120','18 Sep'],['b','FIT5122','17 Sep'],['c','FIT5120','11 Sep']];
function page(content){return new JSDOM(account+content,{url:'https://mail.google.com/mail/u/0/#search/attendance'});}
function listRow(id,course){return `<div role="row"><span data-legacy-thread-id="${id}" data-legacy-last-message-id="m-${id}">${course} attendance</span><span email="teacher@example.edu"></span></div>`;}

test('list discovers IDs on rows without confusing the snippet with the subject',()=>{
 const dom=page('<main><div role="grid">'+rows.map(([id,course,date])=>`<div role="row" data-legacy-thread-id="${id}" data-legacy-last-message-id="m-${id}"><span email="teacher@example.edu">Teacher</span><span class="bog">${course} attendance ${date}</span><span>Other course FIT9999</span></div>`).join('')+'</div></main>');
 try{
  const result=gmailAdapter('list',{...settings,courses:[...settings.courses,'FIT9999']},dom.window.document);
  assert.deepEqual(result.threads.map(t=>[t.id,t.course,t.lastMessageId]),[['a','FIT5120','m-a'],['b','FIT5122','m-b'],['c','FIT5120','m-c']]);
 }finally{dom.window.close();}
});

test('list supports native table rows and separate subject and message metadata',()=>{
 const dom=page('<main><table role="grid"><tbody><tr><td><span data-legacy-thread-id="a"></span><span class="bog">FIT5120 attendance</span><span data-legacy-last-message-id="m-a"></span><span email="teacher@example.edu"></span></td></tr></tbody></table></main>');
 try{assert.deepEqual(gmailAdapter('list',settings,dom.window.document).threads.map(t=>[t.id,t.subject,t.lastMessageId]),[['a','FIT5120 attendance','m-a']]);}
 finally{dom.window.close();}
});

test('list waits for an explicitly busy grid instead of completing with zero threads',()=>{
 const dom=page('<main><div role="grid" aria-busy="true"></div></main>');
 try{assert.equal(gmailAdapter('list',settings,dom.window.document).loading,true);}
 finally{dom.window.close();}
});

async function collectFixture({busy=false,missingId=false,seenThreads={},forceRead=false,stuck=false,listHtml=listRow('a','FIT5120'),tick=()=>{}}={}){
 const dom=page(`<main><div role="grid"${busy?' aria-busy="true"':''}>${busy?'':listHtml}</div></main>`);
 if(missingId)dom.window.document.querySelector('[data-legacy-last-message-id]').removeAttribute('data-legacy-last-message-id');
 const navigations=[],messages=[],diagnostics=[],cache={seenMessages:{},seenThreads};
 const tab={id:1,url:'https://mail.google.com/mail/u/0/',status:'complete'};
 const collectors=createSourceCollectors({
  tabs:{get:async()=>tab},
  navigate:async(id,url)=>{
   tab.url=url;navigations.push(url);
   const thread=rows.find(([threadId])=>url.endsWith('#all/'+threadId));
   if(thread&&!stuck)dom.window.document.querySelector('main').innerHTML=`<h2>${thread[1]} attendance</h2><div data-legacy-message-id="m-${thread[0]}"><span email="teacher@example.edu"></span><div class="a3s">Workshop Monday 14 Sep 01 10:00 am ABC12</div></div>`;
  },
  readAdapter:async(id,adapter,command,args)=>adapter(command,args,dom.window.document),
  delay:async()=>{tick();const grid=dom.window.document.querySelector('[aria-busy="true"]');if(grid){grid.removeAttribute('aria-busy');grid.innerHTML=listRow('a','FIT5120');}},
  onMessages:async items=>{messages.push(...items);return {completedMessageIds:items.map(m=>m.messageId)};},
  onDiagnostic:async d=>diagnostics.push(d),progress:async()=>{},persistCache:async()=>{}
 });
 try{
  const result=await collectors.collectMail({settings,cache,forceRead,verifiedLogin:{gmail:{tabId:1}},snapshot:{courses:{}}});
  return {result,navigations,messages,diagnostics,cache};
 }finally{dom.window.close();}
}

test('collector polls an asynchronous search grid then navigates and delivers the thread',async()=>{
 const output=await collectFixture({busy:true});
 assert.equal(output.navigations.at(-1),'https://mail.google.com/mail/u/0/#all/a');
 assert.deepEqual(output.messages.map(m=>m.messageId),['m-a']);
 assert.equal(output.cache.seenThreads.a,'m-a');
});

test('collector opens all three screenshot-inspired rows when metadata is on the rows',async()=>{
 const listHtml=rows.map(([id,course,date])=>`<div role="row" data-legacy-thread-id="${id}" data-legacy-last-message-id="m-${id}"><span class="bog">${course} attendance ${date}</span><span email="teacher@example.edu"></span></div>`).join('');
 const output=await collectFixture({listHtml});
 assert.deepEqual(output.navigations.slice(1),['https://mail.google.com/mail/u/0/#all/a','https://mail.google.com/mail/u/0/#all/b','https://mail.google.com/mail/u/0/#all/c']);
 assert.deepEqual(output.messages.map(m=>m.messageId),['m-a','m-b','m-c']);
 assert.equal(output.result.complete,true);
 assert.deepEqual(output.diagnostics,[]);
});

test('settled empty searches remain complete and hidden busy indicators do not block lists',()=>{
 for(const content of ['<main>No messages matched your search</main>','<main><div role="grid"></div><div aria-busy="true" hidden></div></main>']){
  const dom=page(content);
  try{assert.deepEqual(gmailAdapter('list',settings,dom.window.document).threads,[]);}
  finally{dom.window.close();}
 }
});

test('completed cache skips navigation while forceRead still opens the thread',async()=>{
 const skipped=await collectFixture({seenThreads:{a:'m-a'}});
 assert.equal(skipped.navigations.length,1);
 assert.equal(skipped.result.complete,true);
 const forced=await collectFixture({seenThreads:{a:'m-a'},forceRead:true});
 assert.deepEqual(forced.messages.map(m=>m.messageId),['m-a']);
});

test('missing latest-message metadata reports an incomplete scan without caching or unsafe navigation',async()=>{
 const output=await collectFixture({missingId:true});
 assert.equal(output.diagnostics.length,1);
 assert.match(output.diagnostics[0].error,/最新消息标识/);
 assert.equal(output.result.complete,false);
 assert.equal(output.navigations.length,1);
 assert.deepEqual(output.cache.seenThreads,{});
});

test('a navigation that never reaches a thread times out and reports an incomplete scan',async t=>{
 let now=Date.now();t.mock.method(Date,'now',()=>now);
 const output=await collectFixture({stuck:true,tick:()=>{now+=600;}});
 assert.equal(output.navigations.at(-1),'https://mail.google.com/mail/u/0/#all/a');
 assert.equal(output.diagnostics.length,1);
 assert.match(output.diagnostics[0].error,/页面没有及时加载/);
 assert.equal(output.result.complete,false);
 assert.deepEqual(output.messages,[]);
 assert.deepEqual(output.cache.seenThreads,{});
});
