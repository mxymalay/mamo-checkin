import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installModuleTabs} from '../extension/module-tabs.js';
test('creation routes retain the library panel and leave lifecycle fires when switching modes',()=>{
 const dom=new JSDOM('<nav class="module-tabs"><button data-module-tab="recognition"></button><button data-module-tab="library"></button><button data-module-tab="matching"></button><button data-module-tab="test"></button></nav><section data-module-panel="recognition"></section><section data-module-panel="library"></section><section data-module-panel="matching"></section><section data-module-panel="test"></section>',{url:'https://extension.test/options.html#modules/create/practice'}),doc=dom.window.document,entered=[],left=[];
 const tabs=installModuleTabs({doc,embedded:true,onEnterCreate:mode=>entered.push(mode),onLeaveCreate:mode=>left.push(mode)});
 tabs.update(false);assert.equal(doc.querySelector('[data-module-panel=library]').hidden,false);assert.equal(doc.querySelector('[data-module-tab=library]').getAttribute('aria-selected'),'true');assert.equal(entered.at(-1),'practice');
 tabs.show('create/actual');assert.equal(left.at(-1),'practice');assert.equal(entered.at(-1),'actual');assert.equal(dom.window.location.hash,'#modules/create/actual');
 tabs.show('library');assert.equal(left.at(-1),'actual');tabs.dispose();dom.window.close();
});
