import {fillMissingCode} from './record-confirmation.js';
export const hiddenRecord=record=>['ignored','linked'].includes(record.status);
export const canResolve=record=>record?.status==='review'&&!record.attemptedAt&&!record.submittedAt;
export function linkCandidates(records,source){
 return records.filter(r=>r.id!==source.id&&!hiddenRecord(r)&&['course','date','time','type','group'].every(k=>r[k])&&r.course===source.course&&['date','time','type','group'].every(k=>!source[k]||source[k]===r[k])&&(!source.code||!r.code||source.code===r.code));
}
export function resolveRecord(records,{id,action,targetId,useCode=false},now=new Date().toISOString()){
 const source=records.find(r=>r.id===id);if(!source)throw new Error('记录不存在，请刷新后重试');
 if(action==='use-linked-code'){
  if(source.status!=='linked'||!source.linkedTo)throw new Error('场次不匹配或签到码冲突，无法关联');
  return resolveRecord(records.map(r=>r.id===id?{...r,status:r.resolutionStatus||'review'}:r),{id,action:'link',targetId:source.linkedTo,useCode:true},now);
 }
 if(action==='restore'){
  if(!hiddenRecord(source))throw new Error('此记录无需恢复');
  return records.map(r=>{
   if(r.id===id){const {resolutionStatus,resolvedAt,linkedTo,...rest}=r;return {...rest,status:resolutionStatus||'review'};}
   if(r.id!==source.linkedTo)return r;
   const separated={...r,ocrEvidence:(r.ocrEvidence||[]).filter(e=>e.id!==id)};
   if(r.codeSourceRecordId!==id||r.status==='submitted'||r.submittedAt)return separated;
   const {codeSourceRecordId,codeBeforeLink,manualConfirmed,manualConfirmedAt,attemptedAt,codeCandidates,...rest}=separated;
   return {...rest,code:'',status:'waiting_code',sessionOnly:true,reason:'关联已解除，等待签到码。',...codeBeforeLink};
  });
 }
 if(!canResolve(source))throw new Error('只能整理尚未提交的待核对记录');
 if(action==='ignore')return records.map(r=>r.id===id?{...r,resolutionStatus:r.status,status:'ignored',resolvedAt:now}:r);
 if(action!=='link')throw new Error('无效的记录操作');
 const target=linkCandidates(records,source).find(r=>r.id===targetId);
 if(!target)throw new Error('场次不匹配或签到码冲突，无法关联');
 let completed=target;
 if(useCode){
  if(source.conflicts?.length||new Set([source.code,...(source.codeCandidates||[])].filter(Boolean)).size!==1)throw new Error('存在多个候选码，请先核对后手动补码');
  completed=fillMissingCode(target,source.code,Date.parse(now));
  completed.codeSourceRecordId=source.id;
  completed.codeBeforeLink=Object.fromEntries(['code','status','sessionOnly','reason','manualConfirmed','manualConfirmedAt','codeCandidates'].filter(key=>Object.hasOwn(target,key)).map(key=>[key,target[key]]));
 }
 return records.map(r=>{
  if(r.id===id)return {...r,resolutionStatus:r.status,status:'linked',linkedTo:targetId,resolvedAt:now};
  if(r.id===targetId)return {...completed,ocrEvidence:[...(r.ocrEvidence||[]).filter(e=>e.id!==id),{...source,manuallyLinkedAt:now}],sources:[...(r.sources||[]),...(source.sources||[]),...(source.sourceUrl?[{sourceUrl:source.sourceUrl,messageId:source.messageId,imagePath:source.imagePath}]:[])]};
  return r;
 });
}
