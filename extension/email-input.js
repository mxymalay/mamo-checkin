import {schoolEmail} from './school-email.js';
export function bindEmailReader({input,button,status,request,onVerified,doc=document}){
 let timer,generation=0;
 const stop=()=>{generation++;clearTimeout(timer);button.disabled=false;};
 button.onclick=()=>{
  stop();let email;
  try{email=schoolEmail(input.value);}catch(error){status.textContent=error.message;return;}
  const ticket=generation,deadline=Date.now()+180000;let tabId,switchAttempted=false,accountSelected=false;
  button.disabled=true;status.textContent='正在检测 Gmail 登录账号…';
  const read=async(open)=>{
   try{
    const result=await request({type:'checkEmail',email,open,switchAttempted,accountSelected,...(tabId!=null?{tabId}:{})});
    if(ticket!==generation)return;
    tabId=result.tabId??tabId;
    switchAttempted||=Boolean(result.switchAttempted);accountSelected||=Boolean(result.accountSelected);
    if(result.matched&&result.email===email){if(onVerified)await onVerified(email);if(ticket!==generation)return;status.textContent=onVerified?'Gmail 邮箱检测通过，已保存。':'Gmail 邮箱检测通过，请确认后保存。';stop();return;}
    status.textContent=result.message||'请在新标签页登录填写的 Gmail 邮箱，登录后会自动检测。';
    if(Date.now()<deadline)timer=setTimeout(()=>read(false),3000);
    else{status.textContent='尚未确认目标邮箱，请登录后重新检测。';stop();}
   }catch(error){if(ticket!==generation)return;status.textContent=error.message;stop();}
  };
  void read(true);
 };
 input.addEventListener('input',()=>{stop();status.textContent='邮箱已修改，请重新检测。';});
 doc.defaultView?.addEventListener('pagehide',stop,{once:true});
 return {stop};
}

export function installIdentityChecks({email,name,nameButton,nameStatus,request,onVerified,doc=document}){
 const hint=doc.getElementById(name.getAttribute('aria-describedby'));if(hint&&hint!==nameStatus)hint.remove();
 name.setAttribute('aria-describedby',nameStatus.id);
 nameButton.textContent='登录并检测';nameButton.className='identity-check';
 nameButton.setAttribute('aria-label','登录并检测 Attendance 姓名');
 name.closest('label').after(nameButton,nameStatus);
 const button=doc.createElement('button');button.type='button';button.id=email.id+'-check';button.className='identity-check';button.textContent='登录并检测';button.setAttribute('aria-label','登录并检测 Gmail 邮箱');
 const status=doc.createElement('p');status.id=email.id+'-check-status';status.className='muted identity-check-status';status.setAttribute('role','status');
 nameStatus.className='muted identity-check-status';email.setAttribute('aria-describedby',status.id);
 email.closest('label').after(button,status);
 return bindEmailReader({input:email,button,status,request,onVerified,doc});
}
