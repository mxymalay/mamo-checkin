import {runSummaryRecords,summaryFingerprint} from './run-summary.js';
import {createOfficialRules,scheduleOfficialRules,OFFICIAL_ALARM} from './source-rules/official-updates.js';
import {createRuleLibrary} from './source-rules/library.js';
import {installSourceRuleRuntime} from './source-rules/runtime.js';
import {messageCacheKey,pruneRuleCache} from './source-rules/cache.js';
import {createSourceCollectors} from './source-collection.js';
import {createBackgroundRules} from './background-rules.js';
import {userError} from './user-error.js';
import {localizeNotification} from './notification-i18n.js';
import {syncSessionRecords,repairLocalExpiry} from './session-records.js';
import {repairOcrState} from './ocr-migration.js';
import {resolveRecord} from './record-resolution.js';
import {checkinResult} from './checkin-result.js';
import {parseActivity,siteDate,matchActivity} from './core.js';
import {gmailAdapter} from './gmail.js';
import {attendanceAdapter} from './attendance.js';
import {submitPending} from './runner.js';
import {cleanupOwnedTabs,processCollectedMessages,reconcileScanAlarm,recordDiagnostic} from './workflow.js';
import {moodleAdapter} from './moodle.js';
import {localService} from './native-service.js';
import {localService as browserOcrService} from './local-service.js';
import {DEFAULTS,normalizeSettings,normalizeIdentity,normalizeIdentityField,gmailQuery} from './settings.js';
import {courseUsesSource} from './course-sources.js';
import {crawlMoodle} from './moodle-frontier.js';
import {edAdapter} from './ed-adapter.js';
import {createRunProgress} from './progress.js';
import {appendDiagnostic} from './diagnostic-log.js';
import {readTargetPage} from './page-ready.js';
import {selectEdThreads} from './ed-ranking.js';
import {missingSessions} from './timetable.js';
import {mergeHistory} from './history-export.js';
import {scanSinceDate,messageOutsideWindow,outsideAttendanceWindow} from './recent-window.js';
import {confirmLowConfidenceRecord,fillMissingCode} from './record-confirmation.js';
import {isWindows} from './platform.js';
import {courseNeedsSource,recordInSchedule,expectedSessions,detectSessions,detectWeeklySchedule,discoveredCourses,gmailDateBounds} from './timetable.js';
import {prioritiseThreads} from './gmail-ranking.js';
import {getImage} from './image-download.js';
import {LOGIN_REQUIRED,readAuthenticatedPage,isClosedPageError,pageError} from './login-state.js';
import {LOGIN_WAIT_MS} from './verification.js';
let activeNotifications={};
async function notify(id,options){
 if(!globalThis.chrome?.notifications)return;
 // action/tabId/windowId are our routing metadata; the notifications API
 // validates its options strictly and rejects unknown properties.
 const {action,tabId,windowId,...notificationOptions}=options;
 activeNotifications[id]={action,tabId,windowId};
 const localized=await localizeNotification(notificationOptions);
 chrome.notifications.create(id,{type:'basic',iconUrl:chrome.runtime.getURL('icons/icon-128.png'),...localized},()=>void chrome.runtime.lastError);
}
if(globalThis.chrome?.notifications?.onClicked)chrome.notifications.onClicked.addListener(notificationId=>{
 const entry=activeNotifications[notificationId];if(!entry)return;
 if(entry.action==='focus-login'&&entry.tabId!=null){
  try{chrome.tabs.update(entry.tabId,{active:true});chrome.windows.update(entry.windowId,{focused:true});}catch{}
  delete activeNotifications[notificationId];
 }else chrome.runtime.openOptionsPage();
});
import {openVerifiedGmail} from './gmail-session.js';
import {previewOcrService} from './source-rules/ocr-service.js';
import {createBuilderSession} from './source-rules/builder/session.js';
import {createBuilderPageBridge} from './source-rules/builder/page-bridge.js';
import {createBuilderPreview} from './source-rules/builder/preview.js';
import {createPracticeBackground} from './source-rules/practice/background.js';
import {checkEmailLogin,listGmailAccounts} from './email-check.js';
import {listGoogleAccounts,selectGoogleAccount} from './google-account.js';
import {checkSiteLogin} from './site-check.js';
import {verifyBackgroundLogin} from './background-preflight.js';
import {trackLoginTabs} from './login-tabs.js';
import {prefetchCall} from './prefetch-control.js';

const UNITS='https://attendance.monash.edu.my/student/Units.aspx';
let activeRun=null,activeDetection=null,activeMailPrefetch=null,prefetchController=null,startupProgress=null,pendingOperations=0;
let ruleLibraryPromise;
const officialRules=createOfficialRules({storage:chrome.storage.local});
const getRuleLibrary=()=>ruleLibraryPromise||=Promise.resolve(createRuleLibrary({storage:chrome.storage.local,getBuiltins:()=>officialRules.rules()}));
const ruleControl=createBackgroundRules({storage:chrome.storage.local,getLibrary:getRuleLibrary,officialRules,tabs:chrome.tabs,readAdapter:runFunction,downloadImage:(url,{tabId})=>getImage(url,tabId),
 isBusy:()=>Boolean(activeRun||activeDetection||activeMailPrefetch||pendingOperations||builderControl.busy||practiceControl.busy),
 connectOcr:()=>previewOcrService({isWindows,nativeService:localService,browserService:browserOcrService})});
const builderControl=createBuilderSession({extensionId:chrome.runtime.id,storage:chrome.storage.local,tabs:chrome.tabs,getLibrary:getRuleLibrary,
 pageBridge:createBuilderPageBridge({scripting:chrome.scripting,tabs:chrome.tabs}),
 preview:createBuilderPreview({downloadImage:(url,{tabId,documentId})=>getImage(url,tabId,{documentId}),connectOcr:()=>previewOcrService({isWindows,nativeService:localService,browserService:browserOcrService})}),
 isBusy:()=>Boolean(activeRun||activeDetection||activeMailPrefetch||pendingOperations||ruleControl.busy||practiceControl.busy)});
const practiceControl=createPracticeBackground({extensionId:chrome.runtime.id,tabs:chrome.tabs,storage:chrome.storage.local,
 connectOcr:()=>previewOcrService({isWindows,nativeService:localService,browserService:browserOcrService}),
 isBusy:()=>Boolean(activeRun||activeDetection||activeMailPrefetch||pendingOperations||ruleControl.busy||builderControl.busy)});
