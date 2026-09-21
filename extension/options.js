import {bindIdentityReader} from './identity-input.js';
import {userError} from './user-error.js';
import {installIdentityChecks} from './email-input.js';
import {createPageTabs} from './page-tabs.js';
import {displayMoodleEntries,bindMoodleCourseInput} from './moodle-course-id.js';
import {installLanguageUI,translate} from './i18n.js';
import {checkinResult} from './checkin-result.js';
import {schoolEmail,emailPrefix,configureEmailInput} from './school-email.js';
import {createSetupGuide} from './setup-guide.js';
import {DEFAULTS,normalizeSettings} from './settings.js';
import {parseConfiguration,exportConfiguration} from './configuration.js';
import {bindVerification,configuredLoginSites,loginRequest} from './verification.js';
import {createLoginPreflight} from './login-preflight.js';
import {appendRecordHelp} from './record-help.js';
import {confirmLowConfidenceRecord} from './record-confirmation.js';
import {displayStatus,weekQualifier} from './record-status.js';
import {isWindows} from './platform.js';
import {semesterRows,historyCsv} from './history-export.js';
const $=id=>document.getElementById(id);
const historyExport=document.createElement('details');historyExport.className='history-export source-log';
historyExport.innerHTML='<summary>学期记录导出</summary><form id="history-export-form"><div class="history-range"><label>开始日期<input id="history-from" type="date" required></label><label>结束日期<input id="history-to" type="date" required></label></div><label class="history-projection"><input id="history-projected" type="checkbox">包含按当前课表推算的场次</label><p class="hint">推算场次不代表实际上课或签到。网站记录仅包含助手实际读取过的场次。</p><button type="submit" class="subtle">导出学期 CSV</button></form>';
document.querySelector('.records .table-wrap').before(historyExport);
$('history-export-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.submitter;button.disabled=true;
 try{
  const state=await request({type:'status'}),{attendanceHistory=[]}=await chrome.storage.local.get('attendanceHistory');
  const rows=semesterRows({from:$('history-from').value,to:$('history-to').value,records:state.records,history:attendanceHistory,settings:state.settings,includeProjected:$('history-projected').checked});
  if(!rows.length){notice('所选日期范围内没有记录。','error');return;}
  const url=URL.createObjectURL(new Blob([historyCsv(rows)],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`mamo-history-${$('history-from').value}-${$('history-to').value}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  notice('学期记录已导出。','success');
 }catch(error){notice(error.message,'error');}finally{button.disabled=false;}
});
const prettyPath=p=>String(p||'').replace(/([^ ])\//g,'$1 / ');
$('app-version').textContent=globalThis.chrome?.runtime?.getManifest?.()?.version||'';
const sourceDivider=document.createElement('div');sourceDivider.id='email-moodle-divider';sourceDivider.className='identity-source-divider';sourceDivider.hidden=true;sourceDivider.setAttribute('aria-hidden','true');$('moodle-login').before(sourceDivider);
const pageTabs=createPageTabs();
const automationSave=document.createElement('button');automationSave.id='save-automation';automationSave.type='button';automationSave.className='primary';automationSave.textContent='保存设置';document.querySelector('.automation-settings').append(automationSave);
const moreCourses=document.createElement('details');moreCourses.className='more-courses';const moreSummary=document.createElement('summary');moreSummary.textContent='还有更多课程？';moreCourses.append(moreSummary);$('add-course').before(moreCourses);moreCourses.append($('add-course'));$('add-course').textContent='添加更多课程';
document.addEventListener('click',event=>{if(event.target.closest('#result-edit'))pageTabs.show('courses');});
const askConfirm=message=>window.confirm(translate(message));
const labels={waiting_code:'等待签到码',ready:'等待匹配',submitted:'已签到',expired:'已过期',review:'需要核对',attempting:'核对提交结果',uncertain:'结果待确认',not_started:'未开始'};
let guide,savedFormSnapshot;
let identityBindings,loginPreflight,identitySnapshot='';
function formSnapshot(){return JSON.stringify([...document.querySelectorAll('#settings input,#settings select,#settings textarea')].map(input=>[input.id||input.dataset.field,input.type==='checkbox'?input.checked:input.value.trim()]));}
let latest={},editing=false,refreshing=false,refreshQueued=false,refreshSettings=false,healthPending=false,healthWarning=false,saving=false,scanPending=false;
const request=async payload=>{
  if(!globalThis.chrome?.runtime?.sendMessage)throw new Error('请先在 Chrome 加载此扩展，再从扩展图标打开设置');
  let timer;
  try{
    const result=await Promise.race([chrome.runtime.sendMessage(payload),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('后台响应超时，操作结果尚未确认。请重新打开马莫签到助手查看状态；若刚升级扩展，请关闭旧页面后重新打开。')),payload.type==='redetect'?30000:10000);})]);
    if(!result)throw new Error('后台未返回结果，请关闭此页面，从扩展图标重新打开');
    if(result.ok===false)throw new Error(result.error);return result;
  }catch(error){throw new Error(userError(error,['checkEmail','listGmailAccounts'].includes(payload.type)?'Gmail':payload.type==='checkMoodle'?'Moodle':payload.type==='readIdentity'?'Attendance 签到系统':'助手'));}finally{clearTimeout(timer);}
};
let scanNotice=false,scanPreviousFinish=null;
let discoveryStarted=false,discovering=false;
function configAlert(message){
 let box=$('config-alert');if(!box){box=document.createElement('dialog');box.id='config-alert';box.setAttribute('aria-labelledby','config-alert-title');box.innerHTML='<h2 id="config-alert-title">请确认课程配置</h2><p></p><button type="button">知道了</button>';document.body.append(box);box.querySelector('button').onclick=()=>{if(box.close)box.close();else box.removeAttribute('open');};}
 box.querySelector('p').textContent=message;if(!box.open){if(box.showModal)box.showModal();else box.setAttribute('open','');}
}
async function discoverCourses(automatic=false){
 pageTabs.show('courses');
 if(discovering)return;if(editing&&!automatic){configAlert('请先保存正在编辑的配置，再重新检测课程。');return;}
 discovering=true;guide?.detecting(true);guide?.message('正在自动读取课程，请保持签到系统登录；检测期间请勿关闭浏览器页面。');$('redetect').disabled=true;$('redetect').textContent='正在检测课程…';notice('正在自动读取课程，请保持签到系统登录；检测期间请勿关闭浏览器页面。');
 try{
  const result=await request({type:'redetect'});if(!result.courses?.length)throw new Error('未检测到课程，请检查签到系统登录状态后重试，或手动添加课程。');
  if(editing)throw new Error('检测完成，但你正在编辑配置。请先保存，再重新检测以免覆盖改动。');
  const draft={...latest.settings,courses:[...new Set([...(latest.settings?.courses||[]),...result.courses])],schedules:{...latest.settings?.schedules,...result.schedules}};
  $('courses').replaceChildren();for(const course of draft.courses)courseRule(course,draft);editing=true;guide?.message('已检测到课程，请在下方完善课程来源和课表。');
  guide?.message(`已检测到 ${result.courses.length} 门课程。请在下方完善课程来源和课表。${(result.issues||[]).length?result.issues.join('；'):''}`);
  const successMessage=document.getElementById('setup-course-message');if(successMessage)successMessage.dataset.state='success';
  notice('');
 }catch(error){const detail=/登录|账号|页面|tab|fetch|权限/i.test(error.message)?'未检测到课程，请检查签到系统登录状态后重试，或手动添加课程。':error.message;guide?.message(detail,true);notice(detail,'error');configAlert(detail);}finally{guide?.detecting(false);discovering=false;$('redetect').disabled=false;$('redetect').textContent='重新检测课程';}
}
let observedRun=false,lastResult=null;
let selectedRecordCourse='',recordViewSnapshot='';
function recordWeek(record){
 const sourceWeek=String(record.subject||'').match(/\bweek\s*(\d{1,2})\b/i);
 if(sourceWeek)return `${(record.date||'').slice(0,4)} · Week ${Number(sourceWeek[1])}（来源标注）`;
 const date=new Date((record.date||'')+'T12:00:00Z');if(Number.isNaN(date.getTime()))return '日期待核对';
 const monday=new Date(date);monday.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));
 const sunday=new Date(monday);sunday.setUTCDate(monday.getUTCDate()+6);
 const thursday=new Date(monday);thursday.setUTCDate(monday.getUTCDate()+3);
 const week=Math.ceil((((thursday-Date.UTC(thursday.getUTCFullYear(),0,1))/86400000)+1)/7);
 return `${monday.toISOString().slice(0,10)} — ${sunday.toISOString().slice(0,10)}`;
}
function showResult(state){
 const status=state.status||{},summary=status.summary||{},confirm=summary.needsConfirmation??(!(status.counts?.records)||state.settings?.courses?.some(c=>!state.settings.schedules?.[c]?.length));
 if(summary.quiet&&!status.error)return;
 let box=$('result-dialog');if(!box){box=document.createElement('dialog');box.id='result-dialog';box.setAttribute('aria-labelledby','result-title');box.innerHTML='<div id="result-success-icon" aria-hidden="true" hidden><svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h2 id="result-title"></h2><p id="result-message"></p><ul id="result-records"></ul><div id="result-login-links" class="setup-links" hidden><a href="https://attendance.monash.edu.my/student/Units.aspx" target="_blank" rel="noreferrer">登录签到系统 ↗</a><a href="https://mail.google.com/" target="_blank" rel="noreferrer">登录 Gmail ↗</a><a href="https://learning.monash.edu/" target="_blank" rel="noreferrer">登录 Moodle ↗</a></div><div class="result-actions"><button id="result-edit" type="button">核对课程配置</button><button id="result-close" type="button">确认</button></div>';document.body.append(box);const close=()=>{if(box.close)box.close();else box.removeAttribute('open');};$('result-close').onclick=close;$('result-edit').onclick=()=>{close();document.querySelector('.courses-card').scrollIntoView?.({behavior:'smooth'});document.querySelector('[data-field="course"]')?.focus();};}
 const outcome=checkinResult(summary,Boolean(status.error));$('result-success-icon').hidden=!outcome.success;
 $('result-title').textContent=outcome.title;
 $('result-message').textContent=status.error?(status.message||'请查看运行明细并核对配置。'):`${summary.submitted?`本轮已确认 ${summary.submitted} 场签到成功。`:'本轮签到流程已完成。'}${confirm?'请确认课程、日期、星期、时间和组别；未填写课表或未检测到数据，不代表已经签到成功。':status.message||''}`;
 if(summary.issues?.length)$('result-message').textContent+=' '+summary.issues.join('；');
 if(summary.loginRequired?.length)$('result-message').textContent=summary.loginRequired.join('；');
 $('result-records').replaceChildren();for(const course of summary.courses||[]){const li=document.createElement('li');li.className='course-result';const title=document.createElement('strong'),detail=document.createElement('span');title.textContent=course.course;detail.textContent=course.reason;li.append(title,detail);$('result-records').append(li);}for(const r of summary.records||[]){if(summary.courses?.some(c=>c.course===r.course))continue;const li=document.createElement('li');li.textContent=`${r.course} · ${r.date} ${weekday(r.date)} ${r.time||''} · ${r.type||''} ${r.group||''} · ${labels[r.status]||r.status||''}`;$('result-records').append(li);}
 if(!summary.records?.length&&!summary.courses?.length&&!status.error){const li=document.createElement('li');li.textContent='暂无可确认的近期场次，请核对课表及签到码来源。';$('result-records').append(li);}
 $('result-login-links').hidden=!status.error;$('result-edit').hidden=!confirm&&!status.error;$('result-close').textContent=confirm?'已核对，关闭':'知道了';if(!box.open){if(box.showModal)box.showModal();else box.setAttribute('open','');}
}
function sourceLabel(url){if(/mail\.google\.com/i.test(url||''))return translate('查看邮件');if(/learning\.monash\.edu/i.test(url||''))return translate('查看 Moodle');if(/edstem\.org/i.test(url||''))return translate('查看 Ed');if(/attendance\.monash\.edu\.my/i.test(url||''))return translate('查看签到系统');return translate('打开来源');}
function appendDiagnostics(parent,diagnostics){const details=document.createElement('details');details.className='source-log';const summary=document.createElement('summary');summary.textContent=translate('查看来源');const list=document.createElement('ul');for(const item of diagnostics){const row=document.createElement('li'),url=item.sourceUrl||'',message=item.error&&item.error!==url&&item.error!=='已读取此来源'?item.error:'';if(message)row.append(document.createTextNode([item.scope,item.course,message].filter(Boolean).join(' · ')));if(url){const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noreferrer';link.textContent=sourceLabel(url);link.title=url;if(message)row.append(document.createTextNode(' · '));row.append(link);}else if(!message){row.textContent=item.scope||translate('打开来源');}list.append(row);}details.append(summary,list);parent.append(details);}
function appendArchivePath(parent,path){const button=document.createElement('button');button.type='button';button.className='archive-path-toggle';button.textContent=translate('查看本机原图路径');button.setAttribute('aria-expanded','false');const code=document.createElement('code');code.className='archive-path-value';code.textContent=path;code.hidden=true;const scroller=parent.closest('.table-wrap');let savedScrollLeft=0,hasSavedScroll=false;const rememberScroll=()=>{savedScrollLeft=scroller?.scrollLeft||0;hasSavedScroll=true;};const restoreScroll=()=>{if(!scroller)return;scroller.scrollLeft=savedScrollLeft;scroller.ownerDocument.defaultView.requestAnimationFrame?.(()=>{scroller.scrollLeft=savedScrollLeft;});};button.addEventListener('pointerdown',rememberScroll);button.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')rememberScroll();});button.onclick=()=>{if(!hasSavedScroll)rememberScroll();const open=code.hidden;code.hidden=!open;button.setAttribute('aria-expanded',String(open));restoreScroll();hasSavedScroll=false;};parent.append(button,code);}
let noticeTimer;
function notice(message,kind='general'){
 clearTimeout(noticeTimer);scanNotice=kind==='scan';const target=$('notice');target.hidden=!message;target.textContent=message;target.dataset.tone=['success','error','warning'].includes(kind)?kind:'info';target.setAttribute('role',kind==='error'?'alert':'status');
 if(message&&kind!=='scan'&&!/^正在/.test(message)){noticeTimer=setTimeout(()=>{target.hidden=true;target.textContent='';},5000);noticeTimer.unref?.();}
}
function weekday(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return '';const day=new Date(date+'T12:00:00Z');return Number.isNaN(day.getTime())?'':['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][day.getUTCDay()];}
let helpId=0;
function fieldHelp(root){
 const descriptions={'source-mode':'选择签到码来源，只显示并使用对应配置，可多选。多选时先查邮件，再查 Moodle，最后查 Ed。',course:'填写学校课程代码，用于匹配邮件、课程页面及签到场次。',sender:'填写后从 Gmail 查找该发件人的签到邮件。留空则不查该课程邮件；学校邮箱只用于登录身份。',keyword:'邮件主题必须包含此文字；留空时使用课程代码。',urls:'填写 Moodle 课程、Week 栏目或公告网址，每行一个。三种来源都填时先查 Gmail，再从 Moodle 补齐缺少的场次，最后查 Ed。','ed-urls':'填写 Ed course_id 或课程网址，例如 37233；粘贴带 discussion 等子地址的网址也可以，会自动提取。注意 Ed 的 course_id 与 Moodle 的不同，不要互填。', 'weekly-count':'自动检测或手动填写。默认无需填写：先从签到页面读取最近 7 天的场次并保存成固定周课表，再查找待签到场次的签到码。信息不全或组别不唯一时请确认；也可手动填写课表。已设课表时，已完成或已取得有效签到码的场次不再查询。',weekday:'选择该场次每周上课的星期。',time:'按马来西亚时间（UTC+8）填写。未到上课时间的场次不会提前搜索，超过 7 天的课程不补签。',type:'可选，填写签到系统中的活动类型，例如 Studio、Seminar、Workshop 或 Applied。',group:'可选，填写你自己的组别，例如 01 或 01-P1；填写后只匹配该组别。',email:'只填写 4 个英文字母加 4 个数字，后缀固定为 @student.monash.edu。学校邮箱只用于核对签到系统登录身份。每门课的邮件来源请在 邮件发件人邮箱中配置。',name:'填写签到页面最上方显示的姓名，与页面保持一致，用于核对登录身份。',interval:'自动运行的检查间隔。保存并开启后可关闭本页面；Chrome 必须运行，电脑睡眠时不会检查。',year:'用于课程页面的年份参考；年份无法可靠确定的签到码不会自动提交。','mail-query':'所有课程共用的 Gmail 检索关键词，留空可扩大检索范围。'};
 for(const input of root.querySelectorAll('input,select,textarea')){
  const key=input.dataset.field||input.id;if(!['sender','urls','ed-urls','weekly-count','mail-query','email','name'].includes(key))continue;const text=descriptions[key],label=input.closest('label');if(!text||!label||label.querySelector('.help-button'))continue;
  const wrap=document.createElement('span');wrap.className='help-wrap';const button=document.createElement('button'),tip=document.createElement('span');button.type='button';button.className='help-button';button.textContent='?';button.setAttribute('aria-label','查看字段说明');tip.id='field-help-'+(++helpId);tip.className='tooltip';tip.setAttribute('role','tooltip');tip.textContent=text;button.setAttribute('aria-describedby',tip.id);button.addEventListener('click',e=>e.preventDefault());wrap.append(button,tip);label.insertBefore(wrap,input.closest('.school-email-field')||input);
 }
}
const elapsed=ms=>{const seconds=Math.max(0,Math.floor(ms/1000)),minutes=Math.floor(seconds/60);return `${minutes}:${String(seconds%60).padStart(2,'0')}`;};
const timestamp=value=>typeof value==='number'?value:Date.parse(value)||0;
function renderProgress(status={}){
 const now=Date.now(),context=status.context||{},parts=[context.course,context.subject,context.page?`第 ${context.page} 页`:null].filter(Boolean);
 $('run-context').textContent=parts.join(' · ')||(status.running?'正在准备下一步…':status.finishedAt?(status.error?'本轮已停止，请查看上方原因':'本轮检查已结束'):'尚未开始处理');if(/^https:\/\//.test(context.sourceUrl||'')){const a=document.createElement('a');a.href=context.sourceUrl;a.target='_blank';a.rel='noreferrer';a.textContent=' · 查看当前来源 ↗';$('run-context').append(a);}
 const startedAt=timestamp(status.startedAt),stepStartedAt=timestamp(status.stepStartedAt),updatedAt=timestamp(status.updatedAt),finishedAt=timestamp(status.finishedAt);const timing=[];if(startedAt)timing.push(`总用时 ${elapsed((status.running?now:finishedAt||now)-startedAt)}`);if(status.running&&stepStartedAt)timing.push(`当前步骤 ${elapsed(now-stepStartedAt)}`);if(updatedAt)timing.push(`${Math.max(0,Math.floor((now-updatedAt)/1000))} 秒前更新`);$('run-timing').textContent=timing.join(' · ');
 // Idle runs keep the full log only in the records tab; this live tail is
 // a run-progress view and hides once the run ends.
 if($('run-events-details'))$('run-events-details').hidden=!status.running;
 const keys=['pages','messages','images','cached','records','skipped'],counts=status.counts||{};[...$('run-counts').querySelectorAll('dd')].forEach((node,index)=>node.textContent=String(counts[keys[index]]||0));
 const liveTail=$('run-events-details');
 if(liveTail?.hidden){liveTail.querySelector('ol')?.replaceChildren();}
 else{$('run-events').replaceChildren();for(const event of (status.events||[]).slice(-8).reverse()){const li=document.createElement('li'),time=document.createElement('time');time.textContent=event.at?new Date(event.at).toLocaleTimeString('zh-CN',{hour12:false}):'—';li.append(time,document.createTextNode(event.message||'运行状态已更新'));const url=event.context?.sourceUrl;if(/^https:\/\//.test(url||'')){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noreferrer';a.textContent='查看来源 ↗';li.append(a);}$('run-events').append(li);}if(!$('run-events').children.length){const li=document.createElement('li');li.textContent='暂无运行明细';$('run-events').append(li);}
 }
 if($('run-log')?.open){$('full-run-events').replaceChildren();for(const [index,event] of (status.events||[]).entries()){const li=document.createElement('li'),time=document.createElement('time');time.textContent=event.at?new Date(event.at).toLocaleString('zh-CN',{hour12:false}):'—';li.append(time,document.createTextNode(event.message||'运行状态已更新'));if(event.level)li.classList.add(event.level);li.dataset.step=String(index+1);const url=event.context?.sourceUrl;if(/^https:\/\//.test(url||'')){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noreferrer';a.textContent='查看来源 ↗';li.append(a);}$('full-run-events').append(li);}if(!$('full-run-events').children.length){const li=document.createElement('li');li.textContent='暂无运行明细';$('full-run-events').append(li);}}
}
function renderHealth(service={}){if($('prefer-companion'))$('prefer-companion').hidden=!service.fallback||isWindows;if(service.fallback&&$('ocr-log'))$('ocr-log').textContent=translate('浏览器内置识别无独立日志文件');const stage=service.stage||'';
 if($('engine-desc'))$('engine-desc').textContent=translate(isWindows?'Windows 使用浏览器内置识别，全程在本机完成。':service.fallback?'当前使用浏览器内置识别引擎，全程在本机完成、无需安装；如需更高识别精度，可安装 Mac OCR 配套程序。':'Mac 使用 Apple Vision 在本机识别。');$('health').textContent=service.busy||['recognizing','running','busy'].includes(stage)?'正在识别':service.fallback?'就绪（浏览器内置识别，可选装配套程序提升精度）':service.binaryReady?'就绪':'识别服务未就绪，请完成安装引导。';if(service.ocrLogPath)$('ocr-log').textContent=prettyPath(service.ocrLogPath);}
function scheduleRow(value={}){
 const row=document.createElement('div');row.className='schedule-row';row.innerHTML='<label>星期<select data-field="weekday" required><option value="">请选择</option><option value="1">星期一</option><option value="2">星期二</option><option value="3">星期三</option><option value="4">星期四</option><option value="5">星期五</option><option value="6">星期六</option><option value="7">星期日</option></select></label><label>时间（UTC+8）<input data-field="time" type="time" required></label><label>活动类型（可选）<input data-field="type" placeholder="例如 Workshop"></label><label>组别（可选）<input data-field="group" placeholder="例如 01"></label>';
 row.querySelector('[data-field="weekday"]').value=value.weekday?String(value.weekday):'';row.querySelector('[data-field="time"]').value=value.time||'';row.querySelector('[data-field="type"]').value=value.type||'';row.querySelector('[data-field="group"]').value=value.group||'';fieldHelp(row);return row;
}
function syncSaveButton(){document.querySelector('#settings button[type=submit]').hidden=!$('courses').children.length;[...$('courses').children].forEach((rule,index)=>{rule.querySelector('.course-number').textContent=String(index+1).padStart(2,'0');});syncIdentitySources();}
function syncIdentitySources(){
 if(!identityBindings)return;
 const modes=[...$('courses').querySelectorAll('[data-field="source-mode"]')].map(input=>input.value),gmail=modes.some(mode=>['email','email-moodle','email-ed','all'].includes(mode)),moodle=modes.some(mode=>['moodle','email-moodle','moodle-ed','all'].includes(mode));
 $('email').closest('label').hidden=!gmail;$('email-check').hidden=!gmail;$('email-check-status').hidden=!gmail;$('moodle-login').hidden=!moodle;const divider=document.querySelector('.identity-source-divider');if(divider)divider.hidden=!(gmail||moodle);
 $('email').disabled=!gmail;$('email').required=gmail;
 sourceDivider.hidden=!(gmail&&moodle);
 if(!gmail)identityBindings.gmail.reset();if(!moodle)identityBindings.moodle.reset();
 $('mail-query').closest('label').hidden=!gmail;
 // During the guide's course step the identity card is hidden; bring it back
 // (without the side cards) the moment a course needs the school email. Only
 // the email shows: the name was already confirmed in guide step 2.
 const guideNeedsEmail=Boolean(gmail&&document.body.dataset.setup==='courses');
 document.body.classList.toggle('guide-needs-email',guideNeedsEmail);
 // Direct inline styles: never rely on stylesheet order or cached CSS for this.
 const columns=document.querySelector('#settings > .columns');
 if(columns&&document.body.dataset.setup==='courses'){
  // page-tabs leaves this panel [hidden] with a display:none!important rule;
  // clearing the attribute is what actually reveals it.
  columns.hidden=false;
  columns.style.display=guideNeedsEmail?'grid':'none';
  columns.style.gridTemplateColumns=guideNeedsEmail?'1fr':'';
  columns.style.marginBottom=guideNeedsEmail?'22px':'';
  const side=columns.querySelector('.settings-side');if(side)side.style.display=guideNeedsEmail?'none':'';
  const coursesCard=document.querySelector('#settings .courses-card');if(coursesCard)coursesCard.style.marginTop=guideNeedsEmail?'22px':'';
 }else if(columns&&columns.style.display){
  // The guide temporarily shares the identity card with the courses panel.
  // Return ownership to the tabs when leaving that step, without a reload.
  for(const property of ['display','grid-template-columns','margin-bottom'])columns.style.removeProperty(property);
  columns.querySelector('.settings-side')?.style.removeProperty('display');
  document.querySelector('#settings .courses-card')?.style.removeProperty('margin-top');
  pageTabs.show(document.body.dataset.page||'settings');
 }
 const nameHidden=guideNeedsEmail,nameLabel=$('name').closest('label');
 if(nameLabel)nameLabel.hidden=nameHidden;$('read-name').hidden=nameHidden;$('read-name-status').hidden=nameHidden;
}
function courseRule(code='',cfg={}){
 const rule=document.createElement('div');rule.className='course-rule';
 rule.innerHTML='<div class="rule-head"><label>课程代码<input data-field="course" required placeholder="例如 ABC1234"></label><label>签到码来源<select data-field="source-mode" required><option value="">请选择签到码来源</option><option value="email">邮件</option><option value="moodle">Moodle</option><option value="ed">Ed</option><option value="email-moodle">邮件和 Moodle</option><option value="email-ed">邮件和 Ed</option><option value="moodle-ed">Moodle 和 Ed</option><option value="all">邮件、Moodle 和 Ed</option></select></label><button type="button" class="subtle">移除</button></div><div class="form-pair mail-fields"><label>邮件发件人邮箱<input data-field="sender" type="email" placeholder="例如 teacher@example.edu"></label><label>邮件主题中包含<input data-field="keyword" placeholder="默认使用课程代码"></label></div><label class="moodle-fields">Moodle 课程、Week 栏目或公告网址<textarea data-field="urls" rows="2" placeholder="每行一个网址，最多 3 个"></textarea></label><label class="ed-fields">Ed course_id<input data-field="ed-urls" placeholder="例如 37233，也可粘贴完整课程网址"><small class="ed-course-guide"></small></label><details class="schedule-details"><summary>课程场次</summary><label class="weekly-count">每周场次<select data-field="weekly-count"></select></label><div class="schedule-rows"></div><small>课表按马来西亚时间（UTC+8）运行。默认自动读取签到页面的待签到场次，无需填写每周课表。</small></details>';
 rule.querySelector('[data-field="course"]').value=code;rule.querySelector('[data-field="sender"]').value=cfg.senders?.[code]||'';rule.querySelector('[data-field="keyword"]').value=cfg.subjectKeywords?.[code]||code;rule.querySelector('[data-field="urls"]').value=displayMoodleEntries(cfg.moodleUrls?.[code]);rule.querySelector('[data-field="ed-urls"]').value=cfg.edUrls?.[code]?.[0]||'';
 const moodleField=rule.querySelector('.moodle-fields');moodleField.firstChild.textContent='Moodle course_id';
 const courseInput=rule.querySelector('[data-field="urls"]');courseInput.placeholder='例如 35417，也可粘贴完整课程网址';courseInput.rows=1;
 const moodleLink=document.createElement('a');moodleLink.target='_blank';moodleLink.rel='noopener noreferrer';
 const moodleGuide=document.createElement('small');moodleGuide.className='moodle-course-guide';moodleGuide.textContent='打开 Moodle 后进入对应课程，网址中 course/view.php?id= 后面的数字就是 course_id；粘贴完整课程网址也会自动提取。';moodleGuide.prepend(moodleLink,document.createTextNode(' · '));moodleField.append(moodleGuide);bindMoodleCourseInput(courseInput,moodleLink);
 const edLink=document.createElement('a');edLink.target='_blank';edLink.rel='noopener noreferrer';edLink.href='https://edstem.org/au/dashboard';edLink.textContent=translate('打开 Ed 查看课程网址');
 const edGuide=rule.querySelector('.ed-course-guide');edGuide.textContent='打开 Ed 后进入对应课程，网址中 au/courses/ 后面的数字就是 Ed course_id；粘贴带 discussion 等子地址的课程网址也会自动提取。';edGuide.append(document.createElement('br'),document.createTextNode('注意 Ed 的 course_id 和 Moodle 的不一样，不要互填。'));edGuide.prepend(edLink,document.createTextNode(' · '));
 const sourceMode=rule.querySelector('[data-field="source-mode"]'),sender=rule.querySelector('[data-field="sender"]'),urls=rule.querySelector('[data-field="urls"]'),edUrls=rule.querySelector('[data-field="ed-urls"]');
 const hasMail=Boolean(sender.value),hasMoodle=Boolean(urls.value),hasEd=Boolean(edUrls.value);
 sourceMode.value=hasMail&&hasMoodle&&hasEd?'all':hasMail&&hasMoodle?'email-moodle':hasMail&&hasEd?'email-ed':hasMoodle&&hasEd?'moodle-ed':hasMail?'email':hasMoodle?'moodle':hasEd?'ed':'';
 const showSource=()=>{const mail=['email','email-moodle','email-ed','all'].includes(sourceMode.value),moodle=['moodle','email-moodle','moodle-ed','all'].includes(sourceMode.value),ed=['ed','email-ed','moodle-ed','all'].includes(sourceMode.value);rule.querySelector('.mail-fields').hidden=!mail;rule.querySelector('.moodle-fields').hidden=!moodle;rule.querySelector('.ed-fields').hidden=!ed;rule.querySelector('.ed-course-guide').hidden=!ed;for(const field of rule.querySelectorAll('.mail-fields input'))field.disabled=!mail;urls.disabled=!moodle;urls.required=moodle;edUrls.disabled=!ed;edUrls.required=ed;};
 sourceMode.addEventListener('change',()=>{showSource();editing=true;syncIdentitySources();if(['email','email-moodle','email-ed','all'].includes(sourceMode.value)){
  // Force-reveal the school email field right here: no CSS class, no render
  // cycle, no saved state — direct DOM writes on the exact event.
  console.log('[mamo] 邮件来源已选择：显示学校邮箱字段');
  const emailLabel=$('email').closest('label');if(emailLabel)emailLabel.hidden=false;
  const columns=document.querySelector('#settings > .columns');
  if(columns){columns.hidden=false;columns.style.display='grid';columns.style.gridTemplateColumns='1fr';columns.style.marginBottom='22px';const side=columns.querySelector('.settings-side');if(side)side.style.display='none';}
  const coursesCard=document.querySelector('#settings .courses-card');if(coursesCard)coursesCard.style.marginTop='22px';
  document.body.classList.add('guide-needs-email');
  emailLabel?.scrollIntoView?.({behavior:'smooth',block:'center'});
  try{$('email').focus({preventScroll:true});}catch{}
 }});showSource();
 const count=rule.querySelector('[data-field="weekly-count"]');for(let i=0;i<=14;i++){const option=document.createElement('option');option.value=String(i);option.textContent=i?`${i} 场`:'自动检测（无需填写）';count.append(option);}const rows=rule.querySelector('.schedule-rows'),schedule=cfg.schedules?.[code]||[];count.value=String(schedule.length);const details=rule.querySelector('.schedule-details'),updateSummary=()=>{details.querySelector('summary').textContent=Number(count.value)?`课程场次 · 每周 ${count.value} 场`:'课程场次 · 自动检测';};updateSummary();schedule.forEach(item=>rows.append(scheduleRow(item)));count.addEventListener('change',()=>{const wanted=Number(count.value);while(rows.children.length>wanted)rows.lastElementChild.remove();while(rows.children.length<wanted)rows.append(scheduleRow());updateSummary();details.open=true;editing=true;});
 const number=document.createElement('span');number.className='course-number';rule.prepend(number);
 rule.querySelector('button').addEventListener('click',()=>{rule.remove();editing=true;syncSaveButton();});fieldHelp(rule);$('courses').append(rule);syncSaveButton();
}
function render(state,settings=false){
  latest=state;guide?.update(state);
  const config=state.settings||{},status=state.status||{};
  if(status.running)observedRun=true;
  if(!status.running&&status.finishedAt&&status.finishedAt!==lastResult&&(observedRun||(scanPending&&status.finishedAt!==scanPreviousFinish)||scanNotice&&status.finishedAt!==scanPreviousFinish)){lastResult=status.finishedAt;observedRun=false;showResult(state);}
  if(scanNotice){if(status.running)notice(status.message||'正在签到…','scan');else if(status.finishedAt&&status.finishedAt!==scanPreviousFinish)notice(status.error?'签到结束：'+(status.message||'处理失败，请查看明细'):'签到流程完成：'+(status.message||'本轮已结束'),checkinResult(status.summary,Boolean(status.error)).tone);}
  $('mode').textContent=config.enabled?'自动运行已开启':'自动运行已暂停';$('mode').classList.toggle('on',Boolean(config.enabled));
  const configured=Boolean(config.email&&config.name&&(config.courses||[]).length);$('status').textContent=!configured&&!status.running?'请先填写邮箱、姓名和至少一门课程':status.message||'等待首次检查';
  renderProgress(status);if(status.service)renderHealth(status.service);if(status.ocrLogPath)$('ocr-log').textContent=prettyPath(status.ocrLogPath);if(status.running&&healthWarning){healthWarning=false;notice('');}
  $('last-run').textContent=status.running?'正在处理，请稍候':status.finishedAt?'最近检查：'+new Date(status.finishedAt).toLocaleString('zh-CN'):'开启后，工具将按设定间隔自动检查。';
  $('scan').disabled=Boolean(status.running)||scanPending;$('scan').textContent=status.running?'正在签到…':scanPending?'正在请求…':editing?'保存并立即签到':'立即签到';
  if(settings&&!editing){$('enabled').checked=Boolean(config.enabled);$('dev-mode').checked=Boolean(config.devMode);$('ignore-completed').checked=Boolean(config.ignoreCompleted);$('email').value=emailPrefix(config.email);$('name').value=config.name||'';$('interval').value=String([0.5,1440,4320,7200,10080].includes(config.intervalMinutes)?config.intervalMinutes:1440);$('year').value=String(config.academicYear||new Date().getFullYear());$('mail-query').value=config.mailQuery??'attendance';$('courses').replaceChildren();for(const c of config.courses||[])courseRule(c,config);savedFormSnapshot=formSnapshot();}
  const snapshot=JSON.stringify([config.email,config.name]);if(identitySnapshot&&snapshot!==identitySnapshot&&!editing)for(const binding of Object.values(identityBindings||{}))binding.reset();identitySnapshot=snapshot;
  syncSaveButton();if(status.archiveDir)$('archive').textContent=prettyPath(status.archiveDir);
 // Developer mode owns the visibility of the ignore-completed switch and the
 // 30-second interval; the checkbox (not the saved config) drives the UI so an
 // unsaved toggle reacts instantly.
 const devOn=$('dev-mode')?.checked;const halfYear=$('interval').querySelector('option[value="0.5"]');if(halfYear)halfYear.hidden=!devOn;const ignoreToggle=document.querySelector('.ignore-completed-toggle');if(ignoreToggle)ignoreToggle.hidden=!devOn;
  const records=[...(state.records||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const courses=[...new Set(records.map(r=>r.course||'课程待核对'))];if(!courses.includes(selectedRecordCourse))selectedRecordCourse=courses[0]||'';
  const recordView=JSON.stringify([records,selectedRecordCourse,Boolean(status.running),scanPending]);
  if(recordView===recordViewSnapshot)return;
  recordViewSnapshot=recordView;
  $('record-course-tabs').replaceChildren();for(const course of courses){const button=document.createElement('button');button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-selected',String(course===selectedRecordCourse));button.textContent=`${course} (${records.filter(r=>(r.course||'课程待核对')===course).length})`;button.onclick=()=>{selectedRecordCourse=course;render(latest);};$('record-course-tabs').append(button);}
  $('count').textContent=records.length;$('records').replaceChildren();$('empty').hidden=records.length>0;
  const groups=new Map();for(const r of records.filter(r=>(r.course||'课程待核对')===selectedRecordCourse)){const key=recordWeek(r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
  for(const [week,rows] of groups){const heading=document.createElement('tr');heading.className='week-heading';const title=document.createElement('th');title.colSpan=5;title.textContent=week;heading.append(title);$('records').append(heading);
  for(const r of rows){
    const tr=document.createElement('tr');
    const cell=(value,detail)=>{const td=document.createElement('td');td.textContent=value;if(detail){const small=document.createElement('small');small.textContent=detail;td.append(small);}tr.append(td);return td;};
    cell(r.date?`${r.date} ${weekday(r.date)}`:'日期待核对',r.time||'');cell(r.course||'',`${r.type||''} ${r.group||''}`);
    const code=cell(''),strong=document.createElement('strong');strong.textContent=r.code||'—';code.append(strong);
    if(r.status==='submitted'&&!r.code)appendRecordHelp(code);
    if(r.code){const copy=document.createElement('button');copy.type='button';copy.className='copy-code';copy.textContent='复制';copy.setAttribute('aria-label','复制签到码');copy.addEventListener('click',async()=>{copy.disabled=true;copy.textContent='复制中…';try{await window.navigator.clipboard.writeText(r.code);copy.textContent='已复制';notice('签到码已复制。','success');}catch{copy.textContent='重试复制';notice('复制失败，请选中签到码手动复制。','error');}finally{copy.disabled=false;}});code.append(copy);}
    const statusCell=cell(''),badge=document.createElement('span');const completeForConfirmation=Boolean(r.course&&r.date&&r.time&&r.type&&r.group&&r.code);const statusKey=displayStatus(r);badge.className='state '+statusKey;const qualifier=weekQualifier(r);badge.textContent=[qualifier&&translate(qualifier),translate(r.status==='review'&&!completeForConfirmation?'资料不完整':labels[statusKey]||r.status)].filter(Boolean).join(' · ');statusCell.append(badge);
    if(statusKey==='not_started'&&!qualifier)statusCell.append(Object.assign(document.createElement('small'),{textContent:translate(r.code?'已提前找到签到码，开课后自动提交':'开课前暂不搜索签到码')}));
    if(r.status==='review'&&r.code&&completeForConfirmation){const confirm=document.createElement('button');confirm.type='button';confirm.className='copy-code review-confirm';confirm.textContent=translate('确认信息并签到');confirm.disabled=Boolean(latest.status?.running)||scanPending;confirm.onclick=()=>confirmLowConfidenceAndRetry(r,confirm);statusCell.append(confirm);}
    if(r.status==='waiting_code'){const retry=document.createElement('button');retry.type='button';retry.className='copy-code';retry.textContent='重试';retry.disabled=Boolean(latest.status?.running)||scanPending;retry.onclick=()=>startManualCheck(r.course);code.append(retry);}
    const source=cell('',r.reason||''),sourceItems=[...(r.sources||[])];
    if(r.sourceUrl&&!sourceItems.some(item=>item.sourceUrl===r.sourceUrl))sourceItems.unshift({sourceUrl:r.sourceUrl});
    if(sourceItems.length)appendDiagnostics(source,sourceItems.map(item=>({...item,error:item.error||item.sourceUrl||'已读取此来源'})));
    if(r.imagePath)appendArchivePath(source,r.imagePath);
    $('records').append(tr);
  }
  }
}
async function refresh(settings=false){if(refreshing){refreshQueued=true;refreshSettings||=settings;return;}refreshing=true;try{const state=await request({type:'status'});render(state,settings);if(state.discoveryAvailable&&!guide?.active&&state.settings?.autoDiscover!==false&&!state.settings?.courses?.length&&!discoveryStarted&&!editing){discoveryStarted=true;if(askConfirm('是否检测课程信息？确认后将打开已登录的签到页面，读取最近 7 天的课程并生成可编辑课表。此步骤不会提交签到。'))void discoverCourses(true);}}catch(e){notice(e.message,'error');}finally{refreshing=false;if(refreshQueued){const nextSettings=refreshSettings;refreshQueued=false;refreshSettings=false;void refresh(nextSettings);}}}
async function health(manual=false){if(healthPending){if(manual)notice('正在检查识别服务，请稍候（最多等待 5 秒）。');return;}healthPending=true;guide?.checking(true,5);$('check-health').disabled=true;$('check-health').textContent='正在检查识别服务…';if(manual)notice('正在检查识别服务（最多等待 5 秒）…');try{const r=await request({type:'health'});renderHealth(r);guide?.health(r);healthWarning=false;if(manual)notice(r.fallback?'未检测到本机识别服务，将使用浏览器内置识别；可安装配套程序提升识别质量。':r.binaryReady?'识别服务检查通过，可以识别图片。':'识别服务未就绪，请运行对应系统的识别服务安装程序。',r.binaryReady&&!r.fallback?'success':'warning');if(r.archiveDir)$('archive').textContent=prettyPath(r.archiveDir);}catch(e){renderHealth({});guide?.health(null,e.message);healthWarning=true;if(manual)notice('识别服务未就绪，请完成安装后重试。','error');}finally{healthPending=false;guide?.checking(false);$('check-health').disabled=false;$('check-health').textContent='检查识别服务';}}
function readFormSettings(){const courses=[],senders={},subjectKeywords={},moodleUrls={},edUrls={},schedules={};for(const row of $('courses').children){const value=f=>row.querySelector(`[data-field="${f}"]`).value.trim();const c=value('course').toUpperCase();if(courses.includes(c))throw new Error('课程代码重复：'+c);if(!value('source-mode'))throw new Error(c+' 请选择签到码来源');const mode=value('source-mode'),mail=['email','email-moodle','email-ed','all'].includes(mode),moodle=['moodle','email-moodle','moodle-ed','all'].includes(mode),ed=['ed','email-ed','moodle-ed','all'].includes(mode);courses.push(c);senders[c]=mail?value('sender'):'';subjectKeywords[c]=value('keyword')||c;moodleUrls[c]=moodle?value('urls').split('\n').map(s=>s.trim()).filter(Boolean):[];edUrls[c]=ed?[value('ed-urls')].filter(Boolean):[];schedules[c]=[...row.querySelectorAll('.schedule-row')].map(item=>{const field=name=>item.querySelector(`[data-field="${name}"]`).value.trim(),weekday=Number(field('weekday')),time=field('time');if(!weekday||!time)throw new Error(`${c||'该课程'} 请填写每个场次的星期和时间`);return {weekday,time,type:field('type'),group:field('group')};});}return {email:$('email').closest('label').hidden?'':($('email').value.trim()?schoolEmail($('email').value):''),name:$('name').value,enabled:$('enabled').checked,intervalMinutes:Number($('interval').value),academicYear:Number($('year').value),mailQuery:$('mail-query').value,courses,senders,subjectKeywords,moodleUrls,edUrls,schedules,ignoreCompleted:$('ignore-completed').checked,devMode:$('dev-mode').checked};}
function hasUnsavedChanges(){if(formSnapshot()===savedFormSnapshot)return false;try{const actual=normalizeSettings(latest.settings||DEFAULTS,readFormSettings(),Boolean(latest.records?.length));const stored=normalizeSettings(latest.settings||DEFAULTS,{},Boolean(latest.records?.length));return JSON.stringify(actual)!==JSON.stringify(stored);}catch{return true;}}
async function saveCard(scope,settings){
 const fieldIds={academicYear:'year',mailQuery:'mail-query',enabled:'enabled',intervalMinutes:'interval',ignoreCompleted:'ignore-completed',devMode:'dev-mode'};
 const ids=Object.keys(settings).map(key=>fieldIds[key]);
 const submitted=JSON.parse(formSnapshot()).filter(([id])=>ids.includes(id));
 await request({type:'settings',scope,settings});
 // Advance only this card's saved baseline; other drafts and edits made during
 // the request stay in the form and remain marked as unsaved.
 if(savedFormSnapshot){const values=new Map(submitted);savedFormSnapshot=JSON.stringify(JSON.parse(savedFormSnapshot).map(([id,value])=>[id,values.has(id)?values.get(id):value]));}
 editing=true;
 await refresh();
 editing=hasUnsavedChanges();render(latest);
}
$('settings').addEventListener('input',()=>{editing=hasUnsavedChanges();if(!scanPending&&!latest.status?.running)$('scan').textContent=editing?'保存并立即签到':'立即签到';});
// Scoped saves: each card's button persists only its own fields and never
// runs the course-rule validation (that belongs to 保存全部设置).
$('save-general').addEventListener('click',async()=>{
 const button=$('save-general');button.disabled=true;button.textContent='正在保存…';
 try{
  await saveCard('search',{academicYear:Number($('year').value),mailQuery:$('mail-query').value});
  button.textContent='已保存';notice('课程检索已保存。','success');
  button.textContent='保存设置';
 }catch(error){button.textContent='保存设置';notice(error.message,'error');}
 finally{button.disabled=false;}
});
automationSave.addEventListener('click',async()=>{
 automationSave.disabled=true;automationSave.textContent='正在保存…';
 try{
  await saveCard('automation',{enabled:$('enabled').checked,intervalMinutes:Number($('interval').value)});
  automationSave.textContent='已保存';notice('自动检查设置已保存。','success');
  automationSave.textContent='保存设置';
 }catch(error){automationSave.textContent='保存设置';notice(error.message,'error');}
 finally{automationSave.disabled=false;}
});
$('ignore-completed').addEventListener('change',async()=>{
 try{await request({type:'settings',scope:'automation',settings:{ignoreCompleted:$('ignore-completed').checked}});editing=hasUnsavedChanges();}catch(error){notice(error.message,'error');}
});
$('dev-mode').addEventListener('change',async()=>{
 try{await request({type:'settings',scope:'automation',settings:{devMode:$('dev-mode').checked}});editing=hasUnsavedChanges();}catch(error){notice(error.message,'error');}
});
function setSaveBusy(busy){for(const button of [$('save-general'),automationSave,$('settings').querySelector('button[type=submit]')]){button.disabled=busy;button.textContent=busy?'正在保存…':button.type==='submit'?'保存全部设置':'保存设置';}}
$('settings').addEventListener('submit',async e=>{e.preventDefault();if(saving)return;saving=true;setSaveBusy(true);notice('正在保存设置…');try{await request({type:'settings',settings:readFormSettings()});editing=false;notice('设置已保存。','success');await refresh(true);}catch(e){notice(e.message,'error');configAlert(e.message);}finally{saving=false;setSaveBusy(false);}});
$('redetect').addEventListener('click',()=>{if(askConfirm('重新检测最近 7 天的课程和课表？检测结果会填入编辑区，保存后替换原课表。'))void discoverCourses();});
$('clear-courses').addEventListener('click',async()=>{if(!askConfirm('确定清空所有课程、来源、课表及收集记录吗？此操作不可撤销，自动运行会暂停。本机已归档的图片文件不受影响。'))return;const button=$('clear-courses');button.disabled=true;notice('正在清空课程…');try{await request({type:'clearCourses'});discoveryStarted=true;editing=false;await refresh(true);notice('所有课程和收集记录已清空，自动运行已暂停。','success');}catch(error){notice(error.message,'error');configAlert(error.message);}finally{button.disabled=false;}});
$('add-course').addEventListener('click',()=>{courseRule();editing=true;});
$('import-settings').addEventListener('click',()=>{$('settings-file').click();});
$('export-settings').addEventListener('click',async()=>{
 const button=$('export-settings');button.disabled=true;button.textContent='正在导出…';
 try{
  const state=await request({type:'status'}),text=exportConfiguration(state.settings||DEFAULTS);
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='mamo-checkin-config.json';document.body.append(link);
  try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  notice(hasUnsavedChanges()?'已导出上次保存的个人配置；页面尚未保存的修改未包含在文件中。':'个人配置已导出，可通过“导入个人配置”恢复。','success');
 }catch(error){notice('导出失败：'+error.message,'error');}finally{button.disabled=false;button.textContent='导出个人配置';}
});
$('settings-file').addEventListener('change',async()=>{
  const file=$('settings-file').files?.[0];if(!file)return;
  try{
    if(file.size>131072)throw new Error('配置文件超过 128 KB');
    const settings=parseConfiguration(await file.text(),latest.settings||DEFAULTS,Boolean(latest.records?.length));
    await request({type:'settings',settings});
    editing=false;await refresh(true);notice('个人配置已导入并保存。','success');
  }catch(error){notice(error.message,'error');}finally{$('settings-file').value='';}
});
async function startManualCheck(course=null){
 if(scanPending||saving||latest.status?.running)return;
 editing=hasUnsavedChanges();scanPending=true;$('scan').disabled=true;scanPreviousFinish=latest.status?.finishedAt||null;
 render(latest);
 try{
  for(const binding of Object.values(identityBindings))binding.stop();
  if(editing){await request({type:'settings',settings:readFormSettings()});editing=false;await refresh(true);}
  const settings=normalizeSettings(latest.settings||DEFAULTS,readFormSettings(),Boolean(latest.records?.length));
  if(course&&!settings.courses.includes(course))throw new Error('课程已被移除，请重新配置');
  notice('');
  const preflight=await loginPreflight.run(course?{...settings,courses:[course]}:settings);if(!preflight)return;if(preflight.error)throw new Error(preflight.error);
  notice('正在请求后台开始签到…','scan');await request({type:course?'retry':'scan',...(course?{course}:{}),expectedIdentity:{email:settings.email,name:settings.name},verifiedLogin:preflight.verifiedLogin});
  if(!course)pageTabs.show('records');
  if(scanNotice)notice('后台已收到签到请求，正在等待运行状态…','scan');await refresh();
 }catch(error){notice(error.message,'error');}finally{scanPending=false;render(latest);}
}
async function confirmLowConfidenceAndRetry(record,button){
 if(scanPending||latest.status?.running)return;
 if(!askConfirm('我已核对课程、日期、星期、时间、组别和签到码，确认这些信息正确并允许签到。'))return;
 button.disabled=true;button.textContent=translate('正在确认…');
 try{
  confirmLowConfidenceRecord(record);
  await request({type:'confirmRecord',id:record.id});
  notice('已确认识别结果，准备签到…','success');
  await refresh();
  await startManualCheck(record.course);
 }catch(error){notice(error.message,'error');button.disabled=false;button.textContent=translate('确认信息并签到');}
}
$('scan').addEventListener('click',()=>startManualCheck());
$('dev-mode').addEventListener('change',()=>{editing=true;const devOn=$('dev-mode').checked;const ignoreToggle=document.querySelector('.ignore-completed-toggle');if(ignoreToggle)ignoreToggle.hidden=!devOn;const halfYear=$('interval').querySelector('option[value="0.5"]');if(halfYear)halfYear.hidden=!devOn;if(!scanPending&&!latest.status?.running)$('scan').textContent=editing?'保存并立即签到':'立即签到';});
$('check-health').addEventListener('click',()=>health(true));
$('prefer-companion').addEventListener('click',async()=>{
 const button=$('prefer-companion');button.disabled=true;
 try{await request({type:'resetOcrPreference'});latest.ocrPreference='';guide?.update(latest);notice('已恢复本机识别优先；请在上方引导第 1 步安装配套程序。','success');document.querySelector('#setup-guide')?.scrollIntoView({behavior:'smooth'});await refresh(true);}
 catch(error){notice(error.message,'error');}
 finally{button.disabled=false;}
});
$('settings').addEventListener('invalid',event=>{
 // The dialog owns focus; prevent Chrome from focusing a now-inert form field.
 event.preventDefault();
 const input=event.target,label=input.closest('label'),text=label?.firstChild?.textContent?.trim()||'配置字段';
 input.closest('details')?.setAttribute('open','');
 if(!$('config-alert')?.open)configAlert(translate('无法保存：请检查')+' '+text+'。'+input.validationMessage);
},true);
fieldHelp($('settings'));
$('run-log').addEventListener('toggle',()=>renderProgress(latest.status||{}));
$('download-run-log').addEventListener('click',async()=>{
 try{
 const events=(latest.status?.events)||[];
 const lines=[`马莫签到助手 ${$('app-version').textContent} 运行日志`,`生成时间：${new Date().toLocaleString('zh-CN',{hour12:false})}`,`条目数：${events.length}`,''];
 for(const event of events){
  const at=event.at?new Date(event.at).toLocaleString('zh-CN',{hour12:false}):'—';
  const course=event.context?.course||'',subject=event.context?.subject||'',url=event.context?.sourceUrl||'';
  lines.push(`[${at}]${event.level&&event.level!=='info'?` [${event.level}]`:''} ${event.message||''}${course?`（${course}${subject?` · ${subject}`:''}）`:''}${/^https:\/\//.test(url)?` ${url}`:''}`);
 }
 if(!events.length)lines.push('（暂无日志）');
 const {diagnosticLog=[]}=await chrome.storage.local.get('diagnosticLog');
 lines.push('', '--- Diagnostic JSONL (local metadata) ---',...diagnosticLog.map(entry=>JSON.stringify(entry)));
 const blob=new Blob([lines.join('\r\n')+'\r\n'],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`签到助手-运行日志-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.txt`;
 document.body.append(link);try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 notice('运行日志已导出。','success');
 }catch(error){notice(error.message,'error');}
});
$('export').addEventListener('click',()=>{
 const fields=['date','time','course','type','group','code','status','reason','sourceType','sourceUrl','imagePath','attemptedAt','submittedAt'];
 const escape=value=>'"'+String(value??'').replace(/"/g,'""').replace(/^[=+@-]/,"'$&")+'"';
 const records=latest.records||[];
 const csv='\uFEFF'+[fields,...records.map(r=>fields.map(f=>r[f]))].map(row=>row.map(escape).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='签到记录.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 const dates=records.map(r=>r.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')).sort();
 notice(records.length?`已导出 ${records.length} 条记录${dates.length?`，覆盖 ${dates[0]} 至 ${dates.at(-1)}`:''}。助手只保存最近 7 天内处理的记录；更早的场次请以签到网站显示为准。`:'暂无可导出的记录。',records.length?'success':'error');
});
configureEmailInput($('email'));
guide=createSetupGuide({request,refresh,skipOcr:()=>request({type:'preferBrowserOcr'}),detect:()=>discoverCourses(true),checkHealth:()=>health(true),reload:()=>window.location.reload(),reset:async()=>{if(!askConfirm('确定清空助手的姓名、邮箱、课程、签到记录和浏览器内缓存吗？此操作不可撤销，自动运行会停止。'))return;try{await request({type:'reset'});window.location.reload();}catch(error){configAlert(error.message);}}});
setInterval(()=>{if(guide.needsHealth()&&!healthPending)void health();},5000);
render({settings:DEFAULTS,setupGuide:true},true);globalThis.chrome?.storage?.onChanged?.addListener((changes,area)=>{if(area==='local'&&(changes.status||changes.settings))void refresh(Boolean(changes.settings));});setInterval(()=>renderProgress(latest.status||{}),1000);setInterval(()=>refresh(),2000);void refresh(true);if(globalThis.chrome?.runtime?.id)void health();

async function saveVerifiedIdentity(field,value){
 editing=true;
 await request({type:'identityField',field,value});
 latest.settings={...latest.settings,[field]:value};
 editing=hasUnsavedChanges();
}
identityBindings={};
identityBindings.attendance=bindIdentityReader({input:$('name'),button:$('read-name'),status:$('read-name-status'),buttonText:'登录并检测',verifiedButtonText:'重新登录并检测',request,onChange:()=>{editing=true;identityBindings.moodle?.reset();},onVerified:value=>saveVerifiedIdentity('name',value)});
identityBindings.gmail=installIdentityChecks({email:$('email'),name:$('name'),nameButton:$('read-name'),nameStatus:$('read-name-status'),request,onVerified:value=>saveVerifiedIdentity('email',value)});
identityBindings.moodle=bindVerification({button:$('check-moodle'),status:$('check-moodle-status'),prepare:()=>{const name=$('name').value.trim();if(!name)throw new Error('请先填写学校系统中的姓名。');return loginRequest('moodle',{name});},check:(read,open)=>read(request,open)});
$('name').addEventListener('input',()=>identityBindings.moodle.reset());
loginPreflight=createLoginPreflight({request,onVerified:site=>identityBindings[site].markVerified()});syncIdentitySources();
installLanguageUI();
