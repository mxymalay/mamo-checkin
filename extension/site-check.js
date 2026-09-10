import {isClosedPageError,pageError,loginRedirect,LOGIN_REQUIRED} from './login-state.js';

export async function checkSiteLogin(message,{tabs,readIdentity},site){
 const moodle=site==='Moodle',origin=moodle?'https://learning.monash.edu':'https://attendance.monash.edu.my';
 const url=origin+(moodle?'/my/':'/student/Default.aspx');
 const pending=tab=>({ok:true,tabId:tab?.id,needsLogin:true,message:`请在新打开的 ${site} 标签页完成学校账号登录，检测会自动继续；请勿关闭页面。`});
 async function inspect(tab){
  if(tab.status!=='complete')return pending(tab);
  const page=new URL(tab.url||url);
  if(page.origin!==origin||loginRedirect(page.href))return pending(tab);
  if(!moodle&&page.pathname!=='/student/Default.aspx')return pending(tab);
  try{
   const result=await readIdentity(tab.id);
   if(!result?.name)return pending(tab);
   if(moodle&&result.name!==message.name)return {...pending(tab),message:'Moodle 姓名与配置不一致，请登录配置的学校账号后继续检测。'};
   return {ok:true,tabId:tab.id,name:result.name,matched:true};
  }catch(error){
   if(error.message?.includes(LOGIN_REQUIRED))return pending(tab);
   throw pageError(error,site);
  }
 }
 let closed;
 if(Number.isInteger(message.tabId)){
  try{return await inspect(await tabs.get(message.tabId));}catch(error){if(!isClosedPageError(error))throw error;closed=error;}
 }
 let candidate;
 for(const tab of await tabs.query({url:moodle?origin+'/*':url+'*'})){
  try{const result=await inspect(tab);if(result.matched)return result;candidate??=tab;}catch(error){if(!isClosedPageError(error))throw error;}
 }
 if(closed)throw pageError(closed,site);
 if(candidate)return inspect(candidate);
 if(!message.open)return pending();
 return pending(await tabs.create({url,active:false}));
}
