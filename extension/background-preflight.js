import {configuredLoginSites,loginRequest,LOGIN_WAIT_MS} from './verification.js';

// Keep polling in the background worker so closing the popup does not cancel it.
export async function verifyBackgroundLogin(settings,{request,progress,onGmailVerified,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now,timeout=LOGIN_WAIT_MS}){
 const verifiedLogin={};
 for(const site of configuredLoginSites(settings)){
  const read=loginRequest(site,settings),deadline=now()+timeout;
  let open=true;
  while(true){
   const result=await read(request,open);open=false;
   if(result.verified){
    verifiedLogin[site]={tabId:result.tabId};
    if(site==='gmail')onGmailVerified(result);
    break;
   }
   if(now()>=deadline)throw new Error(`${site==='attendance'?'Attendance':site==='gmail'?'Gmail':'Moodle'}: 登录检测超时，请完成登录后重新检测。`);
   await progress({phase:'waiting',waitingSite:site,loginDeadline:deadline,message:result.message||'请在打开的网站完成登录，检测会自动继续。'});
   await pause(3000);
  }
 }
 await progress({phase:'collecting',waitingSite:null,loginDeadline:null,message:'正在读取邮件和签到码'});
 return verifiedLogin;
}
