import {eligible,matchActivity,recordKey} from './core.js';
const DAY=86400000,WEEK=7*DAY;
export function detectSessions(activities,course,now=Date.now()){
 const pending=activities.filter(a=>a.course===course&&a.state==='available').filter(a=>{const start=Date.parse(`${a.date}T${a.time}:00+08:00`);return !Number.isFinite(start)||(start<=now&&start>=now-WEEK);});
 const complete=pending.filter(a=>['course','date','time','type','group'].every(k=>a[k]));
 const ambiguous=a=>complete.some(b=>a.date===b.date&&a.time===b.time&&a.type===b.type&&a.group!==b.group);
 return {sessions:complete.filter(a=>!ambiguous(a)).map(({course,date,time,type,group})=>({course,date,time,type,group})),needsConfirmation:complete.length!==pending.length||complete.some(ambiguous)};
}
export function detectWeeklySchedule(activities,course,now=Date.now()){
 const detected=detectSessions(activities.map(a=>({...a,state:'available'})),course,now);
 const rules=new Map();for(const slot of detected.sessions){const rule={weekday:new Date(slot.date+'T12:00:00Z').getUTCDay()||7,time:slot.time,type:slot.type,group:slot.group};rules.set(JSON.stringify(rule),rule);}
 return {schedule:[...rules.values()].sort((a,b)=>a.weekday-b.weekday||a.time.localeCompare(b.time)),needsConfirmation:detected.needsConfirmation};
}
export function expectedSessions(settings,course,now=Date.now()){
 if(!settings.schedules?.[course]?.length&&Array.isArray(settings.detectedSessions?.[course]))return settings.detectedSessions[course];
 const rules=settings.schedules?.[course];if(!rules?.length)return null;
 const result=[],local=new Date(now+8*3600000);
 for(let offset=0;offset<=7;offset++){
  const day=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-offset*DAY);
  const date=day.toISOString().slice(0,10),weekday=day.getUTCDay()||7;
  for(const rule of rules){
   if(rule.weekday!==weekday)continue;
   const start=Date.parse(`${date}T${rule.time}:00+08:00`);
   if(start<=now&&start>=now-WEEK)result.push({course,date,time:rule.time,type:rule.type||'',group:rule.group||''});
  }
 }
 return result.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}
export function matchesSession(slot,record){return ['course','date','time'].every(key=>record[key]===slot[key])&&['type','group'].every(key=>!slot[key]||record[key]===slot[key]);}
function covered(state,slot,now){
 const activities=(state.activities||[]).filter(a=>matchesSession(slot,a));
 if(activities.length&&activities.every(a=>['completed','expired'].includes(a.state)))return true;
 const matching=state.records.filter(r=>matchesSession(slot,r));
 if(new Set(matching.map(recordKey)).size!==1)return false;
 const record=matching[0];
 if(['submitted','expired'].includes(record.status))return !activities.some(a=>a.state==='available');
 if(!eligible(record,now))return false;
 return activities.every(a=>['completed','expired'].includes(a.state)||matchActivity(record,a));
}
export function courseNeedsSource(state,course,now=Date.now()){
 const slots=expectedSessions(state.settings,course,now);
 return slots===null||slots.some(slot=>!covered(state,slot,now));
}
export function recordInSchedule(settings,record,now=Date.now()){
 const slots=expectedSessions(settings,record.course,now);
 return slots===null||slots.some(slot=>matchesSession(slot,record));
}
