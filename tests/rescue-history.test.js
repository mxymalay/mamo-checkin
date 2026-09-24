import test from 'node:test';
import assert from 'node:assert/strict';
import {recognizeTable} from '../extension/ocr-engine.js';
import {parseImageRows} from '../extension/core.js';
import {selectEdThreads} from '../extension/ed-ranking.js';
import {missingSessions} from '../extension/timetable.js';
import {readTargetPage} from '../extension/page-ready.js';
import {mergeHistory,semesterRows,historyCsv} from '../extension/history-export.js';
import {appendDiagnostic} from '../extension/diagnostic-log.js';
const word=(text,x,y,confidence=99)=>({text,confidence,bbox:{x0:x,y0:y,x1:x+40,y1:y+10}});
const data=words=>({data:{text:words.map(w=>w.text).join(' '),blocks:[{paragraphs:[{lines:[{words}]}]}]}});
const row=(y,day,code)=>[word('Studio',0,y),word(`Friday, ${day} Sep`,70,y),word('01-P2',180,y),word('6:00PM',260,y),...(code?[word(code,400,y)]:[])];
const meta={course:'FIT5120',messageId:'m',imageId:'i',sentAt:'2026-09-11T22:00:00+08:00'};
test('rescue code fragments do not become unreliable session fields',async()=>{
 const primary=[...row(10,4),word('7R',400,10,20),word('AJ8',420,10,20)];
 const worker={setParameters:async()=>{},recognize:async input=>input==='image'?data(primary):data([{...word('7RAJ8',10,20,40),bbox:{x0:10,y0:20,x1:70,y1:30}}])};
 const result=await recognizeTable(worker,'image',500,100,async()=> 'crop',()=>{},{codeZone:[{image:'zone',left:400,padding:10}]});
 assert.equal(parseImageRows(result,meta)[0].status,'ready');
});
test('both valid crop alternatives survive even when the raw crop is malformed',async()=>{
 const worker={setParameters:async()=>{},recognize:async input=>input==='image'?data(row(10,4,'ABCDE')):{data:{text:input==='threshold'?'7RAJ8':'ABC',confidence:80}}};
 const result=await recognizeTable(worker,'image',500,100,async()=> 'crop',()=>{},{cropThreshold:async()=> 'threshold'});
 assert.ok(parseImageRows(result,meta)[0].codeCandidates.includes('7RAJ8'));
});
test('one recognized row does not authorize geometry-free zone fallback',async()=>{
 const worker={setParameters:async()=>{},recognize:async input=>input==='image'?data(row(10,4)):{data:{text:'F59V7'}}};
 const result=await recognizeTable(worker,'image',500,100,async()=> 'crop',()=>{},{codeZone:['zone']});
 assert.equal(result.some(o=>o.text==='F59V7'),false);
});
test('partial OCR success still rescues missing codes with row coordinates and pass diagnostics',async()=>{
 const primary=[...row(10,4,'7RAJ8'),...row(60,11)],calls=[];let diagnostics;
 const worker={setParameters:async()=>{},recognize:async input=>{
  calls.push(input);
  if(input==='image')return data(primary);
  if(input==='zone')return data([word('7RAJ8',10,20),word('F59V7',10,70,42)]);
  return {data:{text:'7RAJ8',confidence:90}};
 }};
 const result=await recognizeTable(worker,'image',500,100,async()=> 'crop',()=>{},{codeZone:[{image:'zone',left:400,padding:10}],diagnostics:value=>{diagnostics=value;}});
 const records=parseImageRows(result,meta);
 assert.deepEqual(records.map(r=>[r.date,r.code,r.status]),[['2026-09-04','7RAJ8','ready'],['2026-09-11','F59V7','ready']]);
 assert.equal(calls.includes('zone'),true);assert.equal(diagnostics.width,500);assert.ok(diagnostics.passes.length>=3);
});
test('code-shaped garbage cannot suppress a different crop candidate',async()=>{
 const worker={setParameters:async()=>{},recognize:async input=>input==='image'?data(row(10,4,'ABCDE')):input==='zone'?data([word('7RAJ8',10,20,40)]):{data:{text:'ABCDE',confidence:99}}};
 const result=await recognizeTable(worker,'image',500,100,async()=> 'crop',()=>{},{codeZone:[{image:'zone',left:400,padding:10}]});
 const record=parseImageRows(result,meta)[0];
 assert.deepEqual(record.codeCandidates,['ABCDE','7RAJ8']);assert.equal(record.status,'ready');
});
test('geometry-free code-column text cannot be assigned across multiple rows',async()=>{
 const worker={setParameters:async()=>{},recognize:async input=>input==='image'?data([...row(10,4),...row(60,11)]):{data:{text:'F59V7'}}};
 const result=await recognizeTable(worker,'image',500,100,async()=>'',()=>{},{codeZone:['zone']});
 assert.equal(result.some(o=>o.text==='F59V7'),false);
});
test('layout rescue restores all fields of a wholly missing row',async()=>{
 let main=0;
 const worker={setParameters:async()=>{},recognize:async input=>input==='image'?data(++main===1?row(10,4,'7RAJ8'):[...row(10,4,'7RAJ8'),...row(60,11,'F59V7')]):{data:{text:input,confidence:99}}};
 const result=await recognizeTable(worker,'image',500,100,async box=>box.top===10?'7RAJ8':'F59V7',()=>{},{layoutRescue:true});
 assert.deepEqual(parseImageRows(result,meta).map(r=>r.code),['7RAJ8','F59V7']);
});
test('Ed selection promotes a missing date beyond the old four-post limit',()=>{
 const threads=Array.from({length:6},(_,i)=>({url:String(i),label:`Attendance Week ${i+1}`}));
 threads.push({url:'target',label:'Attendance 11 Sep'});
 const selected=selectEdThreads(threads,[{date:'2026-09-11'}]);
 assert.equal(selected[0].url,'target');assert.equal(selected.length,4);
 assert.equal(selectEdThreads(threads,[{week:6}])[0].url,'5');
});
test('missing session week uses matching-week evidence, not an invented semester calendar',()=>{
 const state={settings:{courses:['FIT5120'],detectedSessions:{FIT5120:[{course:'FIT5120',date:'2026-09-11',time:'18:00',type:'Studio',group:'01'}]}},activities:[],records:[{course:'FIT5120',date:'2026-09-08',subject:'Attendance Week 7'}]};
 state.activities=state.settings.detectedSessions.FIT5120.map(slot=>({...slot,state:'available'}));
 assert.equal(missingSessions(state,'FIT5120',Date.parse('2026-09-11T22:00:00+08:00'))[0].week,7);
 state.records[0].date='2026-09-01';assert.equal(missingSessions(state,'FIT5120')[0].week,undefined);
});
test('content polling works while tab is loading and waits for a stable payload',async()=>{
 let at=0,count=0;
 const value=await readTargetPage({navigate:async()=>{},read:async()=>++count===1?{loading:true}:{messages:['ready']},pause:async ms=>{at+=ms;},now:()=>at,timeout:5000});
 assert.deepEqual(value.messages,['ready']);assert.equal(count,3);
});
test('content polling is bounded and login failures are immediate',async()=>{
 let at=0;
 await assert.rejects(readTargetPage({navigate:async()=>{},read:async()=>({loading:true}),pause:async ms=>{at+=ms;},now:()=>at,timeout:1000}),/没有及时加载/);
 await assert.rejects(readTargetPage({navigate:async()=>{},read:async()=>{throw new Error('[LOGIN_REQUIRED]');},pause:async()=>assert.fail()}),/LOGIN_REQUIRED/);
});
test('diagnostic writes serialize concurrent events and retain only bounded metadata',async()=>{
 let stored={diagnosticLog:Array.from({length:500},(_,i)=>({event:i}))};
 const storage={get:async()=>structuredClone(stored),set:async value=>{stored=value;}};
 await Promise.all([appendDiagnostic(storage,{event:'one'}),appendDiagnostic(storage,{event:'two'})]);
 assert.equal(stored.diagnosticLog.length,500);assert.deepEqual(stored.diagnosticLog.slice(-2).map(e=>e.event),['one','two']);
});
const slot={course:'FIT5120',date:'2026-09-11',time:'18:00',type:'Studio',group:'01'};
test('semester export never treats predictions or local expiry as website attendance',()=>{
 const settings={courses:['FIT5120'],schedules:{FIT5120:[{weekday:5,time:'18:00',type:'Studio',group:'01'}]}};
 const history=mergeHistory([],[{...slot,state:'completed'}],'2026-09-12T00:00:00Z');
 const rows=semesterRows({from:'2026-09-04',to:'2026-09-18',history,settings,includeProjected:true});
 assert.deepEqual(rows.map(r=>r.websiteState),['unknown','completed','unknown']);
 assert.equal(rows[0].evidence,'projected-current-schedule');assert.equal(rows[0].code,'');
 assert.equal(semesterRows({from:'2026-09-04',to:'2026-09-18',history,settings}).length,1);
 assert.equal(semesterRows({from:'2026-09-01',to:'2026-09-30',records:[{...slot,status:'expired'}]})[0].websiteState,'unknown');
});
test('history refresh deduplicates sessions, validates ranges and escapes CSV formulas',()=>{
 let history=mergeHistory([],[{...slot,state:'available'}]);history=mergeHistory(history,[{...slot,state:'completed'}]);
 assert.equal(history.length,1);assert.equal(history[0].websiteState,'completed');
 for(const [from,to] of [['2026-02-30','2026-03-01'],['2026-09-02','2026-09-01'],['2024-01-01','2026-01-01']])assert.throws(()=>semesterRows({from,to}));
 assert.match(historyCsv([{...slot,code:'=CMD()'}]),/'=CMD/);
});
