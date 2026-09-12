import {mergeRecords,parseImageRows,parseMailDate} from './core.js';
import {messageOutsideWindow,outsideAttendanceWindow} from './recent-window.js';
import {parseMoodleTableRow} from './moodle-table.js';

export async function reconcileScanAlarm(settings,alarms) {
  const current=await alarms.get('scan');
  if(!settings.enabled) {
    if(current) await alarms.clear('scan');
    return;
  }
  if(current?.periodInMinutes===settings.intervalMinutes) return;
  if(current) await alarms.clear('scan');
  await alarms.create('scan',{delayInMinutes:1,periodInMinutes:settings.intervalMinutes});
}

export async function cleanupOwnedTabs(state,tabs,persist) {
  for(const id of [...state.ownedTabIds]) {
    try{await tabs.remove(id);}catch{}
  }
  state.ownedTabIds=[];
  await persist(state.ownedTabIds);
}

export async function recordDiagnostic(state,details,saveDiagnostics=async()=>{},now=()=>new Date().toISOString()) {
  state.diagnostics=[...(state.diagnostics||[]),{at:now(),...details}].slice(-50);
  try{await saveDiagnostics();}catch{}
}

const nonCodeWords=new Set(['about','activity','attendance','code','course','courses','discussion','discussions','forum','forums','home','login','moodle','page','pages','student','week','weeks']);
const codeCandidates=text=>[...new Set([...String(text).matchAll(/\b([A-Z0-9]{5})\b/ig)].map(match=>match[1]))]
 .filter(token=>/\d/.test(token)||token===token.toUpperCase())
 .map(token=>token.toUpperCase())
 .filter(token=>!nonCodeWords.has(token.toLowerCase()));
const textSourceType=sourceType=>`${String(sourceType||'gmail').replace(/-(?:text|image)$/,'')}-text`;
const addReason=(record,reason)=>({...record,status:'review',reason:[record.reason,reason].filter(Boolean).join('；')});
function checkDateBasis(records,msg){
  if(msg.dateReferenceOnly)return records.map(record=>addReason(record,'年份仅为参考，旧页面记录不自动提交'));
  if(msg.dateWindow)return records.map(record=>!record.date||record.date<msg.dateWindow.from||record.date>msg.dateWindow.to?addReason(record,'签到日期不在课程周栏目的日期范围内'):record);
  return records;
}

function incompleteReview(meta,{imageId,imagePath,rawText,reason,requireContext=false,requireCandidate=false,rowIndex=null}) {
  if(requireContext&&!/(?:attendance|签到|\bcode\b)/i.test(rawText)) return null;
  const candidates=codeCandidates(rawText);
  if((requireContext||requireCandidate)&&!candidates.length) return null;
  const ambiguity=candidates.length>1?'；发现多个 5 位候选码，未自动选择':'';
  return {...meta,imageId,imagePath,code:candidates.length===1?candidates[0]:null,date:null,type:null,group:null,time:null,confidence:0,codeVerified:false,rawText,status:'review',reason:`${reason}${ambiguity}`,id:`${meta.messageId}|${imageId}${rowIndex===null?'':`|row-${rowIndex}`}`};
}

function parseTextRecords(msg,meta) {
  const rows=(msg.textRows||[]).filter(row=>typeof row==='string'&&row.trim()).map(row=>row.trim());
  if(!rows.length) return [];
  const hasContext=/(?:attendance|签到|\bcode\b)/i.test(rows.join(' '));
  const textMeta={...meta,sourceType:textSourceType(msg.sourceType),imageId:'text'};
  let records=[];
  for(const [index,row] of rows.entries()) {
    const parsed=parseImageRows([{text:row,x:0,y:.5,width:1,height:.1,confidence:1}],textMeta);
    if(!parsed.length&&msg.sourceType==='moodle'&&hasContext){const record=parseMoodleTableRow(row,textMeta,index);if(record)parsed.push(record);}
    records.push(...parsed);
    if(!parsed.length&&hasContext) {
      const fallback=incompleteReview(textMeta,{imageId:'text',rawText:row,reason:'正文含签到码但缺少完整日期、活动类型、组别或时间',requireCandidate:true,rowIndex:index});
      if(fallback) records.push(fallback);
    }
  }
  return checkDateBasis(records,msg);
}

