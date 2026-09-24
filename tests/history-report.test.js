import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {historyReport} from '../extension/history-report.js';
test('outside website coverage is informational and exports the observed date range',()=>{
 const dom=new JSDOM(historyReport([{date:'2026-07-01',websiteState:'outside-range',status:'ready',code:'AB123'}],{language:'en',lookup:{phase:'complete',attendanceRange:{from:'2026-09-13',to:'2026-09-27'}}}));
 try{const text=dom.window.document.body.textContent;assert.match(text,/Lookup complete/);assert.match(text,/Outside the Attendance date range/);assert.match(text,/2026-09-13 — 2026-09-27/);assert.doesNotMatch(text,/Lookup incomplete/);}finally{dom.window.close();}
});
test('lookup report exposes partial coverage and escapes warnings',()=>{
 const dom=new JSDOM(historyReport([],{from:'2026-08-01',to:'2026-09-24',language:'en',lookup:{phase:'partial',warnings:['<script>bad</script>'],finishedAt:'2026-09-24'}}));
 try{assert.match(dom.window.document.body.textContent,/Lookup incomplete/);assert.doesNotMatch(dom.window.document.body.textContent,/exporting does not search/);assert.equal(dom.window.document.querySelectorAll('script').length,1);assert.doesNotMatch(dom.window.document.querySelector('script').textContent,/bad/);}finally{dom.window.close();}
});
test('standalone lookup filters courses and toggles chronological order without inventing attendance',()=>{
 const rows=[{date:'2026-09-02',time:'18:00',course:'B1000',code:'AB123',status:'ready',websiteState:'unknown'},{date:'2026-09-01',time:'17:00',course:'A1000',code:'CD456',status:'ready',websiteState:'unknown'}];
 const dom=new JSDOM(historyReport(rows,{language:'en',lookup:{phase:'complete'}}),{runScripts:'dangerously'});
 try{
  const doc=dom.window.document;assert.equal(doc.querySelector('tbody tr').dataset.course,'A1000');
  assert.match(doc.querySelector('tbody').textContent,/Code extracted/);assert.match(doc.querySelector('tbody').textContent,/No matching website session observed/);
  assert.doesNotMatch(doc.querySelector('tbody').textContent,/Awaiting match/);
  doc.getElementById('time-sort').click();assert.equal(doc.querySelector('tbody tr').dataset.course,'B1000');
  [...doc.querySelectorAll('#course-filters button')].find(b=>b.textContent==='A1000').click();
  assert.equal(doc.querySelectorAll('tbody tr:not([hidden])').length,1);
  doc.querySelector('#course-filters button').click();assert.equal(doc.querySelectorAll('tbody tr:not([hidden])').length,2);
 }finally{dom.window.close();}
});
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
