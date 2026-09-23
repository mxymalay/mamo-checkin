import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {validateRule} from '../extension/source-rules/format.js';
import {installRuleManager} from '../extension/source-rules/manager-ui.js';
import {ruleText} from '../extension/source-rules/strings.js';
import {fixtureRule} from './helpers/source-rules.js';

test('optional author and source links survive validation and reject unsafe URLs',()=>{
 for(const author of ['Teacher','https://github.com/mxymalay',{name:'Teacher',url:'https://example.org/profile'}]){
  const rule=fixtureRule({author,sourceUrl:'https://github.com/mxymalay/mamo-checkin-rules/blob/main/example.json'});
  assert.deepEqual(validateRule(rule),rule);
 }
 for(const url of ['javascript:alert(1)','data:text/html,x','file:///tmp/a','https://user:pass@example.org','//example.org','https://example.org/\npath']){
  assert.throws(()=>validateRule(fixtureRule({sourceUrl:url})),/url/);
  assert.throws(()=>validateRule(fixtureRule({author:{name:'X',url}})),/url/);
 }
 assert.throws(()=>validateRule(fixtureRule({author:{name:'X',url:'https://example.org',script:'bad'}})),/unknown-field/);
});

test('all library origins use title attribution, safe external links and individual course tags',async()=>{
 const dom=new JSDOM('<div id="manager"></div>',{url:'https://extension.test'}),doc=dom.window.document;
 const author={name:'mxymalay',url:'https://github.com/mxymalay'},sourceUrl='https://github.com/mxymalay/mamo-checkin-rules/blob/main/example.json';
 const shared=fixtureRule({author,sourceUrl,courses:['DEMO1000','DEMO2000']});
 const data={builtins:[{...shared,id:'builtin.moodle'}],rules:[{...shared,key:'local:example.rule',origin:'local'},{...shared,id:'community.saved',key:'community:community.saved',origin:'community'}],settings:{courses:['DEMO1000','DEMO2000'],sourceModes:{DEMO1000:'moodle',DEMO2000:'moodle'}},bindings:{}};
 const manager=installRuleManager({root:doc.querySelector('#manager'),request:async()=>data,translate:k=>ruleText(k,'en'),loadCatalog:async()=>[{...shared,id:'community.available',path:'examples/shared/example.json'}]});
 try{
  await manager.refresh();manager.show('community');await new Promise(r=>setTimeout(r,0));
  for(const row of doc.querySelectorAll('.rule-library-row')){
   const title=row.querySelector('.rule-name-row'),authorNode=title.querySelector('.rule-author');
   assert.equal(authorNode.tagName,'BUTTON');assert.equal(authorNode.textContent,'');assert.equal(title.children[1],authorNode.parentElement);assert.equal(authorNode.getAttribute('aria-label'),'Author');
   authorNode.click();const modal=doc.querySelector('dialog');assert.match(modal.textContent,/mxymalay/);assert.equal(modal.querySelector('.rule-author-page').href,author.url);modal.querySelector('[data-rule-action=close-dialog]').click();
   const source=title.querySelector('.rule-source-link');assert.equal(source.href,sourceUrl);assert.equal(source.target,'_blank');assert.match(source.rel,/noopener/);assert.ok(source.getAttribute('aria-label'));
   assert.deepEqual([...row.querySelectorAll('.rule-supported-courses .rule-course-tag')].map(n=>n.textContent),shared.courses);
  }
  data.rules=[{...shared,author:'Plain author',sourceUrl:undefined,origin:'local'}];await manager.refresh();
  const local=doc.querySelector('[data-library-panel=local] .rule-library-row');local.querySelector('.rule-author').click();assert.match(doc.querySelector('dialog').textContent,/Plain author/);assert.equal(doc.querySelector('dialog a'),null);assert.equal(local.querySelector('.rule-source-link'),null);
 }finally{manager.dispose();dom.window.close();}
});