export async function processCollectedMessages(state,messages,{getImage,ocr,save,saveDiagnostics=async()=>{},now=()=>new Date().toISOString(),recentOnly=false,progress=async()=>{},shouldContinue=()=>true,refresh=false}) {
  for(const msg of messages) {
    if(!shouldContinue(msg))continue;
    if(state.seenMessages[msg.messageId]&&!refresh) continue;
    if(refresh)delete state.seenMessages[msg.messageId];
    const sentAt=typeof msg.sentAt==='string'&&Number.isFinite(Date.parse(msg.sentAt))?msg.sentAt:parseMailDate(msg.sentAtText);
    if(recentOnly&&messageOutsideWindow({...msg,sentAt},Date.parse(now()))){state.seenMessages[msg.messageId]=now();await progress({message:'跳过超过 7 天的旧内容',increment:{skipped:1}});await save();continue;}
    await progress({message:'正在读取签到文字和图片',context:{course:msg.course,subject:msg.subject,sourceUrl:msg.sourceUrl},increment:{messages:1}});
    if(!sentAt) {
      await recordDiagnostic(state,{scope:'message',course:msg.course,sourceUrl:msg.sourceUrl,messageId:msg.messageId,subject:msg.subject,error:`无法识别邮件发送年份：${msg.subject}`},saveDiagnostics,now);
      continue;
    }
    let failed=false,incomplete=false;
    const meta={course:msg.course,messageId:msg.messageId,sourceUrl:msg.sourceUrl,sentAt,subject:msg.subject,...(msg.sourceType&&{sourceType:msg.sourceType}),...(msg.dateBasis&&{dateBasis:msg.dateBasis}),...(msg.dateWindow&&{dateWindow:msg.dateWindow})};
    try{
      const textRecords=parseTextRecords(msg,meta);
      if(textRecords.length){const before=state.records.length;state.records=mergeRecords(state.records,textRecords);await save();await progress({message:`已保存 ${textRecords.length} 条文字记录`,increment:{records:state.records.length-before}});}
    }catch(error){
      failed=true;
      await recordDiagnostic(state,{scope:'text',course:msg.course,sourceUrl:msg.sourceUrl,messageId:msg.messageId,subject:msg.subject,error:error?.message||String(error)},saveDiagnostics,now);
    }
    const images=[...new Set(msg.images||[])];
    for(const [imageIndex,imageUrl] of images.entries()) {
      if(!shouldContinue(msg)){incomplete=true;await progress({message:'该课程所需场次已找到，跳过剩余图片',increment:{skipped:images.length-imageIndex}});break;}
      try {
        await progress({message:`正在下载第 ${imageIndex+1}/${images.length} 张图片（最多 20 秒）`});
        const payload=await getImage(imageUrl);
        const result=await ocr(payload,meta);
        let records=parseImageRows(result.observations,{...meta,imageId:result.imageId,imagePath:result.imagePath});
        if(!records.length) records.push(incompleteReview(meta,{imageId:result.imageId,imagePath:result.imagePath,rawText:result.observations.map(o=>o.text).join(' '),reason:'图片未识别出完整签到表格'}));
        records=checkDateBasis(records,msg);
        if(recentOnly)records=records.map(r=>r.status==='ready'&&outsideAttendanceWindow(r,Date.parse(now()))?{...r,status:'expired',reason:'课程已超过 7 天，不再补签'}:r);
        const before=state.records.length;state.records=mergeRecords(state.records,records);
        await save();
        await progress({message:`第 ${imageIndex+1}/${images.length} 张图片已识别并保存`,increment:{images:1,records:state.records.length-before}});
      } catch(error) {
        failed=true;
        await progress({message:`第 ${imageIndex+1}/${images.length} 张图片失败：${error?.message||String(error)}`,level:'error'});
        await recordDiagnostic(state,{scope:'image',course:msg.course,sourceUrl:msg.sourceUrl,messageId:msg.messageId,subject:msg.subject,imageIndex,error:error?.message||String(error)},saveDiagnostics,now);
      }
    }
    if(!failed&&!incomplete) {
      state.seenMessages[msg.messageId]=now();
      try{await save();}
      catch(error){
        delete state.seenMessages[msg.messageId];
        await recordDiagnostic(state,{scope:'message',course:msg.course,sourceUrl:msg.sourceUrl,messageId:msg.messageId,subject:msg.subject,error:error?.message||String(error)},saveDiagnostics,now);
      }
    }
  }
  return state.diagnostics||[];
}
