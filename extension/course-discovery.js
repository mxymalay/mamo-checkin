import {bindVerification} from './verification.js';

export async function discoverCourseDraft({request,host,doc=host.ownerDocument,interval=3000,timeout=180000,signal,onLoginRequired=()=>{}}){
 const first=await request({type:'redetect'});
 if(signal?.aborted)return null;
 if(!first.loginRequired)return first;
 onLoginRequired();
 const wasHidden=host.hidden;host.hidden=true;
 const section=doc.createElement('section');section.className='course-login-wait';
 const button=doc.createElement('button'),status=doc.createElement('p');button.type='button';button.hidden=true;status.setAttribute('role','status');
 section.append(button,status);host.after(section);
 let cached=first,tabId=first.tabId,pending;
 const binding=bindVerification({doc,button,status,interval,timeout,check:async()=>{
  const result=cached||await (pending=request({type:'redetect',tabId}));cached=null;tabId=result.tabId??tabId;
  return {...result,tabId,verified:Array.isArray(result.courses),message:'请在签到系统完成登录，课程检测会自动继续。'};
 }});
 const cancel=()=>binding.stop();signal?.addEventListener('abort',cancel,{once:true});
 try{return await binding.start();}finally{binding.stop();signal?.removeEventListener('abort',cancel);section.remove();host.hidden=wasHidden;if(signal?.aborted)await pending?.catch(()=>{});}
}
