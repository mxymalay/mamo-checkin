import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createPageTabs} from '../extension/page-tabs.js';
const html=readFileSync(new URL('../extension/options.html',import.meta.url),'utf8');
test('page tabs retain settings values and support keyboard navigation',()=>{
 const dom=new JSDOM(html),doc=dom.window.document;createPageTabs(doc);
 doc.querySelector('#email').value='abcd1234';doc.querySelector('#tab-courses').click();
 assert.equal(doc.querySelector('.courses-card').hidden,false);assert.equal(doc.querySelector('#settings>.columns').hidden,true);
 doc.querySelector('#tab-courses').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight'}));
 assert.equal(doc.querySelector('.records').hidden,false);assert.equal(doc.querySelector('#tab-records').getAttribute('aria-selected'),'true');
 doc.querySelector('#tab-settings').click();assert.equal(doc.querySelector('#email').value,'abcd1234');dom.window.close();
});
test('invalid fields reveal their page without altering the first-run wizard stage',()=>{
 const dom=new JSDOM(html),doc=dom.window.document,tabs=createPageTabs(doc);tabs.show('records');
 doc.querySelector('#email').dispatchEvent(new dom.window.Event('invalid'));
 assert.equal(doc.querySelector('#settings>.columns').hidden,false);assert.equal(doc.body.dataset.setup,'install');dom.window.close();
});

test('credits page uses the product description without the removed nickname banner',()=>{
 const dom=new JSDOM(html),credits=dom.window.document.querySelector('#credits');
 assert.doesNotMatch(credits.textContent,/MAMO CHECK-IN · OPEN SOURCE/);
 assert.doesNotMatch(credits.textContent,/一起把马莫|改进马莫/);
 assert.match(credits.textContent,/签到助手/);
 dom.window.close();
});
test('auxiliary module pages retain the header and unsaved settings while switching content',()=>{
 const dom=new JSDOM(html),doc=dom.window.document,tabs=createPageTabs(doc),header=doc.querySelector('header'),panel=doc.createElement('section');panel.id='module-page';doc.querySelector('footer').before(panel);
 assert.equal(typeof tabs.register,'function');tabs.register('modules',panel);doc.querySelector('#email').value='draft1234';tabs.show('modules');
 assert.equal(panel.hidden,false);assert.equal(doc.querySelector('#settings>.columns').hidden,true);assert.equal(doc.querySelector('header'),header);assert.equal(doc.querySelector('#tab-modules'),null);
 tabs.show('settings');assert.equal(panel.hidden,true);assert.equal(doc.querySelector('#email').value,'draft1234');dom.window.close();
});
