import {translate,detectLanguage,setLanguage} from './i18n.js';
import {checkinResult} from './checkin-result.js';
const $=id=>document.getElementById(id);
// Auto-detect the UI language, honouring the picker chosen on the options page
// (both pages share the extension origin, hence the same localStorage).
let choice='auto';try{choice=window.localStorage.getItem('mamo-language')||'auto';}catch{}
const language=choice==='auto'?detectLanguage(globalThis.chrome?.i18n?.getUILanguage?.()||navigator.language):choice;
setLanguage(language);
document.documentElement.lang=language==='zh'?'zh-CN':'en';
$('popup-settings').textContent=translate('更多设置');
$('popup-title').textContent=translate('马莫签到助手');
$('popup-scan').textContent=translate('立即签到');
let latest={};
const request=async payload=>{
 const result=await chrome.runtime.sendMessage(payload);
 if(!result)throw new Error(translate('后台未返回结果，请从扩展图标重新打开'));
 if(result.ok===false)throw new Error(result.error);
 return result;
};
function courseLine(course){
 const li=document.createElement('li');
 const name=document.createElement('strong');name.textContent=course.course;
 const detail=document.createElement('span');
 const parts=[];
 if(course.submitted)parts.push(translate(`签到成功 ${course.submitted} 场`));
 if(course.pending)parts.push(translate(`${course.pending} 场等待签到码`));
 if(course.expired)parts.push(translate(`${course.expired} 场已过期`));
 if(course.unresolved)parts.push(translate(`${course.unresolved} 场待核对`));
 detail.textContent=parts.join(' · ')||translate(course.reason)||translate('尚未检查');
 li.append(name,detail);
 return li;
}
function render(state){
 latest=state;
 const status=state.status||{},config=state.settings||{},summary=status.summary||{};
 const configured=Boolean(config.name)&&(config.courses||[]).length;
 $('popup-mode').textContent=config.enabled?translate('自动运行中'):translate('已暂停');
 $('popup-mode').classList.toggle('on',Boolean(config.enabled));
 const scan=$('popup-scan');
 if(!configured){
  $('popup-status').textContent=translate('先完成初始设置：填写姓名并配置课程。');
  $('popup-courses').replaceChildren();
  scan.textContent=translate('打开设置完成配置');
  scan.disabled=false;
  return;
 }
 if(status.running){
  $('popup-status').textContent=translate(status.message||'正在签到…');
 }else if(status.error){
  $('popup-status').textContent=translate(status.message||'上次检查未完成，请重试');
 }else if(status.finishedAt){
  const outcome=checkinResult(summary,Boolean(status.error));
  $('popup-status').textContent=`${outcome.success?'✓ ':''}${summary.submitted?translate(`本轮已确认 ${summary.submitted} 场签到成功。`):translate(status.message||outcome.title)}`;
 }else{
  $('popup-status').textContent=translate('尚未检查；点击下方按钮立即签到。');
 }
 $('popup-courses').replaceChildren();
 const courses=summary.courses?.length?summary.courses:(config.courses||[]).map(course=>({course,pending:0,reason:''}));
 if(!courses.length){const li=document.createElement('li');li.className='popup-empty';li.textContent=translate('暂无课程；点击“更多设置”添加。');$('popup-courses').append(li);}
 for(const course of courses)$('popup-courses').append(courseLine(course));
 scan.textContent=status.running?translate('正在签到…'):translate('立即签到');
 scan.disabled=Boolean(status.running);
}
$('popup-scan').addEventListener('click',async()=>{
 const scan=$('popup-scan');$('popup-error').hidden=true;
 const configured=Boolean(latest.settings?.name)&&(latest.settings?.courses||[]).length;
 if(!configured){chrome.runtime.openOptionsPage();window.close();return;}
 if(latest.status?.running)return;
 scan.disabled=true;
 try{
  await request({type:'scan',expectedIdentity:{email:latest.settings?.email||'',name:latest.settings?.name||''}});
  await refresh();
 }catch(error){
  $('popup-error').textContent=error.message;$('popup-error').hidden=false;
  render(latest);
 }
});
$('popup-settings').addEventListener('click',()=>{chrome.runtime.openOptionsPage();window.close();});
async function refresh(){try{render(await request({type:'status'}));}catch(error){$('popup-status').textContent=error.message;}}
setInterval(()=>void refresh(),1500);
void refresh();
