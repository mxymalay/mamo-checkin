import test from 'node:test';
import assert from 'node:assert/strict';
import {parseImageRows, mergeRecords, eligible, matchActivity, parseMailDate, parseActivity} from '../extension/core.js';
const meta={course:'FIT5120',sentAt:'2026-09-04T22:08:00+08:00',messageId:'sample',sourceUrl:'https://mail.google.com/mail/u/2/#all/example'};
const observation=(text,y=.7,confidence=1)=>({text,x:0,y,width:1,height:.2,confidence});
const row='Studio Friday,4 Sep 01-P2 6:00PM ZQSB3';
test('separate image rows retain their own date, group and code',()=>{
  const rows=parseImageRows([observation('Studio Tuesday,1 Sep 01-P1 6:00PM T9KUG',.7),observation(row,.2)],meta);
  assert.deepEqual(rows.map(r=>[r.date,r.group,r.code,r.time]),[['2026-09-01','01-P1','T9KUG','18:00'],['2026-09-04','01-P2','ZQSB3','18:00']]);
});
test('split OCR columns are joined by geometry, not OCR output order',()=>{
 const cells=['8RAJ8','Friday,4 Sep','Seminar','5:00PM','01'].map((text,i)=>({...observation(text),x:[.93,.36,0,.69,.54][i],width:.05}));
 assert.equal(parseImageRows(cells,meta)[0].code,'8RAJ8');
});
test('both FIT5122 activity types are supported',()=>{
 const rows=parseImageRows([observation('Workshop Monday,31 Aug 01 6:00PM QK28J',.7),observation('Applied Wednesday,2 Sep 01 6:00PM PNK7L',.2)],{...meta,course:'FIT5122',sentAt:'2026-09-02T19:31:00+08:00'});
 assert.deepEqual(rows.map(r=>[r.type,r.code,r.group]),[['Workshop','QK28J','01'],['Applied','PNK7L','01']]);
});
test('Applied Workshop is canonicalized to Applied on image and activity text',()=>{
 const parsed=parseImageRows([observation('Applied Workshop Wednesday,2 Sep 01 6:00PM PNK7L')],{...meta,course:'FIT5122',sentAt:'2026-09-02T19:31:00+08:00'})[0];
 assert.equal(parsed.type,'Applied');
 assert.equal(parseActivity('6:00 pm FIT5122 Applied Workshop 01',parsed.date).type,'Applied');
});
test('uncertain code or wrong weekday never becomes submit-ready',()=>{
 assert.equal(parseImageRows([observation(row,.7,.4)],meta)[0].status,'review');
 assert.equal(parseImageRows([observation(row.replace('Friday','Monday'))],meta)[0].status,'review');
 assert.equal(parseImageRows([observation(row.replace('ZQSB3','WQSB?'))],meta)[0].status,'review');
});
test('verified code crop allows low raw confidence but an explicit disagreement blocks',()=>{
 const cells=['Studio','Friday,4 Sep','01-P2','6:00PM','ZQSB3'].map((text,index)=>({...observation(text,.7,index===4?.55:1),x:[0,.3,.55,.7,.9][index],width:.08,...(index===4&&{codeVerified:true})}));
 const verified=parseImageRows(cells,meta)[0];
 assert.equal(verified.confidence,.55);assert.equal(verified.codeVerified,true);assert.equal(verified.status,'ready');assert.equal(eligible(verified,Date.parse('2026-09-04T19:00:00+08:00')),true);
 const disagreed=parseImageRows(cells.map(cell=>cell.text==='ZQSB3'?{...cell,confidence:1,codeVerified:false}:cell),meta)[0];
 assert.equal(disagreed.codeVerified,false);assert.equal(disagreed.status,'review');assert.match(disagreed.reason,/复核结果不一致/);
});
test('verified code cannot excuse an unverified low-confidence structural field',()=>{
 const cells=['Studio','Friday,4 Sep','01-P2','6:00PM','ZQSB3'].map((text,index)=>({
   ...observation(text,.7,index===2?.01:index===4?.55:1),x:[0,.3,.55,.7,.9][index],width:.08,
   ...(index===4&&{codeVerified:true})
 }));
 const unsafe=parseImageRows(cells,meta)[0];
 assert.equal(unsafe.status,'review');
 assert.match(unsafe.reason,/识别置信度不足/);
 assert.equal(eligible({...unsafe,status:'ready'},Date.parse('2026-09-04T19:00:00+08:00')),false,'eligible must independently enforce saved evidence');

 const verified=parseImageRows(cells.map(cell=>cell.text==='01-P2'?{...cell,fieldVerified:true}:cell),meta)[0];
 assert.equal(verified.status,'ready');
 assert.deepEqual(verified.fieldVerification.find(field=>field.text==='01-P2'),{text:'01-P2',confidence:.01,fieldVerified:true});
 assert.equal(eligible(verified,Date.parse('2026-09-04T19:00:00+08:00')),true);
});
test('image date permits Monash period punctuation and missing day-month whitespace',()=>{
 const parsed=parseImageRows([observation('Applied Wednesday. 2Sep 01 6:00PM PNK7L')],{...meta,course:'FIT5122',sentAt:'2026-09-02T19:31:00+08:00'})[0];
 assert.equal(parsed.date,'2026-09-02');assert.equal(parsed.status,'ready');
});
test('merged OCR rows with multiple session fields are rejected as ambiguous',()=>{
 const merged='Studio Friday,4 Sep 01-P2 6:00PM ZQSB3 Studio Friday,4 Sep 02-P2 7:00PM ABCDE';
 const parsed=parseImageRows([observation(merged)],{...meta,imageId:'merged'})[0];
 assert.equal(parsed.status,'review');
 assert.match(parsed.reason,/同一行包含多个/);
 assert.equal(parsed.id,'sample|merged|row-0');
});
test('sent year resolves a December image from a January email',()=>{
 assert.equal(parseImageRows([observation('Workshop Wednesday,31 Dec 01 6:00PM ABC23')],{...meta,sentAt:'2026-01-02T09:00:00+08:00'})[0].date,'2025-12-31');
});
test('Gmail September spelling and exact year are parsed in Malaysia timezone',()=>{
 assert.equal(parseMailDate('2 Sept 2026, 19:31'),'2026-09-02T19:31:00+08:00');
 assert.equal(parseMailDate('Wed, 2 Sept, 19:31'),null);
 assert.equal(parseMailDate('Wed, 2 September 2026, 7:31 PM'),'2026-09-02T19:31:00+08:00');
 assert.equal(parseMailDate('2 September 2026\u00a0 7:31 PM'),'2026-09-02T19:31:00+08:00');
});
test('Gmail date parser accepts Windows and localized timestamp formats without guessing the year',()=>{
 assert.equal(parseMailDate('Sep 4, 2026, 10:08 PM'),'2026-09-04T22:08:00+08:00');
 assert.equal(parseMailDate('2026年9月4日 下午10:08'),'2026-09-04T22:08:00+08:00');
 assert.equal(parseMailDate('2026-09-04 22:08'),'2026-09-04T22:08:00+08:00');
 assert.equal(parseMailDate('Sep 4, 10:08 PM'),null);
 assert.equal(parseMailDate('31 February 2026, 10:00'),null);
});
test('conflicting codes block a session, identical codes deduplicate',()=>{
 const r=parseImageRows([observation(row)],meta)[0];
 assert.equal(mergeRecords([r],[{...r,messageId:'another'}]).length,1);
 const conflict=mergeRecords([r],[{...r,code:'ABCDE'}]);
 assert.equal(conflict.length,1); assert.equal(conflict[0].status,'review');
});
test('a reliable repeat repairs an untouched review record and preserves all sources',()=>{
 const ready=parseImageRows([observation(row)],{...meta,messageId:'new',imagePath:'/archive/new.png'})[0];
 const review={...ready,messageId:'old',sourceUrl:'https://mail.google.com/old',imagePath:'/archive/old.png',status:'review',reason:'图片文字置信度不足'};
 const [merged]=mergeRecords([review],[ready]);
 assert.equal(merged.status,'ready');
 assert.equal(merged.messageId,'new');
 assert.deepEqual(merged.sources,[
   {sourceUrl:'https://mail.google.com/old',messageId:'old',imagePath:'/archive/old.png'},
   {sourceUrl:meta.sourceUrl,messageId:'new',imagePath:'/archive/new.png'}
 ]);
});
test('reliable repeats never reset protected attempts or records with conflicts',()=>{
 const ready=parseImageRows([observation(row)],meta)[0];
 for(const protectedRecord of [
   {...ready,status:'submitted',submittedAt:'2026-09-04T18:01:00+08:00'},
   {...ready,status:'attempting',attemptedAt:'2026-09-04T18:00:00+08:00'},
   {...ready,status:'uncertain',attemptedAt:'2026-09-04T18:00:00+08:00'},
   {...ready,status:'review',conflicts:['ZQSB3','ABCDE']}
 ]) {
   const [merged]=mergeRecords([protectedRecord],[{...ready,messageId:'new'}]);
   assert.equal(merged.status,protectedRecord.status);
   assert.deepEqual(merged.conflicts,protectedRecord.conflicts);
   assert.equal(merged.attemptedAt,protectedRecord.attemptedAt);
   assert.equal(merged.submittedAt,protectedRecord.submittedAt);
 }
});
test('future sessions, uncertain attempts and mismatched groups cannot submit',()=>{
 const r=parseImageRows([observation(row)],meta)[0];
 assert.equal(eligible(r,Date.parse('2026-09-04T17:00:00+08:00')),false);
 assert.equal(eligible(r,Date.parse('2026-09-04T19:00:00+08:00')),true);
 assert.equal(eligible({...r,status:'attempting'},Date.parse('2026-09-04T19:00:00+08:00')),false);
 assert.equal(matchActivity(r,{course:'FIT5120',type:'Studio',group:'01-P1',date:r.date,time:r.time}),false);
 assert.equal(matchActivity(r,{...r}),true);
});
test('configured course-shaped identifiers are parsed and can become eligible',()=>{
 const detail=parseActivity('6:00 pm COMP90024 Workshop 01','2026-09-07');
 assert.deepEqual(detail,{course:'COMP90024',type:'Workshop',group:'01',date:'2026-09-07',time:'18:00'});
 assert.equal(eligible({...detail,code:'ABCDE',confidence:1,status:'ready'},Date.parse('2026-09-07T19:00:00+08:00')),true);
 const parsed=parseImageRows([observation('Tutorial Monday,7 Sep 02 6:00PM BC234')],{...meta,course:'COMP90024',sentAt:'2026-09-07T19:00:00+08:00'})[0];
 assert.deepEqual([parsed.type,parsed.status],['Tutorial','ready']);
});
test('re-reading the same image replaces an incomplete row without duplicate historical records',()=>{
 const common={course:'ABC1234',date:'2026-09-04',time:'17:00',type:'Seminar',imageId:'fixture',messageId:'mail'};
 const partial={...common,id:'mail|fixture|row-0',group:null,code:null,status:'expired'};
 const full={...common,id:'ABC1234|2026-09-04|Seminar|01|17:00',group:'01',code:'AB123',status:'review'};
 const rows=mergeRecords([partial],[full]);assert.equal(rows.length,1);assert.equal(rows[0].id,full.id);assert.equal(rows[0].status,'expired');
});
