import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {ruleUI} from '../extension/source-rules/ui.js';

test('inline help describes the command without nesting buttons or replacing its name',()=>{
 const dom=new JSDOM('<div id="rules" data-rule-ui></div>'),doc=dom.window.document,root=doc.querySelector('#rules');
 try{
  const ui=ruleUI(root,s=>s),button=ui.button('builder-title','create'),wrap=ui.help('builder-entry-help',button);root.append(wrap);
  assert.equal(wrap.querySelectorAll('button').length,1);assert.ok(button.querySelector('.help-icon'));
  assert.equal(button.hasAttribute('aria-label'),false);const tip=doc.getElementById(button.getAttribute('aria-describedby'));assert.ok(tip);
  button.getBoundingClientRect=()=>({left:180,bottom:220});
  wrap.dispatchEvent(new dom.window.Event('mouseenter'));assert.equal(wrap.dataset.tipReady,'true');assert.equal(tip.style.left,'180px');
  wrap.dispatchEvent(new dom.window.Event('mouseleave'));assert.equal(wrap.dataset.tipReady,undefined);
  button.focus();assert.equal(wrap.dataset.tipReady,'true');assert.equal(tip.style.top,'228px');
 }finally{dom.window.close();}
});

test('help tooltips appear in position without a transition from the screen origin',async()=>{
 const dom=new JSDOM('<div id="rules" data-rule-ui></div>'),doc=dom.window.document;
 try{
  for(const path of ['style.css','source-rules/style.css']){const style=doc.createElement('style');style.textContent=await readFile(new URL('../extension/'+path,import.meta.url),'utf8');doc.head.append(style);}
  const root=doc.querySelector('#rules'),help=ruleUI(root,s=>s).help('test-help');root.append(help);
  const button=help.querySelector('button'),tip=help.querySelector('.tooltip');
  assert.equal(dom.window.getComputedStyle(tip).visibility,'hidden');
  button.getBoundingClientRect=()=>({left:240,bottom:320});
  help.dispatchEvent(new dom.window.Event('mouseenter'));
  assert.equal(tip.style.left,'240px');assert.equal(tip.style.top,'328px');
  assert.equal(help.dataset.tipReady,'true');
  assert.equal(dom.window.getComputedStyle(tip).transition,'none');
  assert.equal(dom.window.getComputedStyle(tip).transform,'none');
  help.dispatchEvent(new dom.window.Event('mouseleave'));
  assert.equal(help.hasAttribute('data-tip-ready'),false);
  button.focus();assert.equal(help.dataset.tipReady,'true');
 }finally{dom.window.close();}
});
