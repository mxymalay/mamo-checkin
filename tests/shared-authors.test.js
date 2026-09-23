import test from 'node:test';
import assert from 'node:assert/strict';
import {sharedRuleAuthors} from '../extension/source-rules/shared-authors.js';
import {JSDOM} from 'jsdom';
import {installRuleManager} from '../extension/source-rules/manager-ui.js';
import {ruleText} from '../extension/source-rules/strings.js';

test('shared author directory deduplicates by URL or text and ignores absent or unsafe authors',()=>{
 const authors=sharedRuleAuthors([{id:'a',author:'https://github.com/mxymalay/'},{id:'b',author:{name:'mxymalay',url:'https://github.com/mxymalay'}},{id:'c',author:'Writer'},{id:'d',author:'writer'},{id:'e'},{id:'f',author:'javascript:alert(1)'}]);
 assert.deepEqual(authors,[{name:'mxymalay',url:'https://github.com/mxymalay/',count:2},{name:'Writer',url:'',count:2}]);
});
test('author navigation loads the entire catalog, independent of installed rules',async()=>{
 const dom=new JSDOM('<main></main>'),doc=dom.window.document;
 const manager=installRuleManager({root:doc.querySelector('main'),translate:key=>ruleText(key,'en'),request:async()=>({rules:[],settings:{courses:[]}}),loadCatalog:async()=>[{id:'a',name:{en:'A'},version:'1.0.0',source:'gmail',courses:['FIT5122'],sourceUrl:'https://example.com/rule.json',author:{name:'Author',url:'https://example.com'}}]});
 try{await manager.refresh();manager.show('shared-authors');await new Promise(resolve=>setTimeout(resolve,5));
  const panel=doc.querySelector('[data-library-panel=shared-authors]');assert.equal(panel.hidden,false);assert.equal(doc.querySelector('.rule-shared-menu').hidden,false);assert.match(panel.textContent,/Author/);assert.equal(panel.querySelector('a').href,'https://example.com/');assert.equal(panel.querySelector('a').rel,'noopener noreferrer');
 }finally{manager.dispose();dom.window.close();}
});
