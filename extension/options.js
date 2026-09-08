import {schoolEmail,emailPrefix,configureEmailInput} from './school-email.js';
import {createSetupGuide} from './setup-guide.js';
import {DEFAULTS,normalizeSettings} from './settings.js';
import {parseConfiguration} from './configuration.js';
const $=id=>document.getElementById(id);
const labels={ready:'等待匹配',submitted:'已签到',expired:'已过期',review:'需要核对',attempting:'核对提交结果',uncertain:'结果待确认'};
let guide,savedFormSnapshot;
function formSnapshot(){return JSON.stringify([...document.querySelectorAll('#settings input,#settings select,#settings textarea')].map(input=>[input.id||input.dataset.field,input.type==='checkbox'?input.checked:input.value.trim()]));}
let latest={},editing=false,refreshing=false,refreshQueued=false,refreshSettings=false,healthPending=false,healthWarning=false,saving=false,scanPending=false;
const request=async payload=>{
  if(!globalThis.chrome?.runtime?.sendMessage)throw new Error('请先在 Chrome 加载此扩展，再从扩展图标打开设置');
  let timer;
  try{
    const result=await Promise.race([chrome.runtime.sendMessage(payload),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('后台响应超时，操作结果尚未确认。请重新打开马莫签到助手查看状态；若刚升级扩展，请关闭旧页面后重新打开。')),payload.type==='redetect'?30000:10000);})]);
    if(!result)throw new Error('后台未返回结果，请关闭此页面，从扩展图标重新打开');
    if(result.ok===false)throw new Error(result.error);return result;
  }finally{clearTimeout(timer);}
};
let scanNotice=false,scanPreviousFinish=null;
let discoveryStarted=false,discovering=false;
function configAlert(message){
 let box=$('config-alert');if(!box){box=document.createElement('dialog');box.id='config-alert';box.setAttribute('aria-labelledby','config-alert-title');box.innerHTML='<h2 id="config-alert-title">请确认课程配置</h2><p></p><button type="button">知道了</button>';document.body.append(box);box.querySelector('button').onclick=()=>{if(box.close)box.close();else box.removeAttribute('open');};}
 box.querySelector('p').textContent=message;if(!box.open){if(box.showModal)box.showModal();else box.setAttribute('open','');}
}
async function discoverCourses(automatic=false){
 if(discovering)return;if(editing&&!automatic){configAlert('请先保存正在编辑的配置，再重新检测课程。');return;}
 discovering=true;guide?.detecting(true);guide?.message('正在读取签到系统。若需要登录，请先打开上方签到系统链接完成登录，再回来重试。');$('redetect').disabled=true;$('redetect').textContent='正在检测课程…';notice('正在读取签到页面最近 7 天的课程，请保持学校账号已登录…');
 try{
  const result=await request({type:'redetect'});if(!result.courses?.length)throw new Error('最近 7 天未发现课程，请确认签到页面已登录，或手动添加课程。');
  if(editing)throw new Error('检测完成，但你正在编辑配置。请先保存，再重新检测以免覆盖改动。');
  const draft={...latest.settings,courses:[...new Set([...(latest.settings?.courses||[]),...result.courses])],schedules:{...latest.settings?.schedules,...result.schedules}};
  $('courses').replaceChildren();for(const course of draft.courses)courseRule(course,draft);editing=true;guide?.message('课程检测完成。请在下方选择各课程来源并核对课表，点击保存全部设置完成配置。');
  notice(`已检测到 ${result.courses.length} 门课程。请为每门课选择签到码来源，核对课表后保存。`);
  configAlert(`已生成可编辑的课程与课表，请选择邮件、Moodle 或两者，并填写对应来源后保存。${(result.issues||[]).join('；')}`);
 }catch(error){const detail=/登录|账号|页面|tab|fetch|权限/i.test(error.message)?'无法确认签到系统登录状态或读取课程。请点击“打开签到系统并登录”，使用刚填写的学校账号完成登录；确认姓名一致，再回到这里重试。原始信息：'+error.message:error.message;guide?.message(detail,true);notice(detail,'error');configAlert(detail);}finally{guide?.detecting(false);discovering=false;$('redetect').disabled=false;$('redetect').textContent='重新检测课程';}
}
let observedRun=false,lastResult=null;
let selectedRecordCourse='';
function recordWeek(record){
 const sourceWeek=String(record.subject||'').match(/\bweek\s*(\d{1,2})\b/i);
 if(sourceWeek)return `${(record.date||'').slice(0,4)} · Week ${Number(sourceWeek[1])}（来源标注）`;
 const date=new Date((record.date||'')+'T12:00:00Z');if(Number.isNaN(date.getTime()))return '日期待核对';
 const monday=new Date(date);monday.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));
 const sunday=new Date(monday);sunday.setUTCDate(monday.getUTCDate()+6);
 const thursday=new Date(monday);thursday.setUTCDate(monday.getUTCDate()+3);
 const week=Math.ceil((((thursday-Date.UTC(thursday.getUTCFullYear(),0,1))/86400000)+1)/7);
 return `Week ${week}（自然周） · ${monday.toISOString().slice(0,10)} — ${sunday.toISOString().slice(0,10)}`;
}
function showResult(state){
 const status=state.status||{},summary=status.summary||{},confirm=summary.needsConfirmation??(!(status.counts?.records)||state.settings?.courses?.some(c=>!state.settings.schedules?.[c]?.length));
 let box=$('result-dialog');if(!box){box=document.createElement('dialog');box.id='result-dialog';box.setAttribute('aria-labelledby','result-title');box.innerHTML='<div id="result-success-icon" aria-hidden="true" hidden><svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h2 id="result-title"></h2><p id="result-message"></p><ul id="result-records"></ul><div id="result-login-links" class="setup-links" hidden><a href="https://attendance.monash.edu.my/student/Units.aspx" target="_blank" rel="noreferrer">登录签到系统 ↗</a><a href="https://mail.google.com/" target="_blank" rel="noreferrer">登录 Gmail ↗</a><a href="https://learning.monash.edu/" target="_blank" rel="noreferrer">登录 Moodle ↗</a></div><div class="result-actions"><button id="result-edit" type="button">核对课程配置</button><button id="result-close" type="button">确认</button></div>';document.body.append(box);const close=()=>{if(box.close)box.close();else box.removeAttribute('open');};$('result-close').onclick=close;$('result-edit').onclick=()=>{close();document.querySelector('.courses-card').scrollIntoView?.({behavior:'smooth'});document.querySelector('[data-field="course"]')?.focus();};}
 $('result-success-icon').hidden=Boolean(status.error)||!(summary.submitted||summary.allCompleted);
 $('result-title').textContent=status.error?'签到未全部完成':summary.submitted?'签到成功':summary.allCompleted?'课程已全部签到':'签到流程已完成';
 $('result-message').textContent=status.error?(status.message||'请查看运行明细并核对配置。'):`${summary.submitted?`本轮已确认 ${summary.submitted} 场签到成功。`:'本轮签到流程已完成。'}${confirm?'请确认课程、日期、星期、时间和组别；未填写课表或未检测到数据，不代表已经签到成功。':status.message||''}`;
 if(summary.issues?.length)$('result-message').textContent+=' '+summary.issues.join('；');
 $('result-records').replaceChildren();for(const course of summary.courses||[]){const li=document.createElement('li');li.className='course-result';const title=document.createElement('strong'),detail=document.createElement('span');title.textContent=course.course;detail.textContent=course.reason;li.append(title,detail);$('result-records').append(li);}for(const r of summary.records||[]){const li=document.createElement('li');li.textContent=`${r.course} · ${r.date} ${weekday(r.date)} ${r.time||''} · ${r.type||''} ${r.group||''} · ${labels[r.status]||r.status||''}`;$('result-records').append(li);}
 if(!summary.records?.length&&!summary.courses?.length&&!status.error){const li=document.createElement('li');li.textContent='暂无可确认的近期场次，请核对课表及签到码来源。';$('result-records').append(li);}
 $('result-login-links').hidden=!status.error;$('result-edit').hidden=!confirm&&!status.error;$('result-close').textContent=confirm?'已核对，关闭':'知道了';if(!box.open){if(box.showModal)box.showModal();else box.setAttribute('open','');}
}
let noticeTimer;
function notice(message,kind='general'){
 clearTimeout(noticeTimer);scanNotice=kind==='scan';const target=$('notice');target.hidden=!message;target.textContent=message;target.dataset.tone=['success','error','warning'].includes(kind)?kind:'info';target.setAttribute('role',kind==='error'?'alert':'status');
 if(message&&kind!=='scan'&&!/^正在/.test(message)){noticeTimer=setTimeout(()=>{target.hidden=true;target.textContent='';},5000);noticeTimer.unref?.();}
}
function weekday(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return '';const day=new Date(date+'T12:00:00Z');return Number.isNaN(day.getTime())?'':['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][day.getUTCDay()];}
let helpId=0;
function fieldHelp(root){
 const descriptions={'source-mode':'选择签到码来源，只显示并使用对应配置。两者都选时先查邮件，再查 Moodle。',course:'填写学校课程代码，用于匹配邮件、课程页面及签到场次。',sender:'填写后从 Gmail 查找该发件人的签到邮件。留空则不查该课程邮件；学校邮箱只用于登录身份。',keyword:'邮件主题必须包含此文字；留空时使用课程代码。',urls:'填写 Moodle 课程、Week 栏目或公告网址，每行一个。两种来源都填时先查 Gmail，再从 Moodle 补齐缺少的场次。', 'weekly-count':'自动检测或手动填写。默认无需填写：先从签到页面读取最近 7 天的场次并保存成固定周课表，再查找待签到场次的签到码。信息不全或组别不唯一时请确认；也可手动填写课表。已设课表时，已完成或已取得有效签到码的场次不再查询。',weekday:'选择该场次每周上课的星期。',time:'按马来西亚时间（UTC+8）填写。未到上课时间的场次不会提前搜索，超过 7 天的课程不补签。',type:'可选，填写签到系统中的活动类型，例如 Studio、Seminar、Workshop 或 Applied。',group:'可选，填写你自己的组别，例如 01 或 01-P1；填写后只匹配该组别。',email:'只填写 4 个英文字母加 4 个数字，后缀固定为 @student.monash.edu。学校邮箱只用于核对签到系统登录身份。每门课的邮件来源请在 邮件发件人邮箱中配置。',name:'填写学校签到系统显示的姓名，用于核对登录身份。',interval:'自动运行的检查间隔。保存并开启后可关闭本页面；Chrome 必须运行，电脑睡眠时不会检查。',year:'用于课程页面的年份参考；年份无法可靠确定的签到码不会自动提交。','mail-query':'所有课程共用的 Gmail 检索关键词，留空可扩大检索范围。'};
 for(const input of root.querySelectorAll('input,select,textarea')){
  const key=input.dataset.field||input.id;if(!['sender','urls','weekly-count','mail-query','email','name'].includes(key))continue;const text=descriptions[key],label=input.closest('label');if(!text||!label||label.querySelector('.help-button'))continue;
  const wrap=document.createElement('span');wrap.className='help-wrap';const button=document.createElement('button'),tip=document.createElement('span');button.type='button';button.className='help-button';button.textContent='?';button.setAttribute('aria-label','查看字段说明');tip.id='field-help-'+(++helpId);tip.className='tooltip';tip.setAttribute('role','tooltip');tip.textContent=text;button.setAttribute('aria-describedby',tip.id);button.addEventListener('click',e=>e.preventDefault());wrap.append(button,tip);label.insertBefore(wrap,input.closest('.school-email-field')||input);
 }
}
const elapsed=ms=>{const seconds=Math.max(0,Math.floor(ms/1000)),minutes=Math.floor(seconds/60);return `${minutes}:${String(seconds%60).padStart(2,'0')}`;};
const timestamp=value=>typeof value==='number'?value:Date.parse(value)||0;
function renderProgress(status={}){
 const now=Date.now(),context=status.context||{},parts=[context.course,context.subject,context.page?`第 ${context.page} 页`:null].filter(Boolean);
 $('run-context').textContent=parts.join(' · ')||(status.running?'正在准备下一步…':status.finishedAt?(status.error?'本轮已停止，请查看上方原因':'本轮检查已结束'):'尚未开始处理');if(/^https:\/\//.test(context.sourceUrl||'')){const a=document.createElement('a');a.href=context.sourceUrl;a.target='_blank';a.rel='noreferrer';a.textContent=' · 查看当前来源 ↗';$('run-context').append(a);}
 const startedAt=timestamp(status.startedAt),stepStartedAt=timestamp(status.stepStartedAt),updatedAt=timestamp(status.updatedAt),finishedAt=timestamp(status.finishedAt);const timing=[];if(startedAt)timing.push(`总用时 ${elapsed((status.running?now:finishedAt||now)-startedAt)}`);if(status.running&&stepStartedAt)timing.push(`当前步骤 ${elapsed(now-stepStartedAt)}`);if(updatedAt)timing.push(`${Math.max(0,Math.floor((now-updatedAt)/1000))} 秒前更新`);$('run-timing').textContent=timing.join(' · ');
 const keys=['pages','messages','images','cached','records','skipped'],counts=status.counts||{};[...$('run-counts').querySelectorAll('dd')].forEach((node,index)=>node.textContent=String(counts[keys[index]]||0));
 $('run-events').replaceChildren();for(const event of (status.events||[]).slice(-8).reverse()){const li=document.createElement('li'),time=document.createElement('time');time.textContent=event.at?new Date(event.at).toLocaleTimeString('zh-CN',{hour12:false}):'—';li.append(time,document.createTextNode(event.message||'运行状态已更新'));const url=event.context?.sourceUrl;if(/^https:\/\//.test(url||'')){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noreferrer';a.textContent='查看来源 ↗';li.append(a);}$('run-events').append(li);}if(!$('run-events').children.length){const li=document.createElement('li');li.textContent='暂无运行明细';$('run-events').append(li);}
}
function renderHealth(service={}){const stage=service.stage||'';$('health').textContent=service.busy||['recognizing','running','busy'].includes(stage)?'正在识别':service.binaryReady?'就绪':'尚未启动（识别图片时自动启动）';}
function scheduleRow(value={}){
 const row=document.createElement('div');row.className='schedule-row';row.innerHTML='<label>星期<select data-field="weekday" required><option value="">请选择</option><option value="1">星期一</option><option value="2">星期二</option><option value="3">星期三</option><option value="4">星期四</option><option value="5">星期五</option><option value="6">星期六</option><option value="7">星期日</option></select></label><label>时间（UTC+8）<input data-field="time" type="time" required></label><label>活动类型（可选）<input data-field="type" placeholder="例如 Workshop"></label><label>组别（可选）<input data-field="group" placeholder="例如 01"></label>';
 row.querySelector('[data-field="weekday"]').value=value.weekday?String(value.weekday):'';row.querySelector('[data-field="time"]').value=value.time||'';row.querySelector('[data-field="type"]').value=value.type||'';row.querySelector('[data-field="group"]').value=value.group||'';fieldHelp(row);return row;
}
function syncSaveButton(){document.querySelector('#settings button[type=submit]').hidden=!$('courses').children.length;}
function courseRule(code='',cfg={}){
 const rule=document.createElement('div');rule.className='course-rule';
 rule.innerHTML='<div class="rule-head"><label>课程代码<input data-field="course" required placeholder="例如 ABC1234"></label><label>签到码来源<select data-field="source-mode" required><option value="">请选择签到码来源</option><option value="email">邮件</option><option value="moodle">Moodle</option><option value="both">邮件和 Moodle</option></select></label><button type="button" class="subtle">移除</button></div><div class="form-pair mail-fields"><label>邮件发件人邮箱<input data-field="sender" type="email" placeholder="例如 teacher@example.edu"></label><label>邮件主题中包含<input data-field="keyword" placeholder="默认使用课程代码"></label></div><label class="moodle-fields">Moodle 课程、Week 栏目或公告网址<textarea data-field="urls" rows="2" placeholder="每行一个网址，最多 3 个"></textarea></label><details class="schedule-details"><summary>课程场次</summary><label class="weekly-count">每周场次<select data-field="weekly-count"></select></label><div class="schedule-rows"></div><small>课表按马来西亚时间（UTC+8）运行。默认自动读取签到页面的待签到场次，无需填写每周课表。</small></details>';
 rule.querySelector('[data-field="course"]').value=code;rule.querySelector('[data-field="sender"]').value=cfg.senders?.[code]||'';rule.querySelector('[data-field="keyword"]').value=cfg.subjectKeywords?.[code]||code;rule.querySelector('[data-field="urls"]').value=(cfg.moodleUrls?.[code]||[]).join('\n');
 const sourceMode=rule.querySelector('[data-field="source-mode"]'),sender=rule.querySelector('[data-field="sender"]'),urls=rule.querySelector('[data-field="urls"]');
 sourceMode.value=sender.value?(urls.value?'both':'email'):(urls.value?'moodle':'');
 const showSource=()=>{const mail=['email','both'].includes(sourceMode.value),moodle=['moodle','both'].includes(sourceMode.value);rule.querySelector('.mail-fields').hidden=!mail;rule.querySelector('.moodle-fields').hidden=!moodle;for(const field of rule.querySelectorAll('.mail-fields input'))field.disabled=!mail;sender.required=mail;urls.disabled=!moodle;urls.required=moodle;};
 sourceMode.addEventListener('change',()=>{showSource();editing=true;});showSource();
 const count=rule.querySelector('[data-field="weekly-count"]');for(let i=0;i<=14;i++){const option=document.createElement('option');option.value=String(i);option.textContent=i?`${i} 场`:'自动检测（无需填写）';count.append(option);}const rows=rule.querySelector('.schedule-rows'),schedule=cfg.schedules?.[code]||[];count.value=String(schedule.length);const details=rule.querySelector('.schedule-details'),updateSummary=()=>{details.querySelector('summary').textContent=Number(count.value)?`课程场次 · 每周 ${count.value} 场`:'课程场次 · 自动检测';};updateSummary();schedule.forEach(item=>rows.append(scheduleRow(item)));count.addEventListener('change',()=>{const wanted=Number(count.value);while(rows.children.length>wanted)rows.lastElementChild.remove();while(rows.children.length<wanted)rows.append(scheduleRow());updateSummary();details.open=true;editing=true;});
 rule.querySelector('button').addEventListener('click',()=>{rule.remove();editing=true;syncSaveButton();});fieldHelp(rule);$('courses').append(rule);syncSaveButton();
}
function render(state,settings=false){
  latest=state;guide?.update(state);
  const config=state.settings||{},status=state.status||{};
  if(status.running)observedRun=true;
  if(!status.running&&status.finishedAt&&status.finishedAt!==lastResult&&(observedRun||(scanPending&&status.finishedAt!==scanPreviousFinish)||scanNotice&&status.finishedAt!==scanPreviousFinish)){lastResult=status.finishedAt;observedRun=false;showResult(state);}
  if(scanNotice){if(status.running)notice(status.message||'正在签到…','scan');else if(status.finishedAt&&status.finishedAt!==scanPreviousFinish)notice(status.error?'签到结束：'+(status.message||'处理失败，请查看明细'):'签到流程完成：'+(status.message||'本轮已结束'),status.error?'error':status.summary?.needsConfirmation?'warning':'success');}
  $('mode').textContent=config.enabled?'自动运行已开启':'自动运行已暂停';$('mode').classList.toggle('on',Boolean(config.enabled));
  const configured=Boolean(config.email&&config.name&&(config.courses||[]).length);$('status').textContent=!configured&&!status.running?'请先填写邮箱、姓名和至少一门课程':status.message||'等待首次检查';
  renderProgress(status);if(status.service)renderHealth(status.service);if(status.running&&healthWarning){healthWarning=false;notice('');}
  $('last-run').textContent=status.running?'正在处理，请稍候':status.finishedAt?'最近检查：'+new Date(status.finishedAt).toLocaleString('zh-CN'):'开启后，工具将按设定间隔自动检查。';
  $('scan').disabled=Boolean(status.running)||scanPending;$('scan').textContent=status.running?'正在签到…':scanPending?'正在请求…':editing?'保存并立即签到':'立即签到';
  if(settings&&!editing){$('enabled').checked=Boolean(config.enabled);$('email').value=emailPrefix(config.email);$('name').value=config.name||'';$('interval').value=String([1440,4320,7200,10080].includes(config.intervalMinutes)?config.intervalMinutes:1440);$('year').value=String(config.academicYear||new Date().getFullYear());$('mail-query').value=config.mailQuery??'attendance';$('courses').replaceChildren();for(const c of config.courses||[])courseRule(c,config);savedFormSnapshot=formSnapshot();}
  syncSaveButton();if(status.archiveDir)$('archive').textContent=status.archiveDir;
  const records=[...(state.records||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const courses=[...new Set(records.map(r=>r.course||'课程待核对'))];if(!courses.includes(selectedRecordCourse))selectedRecordCourse=courses[0]||'';
  $('record-course-tabs').replaceChildren();for(const course of courses){const button=document.createElement('button');button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-selected',String(course===selectedRecordCourse));button.textContent=`${course} (${records.filter(r=>(r.course||'课程待核对')===course).length})`;button.onclick=()=>{selectedRecordCourse=course;render(latest);};$('record-course-tabs').append(button);}
  $('count').textContent=records.length;$('records').replaceChildren();$('empty').hidden=records.length>0;
  const groups=new Map();for(const r of records.filter(r=>(r.course||'课程待核对')===selectedRecordCourse)){const key=recordWeek(r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
  for(const [week,rows] of groups){const heading=document.createElement('tr');heading.className='week-heading';const title=document.createElement('th');title.colSpan=5;title.textContent=week;heading.append(title);$('records').append(heading);
  for(const r of rows){
    const tr=document.createElement('tr');
    const cell=(value,detail)=>{const td=document.createElement('td');td.textContent=value;if(detail){const small=document.createElement('small');small.textContent=detail;td.append(small);}tr.append(td);return td;};
    cell(r.date?`${r.date} ${weekday(r.date)}`:'日期待核对',r.time||'');cell(r.course||'',`${r.type||''} ${r.group||''}`);
    const code=cell(''),strong=document.createElement('strong');strong.textContent=r.code||'—';code.append(strong);
    if(r.code){const copy=document.createElement('button');copy.type='button';copy.className='copy-code';copy.textContent='复制';copy.setAttribute('aria-label','复制签到码');copy.addEventListener('click',async()=>{copy.disabled=true;copy.textContent='复制中…';try{await window.navigator.clipboard.writeText(r.code);copy.textContent='已复制';notice('签到码已复制。','success');}catch{copy.textContent='重试复制';notice('复制失败，请选中签到码手动复制。','error');}finally{copy.disabled=false;}});code.append(copy);}
    const statusCell=cell(''),badge=document.createElement('span');badge.className='state '+r.status;badge.textContent=labels[r.status]||r.status;statusCell.append(badge);
    const source=cell('',r.reason||'');
    if(/^https:\/\/(mail\.google\.com|learning\.monash\.edu)\//.test(r.sourceUrl||'')){const link=document.createElement('a');link.href=r.sourceUrl;link.textContent=r.sourceUrl.includes('learning.monash.edu')?'查看 Moodle ↗':'查看邮件 ↗';link.target='_blank';link.rel='noreferrer';source.prepend(link);}
    if(r.imagePath){const detail=document.createElement('small');detail.textContent=r.imagePath;source.append(detail);}
    $('records').append(tr);
  }
  }
}
async function refresh(settings=false){if(refreshing){refreshQueued=true;refreshSettings||=settings;return;}refreshing=true;try{const state=await request({type:'status'});render(state,settings);if(state.discoveryAvailable&&!guide?.active&&state.settings?.autoDiscover!==false&&!state.settings?.courses?.length&&!discoveryStarted&&!editing){discoveryStarted=true;if(window.confirm('是否检测课程信息？确认后将打开已登录的签到页面，读取最近 7 天的课程并生成可编辑课表。此步骤不会提交签到。'))void discoverCourses(true);}}catch(e){notice(e.message,'error');}finally{refreshing=false;if(refreshQueued){const nextSettings=refreshSettings;refreshQueued=false;refreshSettings=false;void refresh(nextSettings);}}}
async function health(manual=false){if(healthPending){if(manual)notice('正在检查识别服务，请稍候（最多等待 10 秒）。');return;}healthPending=true;$('check-health').disabled=true;$('check-health').textContent='正在检查识别服务…';if(manual)notice('正在检查识别服务（最多等待 10 秒）…');try{const r=await request({type:'health'});renderHealth(r);guide?.health(r);healthWarning=false;if(manual)notice(r.binaryReady?'识别服务检查通过，可以识别图片。':'识别服务未就绪，请运行 Mac 识别服务安装命令。',r.binaryReady?'success':'warning');if(r.archiveDir)$('archive').textContent=r.archiveDir;}catch(e){renderHealth({});guide?.health(null,e.message);healthWarning=true;notice(e.message,'error');}finally{healthPending=false;$('check-health').disabled=false;$('check-health').textContent='检查识别服务';}}
function readFormSettings(){const courses=[],senders={},subjectKeywords={},moodleUrls={},schedules={};for(const row of $('courses').children){const value=f=>row.querySelector(`[data-field="${f}"]`).value.trim();const c=value('course').toUpperCase();if(courses.includes(c))throw new Error('课程代码重复：'+c);if(!value('source-mode'))throw new Error(c+' 请选择签到码来源');courses.push(c);senders[c]=value('source-mode')==='moodle'?'':value('sender');subjectKeywords[c]=value('keyword')||c;moodleUrls[c]=value('source-mode')==='email'?[]:value('urls').split('\n').map(s=>s.trim()).filter(Boolean);schedules[c]=[...row.querySelectorAll('.schedule-row')].map(item=>{const field=name=>item.querySelector(`[data-field="${name}"]`).value.trim(),weekday=Number(field('weekday')),time=field('time');if(!weekday||!time)throw new Error(`${c||'该课程'} 请填写每个场次的星期和时间`);return {weekday,time,type:field('type'),group:field('group')};});}return {email:schoolEmail($('email').value),name:$('name').value,enabled:$('enabled').checked,intervalMinutes:Number($('interval').value),academicYear:Number($('year').value),mailQuery:$('mail-query').value,courses,senders,subjectKeywords,moodleUrls,schedules};}
function hasUnsavedChanges(){if(formSnapshot()===savedFormSnapshot)return false;try{const actual=normalizeSettings(latest.settings||DEFAULTS,readFormSettings(),Boolean(latest.records?.length));const stored=normalizeSettings(latest.settings||DEFAULTS,{},Boolean(latest.records?.length));return JSON.stringify(actual)!==JSON.stringify(stored);}catch{return true;}}
$('settings').addEventListener('input',()=>{editing=hasUnsavedChanges();if(!scanPending&&!latest.status?.running)$('scan').textContent=editing?'保存并立即签到':'立即签到';});
$('save-general').addEventListener('click',()=>$('settings').requestSubmit());
$('settings').addEventListener('submit',async e=>{e.preventDefault();if(saving)return;saving=true;$('save-general').disabled=true;$('save-general').textContent='正在保存…';const button=$('settings').querySelector('button[type=submit]');button.disabled=true;button.textContent='正在保存…';notice('正在保存设置…');try{await request({type:'settings',settings:readFormSettings()});editing=false;notice('设置已保存。','success');await refresh(true);}catch(e){notice(e.message,'error');configAlert(e.message);}finally{saving=false;$('save-general').disabled=false;$('save-general').textContent='保存设置';button.disabled=false;button.textContent='保存全部设置';}});
$('redetect').addEventListener('click',()=>{if(window.confirm('重新检测最近 7 天的课程和课表？检测结果会填入编辑区，保存后替换原课表。'))void discoverCourses();});
$('clear-courses').addEventListener('click',async()=>{if(!window.confirm('确定清空所有课程、来源、课表及收集记录吗？此操作不可撤销，自动运行会暂停。本机已归档的图片文件不受影响。'))return;const button=$('clear-courses');button.disabled=true;notice('正在清空课程…');try{await request({type:'clearCourses'});discoveryStarted=true;editing=false;await refresh(true);notice('所有课程和收集记录已清空，自动运行已暂停。','success');}catch(error){notice(error.message,'error');configAlert(error.message);}finally{button.disabled=false;}});
$('add-course').addEventListener('click',()=>{courseRule();editing=true;});
$('import-settings').addEventListener('click',()=>{$('settings-file').click();});
$('settings-file').addEventListener('change',async()=>{
  const file=$('settings-file').files?.[0];if(!file)return;
  try{
    if(file.size>131072)throw new Error('配置文件超过 128 KB');
    const settings=parseConfiguration(await file.text(),latest.settings||DEFAULTS,Boolean(latest.records?.length));
    await request({type:'settings',settings});
    editing=false;await refresh(true);notice('个人配置已导入并保存。','success');
  }catch(error){notice(error.message,'error');}finally{$('settings-file').value='';}
});
$('scan').addEventListener('click',async()=>{if(scanPending||saving)return;editing=hasUnsavedChanges();scanPending=true;$('scan').disabled=true;$('scan').textContent='正在请求…';scanPreviousFinish=latest.status?.finishedAt||null;notice('正在请求后台开始签到…','scan');try{if(editing){notice('正在保存设置，完成后立即签到…','scan');await request({type:'settings',settings:readFormSettings()});editing=false;await refresh(true);}await request({type:'scan'});if(scanNotice)notice('后台已收到签到请求，正在等待运行状态…','scan');await refresh();}catch(e){notice(e.message,'error');}finally{scanPending=false;$('scan').disabled=Boolean(latest.status?.running);$('scan').textContent=latest.status?.running?'正在签到…':editing?'保存并立即签到':'立即签到';}});
$('check-health').addEventListener('click',()=>health(true));
$('settings').addEventListener('invalid',event=>{const input=event.target,label=input.closest('label'),text=label?.firstChild?.textContent?.trim()||'配置字段';const message='无法保存：请检查'+text+'，'+input.validationMessage;input.closest('details')?.setAttribute('open','');notice(message,'warning');configAlert(message);},true);
fieldHelp($('settings'));
$('export').addEventListener('click',()=>{const fields=['date','time','course','type','group','code','status','reason','sourceUrl','imagePath'];const escape=value=>'"'+String(value??'').replace(/"/g,'""').replace(/^[=+@-]/,"'$&")+'"';const csv='\uFEFF'+[fields,...(latest.records||[]).map(r=>fields.map(f=>r[f]))].map(row=>row.map(escape).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='签到记录.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
configureEmailInput($('email'));
guide=createSetupGuide({request,refresh,detect:()=>discoverCourses(true),checkHealth:()=>health(true),reload:()=>window.location.reload(),reset:async()=>{if(!window.confirm('确定清空助手的姓名、邮箱、课程、签到记录和浏览器内缓存吗？此操作不可撤销，自动运行会停止。'))return;try{await request({type:'reset'});window.location.reload();}catch(error){configAlert(error.message);}}});
setInterval(()=>{if(guide.needsHealth()&&!healthPending)void health();},5000);
render({settings:DEFAULTS,setupGuide:true},true);globalThis.chrome?.storage?.onChanged?.addListener((changes,area)=>{if(area==='local'&&(changes.status||changes.settings))void refresh(Boolean(changes.settings));});setInterval(()=>renderProgress(latest.status||{}),1000);setInterval(()=>refresh(),2000);void refresh(true);if(globalThis.chrome?.runtime?.id)void health();
