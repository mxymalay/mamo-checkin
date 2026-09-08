import {recordKey,matchActivity} from './core.js';
import {outsideAttendanceWindow} from './recent-window.js';
import {recordInSchedule} from './timetable.js';
export function syncSessionRecords(state,now=Date.now()){
 for(const activity of state.activities||[]){
  if(!state.settings.courses.includes(activity.course)||!['course','date','time','type','group'].every(k=>activity[k]))continue;
  const start=Date.parse(`${activity.date}T${activity.time}:00+08:00`);
  if(!Number.isFinite(start)||start>now||outsideAttendanceWindow(activity,now)||!recordInSchedule(state.settings,activity,now))continue;
  const matches=(state.activities||[]).filter(a=>matchActivity(activity,a));if(matches.length!==1)continue;
  let record=state.records.find(r=>r.id===recordKey(activity));
  if(!record){record={id:recordKey(activity),course:activity.course,date:activity.date,time:activity.time,type:activity.type,group:activity.group,code:'',sessionOnly:true,sourceUrl:'https://attendance.monash.edu.my/student/Default.aspx'};state.records.push(record);}
  if(activity.state==='completed'){record.status='submitted';record.reason=state.runSubmittedIds?.has(record.id)?'本次签到已获网站确认':'网站原已签到，本次无需重复提交';}
  else if(activity.state==='expired'){record.status='expired';record.reason='网站已关闭该场次录入，无法补签';}
  else if(record.sessionOnly){record.status='waiting_code';record.reason='课程已上，暂未找到签到码；可能尚未发布或当前来源未检索到。可稍后重试。';}
 }
 for(const record of state.records){if(state.settings.courses.includes(record.course)&&record.status==='waiting_code'&&outsideAttendanceWindow(record,now)){record.status='expired';record.reason='课程已超过 7 天，无法补签';}}
}
