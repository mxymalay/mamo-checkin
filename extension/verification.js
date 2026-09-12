export const LOGIN_WAIT_MS=180000;

export function configuredLoginSites(settings={}){
 const courses=settings.courses||[];
 return [...(courses.some(c=>settings.senders?.[c])?['gmail']:[]),...(courses.some(c=>settings.moodleUrls?.[c]?.length)?['moodle']:[]),'attendance'];
}

export function bindVerification({button,status,prepare=()=>({}),check,onVerified=async()=>{},success='登录检测通过。',idleText='登录并检测',verifiedText='重新登录并检测',doc=button.ownerDocument,timeout=LOGIN_WAIT_MS,interval=3000}){
 const clock=doc.defaultView;
 const activity=doc.createElement('span');activity.className='verification-activity';activity.hidden=true;
 const spinner=doc.createElement('span');spinner.className='verification-spinner';spinner.setAttribute('aria-hidden','true');
 const countdown=doc.createElement('span');countdown.className='verification-countdown';activity.append(spinner,countdown);button.after(activity);
 let generation=0,pollTimer,tickTimer,endTimer,resolveRun,running=false,verified=false,saving=false;
 function render(){button.disabled=running;button.classList.toggle('verified',verified);button.textContent=verified?verifiedText:idleText;button.setAttribute('aria-busy',String(running));activity.hidden=!running||saving;}
 function clearTimers(){clock.clearTimeout(pollTimer);clock.clearInterval(tickTimer);clock.clearTimeout(endTimer);}
 function finish(value){generation++;clearTimers();running=false;saving=false;const resolve=resolveRun;resolveRun=null;render();resolve?.(value);}
 function stop(){finish(null);}
 function reset(){stop();verified=false;status.textContent='';delete status.dataset.state;render();}
 function markVerified(){verified=true;render();}
 function start(){
  stop();verified=false;let context;
  try{context=prepare();}catch(error){status.textContent=error.message;status.dataset.state='error';render();return Promise.resolve(null);}
  running=true;delete status.dataset.state;render();status.textContent='正在检测登录状态…';
  const ticket=generation,deadline=Date.now()+timeout;
  const tick=()=>{countdown.textContent=`检测中 · 剩余 ${Math.max(0,Math.ceil((deadline-Date.now())/1000))} 秒 · 请勿关闭浏览器页面`;};tick();tickTimer=clock.setInterval(tick,1000);
  const done=new Promise(resolve=>{resolveRun=resolve;});
  endTimer=clock.setTimeout(()=>{if(ticket!==generation)return;status.textContent='登录检测超时，请完成登录后重新检测。';status.dataset.state='error';finish(null);},timeout);
  const read=async open=>{
   try{
    const result=await check(context,open);
    if(ticket!==generation)return;
    if(result?.verified){
     clearTimers();saving=true;status.textContent='正在保存检测结果…';render();
     await onVerified(result);if(ticket!==generation)return;
     verified=true;status.dataset.state='success';status.textContent=typeof success==='function'?success(result):success;finish(result);return;
    }
    delete status.dataset.state;status.textContent=result?.message||'请在打开的网站完成登录，检测会自动继续。';
    pollTimer=clock.setTimeout(()=>read(false),interval);
   }catch(error){if(ticket!==generation)return;status.dataset.state='error';status.textContent=String(error.message||error).replace('页面已被关闭，无法执行签到','页面已被关闭，检测已停止。请重新登录并检测。');finish(null);}
  };
  void read(true);return done;
 }
 button.onclick=()=>{if(!running)void start();};clock.addEventListener('pagehide',stop,{once:true});render();
 return {start,stop,reset,markVerified,get running(){return running;},get verified(){return verified;},activity};
}

export function loginRequest(site,settings){
 const context={};
 return async(request,open)=>{
  const payload=site==='gmail'?{type:'checkEmail',email:settings.email}:site==='moodle'?{type:'checkMoodle',name:settings.name}:{type:'readIdentity'};
  const result=await request({...payload,...context,open});
  if(result.tabId!=null)context.tabId=result.tabId;
  for(const flag of ['switchAttempted','accountSelected'])if(result[flag])context[flag]=true;
  const verified=site==='gmail'?result.matched&&result.email===settings.email:site==='moodle'?result.matched&&result.name===settings.name:result.name===settings.name;
  return {...result,verified,message:site==='attendance'&&result.name&&!verified?'Attendance 姓名与配置不一致，请登录配置的学校账号后继续检测。':result.message};
 };
}
