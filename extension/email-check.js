import {schoolEmail} from './school-email.js';
import {googleAccountChooser} from './google-account.js';
import {isClosedPageError,pageError,loginRedirect} from './login-state.js';
export async function checkEmailLogin(message,{tabs,readIdentity,selectAccount}){
 try{
  const result=await checkEmailSession(message,{tabs,readIdentity,selectAccount});
  if(!result.matched&&Number.isInteger(result.tabId)){
   const tab=await tabs.get(result.tabId);
   if(loginRedirect(tab.pendingUrl||tab.url)||result.email)result.loginRequired=true;
  }
  return result;
 }
 catch(error){throw pageError(error,'Gmail');}
}

export async function listGmailAccounts({tabs,readIdentity,readGoogleAccounts,create,update},message={}){
 const accounts=new Set();
 const candidates=[];
 const addCandidate=tab=>{if(tab?.id!=null&&!candidates.some(item=>item.id===tab.id))candidates.push(tab);};
 if(Number.isInteger(message.tabId))try{addCandidate(await tabs.get(message.tabId));}catch{}
 for(const tab of await tabs.query({url:'https://mail.google.com/*'}))addCandidate(tab);
 let pendingTabId,accountChooserTabId;
 for(const tab of candidates){
  if(tab.status!=='complete'){pendingTabId??=tab.id;continue;}
  let host;try{host=new URL(tab.url||'').hostname;}catch{}
  if(host==='accounts.google.com'&&readGoogleAccounts){
   try{
    const listed=await readGoogleAccounts(tab.id);
    for(const value of listed?.accounts||[]){try{accounts.add(schoolEmail(value));}catch{}}
   }catch{}
   accountChooserTabId??=tab.id;continue;
  }
  try{
   const identity=await readIdentity(tab.id);
   try{accounts.add(schoolEmail(identity?.email));}
   catch{
    // The newly opened Gmail tab may land on a personal default account.
    // Read Google's signed-in account list in the same background tab next.
    if(host==='mail.google.com'&&message.open&&Number.isInteger(message.tabId)&&tab.id===message.tabId&&update){
     await update(tab.id,googleAccountChooser());
     pendingTabId=tab.id;
    }
   }
  }catch{pendingTabId??=tab.id;}
 }
 if(!accounts.size&&message.open&&create&&!Number.isInteger(message.tabId)){
  const tab=await create('https://mail.google.com/');
  pendingTabId=tab?.id??tab;
 }
 return {accounts:[...accounts].sort(),...(Number.isInteger(accountChooserTabId)?{tabId:accountChooserTabId}:!accounts.size&&Number.isInteger(pendingTabId)?{tabId:pendingTabId}:{})};
}
async function checkEmailSession(message,{tabs,readIdentity,selectAccount}){
 const email=schoolEmail(message.email);
 const resultFor=async tab=>{
  if(tab.status!=='complete')return {ok:true,tabId:tab.id,needsLogin:true,message:`请勿关闭新打开的 Gmail 标签页，完成登录后会自动检测 ${email}。`};
  let host;try{host=new URL(tab.url).hostname;}catch{}
  if(host==='accounts.google.com'&&selectAccount&&!message.accountSelected){
   const result=await selectAccount(tab.id,email);
   if(result.selected)return {ok:true,tabId:tab.id,needsLogin:true,accountSelected:true,switchAttempted:true,message:`已自动选择 ${email}，正在等待 Gmail；如需密码或验证，请完成后等待自动检测。`};
  }
  if(host!=='mail.google.com')return {ok:true,tabId:tab.id,needsLogin:true,message:`请在新打开的 Gmail 标签页登录 ${email}，完成验证后会自动检测；请勿关闭页面。`};
  try{const identity=await readIdentity(tab.id);
   if(identity.email!==email&&message.open!==undefined&&!message.switchAttempted&&tabs.update){
    await tabs.update(tab.id,{url:googleAccountChooser(email)});
    return {ok:true,tabId:tab.id,needsLogin:true,switchAttempted:true,message:`当前 Gmail 是 ${identity.email}，正在自动切换到 ${email}；尚未读取邮件。`};
   }
   return {ok:true,tabId:tab.id,email:identity.email,matched:identity.email===email,message:identity.email===email?'Gmail 邮箱检测通过，请确认后保存。':`当前 Gmail 是 ${identity.email}，目标邮箱为 ${email}；请完成登录，助手将继续检测，尚未读取邮件。`};}
  catch(error){if(isClosedPageError(error)||!/LOGIN_REQUIRED|登录|账号|加载/.test(error?.message||''))throw error;return {ok:true,tabId:tab.id,needsLogin:true,message:`尚未确认 Gmail 账号，请在此标签页登录 ${email} 后等待检测；请勿关闭页面。`};}
 };
 let closedError;
 if(Number.isInteger(message.tabId)){
  try{return await resultFor(await tabs.get(message.tabId));}
  catch(error){if(!isClosedPageError(error)||message.recoverClosedTab===false)throw error;closedError=error;}
 }
 for(const tab of await tabs.query({url:'https://mail.google.com/*'})){
  if(tab.status!=='complete')continue;
  try{const identity=await readIdentity(tab.id);if(identity.email===email)return {ok:true,tabId:tab.id,email,matched:true};}catch{}
 }
 if(closedError)throw closedError;
 if(!message.open)return {ok:true,needsLogin:true};
 const tab=await tabs.create({url:`https://mail.google.com/mail/?authuser=${encodeURIComponent(email)}`,active:false});
 return {ok:true,tabId:tab.id,needsLogin:true};
}
