import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installCompanionDownload,STORE_ID} from '../extension/companion-setup.js';
import {translate} from '../extension/i18n.js';
const markup='<section><div data-setup="install"><h2>Install</h2><ol class="setup-instructions"><li>Open the downloaded package.</li></ol><a href="https://github.com/mxymalay/mamo-checkin/releases/latest">Download package</a></div></section>';
test('GitHub extension also points users to the separate OCR package',()=>{
 const doc=new JSDOM(markup).window.document,box=doc.querySelector('section');
 installCompanionDownload(box,{doc});
 assert.ok(box.querySelector('#download-companion'));
 assert.ok(box.querySelector('a[href$="mamo-ocr-mac.zip"]'));
});
for(const isWindows of [true,false])test(`store installation links to helper only (${isWindows?'Windows':'Mac'})`,()=>{
 const dom=new JSDOM(markup),doc=dom.window.document,box=doc.querySelector('section');
 installCompanionDownload(box,{doc,isWindows,extensionId:STORE_ID});
 const link=doc.querySelector('#download-companion');assert.ok(link.href.endsWith(`mamo-ocr-${isWindows?'windows':'mac'}.zip`));
 assert.equal(link.closest('li'),doc.querySelector('.setup-instructions').firstElementChild);assert.equal(link.parentElement.className,'companion-download-row');
 assert.match(link.closest('li').querySelector('.authorization-title').textContent,/第一步：下载/);assert.equal(doc.querySelector('.setup-instructions').children[1].querySelector('.authorization-title').textContent,'第二步：打开解压后的 OCR 包。');assert.equal(doc.querySelector('.setup-instructions').children[2].querySelector('.authorization-title').textContent,'第三步：回到此页面，等待检测通过，自动进入下一步。');
 assert.equal(doc.querySelectorAll('[role=status]').length,0);assert.equal(doc.querySelector('.companion-download-hint').textContent,'请下载后解压。随后进行以下步骤。');assert.equal(link.parentElement.nextElementSibling,doc.querySelector('.companion-download-hint'));assert.doesNotMatch(translate(link.textContent,'en'),/[\u3400-\u9fff]/);assert.doesNotMatch(translate(link.closest('li').querySelector('.authorization-title').textContent,'en'),/[\u3400-\u9fff]/);assert.doesNotMatch(translate(doc.querySelector('.setup-instructions').children[1].querySelector('.authorization-title').textContent,'en'),/[\u3400-\u9fff]/);
 dom.window.close();
});
test('the extension package shows the same helper download step',()=>{
 const dom=new JSDOM(markup),doc=dom.window.document,box=doc.querySelector('section');
 installCompanionDownload(box,{doc});
 assert.ok(doc.querySelector('#download-companion'));
 assert.equal(doc.querySelector('.setup-instructions').children.length,3);assert.ok(doc.querySelector('.setup-step-controls'));assert.equal(doc.querySelector('.setup-instructions').firstElementChild.className,'setup-step-panel');
 dom.window.close();
});
test('the setup steps slide with arrows and dots',()=>{
 const dom=new JSDOM(markup),doc=dom.window.document,box=doc.querySelector('section');
 installCompanionDownload(box,{doc});
 const viewport=doc.querySelector('.setup-step-viewport'),track=doc.querySelector('.setup-step-track'),previous=doc.querySelector('.setup-step-arrow'),next=doc.querySelectorAll('.setup-step-arrow')[1],dots=doc.querySelectorAll('.setup-step-dot');
 assert.equal(previous.disabled,true);assert.equal(next.disabled,false);assert.equal(dots[0].getAttribute('aria-selected'),'true');
 assert.equal(viewport.style.height,'auto');next.click();assert.equal(track.style.transform,'translateX(-100%)');assert.equal(previous.disabled,false);assert.equal(dots[1].getAttribute('aria-selected'),'true');
 dots[2].click();assert.equal(track.style.transform,'translateX(-200%)');assert.equal(next.disabled,true);assert.equal(dots[2].getAttribute('aria-selected'),'true');
 previous.click();assert.equal(track.style.transform,'translateX(-100%)');assert.equal(next.disabled,false);dom.window.close();
});
