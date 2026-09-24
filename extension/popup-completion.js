import {checkinResult} from './checkin-result.js';
const timestamp=value=>{const time=Date.parse(value);return Number.isFinite(time)?time:0;};
const day=time=>new Date(time+8*3600000).toISOString().slice(0,10);
export function popupCompletion(state,now=Date.now()){
 const {settings={},status={},records=[]}=state;
 const confirmed=records.filter(record=>record.status==='submitted'&&settings.courses?.includes(record.course))
  .map(record=>timestamp(record.submittedAt)||(record.attemptedAt?timestamp(record.confirmedAt):0)).filter(time=>time>0&&time<=now);
 const finished=timestamp(status.finishedAt);
 if(status.summary?.submitted>0&&finished>0&&finished<=now)confirmed.push(finished);
 const lastCheckinAt=Math.max(0,...confirmed);
 // A quiet recheck must not restart the completion period after an actual check-in.
 const completedAt=lastCheckinAt||(checkinResult(status.summary,status.error).tone==='success'?finished:0);
 const interval=Number(settings.intervalMinutes)>0?Number(settings.intervalMinutes):1440;
 return {lastCheckinAt,completedAt:completedAt>0&&completedAt<=now?completedAt:0,active:completedAt>0&&completedAt<=now&&day(completedAt)===day(now)&&now-completedAt<interval*60000};
}
export function checkinAgo(time,language,now=Date.now()){
 const seconds=Math.max(0,Math.floor((now-time)/1000));
 const unit=seconds>=3600?'hour':seconds>=60?'minute':'second';
 const value=Math.floor(seconds/(unit==='hour'?3600:unit==='minute'?60:1));
 const locale=language==='en'?'en':language==='zh_TW'?'zh-TW':'zh-CN';
 const relative=new Intl.RelativeTimeFormat(locale,{numeric:'always'}).format(-value,unit);
 return `${language==='en'?'Last check-in: ':language==='zh_TW'?'上次簽到時間：':'上次签到时间：'}${relative}`;
}
