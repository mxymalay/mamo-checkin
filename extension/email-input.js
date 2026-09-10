import {schoolEmail} from './school-email.js';
import {bindVerification,loginRequest} from './verification.js';
export function bindEmailReader({input,button,status,request,onVerified,doc=document}){
 const binding=bindVerification({button,status,doc,prepare:()=>loginRequest('gmail',{email:schoolEmail(input.value)}),check:(read,open)=>read(request,open),onVerified:async result=>onVerified?.(result.email),success:onVerified?'Gmail 邮箱检测通过，已保存。':'Gmail 邮箱检测通过，请确认后保存。'});
 input.addEventListener('input',()=>{binding.reset();status.textContent='邮箱已修改，请重新检测。';});
 return binding;
}

export function installIdentityChecks({email,name,nameButton,nameStatus,request,onVerified,doc=document}){
 const hint=doc.getElementById(name.getAttribute('aria-describedby'));if(hint&&hint!==nameStatus)hint.remove();
 name.setAttribute('aria-describedby',nameStatus.id);
 nameButton.classList.add('identity-check');if(!nameButton.textContent)nameButton.textContent='登录并检测';
 nameButton.setAttribute('aria-label','登录并检测 Attendance 姓名');
 const nameActivity=nameButton.nextElementSibling?.classList.contains('verification-activity')?nameButton.nextElementSibling:null;
 name.closest('label').after(nameButton);(nameActivity||nameButton).after(nameStatus);
 const button=doc.createElement('button');button.type='button';button.id=email.id+'-check';button.className='identity-check';button.textContent='登录并检测';button.setAttribute('aria-label','登录并检测 Gmail 邮箱');
 const status=doc.createElement('p');status.id=email.id+'-check-status';status.className='muted identity-check-status';status.setAttribute('role','status');
 nameStatus.className='muted identity-check-status';email.setAttribute('aria-describedby',status.id);
 email.closest('label').after(button,status);
 return bindEmailReader({input:email,button,status,request,onVerified,doc});
}
