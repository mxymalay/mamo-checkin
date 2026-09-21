const DAY=86400000;
const key=row=>['course','date','time','type','group'].map(k=>row[k]||'').join('|');
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function mergeHistory(previous,activities,observedAt=new Date().toISOString()){
  const history=new Map(previous.map(row=>[key(row),row]));
  for(const activity of activities){
    if(!validDate(activity.date)||!['course','time','type','group'].every(k=>activity[k]))continue;
    const {course,date,time,type,group,state,href}=activity;
    history.set(key(activity),{course,date,time,type,group,websiteState:state,sourceUrl:href,observedAt});
  }
  return [...history.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-20000);
}
export function semesterRows({from,to,records=[],history=[],settings={},includeProjected=false}){
  if(!validDate(from)||!validDate(to)||to<from||Date.parse(to)-Date.parse(from)>366*DAY)throw new Error('请选择有效的起止日期，范围不超过一年。');
  const inRange=r=>r.date>=from&&r.date<=to;
  const result=new Map();
  for(const r of records.filter(inRange))result.set(key(r),{...r,evidence:'local-record',websiteState:'unknown'});
  for(const r of history.filter(inRange))result.set(key(r),{...result.get(key(r)),...r,evidence:'website-observed'});
  if(includeProjected)for(let at=Date.parse(from);at<=Date.parse(to);at+=DAY){
    const day=new Date(at),date=day.toISOString().slice(0,10);
    for(const course of settings.courses||[])for(const rule of settings.schedules?.[course]||[]){
      if(rule.weekday!==(day.getUTCDay()||7))continue;
      const row={course,date,time:rule.time,type:rule.type,group:rule.group,evidence:'projected-current-schedule',websiteState:'unknown',status:'unknown',code:''};
      if(!result.has(key(row)))result.set(key(row),row);
    }
  }
  return [...result.values()].sort((a,b)=>(a.date+a.time+a.course).localeCompare(b.date+b.time+b.course));
}
export function historyCsv(rows){
  const fields=['date','time','course','type','group','code','status','websiteState','evidence','observedAt','sourceUrl'];
  const escape=value=>'"'+String(value??'').replace(/"/g,'""').replace(/^[\s]*[=+@-]/,"'$&")+'"';
  return '\uFEFF'+[fields,...rows.map(row=>fields.map(f=>row[f]))].map(row=>row.map(escape).join(',')).join('\r\n');
}
