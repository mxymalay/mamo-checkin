import {schoolEmail} from './school-email.js';
import {googleAccountChooser} from './google-account.js';
export async function checkEmailLogin(message,{tabs,readIdentity,selectAccount}){
 const email=schoolEmail(message.email);
 const resultFor=async tab=>{
  if(tab.status!=='complete')return {ok:true,tabId:tab.id,needsLogin:true};
  let host;try{host=new URL(tab.url).hostname;}catch{}
  if(host==='accounts.google.com'&&selectAccount&&!message.accountSelected){
   const result=await selectAccount(tab.id,email);
   if(result.selected)return {ok:true,tabId:tab.id,needsLogin:true,accountSelected:true,switchAttempted:true,message:`已自动选择 ${email}，正在等待 Gmail；如需密码或验证，请完成后等待自动检测。`};
  }
  if(host!=='mail.google.com')return {ok:true,tabId:tab.id,needsLogin:true,message:`请在 Gmail 登录 ${email}，完成验证后会自动检测。`};
  try{const identity=await readIdentity(tab.id);
   if(identity.email!==email&&message.open!==undefined&&!message.switchAttempted&&tabs.update){
    await tabs.update(tab.id,{url:googleAccountChooser(email)});
    return {ok:true,tabId:tab.id,needsLogin:true,switchAttempted:true,message:`当前 Gmail 是 ${identity.email}，正在自动切换到 ${email}；尚未读取邮件。`};
   }
   return {ok:true,tabId:tab.id,email:identity.email,matched:identity.email===email,message:identity.email===email?'Gmail 邮箱检测通过，请确认后保存。':`当前 Gmail 是 ${identity.email}，目标邮箱为 ${email}；请完成登录，助手将继续检测，尚未读取邮件。`};}
  catch{return {ok:true,tabId:tab.id,needsLogin:true,message:`尚未确认 Gmail 账号，请登录 ${email} 后等待检测。`};}
 };
 if(Number.isInteger(message.tabId))return resultFor(await tabs.get(message.tabId));
 for(const tab of await tabs.query({url:'https://mail.google.com/*'})){
  if(tab.status!=='complete')continue;
  try{const identity=await readIdentity(tab.id);if(identity.email===email)return {ok:true,tabId:tab.id,email,matched:true};}catch{}
 }
 if(!message.open)return {ok:true,needsLogin:true};
 const tab=await tabs.create({url:`https://mail.google.com/mail/?authuser=${encodeURIComponent(email)}`,active:true});
 return {ok:true,tabId:tab.id,needsLogin:true};
}
