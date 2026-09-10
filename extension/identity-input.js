import {bindVerification} from './verification.js';
export function bindIdentityReader({input,button,status,request,onChange=()=>{},onVerified,buttonText='登录并读取姓名',verifiedButtonText='重新登录并读取姓名',doc=document}){
 const binding=bindVerification({button,status,doc,idleText:buttonText,verifiedText:verifiedButtonText,prepare:()=>({}),check:async(context,open)=>{
  const result=await request({type:'readIdentity',open,...(context.tabId!=null?{tabId:context.tabId}:{})});context.tabId=result.tabId??context.tabId;
  return {...result,verified:Boolean(result.name)};
 },onVerified:async result=>{input.value=result.name;onChange();await onVerified?.(result.name);},success:onVerified?'Attendance 姓名检测通过，已保存。':'已读取 Attendance 姓名，请确认后保存。'});
 input.addEventListener('input',()=>{binding.reset();status.textContent='已切换为手动填写，请确认姓名与 Attendance 一致。';});
 return binding;
}
