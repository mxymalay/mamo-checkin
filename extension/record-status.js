// Pure display-status helpers: derived UI state only. Submission gating stays
// in core.eligible(), so these must never widen what can be submitted.
const DAY=86400000;
function malaysiaDate(ms){return new Date(ms+8*3600000).toISOString().slice(0,10);}
function mondayOf(dateStr){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dateStr||''))return null;
 const date=new Date(dateStr+'T12:00:00+08:00');if(Number.isNaN(date.getTime()))return null;
 return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())-((date.getUTCDay()+6)%7)*DAY).toISOString().slice(0,10);
}
export function sessionWeek(record,now=Date.now()){
 const session=mondayOf(record.date),current=mondayOf(malaysiaDate(now));
 if(!session||!current)return null;
 return session===current?'current':session<current?'previous':'upcoming';
}
export function sessionNotStarted(record,now=Date.now()){
 const start=Date.parse(`${record.date}T${record.time||'23:59'}:00+08:00`);
 return Number.isFinite(start)&&start>now;
}
export function displayStatus(record,now=Date.now()){
 return sessionNotStarted(record,now)&&['ready','waiting_code'].includes(record.status)?'not_started':record.status;
}
// 本周/上周 only qualifies unresolved outcomes: this week's missing code is
// usually just an unpublished code, last week's needs manual verification.
export function weekQualifier(record,now=Date.now()){
 if(!['waiting_code','review','uncertain'].includes(record.status))return '';
 return {current:'本周',previous:'上周'}[sessionWeek(record,now)]||'';
}
