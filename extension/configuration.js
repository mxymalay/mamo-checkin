import {normalizeSettings} from './settings.js';
import {validateRuleBundle} from './source-rules/library.js';
const FIELDS=['enabled','email','name','intervalMinutes','academicYear','mailQuery','courses','sourceModes','senders','subjectKeywords','moodleUrls','edUrls','schedules','ignoreCompleted','devMode'];
export function parseConfiguration(text,existing,hasRecords=false){
  if(text.length>131072)throw new Error('配置文件超过 128 KB');
  let value;try{value=JSON.parse(text);}catch{throw new Error('配置文件不是有效 JSON');}
  if(value?.format!=='attendance-settings-v1'||!value.settings||typeof value.settings!=='object'||Array.isArray(value.settings))throw new Error('请选择马莫签到助手的个人配置文件');
  const update=Object.fromEntries(FIELDS.filter(field=>Object.hasOwn(value.settings,field)).map(field=>[field,value.settings[field]]));
  if(!Object.hasOwn(update,'sourceModes'))update.sourceModes={};
  return normalizeSettings(existing,update,hasRecords);
}

export function parseConfigurationBundle(text,existing,hasRecords=false){
 const settings=parseConfiguration(text,existing,hasRecords);
 return {settings,sourceRules:validateRuleBundle(JSON.parse(text).sourceRules,settings)};
}
export function exportConfiguration(settings,sourceRules){
 const normalized=normalizeSettings(settings,{},false);
 const selected=Object.fromEntries(FIELDS.filter(field=>Object.hasOwn(normalized,field)).map(field=>[field,normalized[field]]));
 const text=JSON.stringify({format:'attendance-settings-v1',settings:selected,...(sourceRules?{sourceRules:validateRuleBundle(sourceRules,normalized)}:{})},null,2)+'\n';
 if(text.length>131072)throw new Error('配置文件超过 128 KB');
 return text;
}
