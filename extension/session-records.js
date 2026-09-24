import {recordKey,matchActivity} from './core.js';
import {outsideAttendanceWindow} from './recent-window.js';
import {recordInSchedule} from './timetable.js';
export function repairLocalExpiry(records){
 return records.map(record=>{
  if(record.status!=='expired'||!['课程已超过 7 天，不再补签','课程已超过 7 天，无法补签'].includes(record.reason))return record;
  const complete=['course','date','time','type','group','code'].every(k=>record[k]);
  return {...record,status:record.attemptedAt?'uncertain':complete?'ready':record.sessionOnly?'waiting_code':'review',reason:''};
 });
}
export function syncSessionRecords(state,now=Date.now()){
 state.records=repairLocalExpiry(state.records);
 for(const activity of state.activities||[]){
  if(!state.settings.courses.includes(activity.course)||!['course','date','time','type','group'].every(k=>activity[k]))continue;
  const start=Date.parse(`${activity.date}T${activity.time}:00+08:00`);
  if(!Number.isFinite(start)||start>now)continue;
  const matches=(state.activities||[]).filter(a=>matchActivity(activity,a));if(matches.length!==1)continue;
  let record=state.records.find(r=>r.id===recordKey(activity));
  if(record&&['ignored','linked'].includes(record.status))continue;
  if(!record&&(outsideAttendanceWindow(activity,now)||!recordInSchedule(state.settings,activity,now)))continue;
  if(!record){record={id:recordKey(activity),course:activity.course,date:activity.date,time:activity.time,type:activity.type,group:activity.group,code:'',sessionOnly:true,sourceUrl:'https://attendance.monash.edu.my/student/Default.aspx'};state.records.push(record);}
  // Preserve incomplete readings as evidence, never infer submission fields.
  const compatible=(r,a)=>r.course===a.course&&r.type===a.type&&r.time===a.time&&(!r.date||r.date===a.date)&&(!r.group||r.group===a.group);
  const partials=state.records.filter(r=>r!==record&&r.imageId&&r.status==='review'&&!r.attemptedAt&&!r.submittedAt&&(!r.date||!r.group||!r.code)&&compatible(r,activity)&&(state.activities||[]).filter(a=>compatible(r,a)).length===1);
  if(partials.length){
   record.ocrEvidence=[...new Map([...(record.ocrEvidence||[]),...partials].map(r=>[r.id,r])).values()];
   record.sources=[...new Map([...(record.sources||[]),...partials.map(r=>({sourceUrl:r.sourceUrl,messageId:r.messageId,imagePath:r.imagePath}))].map(s=>[[s.sourceUrl,s.messageId,s.imagePath].join('|'),s])).values()];
   state.records=state.records.filter(r=>!partials.includes(r));
  }
  if(['completed','expired'].includes(activity.state)){
   const partials=state.records.filter(r=>r!==record&&!r.group&&!r.code&&['review','expired'].includes(r.status)&&['course','date','time','type'].every(k=>r[k]&&r[k]===activity[k])&&(state.activities||[]).filter(a=>['course','date','time','type'].every(k=>a[k]===r[k])).length===1);
   if(partials.length){
    record.ocrEvidence=[...new Map([...(record.ocrEvidence||[]),...partials].map(r=>[r.id,r])).values()];
    const subjects=[...new Set(partials.map(r=>r.subject).filter(Boolean))];if(!record.subject&&subjects.length===1)record.subject=subjects[0];
    state.records=state.records.filter(r=>!partials.includes(r));
   }
  }
  if(activity.state==='completed'){record.status='submitted';record.reason=state.runSubmittedIds?.has(record.id)?'本次签到已获网站确认':'网站原已签到，本次无需重复提交';}
  else if(activity.state==='expired'){record.status='expired';record.reason='网站已关闭该场次录入，无法补签';}
  else if(record.sessionOnly){
   const compatible=(r,a)=>r.course===a.course&&r.type===a.type&&r.time===a.time&&(!r.date||r.date===a.date)&&(!r.group||r.group===a.group);
   const evidence=record.ocrEvidence||[];
   record.status='waiting_code';record.reason=evidence.length?'找到相关图片，但日期或签到码未完整识别。请重试识别，或核对来源后手动补码。':'课程已上，暂未找到签到码；可能尚未发布或当前来源未检索到。可稍后重试。';
   if(evidence.length)record.sources=[...new Map([...(record.sources||[]),...evidence.map(r=>({sourceUrl:r.sourceUrl,messageId:r.messageId,imagePath:r.imagePath}))].map(s=>[[s.sourceUrl,s.messageId,s.imagePath].join('|'),s])).values()];
  }
 }
}
