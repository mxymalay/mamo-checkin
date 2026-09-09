import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installCompanionDownload,STORE_ID} from '../extension/companion-setup.js';
import {translate} from '../extension/i18n.js';
const markup='<section><div data-setup="install"><h2>Install</h2><a href="https://github.com/mxymalay/mamo-checkin/releases/latest">Download package</a></div></section>';
test('GitHub development installation remains unchanged',()=>{
 const doc=new JSDOM(markup).window.document,box=doc.querySelector('section'),before=box.innerHTML;
 installCompanionDownload(box,{doc,extensionId:'nccgbccaamgcdcikjhljinefjbfcinfp'});
 assert.equal(box.innerHTML,before);
});
for(const isWindows of [true,false])test(`store installation links to helper only (${isWindows?'Windows':'Mac'})`,()=>{
 const dom=new JSDOM(markup),doc=dom.window.document,box=doc.querySelector('section');
 installCompanionDownload(box,{doc,isWindows,extensionId:STORE_ID});
 const link=doc.querySelector('#download-companion');assert.ok(link.href.endsWith(`mamo-ocr-${isWindows?'windows':'mac'}.zip`));
 assert.equal(box.querySelector('h2').nextElementSibling,link);link.addEventListener('click',e=>e.preventDefault());link.click();
 assert.match(doc.querySelector('[role=status]').textContent,/下载失败/);assert.doesNotMatch(translate(link.textContent,'en'),/[\u3400-\u9fff]/);
 dom.window.close();
});
