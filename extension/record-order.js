export const needsAttention=record=>['waiting_code','review','uncertain','attempting'].includes(record.status);
function week(date){
 const d=new Date(`${date||''}T12:00:00Z`);if(!Number.isFinite(+d))return '';
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);
}
export function orderRecords(records){
 return [...records].sort((a,b)=>week(b.date).localeCompare(week(a.date))||Number(needsAttention(b))-Number(needsAttention(a))||`${b.date||''} ${b.time||''}`.localeCompare(`${a.date||''} ${a.time||''}`));
}
