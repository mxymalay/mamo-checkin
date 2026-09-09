export function gmailMailbox(url){
 try{const u=new URL(url),match=u.pathname.match(/^\/mail\/u\/\d+\//);return u.origin==='https://mail.google.com'&&match?u.origin+match[0]:null;}catch{return null;}
}
export async function openVerifiedGmail({email,search,tabs,readIdentity,create,navigate,recoverAccount}){
 const expected=email.trim().toLowerCase();
 let base;
 // Inspect only account identity in existing tabs; never navigate the user's tabs.
 for(const tab of await tabs.query({url:'https://mail.google.com/*'})){
  if(tab.status!=='complete')continue;
  try{const identity=await readIdentity(tab.id);if(identity.email===expected&&(base=gmailMailbox(identity.url)))break;}catch{}
 }
 const tabId=await create(base||`https://mail.google.com/mail/?authuser=${encodeURIComponent(expected)}`);
 let identity;
 try{identity=await readIdentity(tabId);}catch(error){if(!recoverAccount||!/LOGIN_REQUIRED|登录|账号|加载/.test(error?.message||''))throw error;}
 if(identity?.email!==expected&&recoverAccount)identity=await recoverAccount(tabId,expected);
 identity||={};
 if(identity.email!==expected)throw new Error(`[LOGIN_REQUIRED] Gmail 当前账号是 ${identity.email||'未知'}，目标账号是 ${expected}。请切换或登录目标邮箱后重试；尚未搜索邮件。`);
 base=gmailMailbox(identity.url);
 if(!base)throw new Error('[LOGIN_REQUIRED] Gmail 账号地址尚未确认，请打开目标邮箱后重试；尚未搜索邮件。');
 const searchUrl=base+'#search/'+encodeURIComponent(search);
 await navigate(tabId,searchUrl);
 return {tabId,searchUrl};
}
