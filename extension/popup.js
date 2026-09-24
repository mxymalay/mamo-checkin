import {translate,detectLanguage,setLanguage} from './i18n.js';
import {checkinResult,checkinDetail} from './checkin-result.js';
import {popupCompletion,checkinAgo} from './popup-completion.js';
import {createLoginNotice} from './login-notice.js';
const $=id=>document.getElementById(id);
const loginNotice=createLoginNotice(document);$('popup-status').after(loginNotice.element);
// Auto-detect the UI language, honouring the picker chosen on the options page
// (both pages share the extension origin, hence the same localStorage).
let choice='auto';try{choice=window.localStorage.getItem('mamo-language')||'auto';}catch{}
const language=choice==='auto'?detectLanguage(globalThis.chrome?.i18n?.getUILanguage?.()||navigator.language):choice;
setLanguage(language);
document.documentElement.lang=language==='zh'?'zh-CN':language==='zh_TW'?'zh-TW':'en';
$('popup-settings').textContent=translate('更多设置');
$('popup-title').textContent=translate('马莫签到助手');
$('popup-scan').textContent=translate('立即签到');
let latest={},starting=false,refreshing=false;
const text=(zh,en)=>language==='en'?en:translate(zh,language);
function scene(mode){
 const copy={idle:[text('准备好，轻松签到','Ready when you are'),text('剩下的交给签到助手','Let the Check-in Assistant take it from here')],working:[text('正在为你签到','Taking care of check-in'),text('查找、识别，一步步完成','Finding codes. Making progress.')],waiting:[text('正在检查登录状态','Checking sign-in status'),text('检测通过后，自动继续','Continuing automatically once verified')],success:[text('处理完成','All done'),text('可以安心去忙啦','You can get back to your day')],error:[text('遇到一点问题','A little help needed'),text('查看下方提示，再试一次','Check the message below and retry')]}[mode];
 $('popup-scene').dataset.state=mode;
 $('popup-heading').textContent=copy[0];$('popup-caption').textContent=copy[1];
}
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
 if(course.completed)parts.push(text(`网站已签到 ${course.completed} 场`,`${course.completed} already checked in`));
 if(course.pending)parts.push(translate(`${course.pending} 场等待签到码`));
 if(course.expired)parts.push(translate(`${course.expired} 场已过期`));
 if(course.unresolved)parts.push(translate(`${course.unresolved} 场待核对`));
 detail.textContent=parts.join(' · ')||translate(course.reason)||translate('尚未检查');
 li.append(name,detail);
 return li;
}
function render(state){
 latest=state;
 const status=state.status||{},config=state.settings||{},summary=status.jobType==='history'?{...status.summary,history:true,partial:status.summary?.partial??/部分/.test(status.message||'')}:status.summary||{};
 loginNotice.update(status.running?status:null);
 const configured=Boolean(config.name)&&(config.courses||[]).length;
 const completion=popupCompletion(state);
 let mode='idle';
 if(status.running||starting)mode=status.phase==='waiting'?'waiting':'working';
 else if(status.error)mode='error';
 else if(status.finishedAt){const outcome=checkinResult(summary,false);mode=outcome.tone==='success'?(completion.active?'success':'idle'):outcome.tone==='error'?'error':'waiting';}
 else if(completion.active)mode='success';
 if(status.jobType==='history'&&status.finishedAt&&!status.running&&!starting&&!status.error&&!summary.partial)mode='success';
 scene(mode);
 $('popup-status').hidden=false;
 if(status.jobType==='history'&&status.running&&status.phase!=='waiting'){$('popup-heading').textContent=translate('正在回查');$('popup-caption').textContent=translate('全部已配置课程 · 仅回查，不提交签到');}
 if(status.jobType==='history'&&!status.running){$('popup-heading').textContent=translate(checkinResult({...summary,history:true,partial:summary.partial??/部分/.test(status.message||'')},Boolean(status.error)).title);$('popup-caption').textContent=translate('本次仅回查历史，未提交签到。请在学期历史回查中下载结果。');}
 if(mode==='waiting'&&!status.running){$('popup-heading').textContent=translate(checkinResult(summary).title);$('popup-caption').textContent=text('详细结果可在更多设置中查看','See More settings for the details');}
 $('popup-mode').textContent=config.enabled?text('自动签到已开启','Auto check-in on'):text('自动签到已关闭','Auto check-in off');
 $('popup-mode').classList.toggle('on',Boolean(config.enabled));
 const scan=$('popup-scan');
 if(!configured){
  $('popup-status').textContent=translate('先完成初始设置：填写姓名并配置课程。');
  $('popup-courses').replaceChildren();
  scan.textContent=translate('继续完成配置');
  scan.disabled=starting;
  return;
 }
 if(status.running){
  $('popup-status').textContent=translate(status.message||'正在签到…');
  if(status.phase==='waiting'){
   const site=status.waitingSite==='gmail'?'Gmail':status.waitingSite==='moodle'?'Moodle':'Attendance';
   const seconds=Math.max(0,Math.ceil((status.loginDeadline-Date.now())/1000));
   $('popup-caption').textContent=text(`正在检测 ${site} · 剩余 ${seconds} 秒`,`Checking ${site} · ${seconds}s remaining`);
   $('popup-status').textContent=text('如需登录，请在打开的网页中完成。','If sign-in is needed, complete it in the opened tab.');
   if(status.loginRequired){$('popup-heading').textContent=translate('需要完成网页登录');$('popup-status').textContent=translate('完成登录后会自动继续。');}
  }
 }else if(status.error){
  $('popup-status').textContent=translate(status.message||'上次检查未完成，请重试');
 }else if(mode==='waiting'){
  $('popup-status').textContent=translate(checkinDetail(summary));
 }else if(completion.completedAt){
  $('popup-status').textContent=checkinAgo(completion.completedAt,language);
 }else if(status.finishedAt&&config.enabled){
  const outcome=checkinResult(summary,Boolean(status.error));
  $('popup-status').textContent=summary.submitted?translate(`本轮已确认 ${summary.submitted} 场签到成功。`):summary.quiet?text('本次无需补签。','No additional check-ins needed this time.'):translate(outcome.title);
 }else if(!config.enabled&&status.finishedAt){
  $('popup-status').textContent=text('自动签到未开启；点击下方按钮再次检查。','Auto check-in is off; click below to run another check.');
 }else{
  $('popup-status').textContent=translate('尚未检查；点击下方按钮立即签到。');
 }
 $('popup-courses').replaceChildren();
 if(status.jobType==='history'){
  $('popup-status').textContent=translate(status.running?status.message||'正在回查':status.error?status.message||checkinDetail(summary):checkinDetail(summary));
  if(!status.running&&!status.error&&!summary.partial){$('popup-status').textContent='';$('popup-status').hidden=true;}
 }
 const courses=summary.checkedCourses?.length?summary.checkedCourses:summary.courses?.length?summary.courses:(config.courses||[]).map(course=>({course,pending:0,reason:status.running?text('正在检查','Checking'):status.finishedAt||completion.active?text('暂无课程明细，请查看记录','No course details; view records'):''}));
 if(!courses.length){const li=document.createElement('li');li.className='popup-empty';li.textContent=translate('暂无课程；点击“更多设置”添加。');$('popup-courses').append(li);}
 for(const course of courses)$('popup-courses').append(courseLine(course));
 scan.textContent=status.running?translate('正在签到…'):translate('立即签到');
 if(status.jobType==='history'&&status.running)scan.textContent=translate('正在回查');
 scan.disabled=Boolean(status.running)||starting;
}
$('popup-scan').addEventListener('click',async()=>{
 const scan=$('popup-scan');$('popup-error').hidden=true;
 const configured=Boolean(latest.settings?.name)&&(latest.settings?.courses||[]).length;
 if(!configured){chrome.runtime.openOptionsPage();window.close();return;}
 if(latest.status?.running||starting)return;
 starting=true;scan.disabled=true;scene('working');$('popup-status').textContent=translate('正在签到…');
 try{
  await request({type:'scan',preflight:true,expectedIdentity:{email:latest.settings?.email||'',name:latest.settings?.name||''}});
  starting=false;
  await refresh();
 }catch(error){
  starting=false;$('popup-error').textContent=translate(error.message);$('popup-error').hidden=false;
  render(latest);scene('error');
 }
});
$('popup-settings').addEventListener('click',()=>{chrome.runtime.openOptionsPage();window.close();});
async function refresh(){if(refreshing)return;refreshing=true;try{render(await request({type:'status'}));}catch(error){$('popup-status').textContent=translate(error.message);scene('error');}finally{refreshing=false;}}
setInterval(()=>void refresh(),1500);
void refresh();
