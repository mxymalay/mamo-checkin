const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
export function parseMoodleTableRow(row,meta,index){
 const clock='(\\d{1,2})(?::(\\d{2}))?\\s*([ap])\\.?m\\.?';
 const pattern=new RegExp('^(Workshop|Tutorial|Seminar|Studio|Applied(?: Workshop)?|Lecture)\\s+(\\d{1,2})\\s+([A-Za-z]{3,9})\\s+(20\\d{2}),?\\s+(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\\s+'+clock+'\\s*(?:to|[-–—])\\s*'+clock+'\\s+([A-Z0-9]{5})$','i');
 const m=String(row).trim().match(pattern);if(!m)return null;
 const month=months.indexOf(m[3].slice(0,3).toLowerCase()),dateValue=new Date(Date.UTC(+m[4],month,+m[2]));
 const validDate=month>=0&&dateValue.getUTCMonth()===month&&dateValue.getUTCDate()===+m[2];
 const time=(hour,minute,period)=>+hour>=1&&+hour<=12&&+(minute||0)<=59?String(+hour%12+(period.toLowerCase()==='p'?12:0)).padStart(2,'0')+':'+String(minute||'00').padStart(2,'0'):null;
 const start=time(m[6],m[7],m[8]),end=time(m[9],m[10],m[11]);
 const reasons=['原表未提供组别，需核对后匹配签到场次'];
 if(!validDate)reasons.push('日期无效');
 else if(days[dateValue.getUTCDay()]!==m[5].toLowerCase())reasons.push('星期与日期不一致');
 if(!start||!end||end<=start)reasons.push('上课时间范围无效');
 return {...meta,id:`${meta.messageId}|text|row-${index}`,imageId:'text',sourceType:'moodle-text',rawText:row,type:m[1].toLowerCase().replace(/\b[a-z]/g,s=>s.toUpperCase()).replace(/^Applied Workshop$/,'Applied'),date:validDate?dateValue.toISOString().slice(0,10):null,time:start,endTime:end,group:null,code:m[12].toUpperCase(),confidence:1,codeVerified:false,status:'review',reason:reasons.join('；')};
}
