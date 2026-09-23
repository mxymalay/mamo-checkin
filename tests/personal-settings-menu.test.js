import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {installPersonalSettingsMenu} from '../extension/personal-settings-menu.js';
test('personal settings menu preserves actions and closes with outside, selection and Escape',async()=>{
 const dom=new JSDOM(await readFile(new URL('../extension/options.html',import.meta.url),'utf8')),doc=dom.window.document,menu=installPersonalSettingsMenu(doc),trigger=doc.querySelector('#personal-settings'),panel=doc.querySelector('#personal-settings-menu');let imported=0;doc.querySelector('#import-settings').onclick=()=>imported++;
 try{assert.equal(panel.hidden,true);trigger.click();assert.equal(panel.hidden,false);doc.querySelector('#import-settings').click();assert.equal(imported,1);assert.equal(panel.hidden,true);trigger.click();panel.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(panel.hidden,true);assert.equal(doc.activeElement,trigger);trigger.click();doc.body.click();assert.equal(panel.hidden,true);}finally{menu.dispose();dom.window.close();}
});
