export const LOGIN_REQUIRED='[LOGIN_REQUIRED]';
export function loginRedirect(url){
 try{const u=new URL(url);return u.hostname==='monashuni.okta.com'||u.hostname==='accounts.google.com'||(u.hostname==='learning.monash.edu'&&u.pathname.startsWith('/login/'));}catch{return false;}
}
export function loginMessage(site){return `${LOGIN_REQUIRED} ${site} 需要登录。请打开 ${site}，完成学校账号登录及验证，再返回助手重试；本轮尚未完成该网站的检查。`;}
export async function readAuthenticatedPage(tabs,tabId,site,read){
 const tab=await tabs.get(tabId);
 if(loginRedirect(tab.url||tab.pendingUrl))throw new Error(loginMessage(site));
 try{return await read();}catch(error){
  // A redirect can occur between checking the URL and injecting the adapter.
  const current=await tabs.get(tabId);
  if(loginRedirect(current.url||current.pendingUrl))throw new Error(loginMessage(site));
  throw error;
 }
}
