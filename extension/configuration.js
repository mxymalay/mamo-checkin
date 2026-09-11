import {normalizeSettings} from './settings.js';
const FIELDS=['enabled','email','name','intervalMinutes','academicYear','mailQuery','courses','senders','subjectKeywords','moodleUrls','schedules','ignoreCompleted'];
export function parseConfiguration(text,existing,hasRecords=false){
  if(text.length>131072)throw new Error('配置文件超过 128 KB');
  let value;try{value=JSON.parse(text);}catch{throw new Error('配置文件不是有效 JSON');}
  if(value?.format!=='attendance-settings-v1'||!value.settings||typeof value.settings!=='object'||Array.isArray(value.settings))throw new Error('请选择马莫签到助手的个人配置文件');
  const update=Object.fromEntries(FIELDS.filter(field=>Object.hasOwn(value.settings,field)).map(field=>[field,value.settings[field]]));
  return normalizeSettings(existing,update,hasRecords);
}

export function exportConfiguration(settings){
 const normalized=normalizeSettings(settings,{},false);
 const selected=Object.fromEntries(FIELDS.filter(field=>Object.hasOwn(normalized,field)).map(field=>[field,normalized[field]]));
 const text=JSON.stringify({format:'attendance-settings-v1',settings:selected},null,2)+'\n';
 if(text.length>131072)throw new Error('配置文件超过 128 KB');
 return text;
}
