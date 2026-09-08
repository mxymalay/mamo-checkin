import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
test('Windows guide shows its own installation flow and English translation',async()=>{
 Object.defineProperty(globalThis,'navigator',{value:{platform:'Win32'},configurable:true});
 const {createSetupGuide}=await import('../extension/setup-guide.js');
 const {translate}=await import('../extension/i18n.js');
 const doc=new JSDOM('<body><header></header></body>').window.document;
 createSetupGuide({doc,request(){},refresh(){},detect(){},checkHealth(){},reload(){}});
 const section=doc.querySelector('[data-setup="install"]');
 assert.match(section.textContent,/Install Windows OCR.exe/);
 assert.doesNotMatch(section.textContent,/macOS|安装Mac/);
 assert.equal(translate(section.querySelector('h2').textContent,'en'),'Install the Windows recognition service first');
});
