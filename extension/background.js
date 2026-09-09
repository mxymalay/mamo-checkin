import {runSummaryRecords,summaryFingerprint} from './run-summary.js';
import {syncSessionRecords} from './session-records.js';
import {checkinResult} from './checkin-result.js';
import {parseActivity,siteDate,matchActivity} from './core.js';
import {gmailAdapter} from './gmail.js';
import {attendanceAdapter} from './attendance.js';
import {submitPending} from './runner.js';
import {cleanupOwnedTabs,processCollectedMessages,reconcileScanAlarm,recordDiagnostic} from './workflow.js';
import {moodleAdapter} from './moodle.js';
import {localService} from './native-service.js';
import {DEFAULTS,normalizeSettings,normalizeIdentity,gmailQuery} from './settings.js';
import {crawlMoodle} from './moodle-frontier.js';
import {createRunProgress} from './progress.js';
import {scanSinceDate,messageOutsideWindow,outsideAttendanceWindow} from './recent-window.js';
import {courseNeedsSource,recordInSchedule,expectedSessions,detectSessions,detectWeeklySchedule} from './timetable.js';
import {getImage} from './image-download.js';
import {LOGIN_REQUIRED,readAuthenticatedPage} from './login-state.js';

const UNITS='https://attendance.monash.edu.my/student/Units.aspx';
let activeRun=null,activeDetection=null;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function loadState(){const s=await chrome.storage.local.get(['settings','records','seenMessages','seenThreads','moodleProgress','nextCourse','diagnostics','status','ownedTabIds']);return {...s,settings:{...DEFAULTS,...s.settings},records:s.records||[],seenMessages:s.seenMessages||{},seenThreads:s.seenThreads||{},moodleProgress:s.moodleProgress||{},diagnostics:s.diagnostics||[],ownedTabIds:s.ownedTabIds||[]};}
async function schedule(){const s=await loadState();await reconcileScanAlarm(s.settings,chrome.alarms);}
async function runFunction(tabId,func,command,args={}){const read=async()=>{const results=await chrome.scripting.executeScript({target:{tabId},func,args:[command,args]});return results[0]?.result;};return readAuthenticatedPage(chrome.tabs,tabId,func===gmailAdapter?'Gmail':func===moodleAdapter?'Moodle':'Attendance',read);}
async function poll(read,predicate,timeout=25000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{last=await read();if(predicate(last))return last;}catch(e){if(e.message?.includes(LOGIN_REQUIRED))throw e;last=e;}await delay(600);}throw last instanceof Error?last:new Error('页面没有及时加载，请确认 Chrome 中的登录状态');}
async function navigate(tabId,url){await chrome.tabs.update(tabId,{url});await poll(()=>chrome.tabs.get(tabId),t=>t.status==='complete');}
async function createOwnedTab(state,url){const tab=await chrome.tabs.create({url,active:false});state.ownedTabIds.push(tab.id);await chrome.storage.local.set({ownedTabIds:state.ownedTabIds});return tab.id;}
async function cleanOwnedTabs(state){await cleanupOwnedTabs(state,chrome.tabs,ownedTabIds=>chrome.storage.local.set({ownedTabIds}));}
async function save(state,native){
  // Chrome storage is the durable submission checkpoint. Downloading an extra
  // snapshot can fail independently without stranding a not-yet-clicked row.
  await chrome.storage.local.set({records:state.records,seenMessages:state.seenMessages,seenThreads:state.seenThreads,diagnostics:state.diagnostics});
  // The extra JSON download is written once at run end; submission checkpoints
  // and every extracted code are already durable in extension storage.
}
const collectionAdapter=(state,native,readImage=getImage)=>({getImage:readImage,ocr:(payload,meta)=>native.call({op:'ocr',...payload,meta}),save:()=>save(state,native),saveDiagnostics:()=>chrome.storage.local.set({diagnostics:state.diagnostics}),recentOnly:true,progress:event=>state.progress(event),shouldContinue:msg=>courseNeedsSource(state,msg.course)});
async function diagnose(state,details){
 if(/登录|账号|tab|页面没有及时加载/i.test(details.error||'')&&!details.error.includes(LOGIN_REQUIRED)){
  const site=['gmail','thread'].includes(details.scope)?'Gmail':details.scope==='moodle'?'Moodle':'签到系统';
  details={...details,error:`${details.error}。请在同一个 Chrome 配置文件打开 ${site} 并完成登录，确认学校邮箱和姓名与设置一致，再返回助手重试。`};
 }
 await state.progress?.({message:details.error,level:'error',context:{course:details.course,subject:details.subject,sourceUrl:details.sourceUrl}});await recordDiagnostic(state,details,()=>chrome.storage.local.set({diagnostics:state.diagnostics}));
}
async function collectMail(state,native){
  const cfg={...state.settings,courses:state.settings.courses.filter(course=>courseNeedsSource(state,course))};
  // authuser binds the new tab to the configured account; DOM still verifies it.
  const search=gmailQuery(cfg);if(!search)return;
  const mailStarted=Date.now(),deadline=mailStarted+100000;
  const base=`https://mail.google.com/mail/?authuser=${encodeURIComponent(cfg.email)}`;
  const searchUrl=base+'#search/'+encodeURIComponent(search);
  await state.progress({message:'正在打开 Gmail 最近 7 天的邮件（页面最多等待 25 秒）',context:{sourceUrl:searchUrl}});
  const tab=await createOwnedTab(state,searchUrl);
  const initial=await poll(()=>runFunction(tab,gmailAdapter,'list',cfg),r=>r&&!r.loading);
  const pending=initial.threads.filter(thread=>state.seenThreads[thread.id]!==thread.lastMessageId);
  if(pending.length>40)await diagnose(state,{scope:'gmail',error:'本轮最多处理 40 个新会话，其余下轮继续'});
  await state.progress({message:`Gmail 列表读取完成（${((Date.now()-mailStarted)/1000).toFixed(1)} 秒），${pending.length} 个待检查会话`,increment:{pages:1}});
  for(const [threadIndex,thread] of pending.slice(0,40).entries()){
    if(Date.now()>deadline){await diagnose(state,{scope:'gmail',error:'本轮邮件检查达到时间上限，其余会话下轮继续'});break;}
    if(state.seenThreads[thread.id]===thread.lastMessageId||!courseNeedsSource(state,thread.course))continue;
    try{
      if(!thread.lastMessageId)throw new Error('邮件会话缺少最新消息标识');
      await state.progress({message:`检查邮件会话 ${threadIndex+1}/${Math.min(pending.length,40)}（最多等待 25 秒）`,context:{subject:thread.subject,sourceUrl:searchUrl}});
      if(threadIndex>0)await navigate(tab,searchUrl);
      await poll(()=>runFunction(tab,gmailAdapter,'list',cfg),r=>r?.threads?.some(t=>t.id===thread.id&&t.lastMessageId===thread.lastMessageId));
      await runFunction(tab,gmailAdapter,'openThread',{...cfg,threadId:thread.id});
      await state.progress({message:'正在等待邮件内容（最多等待 25 秒）'});
      const messageConfig={...cfg,expectedSubject:thread.subject,expectedLastMessageId:thread.lastMessageId};
      await poll(()=>runFunction(tab,gmailAdapter,'messages',messageConfig),r=>r&&!r.loading);
      await runFunction(tab,gmailAdapter,'expand',cfg);
      await state.progress({message:'正在展开并读取邮件正文（最多等待 25 秒）'});
      const data=await poll(()=>runFunction(tab,gmailAdapter,'messages',{...messageConfig,requireBodiesReady:true}),r=>r&&!r.loading&&r.bodiesReady);
      await processCollectedMessages(state,data.messages,collectionAdapter(state,native,url=>getImage(url,tab)));
      if(data.bodiesReady&&data.messages.every(msg=>state.seenMessages[msg.messageId])){state.seenThreads[thread.id]=thread.lastMessageId;await save(state,native);}
    }catch(error){
      await diagnose(state,{scope:'thread',threadId:thread.id,subject:thread.subject,error:error?.message||String(error)});
    }
  }
}
async function collectMoodle(state,native){
  const cfg=state.settings,deadline=Date.now()+100000;
  const courses=cfg.courses.filter(c=>cfg.moodleUrls?.[c]?.length&&courseNeedsSource(state,c));
  if(!courses.length)return;
  const tab=await createOwnedTab(state,cfg.moodleUrls[courses[state.nextCourse%courses.length||0]][0]);
  const start=state.nextCourse%courses.length||0;
  for(let i=0;i<courses.length;i++){
    if(Date.now()>deadline){await diagnose(state,{scope:'moodle',error:'本轮 Moodle 检查达到时间上限，其余课程下轮继续'});break;}
    const index=(start+i)%courses.length,course=courses[index];
    await crawlMoodle({roots:cfg.moodleUrls[course],previous:state.moodleProgress[course],deadline,maxPages:4,shouldContinue:()=>courseNeedsSource(state,course),version:cfg.academicYear+':recent-v1:'+scanSinceDate(),persist:async progress=>{state.moodleProgress[course]=progress;await chrome.storage.local.set({moodleProgress:state.moodleProgress});},read:async url=>{
      try{
        const pageStarted=Date.now();
        await state.progress({message:'正在加载 Moodle 课程页面（最多等待 25 秒）',context:{course,sourceUrl:url}});
        await navigate(tab,url);
        // A normal SSO round trip may land on the dashboard first.
        const loaded=await chrome.tabs.get(tab);
        if(loaded.url?.startsWith('https://learning.monash.edu/my/'))await navigate(tab,url);
        await state.progress({message:'正在读取 Moodle 页面文字和图片（最多等待 25 秒）'});
        const data=await poll(()=>runFunction(tab,moodleAdapter,'read',{...cfg,course,sinceDate:scanSinceDate()}),r=>r&&!r.loading);
        await state.progress({message:`已读取 Moodle ${data.pageTitle||course}（${((Date.now()-pageStarted)/1000).toFixed(1)} 秒）`,context:{course,subject:data.pageTitle||course,sourceUrl:url},increment:{pages:1,skipped:data.skipped||0}});
        data.messages=data.messages.filter(msg=>!messageOutsideWindow(msg));
        const payloads=new Map();
        for(const msg of data.messages){
          if(!courseNeedsSource(state,course))break;
          if(expectedSessions(cfg,course)!==null){
            // Refresh unresolved scheduled sources, fetching only images actually
            // needed. Native content hashing handles changed and cached bytes.
            await processCollectedMessages(state,[msg],{...collectionAdapter(state,native,image=>getImage(image,tab)),refresh:true});
            continue;
          }
          const versions=[];
          for(const image of msg.images){
            await state.progress({message:'正在检查课程图片是否更新（下载最多 20 秒）'});
            if(!payloads.has(image))try{payloads.set(image,await getImage(image,tab));}catch(error){payloads.set(image,error);}
            const payload=payloads.get(image);
            versions.push(payload instanceof Error?'unavailable':Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(atob(payload.imageBase64),c=>c.charCodeAt(0))))).map(n=>n.toString(16).padStart(2,'0')).join(''));
          }
          const fingerprint=JSON.stringify([msg.sentAt,msg.dateReferenceOnly,msg.dateWindow,msg.textRows,msg.images,versions]);
          const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint)))).map(n=>n.toString(16).padStart(2,'0')).join('');
          msg.messageId+=':'+hash;
          await processCollectedMessages(state,[msg],collectionAdapter(state,native,async image=>{const payload=payloads.get(image);if(payload instanceof Error)throw payload;return payload||getImage(image,tab);}));
        }
        return {links:data.links,priorityLinks:data.priorityLinks};
      }catch(error){await diagnose(state,{scope:'moodle',course,sourceUrl:url,error:error.message});return [];}
    }});
    state.nextCourse=(index+1)%courses.length;await chrome.storage.local.set({nextCourse:state.nextCourse});
  }
}
async function readWebsiteActivities(state,tab){
  await state.progress({message:'正在核对网站已有签到（最多等待 25 秒）',context:{sourceUrl:UNITS}});
  const data=await poll(()=>runFunction(tab,attendanceAdapter,'activities',state.settings),r=>Array.isArray(r?.activities));
  const activities=data.activities.map(a=>({...a,...parseActivity(a.rawText,siteDate(a.dateToken))}));
  state.activities=activities;await state.progress({message:`网站签到状态读取完成（${activities.length} 场）`,increment:{pages:1}});return activities;
}
async function inspectSchedule(state){
  state.settings.detectedSessions=Object.fromEntries(state.settings.courses.filter(c=>!state.settings.schedules?.[c]?.length).map(c=>[c,[]]));state.autoNeedsConfirmation=true;
  state.attendanceTab=await createOwnedTab(state,UNITS);
  await readWebsiteActivities(state,state.attendanceTab);
  state.settings.detectedSessions={};state.autoNeedsConfirmation=false;state.scheduleIssues=[];
  const inferred={};
  for(const course of state.settings.courses){
    if(state.settings.schedules?.[course]?.length){
      if(state.activities.some(a=>a.course===course&&a.state==='available'&&!outsideAttendanceWindow(a)&&!recordInSchedule(state.settings,a))){state.autoNeedsConfirmation=true;const issue=`${course} 网站待签到场次与已保存课表不一致，请核对或重新检测课程`;state.scheduleIssues.push(issue);await state.progress({message:issue,context:{course}});}
      continue;
    }
    const detected=detectSessions(state.activities,course);state.settings.detectedSessions[course]=detected.sessions;
    state.autoNeedsConfirmation||=detected.needsConfirmation;
    const weekly=detectWeeklySchedule(state.activities,course);state.autoNeedsConfirmation||=weekly.needsConfirmation;
    if(weekly.schedule.length&&!weekly.needsConfirmation)inferred[course]=weekly.schedule;
    await state.progress({message:`${course} 自动读取到 ${detected.sessions.length} 场近期待签到课程${detected.needsConfirmation?'；部分信息不完整或组别不唯一，请核对课程配置':''}`,context:{course}});
  }
  if(Object.keys(inferred).length){
    const current=(await loadState()).settings;
    if(current.email===state.settings.email&&current.name===state.settings.name){
      const schedules={...current.schedules};for(const [course,rules] of Object.entries(inferred))if(current.courses.includes(course)&&!schedules[course]?.length)schedules[course]=rules;
      const settings=normalizeSettings(current,{schedules});await chrome.storage.local.set({settings});state.settings.schedules=settings.schedules;
      await state.progress({message:'已将最近 7 天的课程场次保存为固定周课表，下次直接复用'});
    }
  }
  for(const course of state.settings.courses){
    const slots=expectedSessions(state.settings,course);
    if(slots!==null)await state.progress({message:courseNeedsSource(state,course)?`${course} 近 7 天共 ${slots.length} 场，继续查找未完成场次`:`${course} 课表场次已完成或已取得可用码，跳过来源扫描`,context:{course},...(!courseNeedsSource(state,course)&&{increment:{skipped:1}})});
  }
}
async function submit(state,native){
  if(!state.records.some(r=>state.settings.courses.includes(r.course)&&recordInSchedule(state.settings,r)&&!['submitted','expired','review'].includes(r.status)))return;
  const tab=state.attendanceTab??await createOwnedTab(state,UNITS);
  const settingsStillActive=async record=>{const current=await loadState();return (state.manualRun||current.settings.enabled)&&current.settings.email===state.settings.email&&current.settings.name===state.settings.name&&current.settings.courses.includes(record.course)&&!outsideAttendanceWindow(record)&&recordInSchedule(current.settings,record); };
  let firstList=true;
  const list=async()=>{
    await state.progress({message:'正在读取网站签到记录（最多等待 25 秒）',context:{sourceUrl:UNITS}});
    const current=await chrome.tabs.get(tab);
    if(!firstList||current.url!==UNITS)await navigate(tab,UNITS);
    firstList=false;return readWebsiteActivities(state,tab);
  };
  const configuredState={...state,records:state.records.filter(r=>state.settings.courses.includes(r.course)&&recordInSchedule(state.settings,r))};
  await submitPending(configuredState,{list,progress:event=>state.progress(event),beforeAttempt:settingsStillActive,save:()=>save(state,native),submit:async(record,activity)=>{
    const target=new URL(activity.href);
    if(siteDate(target.searchParams.get('d'))!==record.date)throw new Error('签到链接日期不匹配');
    await state.progress({message:`正在核对并填写 ${record.course} ${record.date} ${record.time}`,context:{course:record.course,sourceUrl:activity.href}});
    await navigate(tab,activity.href);
    const form=await poll(()=>runFunction(tab,attendanceAdapter,'form',{}),r=>r?.inputPresent&&r.submitPresent);
    const detail=parseActivity(form.heading,siteDate(new URL(form.url).searchParams.get('d')));
    const expectedDay=String(+record.date.slice(8)),expectedMonth=new Date(record.date+'T12:00:00Z').toLocaleString('en-US',{month:'long',timeZone:'UTC'});
    if(form.url!==activity.href||!matchActivity(record,detail)||!new RegExp(`\\b${expectedDay} ${expectedMonth}\\b`).test(form.heading))throw new Error('表单课程、日期或时间不匹配');
    if(!await settingsStillActive(record))return {entered:false,reason:'自动签到已暂停或账号、课程设置发生变化'};
    await runFunction(tab,attendanceAdapter,'submit',{expectedHeading:form.heading,expectedUrl:form.url,code:record.code});
    await state.progress({message:'签到已提交，正在等待网站确认'});
    await delay(1500);
    await poll(()=>chrome.tabs.get(tab),t=>t.status==='complete');
    return {entered:true};
  }});
}
async function run(manual=false,course=null){
  const state=await loadState();
  const beforeSummary=new Map(state.records.map(r=>[r.id,summaryFingerprint(r)]));
  state.runSubmittedIds=new Set();
  if(course)state.settings={...state.settings,courses:state.settings.courses.filter(c=>c===course)};
  if(!manual&&!state.settings.enabled)return {ok:false,error:'自动运行已暂停'};
  state.manualRun=manual;
  let native;
  const startedAt=new Date().toISOString();
  const progress=createRunProgress(status=>chrome.storage.local.set({status}));
  state.progress=event=>progress.update({...event,...(event.message?{message:event.message.replaceAll(LOGIN_REQUIRED+' ','')}:{})});
  try{
    await state.progress({message:'正在签到：核对最近 7 天的课程'});
    native=await localService({onProgress:state.progress});
    state.diagnostics=[];
    await chrome.storage.local.set({diagnostics:[]});
    await cleanOwnedTabs(state);
    const health=await native.call({op:'ping'});
    if(!health.binaryReady)throw new Error(health.healthError||'识别服务未就绪，请完成安装引导。');
    if(health.engine==='Tesseract'){
      const {ocrCacheRevision}=await chrome.storage.local.get('ocrCacheRevision');
      if(ocrCacheRevision!==health.ocrRevision){
        state.seenMessages={};state.seenThreads={};state.moodleProgress={};
        await chrome.storage.local.set({seenMessages:{},seenThreads:{},moodleProgress:{},ocrCacheRevision:health.ocrRevision});
      }
    }
    await state.progress({message:'正在签到；图片识别会在需要时启动',service:health});
    try{await inspectSchedule(state);}catch(error){await diagnose(state,{scope:'timetable',error:'课表预检查失败，将继续寻找签到码：'+error.message});}
    for(const [scope,collect] of [['gmail',collectMail],['moodle',collectMoodle]])try{await collect(state,native);}catch(error){await diagnose(state,{scope,error:error.message});}
    for(const r of state.records)if(r.status==='ready'&&outsideAttendanceWindow(r)){r.status='expired';r.reason='课程已超过 7 天，不再补签';}
    await state.progress({message:'正在核对最近 7 天的签到记录'});
    await submit(state,native);
    syncSessionRecords(state);
    await save(state,native);
    await state.progress({message:'正在写入本地归档'});
    try{await native.call({op:'archive',records:state.records});}catch(error){await diagnose(state,{scope:'archive',error:'记录已存于扩展，下载归档待重试：'+error.message});}
    const attention=state.records.filter(r=>['review','uncertain','attempting'].includes(r.status)).length;
    const failures=state.diagnostics.length,lastFailure=state.diagnostics.at(-1)?.error;
    const message=failures?`${failures} 项处理失败：${lastFailure?.replaceAll(LOGIN_REQUIRED+' ','')}`:attention?`${attention} 条记录需要核对`:'本轮签到流程已完成';
    const currentRecords=state.records.filter(r=>state.settings.courses.includes(r.course)&&(r.status==='expired'||(!outsideAttendanceWindow(r)&&recordInSchedule(state.settings,r))));
    const notificationRecords=runSummaryRecords(currentRecords,beforeSummary,state.runSubmittedIds);
    const summary={issues:state.scheduleIssues||[],submitted:currentRecords.filter(r=>r.status==='submitted'&&state.runSubmittedIds.has(r.id)).length,detected:currentRecords.length,needsConfirmation:!currentRecords.length||Boolean(state.autoNeedsConfirmation),records:notificationRecords.map(({course,date,time,type,group,status})=>({course,date,time,type,group,status}))};
    summary.courses=state.settings.courses.map(course=>{
      const activities=(state.activities||[]).filter(a=>a.course===course&&!outsideAttendanceWindow(a)&&recordInSchedule(state.settings,a));
      const records=notificationRecords.filter(r=>r.course===course);
      const submitted=records.filter(r=>r.status==='submitted'&&state.runSubmittedIds.has(r.id)).length;
      const completed=0;
      const pending=activities.filter(a=>a.state==='available'&&!currentRecords.some(r=>r.status==='submitted'&&matchActivity(r,a))).length;
      const expired=records.filter(r=>r.status==='expired').length;
      const unresolved=records.filter(r=>['ready','review','uncertain','attempting'].includes(r.status)).length;
      const reason=expired?`已保存记录中有 ${expired} 场已过期，无法补签${submitted?`；本次另有 ${submitted} 场签到成功`:''}`:unresolved?`有 ${unresolved} 场尚未确认签到成功，请核对记录${submitted?`；本次另有 ${submitted} 场签到成功`:''}`:submitted?`本次签到成功 ${submitted} 场${completed?`；网站显示已签到 ${completed} 场`:''}`:completed&&!pending&&!expired&&!unresolved?`网站显示 ${completed} 场已签到，本次无需重复签到或查找签到码`:pending?`有 ${pending} 场等待签到码，暂未找到；可能尚未发布或当前来源未检索到，可稍后重试`:activities.length?'近期场次已关闭，无法补签':state.activities?'未找到最近 7 天内与课表匹配的场次，请核对课表':'未能读取网站签到状态，请确认登录后重试';
      return {course,submitted,completed,pending,expired,unresolved,reason};
    });
    summary.loginRequired=[...new Set(state.diagnostics.filter(d=>d.error?.includes(LOGIN_REQUIRED)).map(d=>d.error.replace(LOGIN_REQUIRED+' ','')))];
    summary.courses=summary.courses.filter(c=>c.submitted||c.pending||c.expired||c.unresolved);
    if(summary.loginRequired.length)for(const c of summary.courses)if(c.pending)c.reason='网站登录未完成，签到码来源尚未检查完整。请先登录，再重试。';
    summary.quiet=!failures&&!summary.issues.length&&!summary.needsConfirmation&&!summary.records.length&&!summary.courses.length;
    summary.allCompleted=summary.quiet;
    if(summary.allCompleted&&!state.autoNeedsConfirmation)summary.needsConfirmation=false;
    const outcome=checkinResult(summary,Boolean(failures));
    await progress.finish({message:outcome.success?outcome.title:outcome.title+'：'+message,error:Boolean(failures)||outcome.tone==='error',diagnostics:state.diagnostics.slice(-5),archiveDir:health.archiveDir,summary});
    await chrome.action.setBadgeText({text:attention||failures?'!':''});
    return {ok:true};
  }catch(e){const error=(e.message||String(e)).replaceAll(LOGIN_REQUIRED+' ','');await progress.finish({message:error,error:true});await chrome.action.setBadgeText({text:'!'});return {ok:false,error};}
  finally{try{await cleanOwnedTabs(state);}catch{}try{await native?.close();}catch{}}
}
function start(manual=false,course=null){if(activeDetection)return Promise.resolve({ok:false,error:'正在重新检测课程，请稍后检查签到'});if(!activeRun)activeRun=run(manual,course).finally(()=>{activeRun=null;});return activeRun;}
async function redetect(){
 const state=await loadState();
 if(!state.settings.email||!state.settings.name)throw new Error('请先在第 2 步填写并保存学校邮箱和姓名，再登录签到系统检测课程');
 try{
  const tab=await createOwnedTab(state,UNITS);
  state.progress=async()=>{};
  const data=await poll(()=>runFunction(tab,attendanceAdapter,'activities',state.settings),r=>Array.isArray(r?.activities));
  state.activities=data.activities.map(a=>({...a,...parseActivity(a.rawText,siteDate(a.dateToken))}));
  const schedules={},issues=[];
  const courses=[...new Set(state.activities.filter(a=>!outsideAttendanceWindow(a)).map(a=>a.course).filter(Boolean))];
  for(const course of courses){const result=detectWeeklySchedule(state.activities,course);if(result.needsConfirmation||!result.schedule.length)issues.push(`${course} 信息不完整、组别冲突或近 7 天没有场次，请核对课表`);else schedules[course]=result.schedule;}
  return {ok:true,courses,schedules,issues};
 }finally{await cleanOwnedTabs(state);}
}
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='scan')void start();});
chrome.runtime.onInstalled.addListener(()=>{void schedule();});
chrome.runtime.onStartup.addListener(()=>{void chrome.storage.local.set({ownedTabIds:[]}).then(schedule);});
chrome.action.onClicked.addListener(()=>{void chrome.runtime.openOptionsPage();});
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(message.target==='ocr-offscreen')return false;
  if(sender.id!==chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL('')))return false;
  const handle=async()=>{
    if(message.type==='status'){const state=await loadState();if(!activeRun&&state.status?.running){state.status={...state.status,running:false,error:true,finishedAt:new Date().toISOString(),message:'上次检查已中断，已保存进度，可以重新开始检查'};await chrome.storage.local.set({status:state.status});}return {...state,discoveryAvailable:true,setupGuide:true};}
    if(message.type==='readIdentity'){
      const url='https://attendance.monash.edu.my/student/Default.aspx';
      let tab;
      if(Number.isInteger(message.tabId)){try{tab=await chrome.tabs.get(message.tabId);}catch{}}
      else tab=(await chrome.tabs.query({url:'https://attendance.monash.edu.my/student/Default.aspx*'}))[0];
      if(!tab&&message.open){tab=await chrome.tabs.create({url,active:true});return {ok:true,needsLogin:true,tabId:tab.id};}
      if(!tab)return {ok:true,needsLogin:true};
      const page=new URL(tab.url||url);
      if(page.origin!=='https://attendance.monash.edu.my'||page.pathname!=='/student/Default.aspx'||tab.status!=='complete')return {ok:true,needsLogin:true,tabId:tab.id};
      try{const result=await runFunction(tab.id,attendanceAdapter,'identity');return {ok:true,name:result.name,tabId:tab.id};}
      catch(error){return {ok:false,error:error.message};}
    }
    if(message.type==='identity'){
      if(activeRun||activeDetection)throw new Error('请等待当前检查结束再修改身份');
      const state=await loadState(),identity=normalizeIdentity(state.settings,message,state.records.length>0);
      await chrome.storage.local.set({settings:{...state.settings,...identity}});return {ok:true};
    }
    if(message.type==='reset'){
      if(activeRun||activeDetection)throw new Error('请等待当前检查结束后再重置');
      await chrome.alarms.clear('scan');
      await chrome.storage.local.clear();
      if(chrome.storage.session)await chrome.storage.session.clear();
      if(globalThis.caches)for(const key of await caches.keys())await caches.delete(key);
      if(globalThis.indexedDB?.databases)for(const db of await indexedDB.databases())if(db.name)await new Promise((resolve,reject)=>{const deletion=indexedDB.deleteDatabase(db.name);deletion.onsuccess=resolve;deletion.onerror=()=>reject(new Error('缓存清理失败，请关闭其他助手页面后重试'));deletion.onblocked=()=>reject(new Error('缓存正被其他助手页面使用，请关闭其他助手页面后重试'));});
      await chrome.action.setBadgeText({text:''});return {ok:true};
    }
    if(message.type==='scan'){if(activeDetection)throw new Error('正在重新检测课程，请稍后检查签到');void start(true);return {ok:true};}
    if(message.type==='retry'){if(activeRun||activeDetection)throw new Error('正在签到，请等待本轮结束');const state=await loadState();if(!state.settings.courses.includes(message.course))throw new Error('课程已被移除，请重新配置');void start(true,message.course);return {ok:true};}
    if(message.type==='redetect'){if(activeRun||activeDetection)throw new Error('正在运行，请等待当前检查结束再重新检测课程');activeDetection=redetect().finally(()=>{activeDetection=null;});return activeDetection;}
    if(message.type==='clearCourses'){
      if(activeRun||activeDetection)throw new Error('正在运行，请等待检查结束再清空课程');
      const state=await loadState();
      await chrome.storage.local.set({settings:{...state.settings,enabled:false,autoDiscover:false,courses:[],senders:{},subjectKeywords:{},moodleUrls:{},schedules:{}},records:[],seenMessages:{},seenThreads:{},diagnostics:[],status:{running:false,message:'课程和收集记录已清空'},moodleProgress:{},nextCourse:0});
      await schedule();return {ok:true};
    }
    if(message.type==='settings'){
      const existing=await loadState(),update=message.settings||{};
      const settings=normalizeSettings(existing.settings,update,existing.records.length>0);
      await chrome.storage.local.set({settings});await schedule();return {ok:true};
    }
    if(message.type==='health'){const native=await localService();try{return await native.call({op:'ping'});}finally{await native.close();}}
    throw new Error('未知请求');
  };
  handle().then(respond,e=>respond({ok:false,error:e.message}));return true;
});
void schedule();
