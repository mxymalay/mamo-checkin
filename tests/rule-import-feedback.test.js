import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createRuleDialog} from '../extension/source-rules/dialog.js';
import {showImportError,showRuleToast} from '../extension/source-rules/import-feedback.js';
import {ruleText} from '../extension/source-rules/strings.js';
const translate=k=>ruleText(k,'en')||k;
test('import error identifies filename, ID, path and reserved keyword reason without interpreting markup',()=>{
 const dom=new JSDOM('<button id="open">Import</button>'),doc=dom.window.document;
 const modal=showImportError({doc,translate,trigger:doc.querySelector('button'),filename:'bad.json',text:'{"id":"author.demo-test"}',error:new Error('id-reserved: $.id')});
 assert.match(modal.dialog.textContent,/bad.json/);assert.match(modal.dialog.textContent,/author.demo-test/);assert.match(modal.dialog.textContent,/\$\.id/);assert.match(modal.dialog.textContent,/builtin.*demo/i);
 assert.match(modal.dialog.textContent,/alice.fit5122.moodle/);
 modal.close();dom.window.close();
});
test('long invalid ID is bounded and other field failures identify the real field',()=>{
 const dom=new JSDOM('<button>Import</button>'),doc=dom.window.document;
 let modal=showImportError({doc,translate,filename:'long.json',text:JSON.stringify({id:'x'.repeat(5000)}),error:new Error('id-length: $.id')});assert.ok(modal.dialog.textContent.length<1000);modal.close();
 modal=showImportError({doc,translate,filename:'bad.json',text:'{}',error:new Error('selector: $.images.selectors[0]')});assert.match(modal.dialog.textContent,/\$\.images.selectors\[0\]/);assert.match(modal.dialog.textContent,/Unsupported image selector/);assert.doesNotMatch(modal.dialog.textContent,/alice.fit5122/);modal.close();dom.window.close();
});
test('detail dialog closes only outside its bounds and restores focus',()=>{
 const dom=new JSDOM('<button>Open</button>'),doc=dom.window.document;
 const modal=createRuleDialog({doc,translate,title:'Details',trigger:doc.querySelector('button'),dismissOnOutside:true});modal.show();
 modal.dialog.getBoundingClientRect=()=>({left:100,right:300,top:100,bottom:300});
 modal.dialog.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,clientX:120,clientY:120}));assert.ok(modal.dialog.isConnected);
 modal.dialog.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,clientX:20,clientY:20}));assert.equal(modal.dialog.isConnected,false);assert.equal(doc.activeElement,doc.querySelector('button'));dom.window.close();
});
test('copy feedback uses live toast and a bounded timer',async()=>{
 const dom=new JSDOM('<div></div>'),doc=dom.window.document,root=doc.querySelector('div');
 const dispose=showRuleToast(root,'JSON copied',{duration:10});assert.equal(root.querySelector('[role=status]').textContent,'JSON copied');assert.ok(root.querySelector('.rule-toast'));await new Promise(r=>setTimeout(r,30));assert.equal(root.querySelector('.rule-toast'),null);dispose();dom.window.close();
});