chrome.runtime.onConnect?.addListener(port=>{if(port.name==='rule-builder-owner')port.onDisconnect.addListener(()=>{void builderControl.cancelOwner(port.sender||{});});});
chrome.runtime.onConnect?.addListener(port=>{if(port.name.startsWith('rule-practice-'))practiceControl.connect(port);});
chrome.tabs.onRemoved?.addListener(tabId=>{void builderControl.cancelTab(tabId);void practiceControl.cancelTab(tabId);});
chrome.tabs.onUpdated?.addListener((tabId,change)=>{if(change.url||change.status==='loading')void practiceControl.cancelTab(tabId,change);});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const loginTabs=trackLoginTabs(chrome.tabs,chrome.storage.local);
const emailCheckAdapters={tabs:loginTabs.tabs,readIdentity:tabId=>runFunction(tabId,gmailAdapter,'identity'),readGoogleAccounts:async tabId=>{const results=await chrome.scripting.executeScript({target:{tabId},func:listGoogleAccounts,args:[]});return results[0]?.result||{accounts:[]};},create:url=>loginTabs.tabs.create({url,active:false}),update:(tabId,url)=>chrome.tabs.update(tabId,{url}),selectAccount:async(tabId,email)=>{const results=await chrome.scripting.executeScript({target:{tabId},func:selectGoogleAccount,args:[email]});return results[0]?.result||{selected:false};}};

