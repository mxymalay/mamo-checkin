import {userError} from './user-error.js';

export function requestTimeoutMs(payload){
 if(payload.type==='practiceBuilder')return payload.command?.type==='builderRecognize'?310000:60000;
 return payload.type==='redetect'?30000:10000;
}

export async function uiRequest(payload){
 if(!globalThis.chrome?.runtime?.sendMessage)throw new Error('请先在 Chrome 加载此扩展，再从扩展图标打开设置');
 const practice=payload.type.startsWith('practice');let timer;
 try{
  const result=await Promise.race([chrome.runtime.sendMessage(payload),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(practice?'builder-timeout':'后台响应超时，操作结果尚未确认。请重新打开签到助手查看状态；若刚升级扩展，请关闭旧页面后重新打开。')),requestTimeoutMs(payload));})]);
  if(!result)throw new Error(practice?'practice-no-response':'后台未返回结果，请关闭此页面，从扩展图标重新打开');
  if(result.ok===false)throw new Error(result.error);return result;
 }catch(error){
  if(practice)throw error;
  throw new Error(userError(error,['checkEmail','listGmailAccounts'].includes(payload.type)?'Gmail':payload.type==='checkMoodle'?'Moodle':payload.type==='readIdentity'?'Attendance 签到系统':'助手'));
 }finally{clearTimeout(timer);}
}
