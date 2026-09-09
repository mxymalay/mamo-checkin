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