async function loadState(){const s=await chrome.storage.local.get(['settings','records','seenMessages','seenThreads','moodleProgress','nextCourse','diagnostics','status','ownedTabIds','ocrPreference','ocrRepairVersion']);return {...s,settings:{...DEFAULTS,...s.settings},records:repairLocalExpiry(s.records||[]),seenMessages:s.seenMessages||{},seenThreads:s.seenThreads||{},moodleProgress:s.moodleProgress||{},diagnostics:s.diagnostics||[],ownedTabIds:s.ownedTabIds||[]};}
async function loadCollectionState(){const state=await loadState(),repair=repairOcrState(state);if(repair){await chrome.storage.local.set(repair);Object.assign(state,repair);}state.sourceRules=await (await getRuleLibrary()).snapshot(state.settings);return state;}
async function schedule(){const s=await loadState();await reconcileScanAlarm(s.settings,chrome.alarms);await scheduleOfficialRules(chrome.alarms);}
async function runFunction(tabId,func,command,args={}){const read=async()=>{
  if((func===gmailAdapter&&command==='messages')||((func===moodleAdapter||func===edAdapter)&&command==='read')){
    await chrome.scripting.executeScript({target:{tabId},func:installSourceRuleRuntime,args:[{}]});
  }
  const results=await chrome.scripting.executeScript({target:{tabId},func,args:[command,args]});return results[0]?.result;
};return readAuthenticatedPage(chrome.tabs,tabId,func===gmailAdapter?'Gmail':func===moodleAdapter?'Moodle':func===edAdapter?'Ed':'Attendance',read);}
async function poll(read,predicate,timeout=25000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{last=await read();if(predicate(last))return last;}catch(e){if(e.message?.includes(LOGIN_REQUIRED)||isClosedPageError(e))throw e;last=e;}await delay(600);}throw last instanceof Error?last:new Error('页面没有及时加载，请确认 Chrome 中的登录状态');}
async function navigate(tabId,url){try{await chrome.tabs.update(tabId,{url});await poll(()=>chrome.tabs.get(tabId),t=>t.status==='complete');}catch(error){const host=new URL(url).hostname;throw pageError(error,host==='mail.google.com'?'Gmail':host==='learning.monash.edu'?'Moodle':'Attendance 签到系统');}}
async function createOwnedTab(state,url){const tab=await chrome.tabs.create({url,active:false});state.ownedTabIds.push(tab.id);await chrome.storage.local.set({ownedTabIds:state.ownedTabIds});return tab.id;}
async function cleanOwnedTabs(state){await cleanupOwnedTabs(state,chrome.tabs,ownedTabIds=>chrome.storage.local.set({ownedTabIds}));}
async function connectOcr(state){
 let native,health,usingBrowserOcr=false;
 if(isWindows){
  usingBrowserOcr=true;
  await state.progress({message:'Windows 使用浏览器内置识别'});
  native=await browserOcrService({onProgress:state.progress});
  health=await native.call({op:'ping'});
 }else{
  try{
   native=await localService({onProgress:state.progress});
   health=await native.call({op:'ping'});
   if(!health.binaryReady)throw new Error(health.healthError||'本机识别服务未就绪');
  }catch(companionError){
   try{await native?.close();}catch{}
   native=null;usingBrowserOcr=true;
   await state.progress({message:'未检测到可用的本机识别服务，改用浏览器内置识别'});
   native=await browserOcrService({onProgress:state.progress});
   health=await native.call({op:'ping'});
  }
 }
 state.usingBrowserOcr=usingBrowserOcr;
 return {native,health,usingBrowserOcr};
}
async function save(state,native){
  state.prefetchSignal?.throwIfAborted();
  pruneRuleCache(state.seenMessages,state.sourceRules);pruneRuleCache(state.seenThreads,state.sourceRules);
  // Chrome storage is the durable submission checkpoint. Downloading an extra
  // snapshot can fail independently without stranding a not-yet-clicked row.
  await chrome.storage.local.set({records:state.records,seenMessages:state.seenMessages,seenThreads:state.seenThreads,diagnostics:state.diagnostics});
  // The extra JSON download is written once at run end; submission checkpoints
  // and every extracted code are already durable in extension storage.
}
const collectionAdapter=(state,native,readImage=getImage)=>({getImage:(...args)=>prefetchCall(state.prefetchSignal,()=>readImage(...args)),ocr:async(payload,meta)=>{
  const at=Date.now(),context={course:meta?.course,sourceUrl:meta?.sourceUrl};
  try{
    const result=await prefetchCall(state.prefetchSignal,()=>native.call({op:'ocr',...payload,meta,force:Boolean(state.forceOcr)}));
    await appendDiagnostic(chrome.storage.local,{event:'ocr',...context,ms:Date.now()-at,imageId:result.imageId,cached:result.cached,diagnostics:result.diagnostics,candidates:result.observations?.filter(o=>/^[A-Z0-9]{5}$/.test(o.text)).map(({text,confidence,x,y})=>({text,confidence,x,y}))});
    return result;
  }catch(error){state.prefetchSignal?.throwIfAborted();await appendDiagnostic(chrome.storage.local,{event:'ocr-error',...context,ms:Date.now()-at,error:error.message});throw error;}
},rescueOcr:state.usingBrowserOcr?undefined:async(payload,meta)=>{
 const rescue=await browserOcrService({onProgress:state.progress});
 try{return await prefetchCall(state.prefetchSignal,()=>rescue.call({op:'ocr',...payload,meta,force:Boolean(state.forceOcr)}));}finally{if(state.prefetchSignal?.aborted)void rescue.close().catch(()=>{});else await rescue.close();}
},save:()=>save(state,native),saveDiagnostics:()=>chrome.storage.local.set({diagnostics:state.diagnostics}),recentOnly:true,refresh:Boolean(state.forceOcr||state.settings.ignoreCompleted),progress:event=>state.progress(event),shouldContinue:msg=>courseNeedsSource(state,msg.course)});
async function diagnose(state,details){
 details={...details,error:userError(details.error,['gmail','thread'].includes(details.scope)?'Gmail':details.scope==='moodle'?'Moodle':details.scope==='ed'?'Ed':details.scope==='archive'?'归档':'Attendance 签到系统')};
 const source=['gmail','thread'].includes(details.scope)?'Gmail':details.scope==='moodle'?'Moodle':details.scope==='ed'?'Ed':'Attendance 签到系统';
 if(isClosedPageError(details.error))details={...details,error:pageError(new Error(details.error),source).message};
 else if(/登录|账号|tab|页面没有及时加载/i.test(details.error||'')&&!details.error.includes(LOGIN_REQUIRED)){
  const site=['gmail','thread'].includes(details.scope)?'Gmail':details.scope==='moodle'?'Moodle':details.scope==='ed'?'Ed':'签到系统';
  details={...details,error:`${details.error}。请在同一个 Chrome 配置文件打开 ${site} 并完成登录，确认学校邮箱和姓名与设置一致，再返回助手重试。`};
 }
 await state.progress?.({message:details.error,level:'error',context:{course:details.course,subject:details.subject,sourceUrl:details.sourceUrl}});await recordDiagnostic(state,details,()=>chrome.storage.local.set({diagnostics:state.diagnostics}));
}
async function recoverCollectorGmail(tabId,email,progress){
 const end=Date.now()+180000;let switchAttempted=false,accountSelected=false;
 while(Date.now()<end){
  const result=await checkEmailLogin({email,tabId,open:false,recoverClosedTab:false,switchAttempted,accountSelected},emailCheckAdapters);
  if(result.matched)return runFunction(tabId,gmailAdapter,'identity');
  switchAttempted||=Boolean(result.switchAttempted);accountSelected||=Boolean(result.accountSelected);
  await progress({message:result.message||`正在切换 Gmail 到 ${email}，完成登录后将自动继续`});await delay(3000);
 }
 throw new Error(`[LOGIN_REQUIRED] Gmail 尚未登录目标邮箱 ${email}`);
}
async function collectSource(method,state,native,verifiedLogin={}){
 const collector=createSourceCollectors({tabs:chrome.tabs,readAdapter:(...args)=>prefetchCall(state.prefetchSignal,()=>runFunction(...args)),navigate:(...args)=>prefetchCall(state.prefetchSignal,()=>navigate(...args)),createOwnedTab:url=>createOwnedTab(state,url),delay:ms=>prefetchCall(state.prefetchSignal,()=>delay(ms)),now:Date.now,recoverGmail:recoverCollectorGmail,
  progress:state.progress,persistCache:patch=>chrome.storage.local.set(patch),onDiagnostic:details=>diagnose(state,details),sourceEvent:details=>appendDiagnostic(chrome.storage.local,details),
  onMessages:async(messages,{tabId,fingerprintImages})=>{
   const completed=[];
   for(const original of messages){
    if(!courseNeedsSource(state,original.course))break;
    const msg={...original},payloads=new Map();
    const scheduled=fingerprintImages&&expectedSessions(state.settings,msg.course)!==null;
    if(fingerprintImages&&!scheduled){
     const versions=[];
     for(const image of msg.images){try{payloads.set(image,await getImage(image,tabId));}catch(error){payloads.set(image,error);}
      const payload=payloads.get(image);versions.push(payload instanceof Error?'unavailable':[...new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(atob(payload.imageBase64),c=>c.charCodeAt(0))))].map(n=>n.toString(16).padStart(2,'0')).join(''));
     }
     const fingerprint=JSON.stringify([msg.sentAt,msg.dateReferenceOnly,msg.dateWindow,msg.textRows,msg.images,versions]);
     msg.messageId+=':'+[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint)))].map(n=>n.toString(16).padStart(2,'0')).join('');
    }
    const adapter=collectionAdapter(state,native,async url=>{const cached=payloads.get(url);if(cached instanceof Error)throw cached;return cached||getImage(url,tabId);});
    await processCollectedMessages(state,[msg],{...adapter,refresh:scheduled||adapter.refresh});
    if(state.seenMessages[messageCacheKey(state,msg)])completed.push(original.messageId);
   }
   return {completedMessageIds:completed};
  }});
 return collector[method]({settings:state.settings,snapshot:state.sourceRules,cache:state,verifiedLogin,signal:state.prefetchSignal,forceRead:Boolean(state.forceOcr||state.settings.ignoreCompleted),shouldContinue:course=>courseNeedsSource(state,course)});
}
const collectMail=(state,native,login)=>collectSource('collectMail',state,native,login);
const collectMoodle=(state,native,login)=>collectSource('collectMoodle',state,native,login);
const collectEd=(state,native,login)=>collectSource('collectEd',state,native,login);
async function prefetchMail(verifiedLogin={},expectedIdentity,snapshot,signal){
 const state=await loadCollectionState();
 state.prefetchSignal=signal;
 if(snapshot)state.sourceRules=snapshot;
 if(expectedIdentity&&(expectedIdentity.email!==state.settings.email||expectedIdentity.name!==state.settings.name))return;
 state.manualRun=true;
 state.progress=async event=>{
  signal.throwIfAborted();
  if(startupProgress){try{await startupProgress.update({...event,background:true});}catch{}}
  else if(event.message)await appendDiagnostic(chrome.storage.local,{event:'gmail-prefetch',...event});
 };
 state.diagnostics=[];
 let native;
 try{
  signal.throwIfAborted();
  await state.progress({message:'开始 Gmail 预读取：提前查找邮件和签到码，已识别结果会保存到缓存'});
  const connecting=connectOcr(state);
  void connecting.then(connection=>{if(signal.aborted)void connection.native?.close()?.catch(()=>{});},()=>{});
  ({native}=await prefetchCall(signal,()=>connecting));
  signal.throwIfAborted();
  await collectMail(state,native,verifiedLogin);
  await save(state,native);
  await state.progress({message:'Gmail 预读取完成，已保存识别结果；等待签到系统核对场次状态'});
 }catch(error){
  if(!signal.aborted)await diagnose(state,{scope:'gmail',error:error.message||String(error)});
 }finally{
  try{await cleanOwnedTabs(state);}catch{}
  try{if(signal.aborted)void native?.close()?.catch(()=>{});else await native?.close();}catch{}
 }
}
function startMailPrefetch(verifiedLogin={},expectedIdentity,snapshot){
 if(!activeMailPrefetch){prefetchController=new AbortController();activeMailPrefetch=prefetchMail(verifiedLogin,expectedIdentity,snapshot,prefetchController.signal).finally(()=>{activeMailPrefetch=null;prefetchController=null;});}
 return activeMailPrefetch;
}
async function pauseMailPrefetch(reason='优先核对 Attendance 签到状态'){
 if(!activeMailPrefetch)return;
 prefetchController?.abort();
 const report=async(event,message)=>{
  await appendDiagnostic(chrome.storage.local,{event,message});
  await startupProgress?.update({message,background:true});
 };
 await report('gmail-pause-requested',`暂停 Gmail 检测：${reason}；停止后续查找和 OCR，保留已保存结果`);
 if(activeMailPrefetch)await activeMailPrefetch;
 await report('gmail-paused','Gmail 预读取已暂停；未完成结果不再写入，后续仅检查仍缺少签到码的场次');
}
async function readWebsiteActivities(state,tab,identityVerified=false){
  await state.progress({message:'正在核对网站已有签到（最多等待 25 秒）',context:{sourceUrl:UNITS}});
  let data;try{const current=await chrome.tabs.get(tab);if(current.url!==UNITS)await navigate(tab,UNITS);data=await poll(()=>runFunction(tab,attendanceAdapter,'activities',{...state.settings,identityVerified}),r=>Array.isArray(r?.activities));}catch(error){throw new Error('Attendance 课表检查失败：'+userError(error,'Attendance 签到系统'));}
  const activities=data.activities.map(a=>({...a,...parseActivity(a.rawText,siteDate(a.dateToken))}));
  const {attendanceHistory=[]}=await chrome.storage.local.get(['attendanceHistory']);
  await chrome.storage.local.set({attendanceHistory:mergeHistory(attendanceHistory,activities)});
  state.activities=activities;await state.progress({message:`网站签到状态读取完成（${activities.length} 场）`,increment:{pages:1}});
  for(const activity of activities.filter(a=>state.settings.courses.includes(a.course))){
   const status={completed:'已签到，不重复提交',available:'未签到，网站可录入',expired:'网站已关闭录入',waiting:'网站暂未开放录入'}[activity.state]||'网站状态尚未确认';
   await state.progress({message:`Attendance 检测：${activity.course} ${activity.date||'日期待核对'} ${activity.time||''} ${activity.type||''} ${activity.group||''}：${status}`,context:{course:activity.course,sourceUrl:UNITS}});
  }
  return activities;
}
async function inspectSchedule(state,verifiedLogin={}){
  state.settings.detectedSessions=Object.fromEntries(state.settings.courses.filter(c=>!state.settings.schedules?.[c]?.length).map(c=>[c,[]]));state.autoNeedsConfirmation=true;
  state.attendanceTab=verifiedLogin.attendance?.tabId;
  if(!Number.isInteger(state.attendanceTab))state.attendanceTab=await createOwnedTab(state,UNITS);
  try{
    await readWebsiteActivities(state,state.attendanceTab,Boolean(verifiedLogin.attendance));
  }catch(error){
    // Popup and scheduled runs skip the page preflight: when the Attendance
    // session is gone, surface the login page and wait for sign-in instead of
    // failing the whole run.
    if(!/需要登录|LOGIN_REQUIRED/.test(String(error?.message||error)))throw error;
    // Surface the login page once, then probe passively: reloading under the
    // student's keyboard while they enter Okta credentials is unacceptable.
    await chrome.tabs.update(state.attendanceTab,{url:UNITS,active:true});
    const loginTab=await chrome.tabs.get(state.attendanceTab);
    notify('login',{title:'需要登录 Attendance',message:'已在打开的页面完成登录后，本轮签到会自动继续（最多等待 3 分钟）。',action:'focus-login',tabId:state.attendanceTab,windowId:loginTab.windowId});
    const deadline=Date.now()+LOGIN_WAIT_MS;let rechecked=false,lastError=error;
    while(Date.now()<deadline){
      await state.progress({phase:'waiting',waitingSite:'attendance',loginRequired:true,loginTabId:state.attendanceTab,loginDeadline:deadline,message:'等待 Attendance 登录——请在弹出的页面完成登录，完成后自动继续（最多等待 3 分钟）',context:{sourceUrl:UNITS}});
      await delay(5000);
      let current;try{current=await chrome.tabs.get(state.attendanceTab);}catch{break;}
      // Probe only after the student landed back on the portal; never reload
      // the login page itself.
      if(!current.url||!/attendance\.monash\.edu\.my\/student/i.test(current.url))continue;
      try{await readWebsiteActivities(state,state.attendanceTab,true);rechecked=true;break;}
      catch(retryError){
        if(!/需要登录|LOGIN_REQUIRED/.test(String(retryError?.message||retryError)))throw retryError;
        lastError=retryError;
      }
    }
    if(!rechecked)throw lastError;
    await state.progress({phase:'collecting',loginRequired:false,loginTabId:null,waitingSite:null,loginDeadline:null});
  }
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
      await state.progress({message:'已将最近 14 天的课程场次保存为固定周课表，下次直接复用'});
    }
  }
  for(const course of state.settings.courses){
    const slots=expectedSessions(state.settings,course);
    if(slots!==null){
      for(const slot of slots)if(Array.isArray(state.activities)&&!state.activities.some(a=>a.course===slot.course&&a.date===slot.date&&a.time===slot.time))await state.progress({message:`${course} ${slot.date} ${slot.time}：仅为周课表推算，网站未出现该场次${state.settings.ignoreCompleted?'；开发者强制识别已开启':'，不查找签到码'}`,context:{course}});
      await state.progress({message:courseNeedsSource(state,course)?`${course} 近 7 天共 ${slots.length} 个课表计划，仍有场次需查找签到码`:`${course} 无需查码：网站未出现对应场次、场次已完成或已有可用码，跳过来源扫描`,context:{course},...(!courseNeedsSource(state,course)&&{increment:{skipped:1}})});
    }
  }
}
async function submit(state,native){
  const currentSettings=(await loadState()).settings;
  if(state.settings.recognitionOnly||currentSettings.recognitionOnly){await state.progress({message:'仅识别模式：签到码已保留，本轮不填写或提交签到'});return;}
  if(!state.records.some(r=>state.settings.courses.includes(r.course)&&recordInSchedule(state.settings,r)&&!['submitted','expired','ignored','linked'].includes(r.status)))return;
  const tab=state.attendanceTab??await createOwnedTab(state,UNITS);
  const settingsStillActive=async record=>{const current=await loadState();return !state.settings.recognitionOnly&&!current.settings.recognitionOnly&&(state.manualRun||current.settings.enabled)&&current.settings.email===state.settings.email&&current.settings.name===state.settings.name&&current.settings.courses.includes(record.course)&&!outsideAttendanceWindow(record)&&recordInSchedule(current.settings,record); };
  let firstList=true;
  const list=async()=>{
    await state.progress({message:'正在读取网站签到记录（最多等待 25 秒）',context:{sourceUrl:UNITS}});
    let current;try{current=await chrome.tabs.get(tab);}catch(error){throw pageError(error,'Attendance 签到系统');}
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
    return {entered:true,...await runFunction(tab,attendanceAdapter,'outcome',{})};
  }});
}
function createBackgroundProgress(){
 let loggedEvents;
 return createRunProgress(async status=>{
  await chrome.storage.local.set({status});
  const last=status.events.at(-1);
  if(last&&JSON.stringify(last)!==loggedEvents){loggedEvents=JSON.stringify(last);await appendDiagnostic(chrome.storage.local,{event:'run',...last});}
 });
}
async function run(manual=false,course=null,expectedIdentity=null,verifiedLogin={},preflight=false){
  await pauseMailPrefetch();
  const state=await loadCollectionState();
  if(expectedIdentity&&(expectedIdentity.email!==state.settings.email||expectedIdentity.name!==state.settings.name))throw new Error('签到前身份已改变，请重新登录并检测后再试');
  const beforeSummary=new Map(state.records.map(r=>[r.id,summaryFingerprint(r)]));
  state.runSubmittedIds=new Set();
  if(course)state.settings={...state.settings,courses:state.settings.courses.filter(c=>c===course)};
  if(!manual&&!state.settings.enabled)return {ok:false,error:'自动运行已暂停'};
  state.manualRun=manual;
  state.forceOcr=Boolean(course);
  let native;
  const progress=startupProgress||createBackgroundProgress();
  state.progress=event=>progress.update({...event,...(event.message?{message:event.message.replaceAll(LOGIN_REQUIRED+' ','')}:{})});
  try{
    await state.progress({phase:'collecting',message:'正在签到：核对最近 7 天的课程'});
    if(preflight){
      verifiedLogin=await verifyBackgroundLogin(state.settings,{
        request:message=>message.type==='checkEmail'?checkEmailLogin(message,emailCheckAdapters):checkSiteLogin(message,{tabs:loginTabs.tabs,readIdentity:tabId=>runFunction(tabId,message.type==='checkMoodle'?moodleAdapter:attendanceAdapter,'identity')},message.type==='checkMoodle'?'Moodle':'Attendance 签到系统'),
        progress:state.progress,
        onGmailVerified:result=>{void startMailPrefetch({gmail:{tabId:result.tabId}},expectedIdentity,state.sourceRules).catch(()=>{});},
        onSiteVerified:site=>site==='moodle'||site==='attendance'?pauseMailPrefetch(`${site==='moodle'?'Moodle':'Attendance'} 登录验证完成，优先核对签到状态`):undefined
      });
      await pauseMailPrefetch();
      const collected=await loadState();
      state.records=collected.records;state.seenMessages=collected.seenMessages;state.seenThreads=collected.seenThreads;state.ownedTabIds=collected.ownedTabIds;
    }
    if(!manual)notify('run-start',{title:'自动签到已开始',message:'页面将在后台打开并检查最近 7 天的课程，完成后会再通知结果。'});
    let health,usingBrowserOcr=false;
    ({native,health,usingBrowserOcr}=await connectOcr(state));
    state.diagnostics=[];
    await chrome.storage.local.set({diagnostics:[]});
    await cleanOwnedTabs(state);
    await state.progress({message:usingBrowserOcr?'正在签到；使用浏览器内置识别图片':'正在签到；图片识别会在需要时启动',service:health});
    await inspectSchedule(state,verifiedLogin);
    const mailCourses=state.settings.courses.filter(course=>state.settings.senders?.[course]);
    const pendingMail=mailCourses.filter(course=>courseNeedsSource(state,course));
    await state.progress({message:pendingMail.length?`开始或恢复 Gmail 检测：${pendingMail.join('、')} 仍需查找签到码；优先复用缓存，仅补查缺失结果`:'无需恢复 Gmail 检测：网站未出现的场次、已签到、已关闭录入或已有可用码的场次不再查找；未配置邮件来源的课程不查邮件'});
    for(const [scope,collect] of [['gmail',collectMail],['moodle',collectMoodle],['ed',collectEd]])try{
      const label={gmail:'Gmail',moodle:'Moodle',ed:'Ed'}[scope];
      await state.progress({message:`开始检查 ${label} 签到码来源；已完成或已有可用码的场次将跳过`});
      await collect(state,native,verifiedLogin);
      await state.progress({message:`${label} 来源检查结束`});
    }catch(error){await diagnose(state,{scope,error:error.message});}
    await state.progress({message:'正在核对最近 7 天的签到记录'});
    try{await submit(state,native);}catch(error){throw new Error('Attendance 签到提交检查失败：'+userError(error,'Attendance 签到系统'));}
    syncSessionRecords(state);
    await save(state,native);
    await state.progress({message:'正在写入本地归档'});
    try{await native.call({op:'archive',records:state.records});}catch(error){await diagnose(state,{scope:'archive',error:'记录已存于扩展，下载归档待重试：'+error.message});}
    const attention=state.records.filter(r=>['review','uncertain','attempting'].includes(r.status)).length;
    const failures=state.diagnostics.length,lastFailure=state.diagnostics.at(-1)?.error;
    const message=failures?`${failures} 项处理失败：${lastFailure?.replaceAll(LOGIN_REQUIRED+' ','')}`:attention?`${attention} 条记录需要核对`:'本轮签到流程已完成';
    const currentRecords=state.records.filter(r=>!['ignored','linked'].includes(r.status)&&state.settings.courses.includes(r.course)&&(r.status==='expired'||(!outsideAttendanceWindow(r)&&recordInSchedule(state.settings,r))));
    const notificationRecords=runSummaryRecords(currentRecords,beforeSummary,state.runSubmittedIds);
    const summary={issues:state.scheduleIssues||[],diagnostics:state.diagnostics.slice(-20),submitted:currentRecords.filter(r=>r.status==='submitted'&&state.runSubmittedIds.has(r.id)).length,detected:currentRecords.length,needsConfirmation:!currentRecords.length||Boolean(state.autoNeedsConfirmation),records:notificationRecords.map(({course,date,time,type,group,status})=>({course,date,time,type,group,status}))};
    summary.courses=state.settings.courses.map(course=>{
      const activities=(state.activities||[]).filter(a=>a.course===course&&!outsideAttendanceWindow(a)&&recordInSchedule(state.settings,a));
      const records=notificationRecords.filter(r=>r.course===course);
      const submitted=records.filter(r=>r.status==='submitted'&&state.runSubmittedIds.has(r.id)).length;
      const completed=0;
      const pending=activities.filter(a=>a.state==='available'&&!currentRecords.some(r=>r.status==='submitted'&&matchActivity(r,a))).length;
      const expired=records.filter(r=>r.status==='expired').length;
      const unresolved=records.filter(r=>['ready','review','uncertain','attempting'].includes(r.status)).length;
      const reason=expired?`已保存记录中有 ${expired} 场已过期，无法补签${submitted?`；本次另有 ${submitted} 场签到成功`:''}`:unresolved?`有 ${unresolved} 场尚未确认签到成功，请核对记录${submitted?`；本次另有 ${submitted} 场签到成功`:''}`:submitted?`本次签到成功 ${submitted} 场${completed?`；网站显示已签到 ${completed} 场`:''}`:completed&&!pending&&!expired&&!unresolved?`网站显示 ${completed} 场已签到，本次无需重复签到或查找签到码`:pending?`有 ${pending} 场等待签到码，暂未找到；可能尚未发布或当前来源未检索到，可稍后重试`:activities.length?'近期场次已关闭，无法补签':state.activities?'未找到最近 7 天内与课表匹配的场次，请核对课表':'未能读取网站签到状态，请确认登录后重试';
      return {course,submitted,completed,pending,expired,unresolved,reason,diagnostics:state.diagnostics.filter(d=>d.course===course).slice(-5)};
    });
    summary.loginRequired=[...new Set(state.diagnostics.filter(d=>d.error?.includes(LOGIN_REQUIRED)).map(d=>d.error.replace(LOGIN_REQUIRED+' ','')))];
    summary.courses=summary.courses.filter(c=>c.submitted||c.pending||c.expired||c.unresolved);
    if(summary.loginRequired.length)for(const c of summary.courses)if(c.pending)c.reason='网站登录未完成，签到码来源尚未检查完整。请先登录，再重试。';
    summary.quiet=!failures&&!summary.issues.length&&!summary.needsConfirmation&&!summary.records.length&&!summary.courses.length;
    summary.allCompleted=summary.quiet;
    if(summary.allCompleted&&!state.autoNeedsConfirmation)summary.needsConfirmation=false;
    const outcome=checkinResult(summary,Boolean(failures));
    if(outcome.tone==='success')try{await loginTabs.release(verifiedLogin);}catch{}
    // Scheduled runs happen unattended: a system notification carries the
    // outcome (clicking it opens the assistant) unless there is nothing to say.
    if(!manual&&!summary.quiet)notify('result',{title:outcome.title,message:(outcome.success?'':message?message+' ':'')+'点击打开马莫签到助手查看记录。'});
    await progress.finish({message:failures||attention?outcome.title+'：'+message:outcome.title,error:Boolean(failures),diagnostics:state.diagnostics.slice(-5),archiveDir:health.archiveDir,ocrLogPath:health.ocrLogPath,summary});
    await chrome.action.setBadgeText({text:attention||failures?'!':''});
    return {ok:true};
  }catch(e){const error=userError(e,'签到').replaceAll(LOGIN_REQUIRED+' ','');await progress.finish({message:error,error:true});await chrome.action.setBadgeText({text:'!'});return {ok:false,error};}
  finally{try{await cleanOwnedTabs(state);}catch{}try{await native?.close();}catch{}}
}
function start(manual=false,course=null,expectedIdentity=null,verifiedLogin={},preflight=false){
 if(ruleControl.busy||builderControl.busy||practiceControl.busy)return Promise.resolve({ok:false,error:'rule-test-busy'});
 if(activeDetection)return Promise.resolve({ok:false,error:'正在重新检测课程，请稍后检查签到'});
 if(activeRun)return activeRun;
 startupProgress=createBackgroundProgress();
 activeRun=(async()=>{
  try{await startupProgress.update({phase:'starting',message:'正在启动签到检查…'});}catch{}
  return run(manual,course,expectedIdentity,verifiedLogin,preflight);
 })().finally(()=>{startupProgress=null;activeRun=null;});
 return activeRun;
}
async function redetect(message={}){
 const state=await loadState();
 if(!state.settings.name)throw new Error('请先在第 2 步填写并保存姓名，再登录签到系统检测课程');
 let tab;
 try{
  tab=Number.isInteger(message.tabId)?message.tabId:await createOwnedTab(state,UNITS);
  state.progress=async()=>{};
  const data=await readAuthenticatedPage(chrome.tabs,tab,'Attendance',async()=>{
   const current=await chrome.tabs.get(tab);
   const url=current.pendingUrl||current.url;
   if(!url?.startsWith('https://attendance.monash.edu.my/'))throw new Error('请重新打开签到系统检测课程');
   if(url!==UNITS)await navigate(tab,UNITS);
   return poll(()=>readAuthenticatedPage(chrome.tabs,tab,'Attendance',()=>runFunction(tab,attendanceAdapter,'activities',state.settings)),r=>Array.isArray(r?.activities));
  });
  state.activities=data.activities.map(a=>({...a,...parseActivity(a.rawText,siteDate(a.dateToken))}));
  const schedules={},issues=[];
  const courses=discoveredCourses(state.activities);
  for(const course of courses){const result=detectWeeklySchedule(state.activities,course);if(result.needsConfirmation||!result.schedule.length)issues.push(`${course} 信息不完整、组别冲突或近 14 天没有场次，请核对课表`);else schedules[course]=result.schedule;}
  return {ok:true,courses,schedules,issues};
 }catch(error){
  if(error.message?.includes(LOGIN_REQUIRED)&&Number.isInteger(tab)){
   // Keep the sign-in tab alive while the setup page waits for the user.
   state.ownedTabIds=state.ownedTabIds.filter(id=>id!==tab);await chrome.storage.local.set({ownedTabIds:state.ownedTabIds});
   return {ok:true,loginRequired:true,tabId:tab};
  }
  throw error;
 }finally{await cleanOwnedTabs(state);}
}
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===OFFICIAL_ALARM)void officialRules.check().catch(()=>{});if(alarm.name==='scan'&&!ruleControl.busy&&!builderControl.busy&&!practiceControl.busy)void start();});
chrome.runtime.onInstalled.addListener(()=>{void schedule();void officialRules.check().catch(()=>{});});
chrome.runtime.onStartup.addListener(()=>{void chrome.storage.local.set({ownedTabIds:[],loginTabs:[]}).then(schedule);void officialRules.check().catch(()=>{});});
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(message.target==='ocr-offscreen')return false;
  if(sender.id!==chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL('')))return false;
  const guarded=['scan','retry','redetect','prefetchMail','identity','identityField','reset','clearCourses','confirmRecord','fillMissingCode','resolveRecord','readIdentity','checkEmail','checkMoodle','listGmailAccounts','health','settings','preferBrowserOcr','resetOcrPreference'].includes(message.type);
  const handleProduction=async()=>{
    if(message.type==='pauseMailPrefetch'){await pauseMailPrefetch(message.site==='moodle'?'Moodle 登录验证完成，优先核对签到状态':'优先核对 Attendance 签到状态');return {ok:true};}
    if(message.type==='checkEmail')return checkEmailLogin(message,emailCheckAdapters);
    if(message.type==='listGmailAccounts')return listGmailAccounts(emailCheckAdapters,message);
    if(message.type==='status'){const state=await loadState();if(!activeRun&&state.status?.running){state.status={...state.status,running:false,error:true,finishedAt:new Date().toISOString(),message:'上次检查已中断，已保存进度，可以重新开始检查'};await chrome.storage.local.set({status:state.status});}return {...state,discoveryAvailable:true,setupGuide:true};}
    if(message.type==='readIdentity'||message.type==='checkMoodle'){
      if(message.type==='checkMoodle')await appendDiagnostic(chrome.storage.local,{event:'moodle-login-check',message:'检测 Moodle 登录状态'});
      const result=await checkSiteLogin(message,{tabs:loginTabs.tabs,readIdentity:tabId=>runFunction(tabId,message.type==='checkMoodle'?moodleAdapter:attendanceAdapter,'identity')},message.type==='checkMoodle'?'Moodle':'Attendance 签到系统');
      if(message.type==='checkMoodle')await appendDiagnostic(chrome.storage.local,{event:'moodle-login-result',message:result.verified?'Moodle 登录检测完成；场次是否已签到由 Attendance 确认':result.loginRequired?'Moodle 需要网页登录':'Moodle 登录尚未确认，继续等待'});
      return result;
    }
    if(message.type==='identityField'){
      if(activeRun||activeDetection)throw new Error('请等待当前检查结束再修改身份');
      const state=await loadState(),identity=normalizeIdentityField(state.settings,message.field,message.value,state.records.length>0);
      await chrome.storage.local.set({settings:{...state.settings,...identity}});return {ok:true};
    }
    if(message.type==='identity'){
      if(activeRun||activeDetection)throw new Error('请等待当前检查结束再修改身份');
      const state=await loadState(),identity=normalizeIdentity(state.settings,message,state.records.length>0);
      await chrome.storage.local.set({settings:{...state.settings,...identity}});return {ok:true};
    }
    if(message.type==='resolveRecord'){
      if(activeRun||activeDetection||activeMailPrefetch)throw new Error('正在签到，请等待本轮结束');
      const state=await loadState();state.records=resolveRecord(state.records,message);
      await chrome.storage.local.set({records:state.records});return {ok:true};
    }
    if(message.type==='confirmRecord'||message.type==='fillMissingCode'){
      if(activeRun||activeDetection||activeMailPrefetch)throw new Error('正在签到，请等待本轮结束');
      const state=await loadState(),record=state.records.find(item=>item.id===message.id);
      const confirmed=message.type==='fillMissingCode'?fillMissingCode(record,message.code):confirmLowConfidenceRecord(record);
      state.records=state.records.map(item=>item.id===confirmed.id?confirmed:item);
      await chrome.storage.local.set({records:state.records});
      return {ok:true,record:confirmed};
    }
    if(message.type==='reset'){
      if(activeRun||activeDetection||activeMailPrefetch)throw new Error('请等待当前检查结束后再重置');
      await chrome.alarms.clear('scan');
      await chrome.alarms.clear(OFFICIAL_ALARM);await officialRules.reset(()=>chrome.storage.local.clear());
      ruleLibraryPromise=null;await ruleControl.cancel();
      if(chrome.storage.session)await chrome.storage.session.clear();
      if(globalThis.caches)for(const key of await caches.keys())await caches.delete(key);
      if(globalThis.indexedDB?.databases)for(const db of await indexedDB.databases())if(db.name)await new Promise((resolve,reject)=>{const deletion=indexedDB.deleteDatabase(db.name);deletion.onsuccess=resolve;deletion.onerror=()=>reject(new Error('缓存清理失败，请关闭其他助手页面后重试'));deletion.onblocked=()=>reject(new Error('缓存正被其他助手页面使用，请关闭其他助手页面后重试'));});
      await chrome.action.setBadgeText({text:''});return {ok:true};
    }
    if(message.type==='scan'){
      if(activeDetection)throw new Error('正在重新检测课程，请稍后检查签到');
      if(message.expectedIdentity){const current=await loadState();if(message.expectedIdentity.email!==current.settings.email||message.expectedIdentity.name!==current.settings.name)throw new Error('签到前身份已改变，请重新登录并检测后再试');}
      void start(true,null,message.expectedIdentity,message.verifiedLogin,Boolean(message.preflight));return {ok:true};
    }
    if(message.type==='prefetchMail'){
      if(activeRun||activeDetection)throw new Error('正在签到，请等待本轮结束');
      const state=await loadState();
      if(message.expectedIdentity&&(message.expectedIdentity.email!==state.settings.email||message.expectedIdentity.name!==state.settings.name))throw new Error('签到前身份已改变，请重新登录并检测后再试');
      void startMailPrefetch(message.verifiedLogin,message.expectedIdentity);return {ok:true};
    }
    if(message.type==='retry'){if(activeRun||activeDetection)throw new Error('正在签到，请等待本轮结束');const state=await loadState();if(!state.settings.courses.includes(message.course))throw new Error('课程已被移除，请重新配置');if(message.expectedIdentity&&(message.expectedIdentity.email!==state.settings.email||message.expectedIdentity.name!==state.settings.name))throw new Error('签到前身份已改变，请重新登录并检测后再试');void start(true,message.course,message.expectedIdentity,message.verifiedLogin);return {ok:true};}
    if(message.type==='redetect'){if(activeRun||activeDetection)throw new Error('正在运行，请等待当前检查结束再重新检测课程');activeDetection=redetect(message).finally(()=>{activeDetection=null;});return activeDetection;}
    if(message.type==='clearCourses'){
      if(activeRun||activeDetection||activeMailPrefetch)throw new Error('正在运行，请等待检查结束再清空课程');
      const state=await loadState();
      await chrome.storage.local.set({settings:{...state.settings,enabled:false,autoDiscover:false,courses:[],sourceModes:{},senders:{},subjectKeywords:{},moodleUrls:{},edUrls:{},schedules:{}},records:[],attendanceHistory:[],diagnosticLog:[],seenMessages:{},seenThreads:{},diagnostics:[],status:{running:false,message:'课程和收集记录已清空'},moodleProgress:{},nextCourse:0});
      await chrome.storage.local.set({sourceRuleBindings:{},sourceRuleRevisions:{}});
      await schedule();return {ok:true};
    }
    if(message.type==='settings'){
      const existing=await loadState(),update=message.settings||{};
      const settings=normalizeSettings(existing.settings,update,existing.records.length>0,message.scope||'all');
      if(ruleControl.busy&&settings.devMode)throw new Error('rule-test-busy');
      if(!settings.devMode)await ruleControl.cancel();
      await chrome.storage.local.set({settings});await schedule();if(!existing.settings.courses?.length&&settings.courses?.length)void officialRules.check().catch(()=>{});return {ok:true};
    }
    if(message.type==='preferBrowserOcr'){
      if(activeRun||activeDetection)throw new Error('正在运行，请稍后再更改识别方式');
      await chrome.storage.local.set({ocrPreference:'browser'});
      return {ok:true};
    }
    if(message.type==='resetOcrPreference'){
      await chrome.storage.local.remove('ocrPreference');
      return {ok:true};
    }
    if(message.type==='health'){
      if(isWindows)return {ok:true,binaryReady:true,engine:'browser-wasm',fallback:true,busy:false,stage:'浏览器内置识别'};
      try{const native=await localService();try{return await native.call({op:'ping'});}finally{await native.close();}}
      catch{return {ok:true,binaryReady:false,fallback:true,engine:'browser-wasm',busy:false,stage:'浏览器内置识别'};}
    }
    throw new Error('未知请求');
  };
  const handle=async()=>{
    if(practiceControl.owns(message.type))return practiceControl.handle(message,sender);
    if(message.type.startsWith('practice')||sender.url.startsWith(chrome.runtime.getURL('practice.html'))||sender.url.startsWith(chrome.runtime.getURL('source-rules/practice/')))throw new Error('practice-owner');
    if(message.type==='officialRulesCheck')return {ok:true,official:await officialRules.check({force:true})};
    if(message.type==='officialRulesRollback')return {ok:true,official:await officialRules.rollback()};
    if(practiceControl.busy&&(guarded||builderControl.owns(message.type)||ruleControl.owns(message.type)&&!['ruleList','exportConfiguration'].includes(message.type)))throw new Error('builder-busy');
    if(builderControl.owns(message.type)){
      try{return await builderControl.handle(message,sender);}catch(error){throw new Error(/^builder-[a-z-]+$/.test(error.message)?error.message:'builder-source-error');}
    }
    if(builderControl.busy&&(guarded||ruleControl.owns(message.type)&&!['ruleList','exportConfiguration'].includes(message.type)))throw new Error('builder-busy');
    if(ruleControl.owns(message.type)){const result=await ruleControl.handle(message);if(message.type==='importConfiguration')await schedule();return result;}
    if(guarded){
      if(ruleControl.busy&&!(message.type==='settings'&&message.settings?.devMode===false))throw new Error('rule-test-busy');
      // Reserve before the first storage/API await so previews cannot race startup.
      pendingOperations++;
    }
    try{return await handleProduction();}finally{if(guarded)pendingOperations--;}
  };
  handle().then(respond,e=>respond({ok:false,error:practiceControl.owns(message.type)?String(e.message||e).slice(0,500):userError(e,['checkEmail','listGmailAccounts'].includes(message.type)?'Gmail':message.type==='checkMoodle'?'Moodle':message.type==='readIdentity'?'Attendance 签到系统':'助手')}));return true;
});
void schedule();
