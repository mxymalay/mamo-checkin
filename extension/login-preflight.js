import {bindVerification,configuredLoginSites,loginRequest} from './verification.js';

export function createLoginPreflight({request,onVerified=()=>{},doc=document}){
 const dialog=doc.createElement('dialog');dialog.id='login-preflight';dialog.setAttribute('aria-labelledby','login-preflight-title');
 dialog.innerHTML='<h2 id="login-preflight-title">学校身份</h2><p class="muted">签到前登录检测 · 请勿关闭浏览器页面</p><div class="login-checks"></div><p class="preflight-complete" role="status" hidden></p>';
 doc.body.append(dialog);
 let bindings=[],resolveRun,generation=0;
 function finish(value){generation++;for(const binding of bindings)binding.stop();if(dialog.open){if(dialog.close)dialog.close();else dialog.removeAttribute('open');}const resolve=resolveRun;resolveRun=null;resolve?.(value);}
 dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
 doc.defaultView.addEventListener('pagehide',()=>finish(false),{once:true});
 async function run(settings){
  finish(false);const ticket=generation,sites=configuredLoginSites(settings),list=dialog.querySelector('.login-checks');list.replaceChildren();bindings=[];
  const complete=dialog.querySelector('.preflight-complete');complete.hidden=true;complete.textContent='';
  const done=new Promise(resolve=>{resolveRun=resolve;});
  for(const site of sites){
   const row=doc.createElement('section');row.className='login-check-row';row.dataset.site=site;
   const title=doc.createElement('h3');title.textContent=site==='gmail'?'Gmail':site==='moodle'?'Moodle':'Attendance 签到系统';
   const identity=doc.createElement('p');identity.className='login-identity';identity.textContent=site==='gmail'?settings.email:settings.name;
   const button=doc.createElement('button');button.type='button';button.className='identity-check';button.hidden=true;
   const status=doc.createElement('p');status.className='identity-check-status';status.setAttribute('role','status');row.append(title,identity,button,status);list.append(row);
   const binding=bindVerification({button,status,doc,prepare:()=>loginRequest(site,settings),check:(read,open)=>read(request,open),onVerified:()=>onVerified(site),success:'登录检测通过。'});
   status.textContent='等待检测';button.disabled=true;bindings.push(binding);
  }
  async function proceed(){
   const verifiedLogin={};
   for(let i=0;i<bindings.length;i++){
    if(ticket!==generation)return;
    const binding=bindings[i],button=list.children[i].querySelector('button');
    const result=await binding.start();if(ticket!==generation)return;
    if(!result){finish({error:list.children[i].querySelector('.identity-check-status').textContent});return;}
    verifiedLogin[sites[i]]={tabId:result.tabId};
    button.disabled=true;
   }
   complete.hidden=false;complete.textContent='初始化检测通过，开始执行签到…';
   await new Promise(resolve=>doc.defaultView.setTimeout(resolve,900));
   if(ticket===generation)finish({verifiedLogin});
  }
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
  void proceed();return done;
 }
 return {run,cancel:()=>finish(false),get active(){return Boolean(resolveRun);}};
}
