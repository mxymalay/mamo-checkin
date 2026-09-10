export const LOGIN_REQUIRED='[LOGIN_REQUIRED]';
export function isClosedPageError(error){return /No tab with id\b|Invalid tab ID\b|tab (?:was |has been )?closed|页面已被关闭/i.test(error?.message||String(error));}
export function pageError(error,site='签到系统'){
 if(!isClosedPageError(error))return error;
 if((error?.message||String(error)).includes('页面已被关闭'))return error;
 return new Error(`${site==='Attendance'?'Attendance 签到系统':site} 页面已被关闭，无法执行签到`);
}
export function loginRedirect(url){
 try{const u=new URL(url);return u.hostname==='monashuni.okta.com'||u.hostname==='accounts.google.com'||(u.hostname==='learning.monash.edu'&&u.pathname.startsWith('/login/'));}catch{return false;}
}
export function loginMessage(site){return `${LOGIN_REQUIRED} ${site} 需要登录。请打开 ${site}，完成学校账号登录及验证；请勿关闭浏览器页面，再返回助手重试。本轮尚未完成该网站的检查。`;}
export async function readAuthenticatedPage(tabs,tabId,site,read){
 let tab;try{tab=await tabs.get(tabId);}catch(error){throw pageError(error,site);}
 if(loginRedirect(tab.url||tab.pendingUrl))throw new Error(loginMessage(site));
 try{return await read();}catch(error){
  if(isClosedPageError(error))throw pageError(error,site);
  // A redirect can occur between checking the URL and injecting the adapter.
  let current;try{current=await tabs.get(tabId);}catch(error){throw pageError(error,site);}
  if(loginRedirect(current.url||current.pendingUrl))throw new Error(loginMessage(site));
  throw error;
 }
}
