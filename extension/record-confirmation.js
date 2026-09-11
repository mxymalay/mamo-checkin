const CODE=/^[A-Z0-9]{5}$/;

export function confirmLowConfidenceRecord(record,now=Date.now()){
 if(!record||record.status!=='review')throw new Error('只有需要核对的记录可以确认');
 if(record.conflicts?.length)throw new Error('该记录存在多个签到码候选，请重新检测后再确认');
 if(!CODE.test(String(record.code||'').toUpperCase()))throw new Error('签到码必须是 5 位字母数字');
 if(!record.course||!record.date||!record.time||!record.type||!record.group)throw new Error('日期、活动类型、组别和时间必须完整后才能确认');
 return {...record,code:String(record.code).toUpperCase(),manualConfirmed:true,manualConfirmedAt:new Date(now).toISOString(),status:'ready',reason:'用户已核对识别结果，允许签到'};
}
