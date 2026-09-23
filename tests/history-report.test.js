import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {historyReport} from '../extension/history-report.js';
test('Traditional report localizes headings and statuses but never changes record data',()=>{
 const dom=new JSDOM(historyReport([{date:'2026-09-01',course:'软件开发',status:'submitted',websiteState:'unknown',evidence:'local-record'}],{language:'zh-TW'})),doc=dom.window.document;
 try{assert.equal(doc.documentElement.lang,'zh-TW');assert.equal(doc.title,'學期簽到報告');assert.match(doc.body.textContent,/本機記錄狀態/);assert.equal(doc.querySelector('tbody strong').textContent,'软件开发');assert.equal(doc.querySelector('tbody tr').children[4].textContent,'已簽到');}finally{dom.window.close();}
});
test('report preserves evidence and separates local success from unknown website state',()=>{
 const html=historyReport([{date:'2026-09-01',course:'FIT5120',status:'submitted',websiteState:'unknown',evidence:'local-record'},{date:'2026-09-02',course:'<script>alert(1)</script>',websiteState:'unknown',evidence:'projected-current-schedule',sourceUrl:'javascript:alert(1)'}],{from:'2026-09-01',to:'2026-09-30',language:'en'});
 const doc=new JSDOM(html).window.document;
 assert.equal(doc.querySelectorAll('tbody tr').length,2);
 assert.equal(doc.querySelector('script'),null);assert.equal(doc.querySelector('a'),null);
 const cells=doc.querySelector('tbody tr').children;
 assert.equal(cells[4].textContent,'Checked in');assert.equal(cells[5].textContent,'Unknown');
 assert.match(doc.querySelector('.projected').textContent,/Projected from current timetable/);
 assert.doesNotMatch(doc.body.textContent,/[\u3400-\u9fff]/);
});
