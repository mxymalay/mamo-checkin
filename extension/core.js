const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const WEEKDAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const pad = n => String(n).padStart(2,'0');
const canonicalType=text=>{
  const value=String(text).trim().replace(/\s+/g,' ');
  if(/^Applied Workshop$/i.test(value)) return 'Applied';
  return value.toLowerCase().replace(/\b[a-z]/g,s=>s.toUpperCase());
};
export const recordKey = r => [r.course,r.date,r.type,r.group,r.time].join('|');
export function parseMailDate(text) {
  const value=String(text).replace(/\u00a0/g,' ').replace(/[，]/g,',').replace(/\s+/g,' ').trim();
  const clock=(hour,minute,meridiem)=>{
    hour=Number(hour);minute=Number(minute);if(!Number.isInteger(hour)||!Number.isInteger(minute)||minute>59)return null;
    if(meridiem){if(hour<1||hour>12)return null;hour=hour%12+(meridiem.toLowerCase()==='pm'?12:0);}
    if(hour>23)return null;return `${pad(hour)}:${pad(minute)}`;
  };
  const result=(year,month,day,time)=>{
    year=Number(year);month=Number(month);day=Number(day);if(!year||month<1||month>12||day<1||day>31||!time)return null;
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
    return `${year}-${pad(month)}-${pad(day)}T${time}:00+08:00`;
  };
  const weekday='(?:\\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\w*\\s*,?\\s*)?';
  let m=value.match(new RegExp(`${weekday}(\\d{1,2})\\s+([A-Za-z]+)\\s*,?\\s*(20\\d{2})\\s*,?\\s+(\\d{1,2}):(\\d{2})(?:\\s*(am|pm))?`,'i'));
  if(m){const month=MONTHS.indexOf(m[2].slice(0,3).toLowerCase());return result(m[3],month+1,m[1],clock(m[4],m[5],m[6]));}
  m=value.match(new RegExp(`${weekday}([A-Za-z]+)\\s+(\\d{1,2})\\s*,?\\s*(20\\d{2})\\s*,?\\s+(\\d{1,2}):(\\d{2})(?:\\s*(am|pm))?`,'i'));
  if(m){const month=MONTHS.indexOf(m[1].slice(0,3).toLowerCase());return result(m[3],month+1,m[2],clock(m[4],m[5],m[6]));}
  m=value.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日\s*(?:(上午|下午)\s*)?(\d{1,2})[:：](\d{2})/i);
  if(m)return result(m[1],m[2],m[3],clock(m[5],m[6],m[4]?m[4]==='下午'?'pm':'am':null));
  m=value.match(/\b(20\d{2})[-/]([01]?\d)[-/]([0-3]?\d)(?:[ T]+)(\d{1,2})[:：](\d{2})(?:\s*(am|pm))?/i);
  if(m)return result(m[1],m[2],m[3],clock(m[4],m[5],m[6]));
  return null;
}
export function siteDate(value) {
  const m=String(value).match(/^(\d{1,2})_([A-Za-z]{3})_(\d{2})$/);
  if(!m) return null;
  const month=MONTHS.indexOf(m[2].toLowerCase());
  if(month<0) return null;
  return `20${m[3]}-${pad(month+1)}-${pad(m[1])}`;
}
export function parseTime(text) {
  const m=String(text).match(/\b(\d{1,2})\s*[:.]\s*(\d{2})\s*(am|pm)\b/i);
  if(!m || +m[1]<1 || +m[1]>12 || +m[2]>59) return null;
  return `${pad(+m[1]%12+(m[3].toLowerCase()==='pm'?12:0))}:${m[2]}`;
}
export function parseActivity(text,date) {
  const m=String(text).match(/\b([A-Z]{2,10}\d{3,6})\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d{2}(?:-P\d+)?)\b/i);
  return m ? {course:m[1].toUpperCase(),type:canonicalType(m[2]),group:m[3].toUpperCase(),date,time:parseTime(text)} : null;
}
function rowDate(text,sentAt) {
  const m=text.match(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*[,.]?\s*(\d{1,2})\s*([A-Za-z]{3,9})\b/i);
  if(!m || !sentAt || !Number.isFinite(Date.parse(sentAt))) return {error:'缺少可靠的日期或邮件年份'};
  const month=MONTHS.indexOf(m[3].slice(0,3).toLowerCase());
  if(month<0) return {error:'月份无法识别'};
  const year=+sentAt.slice(0,4);
  const candidates=[year-1,year,year+1].map(y=>new Date(Date.UTC(y,month,+m[2]))).filter(d=>d.getUTCMonth()===month && d.getUTCDate()===+m[2]).sort((a,b)=>Math.abs(+a-Date.parse(sentAt))-Math.abs(+b-Date.parse(sentAt)));
  const d=candidates[0];
  if(!d || Math.abs(+d-Date.parse(sentAt))>21*86400000) return {error:'图片日期距发送日期超过 21 天'};
  const date=d.toISOString().slice(0,10);
  return WEEKDAYS[d.getUTCDay()]===m[1].toLowerCase()?{date}:{date,error:'图片的星期与日期不一致'};
}
export function parseImageRows(observations,meta) {
  const lines=[];
  for(const obs of [...observations].filter(o=>o.text?.trim()).sort((a,b)=>(b.y+b.height/2)-(a.y+a.height/2))) {
    const center=obs.y+obs.height/2;
    let line=lines.find(l=>Math.abs(l.center-center)<Math.max(.012,Math.min(l.height,obs.height)*.48));
    if(!line){line={center,height:obs.height,cells:[]};lines.push(line);}
    line.cells.push(obs);
  }
  const result=[];
  for(const [index,line] of lines.entries()) {
    const rawText=line.cells.sort((a,b)=>a.x-b.x).map(c=>c.text.trim()).join(' ').replace(/[–—]/g,'-');
    const types=[...rawText.matchAll(/(?:^|\b[A-Z0-9]{5}\s+)([A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(?=\b(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b)/ig)];
    if(!types.length) continue;
    const groups=[...rawText.matchAll(/\b(\d{2}(?:-P\d+)?)\s+(?=\d{1,2}\s*[:.]\s*\d{2}\s*(?:am|pm)\b)/ig)];
    const times=[...rawText.matchAll(/\b(\d{1,2})\s*[:.]\s*(\d{2})\s*(am|pm)\b/ig)];
    const codes=[...rawText.matchAll(/\b([A-Z0-9]{5})\b/g)];
    const dates=[...rawText.matchAll(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*[,.]?\s*(\d{1,2})\s*[A-Za-z]{3,9}\b/ig)];
    const ambiguous=[];
    if(types.length>1) ambiguous.push('活动类型');
    if(dates.length>1) ambiguous.push('日期');
    if(groups.length>1) ambiguous.push('组别');
    if(times.length>1) ambiguous.push('时间');
    if(codes.length>1) ambiguous.push('签到码');
    const type=types.length===1?canonicalType(types[0][1]):null;
    const group=groups.length===1?groups[0][1].toUpperCase():null;
    const code=codes.length===1?codes[0][1]:null;
    const time=times.length===1?parseTime(times[0][0]):null;
    const {date=null,error}=dates.length===1?rowDate(rawText,meta.sentAt):{error:dates.length?'同一行包含多个日期':'缺少可靠的日期或邮件年份'};
    const confidence=Math.min(...line.cells.map(c=>Number(c.confidence)||0));
    const codeCell=code&&line.cells.find(c=>c.text?.trim()===code);
    const codeVerified=codeCell?.codeVerified===true;
    const verificationFailed=codeCell?.codeVerified===false;
    const codeConfidence=Number(codeCell?.confidence??confidence)||0;
    const codeReliable=!verificationFailed&&(codeConfidence>=.96||codeVerified);
    const fieldVerification=line.cells.filter(cell=>cell!==codeCell).map(cell=>({text:cell.text.trim(),confidence:Number(cell.confidence)||0,fieldVerified:cell.fieldVerified===true}));
    const fieldsReliable=fieldVerification.every(field=>field.confidence>=.96||field.fieldVerified);
    const reasons=[error,ambiguous.length&&`同一行包含多个${ambiguous.join('、')}`,!group&&'组别不完整',!time&&'上课时间不完整',!code&&'签到码不是 5 位字母数字',verificationFailed&&'签到码两次识别复核结果不一致',code&&!codeReliable&&!verificationFailed&&'签到码识别置信度不足',!fieldsReliable&&'活动类型、日期、时间或组别识别置信度不足'].filter(Boolean);
    const r={...meta,type,group,code,time,date,confidence,codeConfidence,codeVerified,codeVerificationFailed:verificationFailed,fieldVerification,rawText,status:reasons.length?'review':'ready',reason:reasons.join('；')};
    r.id=date&&group&&time?recordKey(r):`${meta.messageId}|${meta.imageId}|row-${index}`;
    result.push(r);
  }
  return result;
}
export function mergeRecords(existing,incoming) {
  const map=new Map(existing.map(r=>[r.id,{...r}]));
  for(const r of incoming){
    let old=map.get(r.id);
    const sameRow=x=>r.imageId&&r.messageId&&['course','date','time','type','imageId','messageId'].every(k=>r[k]&&x[k]===r[k]);
    if(r.group&&r.code&&incoming.filter(sameRow).length===1){
      const partials=[...map.values()].filter(x=>x.id!==r.id&&!x.group&&!x.code&&!x.attemptedAt&&['review','expired'].includes(x.status)&&sameRow(x));
      for(const partial of partials){map.delete(partial.id);if(!old&&partial.status==='expired')old={...partial,id:r.id,sessionOnly:true};}
    }
    if(!old){map.set(r.id,{...r});continue;}
    if(old.sessionOnly&&!old.code){map.set(r.id,{...r,...(['submitted','expired'].includes(old.status)?{status:old.status,reason:old.reason}:{})});continue;}
    const sources=[...new Map([...recordSources(old),...recordSources(r)].map(source=>[[source.sourceUrl,source.messageId,source.imagePath].join('|'),source])).values()];
    if(old.code!==r.code){map.set(r.id,{...old,sources,status:'review',reason:'同一场次出现不同签到码',conflicts:[...new Set([...(old.conflicts||[]),old.code,r.code].filter(Boolean))]});continue;}
    const untouchedReview=old.status==='review'&&!old.attemptedAt&&!old.submittedAt&&!(old.conflicts||[]).length;
    if(untouchedReview&&r.status==='ready'&&reliableEvidence(r)){map.set(r.id,{...r,sources});continue;}
    map.set(r.id,{...old,sources});
    // A repeated image must never reset a submitted or uncertain attempt.
  }
  return [...map.values()];
}
function recordSources(record){
  const own={};
  for(const key of ['sourceUrl','messageId','imagePath'])if(record[key]!=null)own[key]=record[key];
  return [...(Array.isArray(record.sources)?record.sources:[]),...(Object.keys(own).length?[own]:[])];
}
function reliableEvidence(record){
  const fields=Array.isArray(record.fieldVerification)?record.fieldVerification:null;
  const fieldsReliable=fields?fields.length>0&&fields.every(field=>Number(field.confidence)>=.96||field.fieldVerified===true):Number(record.confidence)>=.96;
  const codeConfidence=Number(record.codeConfidence??record.confidence)||0;
  return fieldsReliable&&!record.codeVerificationFailed&&(codeConfidence>=.96||record.codeVerified===true);
}
export function eligible(r,now=Date.now()) {
  const start=Date.parse(`${r.date}T${r.time}:00+08:00`);
  return r.status==='ready' && reliableEvidence(r) && /^[A-Z0-9]{5}$/.test(r.code||'') && Number.isFinite(start) && start<=now && now-start<=7*86400000;
}
export function matchActivity(record,activity) {
  return ['course','date','type','group','time'].every(k=>record[k] && record[k]===activity?.[k]);
}
