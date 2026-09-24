import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
test('log dialog has readable text, timestamps and links outside the status card',async()=>{
 const dom=new JSDOM('<dialog class="live-run-dialog" open><ol class="run-events"><li><time>17:19:07</time>Reading course images<a href="#">Source</a></li><li class="error">Failed</li></ol></dialog>');
 try{
  for(const file of ['style.css','dashboard.css']){const style=dom.window.document.createElement('style');style.textContent=await readFile(new URL('../extension/'+file,import.meta.url),'utf8');dom.window.document.head.append(style);}
  const doc=dom.window.document,css=selector=>dom.window.getComputedStyle(doc.querySelector(selector));
  const actions=doc.createElement('div');actions.className='run-log-actions';doc.querySelector('dialog').append(actions);
  assert.equal(css('.run-log-actions').marginTop,'20px');
  assert.equal(css('li').color,'rgb(36, 51, 63)');
  assert.equal(css('time').color,'rgb(82, 104, 119)');
  assert.equal(css('a').color,'rgb(0, 109, 174)');
  assert.equal(css('li.error').color,'rgb(179, 38, 30)');
  assert.equal(css('dialog').margin,'auto');
 }finally{dom.window.close();}
});
