import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installRulePicker} from '../extension/source-rules/builder/picker.js';
import {installBuilderSelectorEngine} from '../extension/source-rules/builder/selector-generator.js';
import './helpers/install-source-runtime.js';
const setup=()=>{const dom=new JSDOM('<main><div class="attendance"><a href="/leave"><img src="https://learning.monash.edu/a.png"></a></div></main><img src="https://learning.monash.edu/outside.png">',{url:'https://learning.monash.edu/course/view.php?id=1'});installBuilderSelectorEngine();installRulePicker({sessionId:'s1',expiresAt:Date.now()+600000,labels:{cancel:'Cancel',pick:'Choose an image'}},dom.window.document);const picker=globalThis.__mamoRulePicker;picker.registerRoots({source:'moodle',course:'DEMO1000',roots:[{root:dom.window.document.querySelector('main')}]});return {dom,picker};};
test('picker only intercepts a valid image and Escape removes its controls',()=>{
 const {dom,picker}=setup(),doc=dom.window.document;
 try{picker.begin({sessionId:'s1'});const event=new dom.window.MouseEvent('click',{bubbles:true,cancelable:true});doc.querySelector('main img').dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(picker.inspect({sessionId:'s1'}).phase,'selected');assert.equal(picker.inspect({sessionId:'s1'}).images.length,1);doc.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(doc.querySelector('[data-mamo-picker]'),null);assert.equal(picker.inspect({sessionId:'s1'}).phase,'cancelled');}
 finally{picker.dispose();dom.window.close();}
});
test('picker invalidates a selected image after same-URL document content replacement',()=>{
 const {dom,picker}=setup(),doc=dom.window.document;
 try{picker.begin({sessionId:'s1'});doc.querySelector('main img').click();doc.querySelector('main').replaceChildren();assert.equal(picker.inspect({sessionId:'s1'}).phase,'invalidated');assert.throws(()=>picker.inspect({sessionId:'forged'}),/builder-session/);}
 finally{picker.dispose();dom.window.close();}
});
test('Enter on the toolbar inside its closed shadow root selects the image',()=>{
 const dom=new JSDOM('<main><div class="attendance"><img src="https://learning.monash.edu/a.png"></div></main>',{url:'https://learning.monash.edu/course/view.php?id=1'}),doc=dom.window.document;
 let shadow;const original=dom.window.Element.prototype.attachShadow;dom.window.Element.prototype.attachShadow=function(options){shadow=original.call(this,options);return shadow;};
 try{installRulePicker({sessionId:'s1',expiresAt:Date.now()+600000},doc);const picker=globalThis.__mamoRulePicker;picker.registerRoots({source:'moodle',course:'DEMO1000',roots:[{root:doc.querySelector('main'),messageKey:'one'}]});picker.begin({sessionId:'s1'});
 shadow.querySelector('section').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,composed:true,cancelable:true}));assert.equal(picker.inspect({sessionId:'s1'}).phase,'selected');
 picker.registerRoots({source:'moodle',course:'DEMO1000',roots:[{root:doc.querySelector('main'),messageKey:'two'}]});assert.equal(picker.inspect({sessionId:'s1'}).phase,'invalidated');
 }finally{globalThis.__mamoRulePicker?.dispose();dom.window.close();}
});
