import {semesterRows} from './history-export.js';
import {validTestDate} from './source-rules/test-date-range.js';
import {siteDate} from './core.js';
export function attendanceDateRange(tokens=[]){
 const dates=tokens.map(siteDate).filter(validTestDate).sort();
 return dates.length?{from:dates[0],to:dates.at(-1)}:null;
}
export function validateHistoryRange(range){
 if(!range||!validTestDate(range.from)||!validTestDate(range.to)||range.from>range.to||Date.parse(range.to)-Date.parse(range.from)>366*86400000)throw new Error('请选择有效的起止日期，范围不超过一年。');
 return {from:range.from,to:range.to};
}
export async function runHistoryLookup(state,range,io){
 range=validateHistoryRange(range);
 const job={range,phase:'running',startedAt:io.now(),rows:[],warnings:[],sources:{}};
 const refresh=async()=>{
  job.rows=semesterRows({...range,records:state.records,history:await io.history(),settings:state.settings});
  if(job.attendanceRange)job.rows=job.rows.map(row=>(!row.websiteState||row.websiteState==='unknown')&&(row.date<job.attendanceRange.from||row.date>job.attendanceRange.to)?{...row,websiteState:'outside-range'}:row);
  await io.persist({...job,updatedAt:io.now()});
 };
 await refresh();
 try{const coverage=await io.readAttendance();if(coverage&&validTestDate(coverage.from)&&validTestDate(coverage.to)&&coverage.from<=coverage.to)job.attendanceRange=coverage;job.sources.attendance='checked';}
 catch(error){job.sources.attendance='partial';job.warnings.push(`Attendance: ${error.message}`);}
 await refresh();
 for(const source of ['gmail','moodle','ed']){
  if(io.enabledSources&&!io.enabledSources.includes(source)){job.sources[source]='disabled';continue;}
  await io.progress({message:`学期历史回查：${source} ${range.from} 至 ${range.to}`,context:{}});
  try{
   const result=await io.collect(source);
   job.sources[source]=result?.complete?'checked':'partial';
   if(!result?.complete)job.warnings.push(`${source}: 部分页面或消息未完成检索，请查看运行日志后重试。`);
  }catch(error){job.sources[source]='partial';job.warnings.push(`${source}: ${error.message}`);}
  await refresh();
 }
 const unverified=job.rows.filter(row=>!row.websiteState||row.websiteState==='unknown').length;
 if(unverified)job.warnings.push(`有 ${unverified} 条记录未读取到对应网站场次，不能确认历史签到状态。`);
 job.phase=job.warnings.length?'partial':'complete';job.finishedAt=io.now();
 await refresh();return job;
}
