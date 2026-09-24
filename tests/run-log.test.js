import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {groupRunLog,renderRunLog,logSessionLabels} from '../extension/run-log.js';
test('session context shows class date and time, never message delivery time',()=>{
 assert.deepEqual(logSessionLabels({context:{course:'FIT5122',date:'2026-09-16',time:'18:00',type:'Applied',group:'01'}}),['FIT5122 · 2026-09-16 · 18:00 · Applied · 01']);
 assert.deepEqual(logSessionLabels({context:{course:'FIT5122',sentAt:'2026-09-17T10:00:00Z'}}),[]);
 assert.deepEqual(logSessionLabels({sessions:[{course:'FIT5120',date:'2026-09-18',time:'17:00'},{course:'FIT5120',date:'2026-09-18',time:'18:00'}]}),['FIT5120 · 2026-09-18 · 17:00','FIT5120 · 2026-09-18 · 18:00']);
});
test('log sections preserve chronology and identify source, course and OCR',()=>{
 const events=[{message:'正在核对网站已有签到',context:{sourceUrl:'https://attendance.monash.edu.my/student/Units.aspx'}},{message:'检查邮件会话 1/2',context:{course:'FIT5122',sourceUrl:'https://mail.google.com/mail/u/0/#all/123'}},{message:'正在等待邮件内容',context:{course:'FIT5122',sourceUrl:'https://mail.google.com/mail/u/0/#all/123'}},{message:'正在下载第 1/2 张图片',context:{course:'FIT5122'}},{message:'签到已提交，正在等待网站确认'}];
 const groups=groupRunLog(events);assert.equal(groups.length,4);assert.match(groups[0].title,/Attendance/);assert.match(groups[1].title,/Gmail.*FIT5122/);assert.match(groups[2].title,/图片/);assert.match(groups[3].title,/提交/);assert.deepEqual(groups.flatMap(g=>g.events),events);
 const dom=new JSDOM('<ol></ol>'),root=dom.window.document.querySelector('ol');renderRunLog(root,events);
 assert.equal(root.querySelectorAll('.run-log-divider').length,4);assert.equal(root.querySelector('.run-log-divider time'),null);assert.doesNotMatch(root.querySelector('.run-log-divider').textContent,/------/);dom.window.close();
});
