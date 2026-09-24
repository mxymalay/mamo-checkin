import {gmailAdapter} from './gmail.js';
import {moodleAdapter} from './moodle.js';
import {edAdapter} from './ed-adapter.js';
import {gmailQuery} from './settings.js';
import {courseUsesSource} from './course-sources.js';
import {gmailDateBounds,missingSessions} from './timetable.js';
import {scanSinceDate,messageOutsideWindow} from './recent-window.js';
import {crawlMoodle} from './moodle-frontier.js';
import {openVerifiedGmail} from './gmail-session.js';
import {readTargetPage} from './page-ready.js';
import {prioritiseThreads} from './gmail-ranking.js';
import {selectEdThreads} from './ed-ranking.js';
import {LOGIN_REQUIRED,isClosedPageError} from './login-state.js';
import {threadSourceKey,sourceFrontierVersion,messageCacheKey} from './source-rules/cache.js';
import {gmailTestDateBounds,testMessageDateState} from './source-rules/test-date-range.js';

export function createSourceCollectors(io){
  let context,visited=0,truncated=false;
  const check=()=>{if(context.signal?.aborted)throw new Error('cancelled');};
  const delay=async ms=>{check();await io.delay(ms);check();};
  const navigate=async(tab,url)=>{check();await io.navigate(tab,url);check();};
  const courseNeedsSource=(state,course)=>!context.signal?.aborted&&(context.shouldContinue?.(course)??true);
  const runFunction=async(tab,func,command,args={})=>{check();const data=await io.readAdapter(tab,func,command,{...args,...(context.dateRange?{sinceDate:context.dateRange.from,untilDate:context.dateRange.to,testDateRange:true}:{}),...(context.historyLookup?{historyLookup:true}:{}),sourceRules:context.snapshot,ruleMode:context.mode||'combined',ruleTrace:Boolean(context.collectTrace)});check();return data;};
  const createOwnedTab=async(state,url)=>{check();return io.createOwnedTab(url);};
  const diagnose=async(state,details)=>{check();if(/上限|最多/.test(details.error||''))truncated=true;if(details.sourceUrl)await state.progress({item:{kind:'pages',id:details.sourceUrl,sourceUrl:details.sourceUrl,course:details.course,title:details.subject,state:'failed',reason:details.error}});await io.onDiagnostic(details);};
  const poll=async(read,predicate,timeout=25000)=>{const end=Date.now()+timeout;let last;while(Date.now()<end){check();try{last=await read();if(predicate(last))return last;}catch(e){if(context.signal?.aborted||e.message?.includes(LOGIN_REQUIRED)||isClosedPageError(e))throw e;last=e;}await delay(600);}throw last instanceof Error?last:new Error('页面没有及时加载');};
  const deliver=async(state,messages,tabId,extra={})=>{
    check();const result=await io.onMessages(messages,{tabId,...extra});check();
    for(const msg of messages)if(result?.completedMessageIds?.includes(msg.messageId))state.seenMessages[messageCacheKey(state,msg)]=new Date().toISOString();
  };
async function collectMail(state,native,verifiedLogin={}){
  const cfg={...state.settings,courses:state.settings.courses.filter(course=>courseUsesSource(state.settings,course,'email')&&courseNeedsSource(state,course))};
  let search=gmailQuery(cfg);if(!search)return;
  const bounds=context.dateRange?gmailTestDateBounds(context.dateRange):gmailDateBounds(cfg);if(bounds)search=search.replace('newer_than:7d ',bounds+' ');
  let mailStarted=Date.now(),deadline=mailStarted+100000;
  await state.progress({message:verifiedLogin.gmail?'Gmail 登录已确认，正在读取目标邮箱':`正在核对 Gmail 目标账号：${cfg.email}`});
  const verifiedTabId=verifiedLogin.gmail?.tabId;
  const {tabId:tab,searchUrl}=await openVerifiedGmail({email:cfg.email,search,tabs:io.tabs,create:url=>createOwnedTab(state,url),navigate,recoverAccount:(tabId,email)=>io.recoverGmail(tabId,email,state.progress),readIdentity:async tabId=>{
    await poll(()=>io.tabs.get(tabId),t=>t.status==='complete');
    return runFunction(tabId,gmailAdapter,'identity',cfg);
  },verifiedTabId});
  await state.progress({message:context.historyLookup?`正在回查 Gmail：${context.dateRange.from} 至 ${context.dateRange.to}`:'Gmail 账号已确认，正在搜索最近 7 天的邮件',context:{sourceUrl:searchUrl}});
  if(context.sourceUrl){
    const target=new URL(context.sourceUrl);if(target.pathname!==new URL(searchUrl).pathname)throw new Error('[LOGIN_REQUIRED] Gmail 来源链接属于另一个账号');
    await navigate(tab,target.href);
    await poll(()=>runFunction(tab,gmailAdapter,'messages',cfg),r=>r&&!r.loading);
    await runFunction(tab,gmailAdapter,'expand',cfg);
    const data=await poll(()=>runFunction(tab,gmailAdapter,'messages',{...cfg,requireBodiesReady:true}),r=>r&&!r.loading&&r.bodiesReady);
    await deliver(state,data.messages,tab);await state.progress({increment:{pages:1}});return;
  }
  mailStarted=Date.now();deadline=mailStarted+(context.historyLookup?900000:100000);
  const initial=await poll(()=>runFunction(tab,gmailAdapter,'list',cfg),r=>r&&!r.loading);
  if(context.historyLookup){
    let page=initial,pages=1;
    const signatures=new Set([page.pageSignature]);
    try{
    while(page.hasMore===true&&pages<30&&Date.now()<deadline){
      const next=await runFunction(tab,gmailAdapter,'nextPage',cfg);
      if(!next.advanced)break;
      page=await poll(()=>runFunction(tab,gmailAdapter,'list',cfg),r=>r&&!r.loading&&r.pageSignature!==page.pageSignature);
      if(signatures.has(page.pageSignature))break;
      signatures.add(page.pageSignature);pages++;
      initial.threads=[...new Map([...initial.threads,...page.threads].map(t=>[t.id,t])).values()];
      await state.progress({message:`Gmail 历史列表已读取 ${pages} 页`,increment:{pages:1},context:{sourceUrl:searchUrl}});
    }
    }catch(error){check();await diagnose(state,{scope:'gmail',error:`Gmail 历史分页中断：${error.message}`});}
    if(page.hasMore!==false)await diagnose(state,{scope:'gmail',error:'Gmail 历史列表分页未能确认读完，结果可能不完整。'});
  }
  const pending=initial.threads.filter(thread=>state.forceOcr||state.settings.ignoreCompleted||state.seenThreads[threadSourceKey({course:thread.course,...state.sourceRules?.courses?.[thread.course]?.gmail,threadId:thread.id})]!==thread.lastMessageId);
  const threadLimit=context.historyLookup?1000:40;
  if(pending.length>threadLimit)await diagnose(state,{scope:'gmail',error:`本轮最多处理 ${threadLimit} 个新会话，其余未完成`});
  // Round-robin the best threads per course before falling back to score order,
  // so one noisy unit cannot consume the cap before another course's code mail.
  const queue=prioritiseThreads(pending,{limit:threadLimit,perCourse:4});
  await state.progress({message:`Gmail 列表读取完成（${((Date.now()-mailStarted)/1000).toFixed(1)} 秒），${pending.length} 个待检查会话`,increment:{pages:1}});
  for(const [threadIndex,thread] of queue.entries()){
    if(Date.now()>deadline){await diagnose(state,{scope:'gmail',error:'本轮邮件检查达到时间上限，其余会话下轮继续'});break;}
    if((!state.forceOcr&&!state.settings.ignoreCompleted&&state.seenThreads[threadSourceKey({course:thread.course,...state.sourceRules?.courses?.[thread.course]?.gmail,threadId:thread.id})]===thread.lastMessageId)||!courseNeedsSource(state,thread.course))continue;
    try{
      if(!thread.lastMessageId)throw new Error('邮件会话缺少最新消息标识');
      // Open the thread by URL: deterministic, unlike clicking the list row,
      // which virtualised lists and overlays can silently swallow.
      const threadUrl=`${searchUrl.split('#')[0]}#all/${thread.id}`;
      await state.progress({message:`检查邮件会话 ${threadIndex+1}/${queue.length}（最多等待 25 秒）`,context:{course:thread.course,subject:thread.subject,sourceUrl:threadUrl}});
      await navigate(tab,threadUrl);
      await state.progress({message:'正在等待邮件内容（最多等待 25 秒）',context:{course:thread.course,subject:thread.subject,sourceUrl:threadUrl}});
      const messageConfig={...cfg,expectedLastMessageId:thread.lastMessageId,threadCourse:thread.course};
      await poll(()=>runFunction(tab,gmailAdapter,'messages',messageConfig),r=>r&&!r.loading);
      await runFunction(tab,gmailAdapter,'expand',cfg);
      await state.progress({message:'正在展开并读取邮件正文（最多等待 25 秒）'});
      const data=await poll(()=>runFunction(tab,gmailAdapter,'messages',{...messageConfig,requireBodiesReady:true}),r=>r&&!r.loading&&r.bodiesReady);
      await deliver(state,data.messages,tab);
      if(data.bodiesReady&&data.messages.every(msg=>state.seenMessages[messageCacheKey(state,msg)])){state.seenThreads[threadSourceKey({course:thread.course,...state.sourceRules?.courses?.[thread.course]?.gmail,threadId:thread.id})]=thread.lastMessageId;await io.persistCache({seenThreads:state.seenThreads,seenMessages:state.seenMessages});}
    }catch(error){
      truncated=true;
      await diagnose(state,{scope:'thread',threadId:thread.id,course:thread.course,sourceUrl:`${searchUrl.split('#')[0]}#all/${thread.id}`,subject:thread.subject,error:error?.message||String(error)});
    }
  }
}
async function collectMoodle(state,native,verifiedLogin={}){
  const cfg=state.settings,deadline=Date.now()+(context.historyLookup?900000:100000);
  const courses=cfg.courses.filter(c=>courseUsesSource(cfg,c,'moodle')&&cfg.moodleUrls?.[c]?.length&&courseNeedsSource(state,c));
  if(!courses.length)return;
  let tab=verifiedLogin.moodle?.tabId;
  if(!Number.isInteger(tab))tab=await createOwnedTab(state,cfg.moodleUrls[courses[state.nextCourse%courses.length||0]][0]);
  const start=state.nextCourse%courses.length||0;
  for(let i=0;i<courses.length;i++){
    if(Date.now()>deadline){await diagnose(state,{scope:'moodle',error:'本轮 Moodle 检查达到时间上限，其余课程下轮继续'});break;}
    const index=(start+i)%courses.length,course=courses[index];
    const frontier=await crawlMoodle({roots:context.sourceUrl?[context.sourceUrl]:cfg.moodleUrls[course],previous:state.forceOcr||state.settings.ignoreCompleted?{}:state.moodleProgress[course],deadline,maxDepth:context.historyLookup?Infinity:3,maxPages:context.sourceUrl?1:context.historyLookup?200:4,shouldContinue:()=>courseNeedsSource(state,course),version:sourceFrontierVersion({academicYear:cfg.academicYear,course,...state.sourceRules?.courses?.[course]?.moodle,sinceDate:context.dateRange?.from||scanSinceDate()}),persist:async progress=>{state.moodleProgress[course]=progress;await io.persistCache({moodleProgress:state.moodleProgress});},read:async url=>{
      try{
        const pageStarted=Date.now();
        await state.progress({message:'正在读取 Moodle 页面内容（最多等待 45 秒）',context:{course,sourceUrl:url}});
        let redirected=false;
        const data=await readTargetPage({navigate:()=>io.tabs.update(tab,{url}),pause:delay,timeout:Math.min(45000,Math.max(1,deadline-Date.now())),read:async()=>{
          const current=await io.tabs.get(tab);
          if(current.url?.startsWith('https://learning.monash.edu/my/')&&!redirected){redirected=true;await io.tabs.update(tab,{url});return {loading:true};}
          if(current.url?.split('#')[0]!==url.split('#')[0]){await runFunction(tab,moodleAdapter,'identity');return {loading:true};}
          return runFunction(tab,moodleAdapter,'read',{...cfg,course,sinceDate:scanSinceDate(),identityVerified:Boolean(verifiedLogin.moodle)});
        }});
        await io.sourceEvent({event:'source-read',source:'moodle',course,url,ms:Date.now()-pageStarted,messages:data.messages.length,links:data.links.length,skipped:data.skipped});
        await state.progress({message:`已读取 Moodle ${data.pageTitle||course}（${((Date.now()-pageStarted)/1000).toFixed(1)} 秒）`,context:{course,subject:data.pageTitle||course,sourceUrl:url},increment:{pages:1,skipped:data.skipped||0}});
        data.messages=data.messages.filter(msg=>context.dateRange?testMessageDateState(msg,context.dateRange)!=='outside':!messageOutsideWindow(msg));
        await deliver(state,data.messages,tab,{fingerprintImages:true});
        return {links:context.sourceUrl?[]:data.links,priorityLinks:context.sourceUrl?[]:data.priorityLinks};
      }catch(error){await diagnose(state,{scope:'moodle',course,sourceUrl:url,error:error.message});return [];}
    }});
    if(frontier.pending.length)truncated=true;
    state.nextCourse=(index+1)%courses.length;await io.persistCache({nextCourse:state.nextCourse});
  }
}
async function collectEd(state,native,verifiedLogin={}){
  const cfg=state.settings,deadline=Date.now()+(context.historyLookup?900000:100000);
  const courses=cfg.courses.filter(c=>courseUsesSource(cfg,c,'ed')&&cfg.edUrls?.[c]?.length&&courseNeedsSource(state,c));
  if(!courses.length)return;
  let tab,rootCourse=null;
  const read=async url=>{
    await state.progress({message:'正在读取 Ed 页面内容（最多等待 45 秒）',context:{course:rootCourse,sourceUrl:url}});
    return readTargetPage({navigate:()=>io.tabs.update(tab,{url}),pause:delay,timeout:Math.min(45000,Math.max(1,deadline-Date.now())),read:async()=>{
      const current=await io.tabs.get(tab);
      if(current.url?.split('#')[0]!==url.split('#')[0]){if(/\/login|okta/.test(current.url||''))throw new Error(LOGIN_REQUIRED+' Ed 需要登录');return {loading:true};}
      return runFunction(tab,edAdapter,'read',{course:rootCourse,expectedCourseId:new URL(url).pathname.match(/^\/au\/courses\/(\d+)/)?.[1],sinceDate:scanSinceDate(),academicYear:cfg.academicYear});
    }});
  };
  try{
    for(const course of courses){
      if(Date.now()>deadline){await diagnose(state,{scope:'ed',error:'本轮 Ed 检查达到时间上限，其余课程下轮继续'});break;}
      if(!courseNeedsSource(state,course))continue;
      rootCourse=course;
      if(!Number.isInteger(tab))tab=await createOwnedTab(state,cfg.edUrls[course][0]);
      try{
        const root=context.sourceUrl||cfg.edUrls[course][0];
        const data=await read(root);
        await state.progress({message:`已读取 Ed 课程页面（${data.pageTitle||course}）`,context:{course,sourceUrl:root},increment:{pages:1,skipped:data.skipped||0}});
        // The course page itself may already embed an attendance table (pinned
        // post); process it before following thread links.
        await deliver(state,data.messages,tab);
        const missing=missingSessions(state,course);
        const selected=selectEdThreads(data.threads||data.threadLinks||[],missing,{limit:context.historyLookup?500:4});
        if(context.historyLookup)await diagnose(state,{scope:'ed',course,error:'Ed 回查覆盖当前可访问的帖子列表；未验证更早的懒加载帖子，可能不完整。'});
        if(!context.sourceUrl&&(data.threads||data.threadLinks||[]).length>selected.length)truncated=true;
        await io.sourceEvent({event:'ed-selection',course,missing,discovered:data.threadLinks?.length||0,selected});
        const threads=context.sourceUrl?[]:selected.map(t=>t.url);
        for(const [threadIndex,threadUrl] of threads.entries()){
          if(Date.now()>deadline){truncated=true;break;}
          if(!courseNeedsSource(state,course))break;
          try{
            await state.progress({message:`检查 Ed 讨论帖 ${threadIndex+1}/${threads.length}`,context:{course,sourceUrl:threadUrl}});
            const thread=await read(threadUrl);
            await io.sourceEvent({event:'source-read',source:'ed',course,url:threadUrl,messages:thread.messages.length,images:thread.messages.reduce((n,m)=>n+m.images.length,0)});
            await deliver(state,thread.messages,tab);
          }catch(error){await diagnose(state,{scope:'ed',course,sourceUrl:threadUrl,error:error.message});}
        }
      }catch(error){await diagnose(state,{scope:'ed',course,sourceUrl:cfg.edUrls[course][0],error:error.message});}
    }
  }finally{rootCourse=null;}
}

  const collect=method=>async next=>{
    context=next;visited=0;truncated=false;
    const state=next.cache;state.settings=next.settings;state.sourceRules=next.snapshot;state.forceOcr=Boolean(next.forceRead);
    const previousProgress=state.progress;
    state.progress=async event=>{check();visited+=event.increment?.pages||0;await io.progress(event);};
    try{await method(state,null,next.verifiedLogin||{});check();return {complete:!truncated,visited,truncated};}
    finally{state.progress=previousProgress;}
  };
  return {collectMail:collect(collectMail),collectMoodle:collect(collectMoodle),collectEd:collect(collectEd)};
}
