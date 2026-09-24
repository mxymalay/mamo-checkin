import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installHistoryDates} from '../extension/history-date-picker.js';
test('calendar supports presets, month selection, leap day and keyboard navigation',()=>{
 const dom=new JSDOM('<html lang="en"><section><button data-days="14"></button><div class="history-range"><input id="history-from"><input id="history-to"><button data-date="from"></button><button data-date="to"></button></div></section></html>');
 try{
  const host=dom.window.document.querySelector('section');
  installHistoryDates({host,translate:t=>t,now:()=>new Date('2024-03-02T12:00:00Z')});
  host.querySelector('[data-days]').click();assert.equal(host.querySelector('#history-from').value,'2024-02-18');assert.equal(host.querySelector('#history-to').value,'2024-03-02');
  host.querySelector('[data-date="from"]').click();
  host.querySelector('[data-day="2024-02-29"]').click();assert.equal(host.querySelector('#history-from').value,'2024-02-29');assert.equal(host.querySelector('.history-calendar').hidden,true);
  host.querySelector('[data-date="from"]').click();
  host.querySelector('[data-day="2024-02-29"]').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(dom.window.document.activeElement.dataset.day,'2024-03-01');
  dom.window.document.activeElement.click();assert.equal(host.querySelector('#history-from').value,'2024-03-01');
 }finally{dom.window.close();}
});
