import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installBuilderSelectorEngine} from '../extension/source-rules/builder/selector-generator.js';
import {validateRule} from '../extension/source-rules/format.js';
import './helpers/install-source-runtime.js';
import {fixtureRule} from './helpers/source-rules.js';
test('runtime accepts relative images but not hidden aliases of the same URL',()=>{
 const dom=new JSDOM('<main><div class="attendance"><img src="/a.png"><img hidden src="/a.png"></div></main>',{url:'https://learning.monash.edu/course/view.php?id=1'});
 try{installBuilderSelectorEngine();const root=dom.window.document.querySelector('main'),[a,b]=root.querySelectorAll('img');
 const result=globalThis.__mamoBuilderSelector.evaluate({root,positives:[a],rule:fixtureRule(),source:'moodle',course:'DEMO1000'});
 assert.equal(result.eligible,true);assert.deepEqual(result.nodes,[a]);assert.equal(result.nodes.includes(b),false);
 }finally{dom.window.close();}
});
test('generator finds structural images without persisting private attributes',()=>{
 const dom=new JSDOM('<main><div class="attendance secret-person" id="private-message"><img src="https://learning.monash.edu/a.png?token=PRIVATE"></div><img class="avatar" src="https://learning.monash.edu/avatar.png"></main>',{url:'https://learning.monash.edu/course/view.php?id=1'});
 try{installBuilderSelectorEngine();const root=dom.window.document.querySelector('main'),positive=root.querySelector('div img'),negative=root.querySelector('.avatar');
 const candidates=globalThis.__mamoBuilderSelector.propose({root,positives:[positive],negatives:[negative],base:fixtureRule()});
 assert.ok(candidates.some(rule=>rule.images.selectors.includes('.attendance img')));for(const rule of candidates){validateRule(rule);assert.doesNotMatch(JSON.stringify(rule),/private|secret-person|PRIVATE|src=|nth-child/);}
 const good=candidates.find(rule=>rule.images.selectors.includes('.attendance img'));
 const result=globalThis.__mamoBuilderSelector.evaluate({root,positives:[positive],negatives:[negative],rule:good,source:'moodle',course:'DEMO1000'});assert.equal(result.eligible,true);
 }finally{dom.window.close();}
});
test('broad selectors are allowed but explicit excluded images still block enabling',()=>{
 const dom=new JSDOM('<main><img src="https://learning.monash.edu/a.png"><img src="https://learning.monash.edu/a.png"></main>',{url:'https://learning.monash.edu/course/view.php?id=1'});
 try{installBuilderSelectorEngine();const root=dom.window.document.querySelector('main'),[a,b]=root.querySelectorAll('img');
 const result=globalThis.__mamoBuilderSelector.evaluate({root,positives:[a],negatives:[b],rule:fixtureRule({images:{selectors:['img']}}),source:'moodle',course:'DEMO1000'});
 assert.equal(result.eligible,false);assert.ok(result.reasons.includes('builder-negative-match'));
 const broad=globalThis.__mamoBuilderSelector.evaluate({root,positives:[a],rule:fixtureRule({images:{selectors:['img']}}),source:'moodle',course:'DEMO1000'});
 assert.equal(broad.eligible,true);assert.deepEqual(broad.nodes,[a,b]);assert.deepEqual(broad.reasons,[]);
 }finally{dom.window.close();}
});
