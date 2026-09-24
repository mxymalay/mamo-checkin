import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installHistoryLookup} from '../extension/history-lookup-ui.js';
import {translate} from '../extension/i18n.js';
test('download follows the selected range across calendar changes, presets and background updates',async()=>{
 const dom=new JSDOM('<section></section>');let listener;
 const job={phase:'complete',range:{from:'2026-08-01',to:'2026-09-24'},rows:[]},host=dom.window.document.querySelector('section');
 try{
  installHistoryLookup({host,translate:t=>t,storage:{onChanged:{addListener(fn){listener=fn;},removeListener(){}}},request:async()=>({job})});
  await new Promise(r=>setTimeout(r,0));
  const download=host.querySelector('.history-download'),start=host.querySelector('.history-start');
  assert.equal(download.hidden,false);
  host.querySelector('[data-date="from"]').click();host.querySelector('[data-day="2026-08-02"]').click();
  assert.equal(download.hidden,true);assert.ok(start.classList.contains('is-primary'));
  listener({historyLookup:{newValue:job}},'local');assert.equal(download.hidden,true);
  host.querySelector('[data-date="from"]').click();host.querySelector('[data-day="2026-08-01"]').click();assert.equal(download.hidden,false);
  host.querySelector('[data-days="14"]').click();assert.equal(download.hidden,true);
 }finally{dom.window.close();}
});
test('completion notifies once after an observed run, never for an old result',async()=>{
 const dom=new JSDOM('<section></section>');let listener,completed=0;
 const range={from:'2026-08-01',to:'2026-09-24'},job={phase:'complete',range,rows:[]};
 installHistoryLookup({host:dom.window.document.querySelector('section'),translate:t=>t,onFinished:()=>completed++,storage:{onChanged:{addListener(fn){listener=fn;},removeListener(){}}},request:async()=>({job})});
 await new Promise(r=>setTimeout(r,0));assert.equal(completed,0);
 listener({historyLookup:{newValue:{...job,phase:'running'}}},'local');
 listener({historyLookup:{newValue:job}},'local');listener({historyLookup:{newValue:job}},'local');
 assert.equal(completed,1);dom.window.close();
});
test('English lookup uses inline validation and describes its all-configured-course scope',async()=>{
 const dom=new JSDOM('<section></section>'),calls=[];
 try{
  const host=dom.window.document.querySelector('section');
  installHistoryLookup({host,storage:{onChanged:{addListener(){},removeListener(){}}},translate:t=>translate(t,'en'),request:async p=>{calls.push(p);return {ok:true};}});
  await new Promise(r=>setTimeout(r,0));
  const form=host.querySelector('form');assert.equal(form.noValidate,true);
  for(const field of host.querySelectorAll('.history-range input'))assert.equal(field.type,'hidden');
  host.querySelector('[data-date="from"]').click();assert.equal(host.querySelector('.history-calendar').hidden,false);
  assert.equal(host.querySelectorAll('.calendar-days button').length,42);
  assert.doesNotMatch(host.querySelector('.calendar-weekdays').textContent,/[\u3400-\u9fff]/);
  form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  await new Promise(r=>setTimeout(r,0));
  assert.equal(calls.some(c=>c.type==='historyLookupStart'),false);
  assert.match(host.querySelector('[role="alert"]').textContent,/start and end dates/i);
  assert.doesNotMatch(host.querySelector('[role="alert"]').textContent,/[\u3400-\u9fff]/);
  assert.match(host.querySelector('.history-scope').textContent,/All configured courses/);
  host.querySelector('#history-from').value='2026-02-30';host.querySelector('#history-to').value='2026-03-01';
  form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  assert.match(host.querySelector('[role="alert"]').textContent,/valid date range/i);
  assert.equal(calls.some(c=>c.type==='historyLookupStart'),false);
 }finally{dom.window.close();}
});
test('lookup UI resumes durable progress and starts a read-only date range request',async()=>{
 const dom=new JSDOM('<section></section>'),calls=[];let listener;
 const range={from:'2026-08-01',to:'2026-09-24'};
 let job={phase:'partial',range,rows:[],warnings:['unavailable']};
 const storage={onChanged:{addListener(fn){listener=fn;},removeListener(){}}};
 try{
  const host=dom.window.document.querySelector('section');
  installHistoryLookup({host,storage,translate:t=>t,request:async payload=>{calls.push(payload);return {ok:true,job};}});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(host.querySelector('#history-from').value,range.from);
  assert.equal(host.querySelector('.history-download').hidden,false);
  host.querySelector('form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(calls.find(c=>c.type==='historyLookupStart'),{type:'historyLookupStart',range});
  listener({historyLookup:{newValue:{...job,phase:'running'}}},'local');
  assert.equal(host.querySelector('.history-start').disabled,true);
  assert.equal(host.querySelector('.history-download').hidden,true);
 }finally{dom.window.close();}
});
