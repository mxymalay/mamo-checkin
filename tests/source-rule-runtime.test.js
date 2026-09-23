import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {loadBuiltinRules} from '../extension/source-rules/builtins.js';
import {installSourceRuleRuntime} from '../extension/source-rules/runtime.js';
import {fixtureRule} from './helpers/source-rules.js';
const builtins=await loadBuiltinRules({readJson:async url=>JSON.parse(await readFile(url,'utf8'))});
function locate(html,{source='moodle',mode='combined',rules=[builtins[source]],...rest}={}){
  const doc=new JSDOM(`<main>${html}</main>`,{url:'https://learning.monash.edu/course/view.php?id=1'}).window.document;
  for(const img of doc.querySelectorAll('img')){Object.defineProperty(img,'naturalWidth',{value:Number(img.getAttribute('width')||600)});Object.defineProperty(img,'naturalHeight',{value:Number(img.getAttribute('height')||100)});}
  installSourceRuleRuntime();
  return globalThis.__mamoSourceRules.locate({root:doc.querySelector('main'),source,rules,mode,course:'DEMO1000',contextText:'Attendance',collectTrace:true,...rest});
}
test('community-only reports zero instead of falling back and combination preserves provenance',()=>{
  const rules=[builtins.moodle,fixtureRule()];
  assert.equal(locate('<img src="/a.png">',{rules,mode:'community'}).images.length,0);
  const found=locate('<div class="attendance"><img src="/a.png"></div>',{rules});
  assert.equal(found.images.length,1);
  assert.deepEqual(found.images[0].matches.map(m=>m.id),['builtin.moodle','community.example.images']);
});
test('quotations remain candidates while hidden elements and misleading hosts are rejected',()=>{
  const html='<blockquote><img src="/old.png"></blockquote><div hidden><img src="/hidden.png"></div><img src="https://learning.monash.edu.evil.test/a.png"><img class="avatar" src="/avatar.png"><img src="/yes.png">';
  const result=locate(html,{rules:[fixtureRule({images:{selectors:['img'],minWidth:1,minHeight:1}})]});
  assert.deepEqual(result.images.map(i=>i.url),['https://learning.monash.edu/old.png','https://learning.monash.edu/yes.png']);
  assert.ok(result.trace.some(t=>t.reason==='host'));
  assert.equal(result.trace.some(t=>t.reason==='quoted'),false);
});
test('builtins accept quoted images for every source; explicit exclusions still apply',()=>{
 for(const [source,host] of [['moodle','learning.monash.edu'],['gmail','mail.google.com'],['ed','cdn.edusercontent.com']]){
  const url=`https://${host}/image.png`,html=`<blockquote class="gmail_quote"><img src="${url}"></blockquote>`;
  assert.deepEqual(locate(html,{source}).images.map(i=>i.url),[url]);
  assert.equal(locate(html,{source,rules:[fixtureRule({source,images:{selectors:['img'],excludeSelectors:['blockquote img']}})]}).images.length,0);
 }
});
test('community selectors recover small course pictures within hard bounds and cannot reach sibling messages',()=>{
  const html='<div class="attendance"><img width="40" height="30" src="/small.png"></div>';
  assert.equal(locate(html).images.length,0);
  const custom=fixtureRule({images:{selectors:['.attendance img'],minWidth:30,minHeight:20}});
  assert.equal(locate(html,{rules:[custom],mode:'community'}).images.length,1);
  assert.equal(locate(html,{rules:[custom],course:'FIT9999'}).images.length,0);
});
test('Ed attachments keep literal file links and reject non-Ed hosts',()=>{
  const result=locate('<a href="https://cdn.edusercontent.com/files/a.png">Image</a><a href="https://evil-edusercontent.com/files/b.png">Wrong</a>',{source:'ed',isThread:true});
  assert.deepEqual(result.images.map(i=>i.url),['https://cdn.edusercontent.com/files/a.png']);
});
test('candidate budgets report truncation instead of an unbounded result',()=>{
  const result=locate(Array.from({length:250},(_,i)=>`<img src="/${i}.png">`).join(''));
  assert.equal(result.truncated,true);assert.ok(result.images.length<=200);assert.ok(result.trace.length<=200);
});
test('malformed rule does not block siblings or builtin URL deduplication',()=>{
 const rules=[null,{source:'moodle'},fixtureRule({id:'community.broken',images:null}),builtins.moodle,fixtureRule({id:'community.a'}),fixtureRule({id:'community.b'})];
 const result=locate('<div class="attendance"><img src="/a.png"></div>',{rules});
 assert.deepEqual(result.images.map(i=>i.url),['https://learning.monash.edu/a.png']);
 assert.deepEqual(result.images[0].matches.map(r=>r.id),['builtin.moodle','community.a','community.b']);
});
test('overlapping rules share candidate budget without starving later recovery or provenance',()=>{
 const html=Array.from({length:60},(_,i)=>`<img width="${i===59?40:600}" height="30" src="/${i}.png">`).join('');
 const shared=Array.from({length:7},(_,i)=>fixtureRule({id:`community.overlap${i}`,images:{selectors:['img']}}));
 const recovery=fixtureRule({id:'community.recovery',images:{selectors:['img'],minWidth:30,minHeight:20}});
 const result=locate(html,{rules:[builtins.moodle,...shared,recovery]});
 assert.equal(result.images.length,60);assert.equal(result.truncated,false);
 assert.equal(result.images[0].matches.length,9);
 assert.deepEqual(result.images[59].matches.map(r=>r.id),['community.recovery']);
});
test('overlapping selectors do not consume one rule candidate budget twice',()=>{
 const html='<div class="attendance">'+Array.from({length:100},(_,i)=>`<img src="/${i}.png">`).join('')+'</div><img class="extra" src="/extra.png">';
 const rule=fixtureRule({images:{selectors:['.attendance img','div img','.extra']}});
 const result=locate(html,{rules:[rule]});
 assert.equal(result.images.length,101);assert.equal(result.truncated,false);
});
test('same raw ID in local and community origins retains both matches on one URL',()=>{
 const raw=fixtureRule(),rules=['local','community'].map(origin=>({...raw,origin,key:`${origin}:${raw.id}`}));
 const result=locate('<div class="attendance"><img src="/shared.png"><img src="/shared.png"></div>',{rules});
 assert.equal(result.images.length,1);
 assert.deepEqual(result.images[0].matches.map(r=>[r.id,r.origin,r.key]),[
  [raw.id,'local','local:community.example.images'],[raw.id,'community','community:community.example.images']
 ]);
 assert.deepEqual(result.trace.filter(t=>t.reason==='accepted'||t.reason==='duplicate').map(t=>t.ruleKey),[
  'local:community.example.images','local:community.example.images','community:community.example.images','community:community.example.images'
 ]);
});
