import {plausibleCode} from './core.js';
const CODE=/^[A-Z0-9]{5}$/;

export function fillMissingCode(record,value,now=Date.now()){
 const replaceRejected=record?.status==='review'&&record.candidatesExhausted===true;
 if(!record||!['waiting_code','review'].includes(record.status)||(!replaceRejected&&(record.code||record.attemptedAt))||record.submittedAt)throw new Error('只有尚未提交且缺少签到码的场次可以补码');
 if(!['course','date','time','type','group'].every(k=>record[k]))throw new Error('日期、活动类型、组别和时间必须完整后才能确认');
 const start=Date.parse(`${record.date}T${record.time}:00+08:00`);
 if(!Number.isFinite(start)||start>now||now-start>7*86400000)throw new Error('只能补充最近 7 天已开始的场次');
 const code=String(value||'').trim().toUpperCase();
 if(!plausibleCode(code))throw new Error('签到码必须是 5 位字母数字');
 const updated={...record,code,sessionOnly:false,status:'ready',manualConfirmed:true,manualConfirmedAt:new Date(now).toISOString(),reason:'用户已核对识别结果，允许签到'};
 if(replaceRejected){delete updated.attemptedAt;delete updated.codeCandidates;delete updated.conflicts;delete updated.candidatesExhausted;delete updated.codeSourceRecordId;delete updated.codeBeforeLink;}
 return updated;
}

export function confirmLowConfidenceRecord(record,now=Date.now()){
 if(!record||record.status!=='review')throw new Error('只有需要核对的记录可以确认');
 if(record.conflicts?.length)throw new Error('该记录存在多个签到码候选，请重新检测后再确认');
 if(!CODE.test(String(record.code||'').toUpperCase()))throw new Error('签到码必须是 5 位字母数字');
 if(!record.course||!record.date||!record.time||!record.type||!record.group)throw new Error('日期、活动类型、组别和时间必须完整后才能确认');
 return {...record,code:String(record.code).toUpperCase(),manualConfirmed:true,manualConfirmedAt:new Date(now).toISOString(),status:'ready',reason:'用户已核对识别结果，允许签到'};
}
