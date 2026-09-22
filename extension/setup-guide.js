import {bindIdentityReader} from './identity-input.js';
import {installCompanionDownload} from './companion-setup.js';
import {isWindows} from './platform.js';

const nativeHealthErrors=new Map([
 ['Allow the OCR executable','请在系统安全设置中允许识别程序，然后点击“重新检测”。']
]);
function normalizeNativeHealthError(value,language=''){
 const raw=String(value||'').trim();
 const generic=/本地识别服务无法连接|native messaging host not found|specified native messaging host not found/i.test(raw);
 if(generic)return '';
 return (nativeHealthErrors.get(raw)||raw).replace(/\s*[（(][^（）()]*[）)]\s*$/,'').trim();
}

export function createSetupGuide({doc=document,request,refresh,detect,checkHealth,reload,reset,skipOcr,windows=isWindows}){
 const box=doc.createElement('section');box.id='setup-guide';box.className='card';box.innerHTML=`
 <div data-setup="install"><h2>先安装 Mac 识别服务</h2><ol class="setup-instructions"><li>第二步：打开解压后的 OCR 包。</li><li class="authorization-step"><span class="authorization-number" aria-hidden="true">1</span><div><strong class="authorization-title">安装命令授权</strong><p>双击 <strong>安装 Mac 识别服务.command</strong>，按终端提示安装。</p><p>如被阻止：系统设置 → 隐私与安全性 → 仍要打开。</p></div></li><li class="authorization-step"><span class="authorization-number" aria-hidden="true">2</span><div><strong class="authorization-title">attendance-ocr 自检</strong><p>安装脚本会自动完成自检；macOS 首次检查新程序可能需要约半分钟，请耐心等待。</p><p>只有当 macOS 明确提示 <strong>attendance-ocr</strong> 被阻止时，才前往 <strong>系统设置 → 隐私与安全性 → 仍要打开</strong> 允许它，然后回到这里重新检测。</p></div></li><li>第三步：回到此页面，等待检测通过，自动进入下一步。</li></ol><p id="setup-health" role="status"><span id="setup-health-activity" class="setup-health-progress" role="img" aria-label="正在检查识别服务"><span id="setup-health-ring" aria-hidden="true"></span></span><span id="setup-health-success" class="setup-health-success" hidden aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m5 12 4 4L19 6"/></svg></span><span id="setup-health-message" class="setup-health-message">暂未检测到，5 秒后自动检查</span></p><button id="setup-check" type="button">我已安装，立即检测</button><button id="setup-reload" type="button" hidden>安装成功 · 刷新并继续</button><div class="setup-install-divider" aria-hidden="true"></div><details><summary>macOS 提示无法验证开发者、打不开？</summary><p>确认文件来自本项目 Release 后，先尝试打开一次，再进入 <strong>系统设置 → 隐私与安全性 → 安全性 → 仍要打开</strong>，按提示确认。只允许这个文件，不需要关闭系统安全保护。</p><a href="https://support.apple.com/zh-cn/102445" target="_blank" rel="noreferrer">查看 Apple 操作说明 ↗</a></details><a href="https://github.com/mxymalay/mamo-checkin/releases/latest" target="_blank" rel="noreferrer">下载 OCR 配套包 ↗</a></div>
 <div data-setup="identity" hidden><h2>确认你的身份</h2><form id="setup-identity"><input id="setup-name" aria-label="学校姓名" required autocomplete="name" placeholder="登录 Attendance 后自动填写"><p id="setup-read-name-status" role="status" class="muted identity-check-status"></p><button id="setup-read-name" type="button" class="subtle" hidden>重新检测姓名</button><button type="submit">确认，继续</button></form><p id="setup-identity-error" role="alert"></p></div>
 <div data-setup="courses" hidden><div class="setup-course-header"><h2>课程配置</h2><details id="setup-edit-identity"><summary>需要修改姓名？</summary><button id="setup-back" type="button">修改姓名</button></details></div><button id="setup-detect" type="button" hidden>已登录，检测课程信息</button><p id="setup-course-message" role="status">正在检测课程，请稍候。</p></div>`;
 if(windows){
  const install=box.querySelector('[data-setup="install"]');
  const controls=['setup-health','setup-check','setup-reload'].map(id=>install.querySelector('#'+id));
  install.replaceChildren(...controls);
 }else installCompanionDownload(box,{doc});
 const importDetails=doc.createElement('details');importDetails.id='setup-import';importDetails.innerHTML='<summary>您有旧的配置？</summary><p>可以导入以前导出的个人配置，跳过重复填写。</p><button id="setup-import-button" type="button">显示导入配置</button>';
 importDetails.querySelector('button').onclick=()=>{importDetails.open=true;doc.getElementById('settings-file')?.click();};
 const resetButton=doc.createElement('button');resetButton.id='setup-reset';resetButton.type='button';resetButton.className='subtle danger-action';resetButton.textContent='清空所有配置与缓存';resetButton.onclick=()=>reset?.();const toolbar=doc.createElement('section');toolbar.className='card setup-toolbar setup-toolbar-row';toolbar.append(importDetails,resetButton);
 const stepsBar=doc.createElement('section');stepsBar.className='card setup-steps-bar';stepsBar.innerHTML='<ol class="setup-steps"><li>安装识别服务</li><li>填写身份</li><li>登录并配置课程</li></ol>';
 doc.querySelector('header').after(toolbar);toolbar.after(stepsBar);stepsBar.after(box);
 if(windows)stepsBar.querySelector('li').remove();
 const skipLine=doc.createElement('div');skipLine.className='setup-skip-line';skipLine.innerHTML='<button id="setup-skip-ocr" type="button">不想麻烦？先尝试下内置识别。</button>';box.after(skipLine);let enabled=true,healthy=false,blocked=false,failed=false,reloadRequired=false,healthError='',state={},ocrSkipped=false,identityEdit=false,identityStepReadStarted=false,identityAutoQueued=false,identityAutoBusy=0,lastStep='',courseDetectionStarted=false,healthTimer;
 const $=id=>doc.getElementById(id);const identityBindings={},identitySubmit=$('setup-identity').querySelector('button[type=submit]');const syncIdentitySubmit=()=>{identitySubmit.hidden=!identityBindings.attendance?.verified;};const syncIdentityControls=()=>{const locked=identityAutoBusy>0;identityBindings.attendance?.setLocked?.(locked);identitySubmit.disabled=locked;$('setup-import-button').disabled=locked;$('setup-reset').disabled=locked;};const beginIdentityAuto=()=>{identityAutoBusy++;syncIdentityControls();};const endIdentityAuto=()=>{identityAutoBusy=Math.max(0,identityAutoBusy-1);syncIdentityControls();};const scheduleIdentitySubmit=()=>doc.defaultView.setTimeout(syncIdentitySubmit,0);
 identityBindings.attendance=bindIdentityReader({input:$('setup-name'),button:$('setup-read-name'),status:$('setup-read-name-status'),request,doc,buttonText:'重新检测姓名',verifiedButtonText:'重新检测姓名',onChange:()=>{if(!identityBindings.attendance?.running)identityEdit=true;$('setup-read-name').hidden=false;syncIdentitySubmit();},onVerified:scheduleIdentitySubmit});syncIdentitySubmit();
 let usedBrowserOcr=false;
 function render(){
 const cfg=state.settings||{},identity=Boolean(cfg.name),complete=identity&&cfg.courses?.length&&cfg.courses.every(c=>cfg.senders?.[c]||cfg.moodleUrls?.[c]?.length||cfg.edUrls?.[c]?.length);
  const step=!windows&&!healthy&&!reloadRequired&&!ocrSkipped?'install':!identity||identityEdit?'identity':!complete?'courses':'complete';
  const enteredIdentity=step==='identity'&&lastStep!=='identity';
  if(step!=='courses')courseDetectionStarted=false;
  if(step!=='identity'){identityStepReadStarted=false;}
  doc.body.dataset.setup=enabled?step:'complete';box.hidden=!enabled||step==='complete';toolbar.hidden=step==='install'||box.hidden;stepsBar.hidden=box.hidden;
  for(const section of box.querySelectorAll('[data-setup]'))section.hidden=section.dataset.setup!==step;
  [...stepsBar.querySelectorAll('.setup-steps li')].forEach((li,i)=>li.setAttribute('aria-current',i===(windows?['identity','courses']:['install','identity','courses']).indexOf(step)?'step':'false'));
  $('setup-reload').hidden=!reloadRequired;$('setup-check').hidden=reloadRequired;$('setup-skip-ocr').hidden=enabled?step!=='install':true;
  $('setup-skip-ocr').textContent=usedBrowserOcr?'继续使用内置识别':'不想麻烦？先尝试下内置识别。';
  if(!doc.activeElement?.id?.startsWith('setup-')&&!identityEdit){
   if(cfg.name)$('setup-name').value=cfg.name;
  }
  lastStep=step;
  if(enteredIdentity&&!identityStepReadStarted&&!identityEdit&&!$('setup-name').value.trim()&&!identityBindings.attendance.verified&&!identityBindings.attendance.running){
   identityStepReadStarted=true;identityAutoQueued=true;$('setup-read-name').hidden=true;
   doc.defaultView.setTimeout(()=>{if(enabled&&doc.body.dataset.setup==='identity'&&!identityEdit&&!$('setup-name').value.trim()&&!identityBindings.attendance.verified&&!identityBindings.attendance.running){beginIdentityAuto();void identityBindings.attendance.start().finally(()=>{identityAutoQueued=false;endIdentityAuto();syncIdentitySubmit();});}else{identityAutoQueued=false;syncIdentitySubmit();}},0);
  }
  if(enabled&&step==='courses'&&!courseDetectionStarted){courseDetectionStarted=true;doc.defaultView.setTimeout(()=>{if(enabled&&doc.body.dataset.setup==='courses')detect?.();},0);}
  // The retry button stays out of the way while the automatic name read runs
  // and reappears once that attempt concludes (or when the user edits manually).
  $('setup-read-name').hidden=Boolean(identityBindings.attendance?.running||identityAutoQueued);
 }
 $('setup-check').onclick=()=>checkHealth();$('setup-reload').onclick=()=>reload();$('setup-skip-ocr').onclick=async()=>{if(ocrSkipped)return;ocrSkipped=true;try{await skipOcr?.();}catch{}render();};
 $('setup-detect').onclick=()=>detect();$('setup-back').onclick=()=>{$('setup-name').value=state.settings?.name||'';identityEdit=true;render();};
 $('setup-identity').onsubmit=async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;$('setup-identity-error').textContent='正在保存…';try{await request({type:'identity',name:$('setup-name').value});identityEdit=false;$('setup-identity-error').textContent='';await refresh(true);}catch(error){$('setup-identity-error').textContent=error.message;}finally{button.disabled=false;}};
 render();return {
  update(value){state=value;ocrSkipped=value.ocrPreference==='browser';usedBrowserOcr||=ocrSkipped;enabled=value.setupGuide===true;render();},
  health(result,error){blocked=Boolean(result?.nativeBlocked);healthError=normalizeNativeHealthError(result?.healthError||error,doc.documentElement?.lang||'');$('setup-check').textContent=blocked?'已在系统设置允许，重新检测':'我已安装，立即检测';healthy=Boolean(result?.binaryReady);if(!healthy)failed=true;else reloadRequired=false;const message=healthy?'检测成功':(blocked?'attendance-ocr 未通过启动自检。请按提示更新或允许程序，再手动点击重新检测。':healthError||'');$('setup-health-message').textContent=message;$('setup-health-message').dataset.state=healthy?'ready':healthError||blocked?'error':'pending';$('setup-health-success').hidden=!healthy;render();},
  needsHealth(){return !windows&&enabled&&!healthy&&!blocked&&!ocrSkipped;},
  checking(value,seconds=5){const activity=$('setup-health-activity'),ring=$('setup-health-ring'),message=$('setup-health-message');doc.defaultView.clearInterval(healthTimer);if(!value&&!healthy&&!blocked&&!reloadRequired&&!healthError){value=true;seconds=5;}activity.hidden=!value;$('setup-health-success').hidden=!healthy;if(!value){ring.style.setProperty('--health-progress','0%');return;}message.dataset.state='pending';const deadline=Date.now()+seconds*1000;const tick=()=>{const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));ring.style.setProperty('--health-progress',`${Math.max(0,remaining/seconds*100)}%`);message.textContent=`暂未检测到，${remaining} 秒后自动检查`;activity.setAttribute('aria-label',`正在检查识别服务，剩余 ${remaining} 秒`);};tick();healthTimer=doc.defaultView.setInterval(tick,1000);},
  message(text,error=false){$('setup-course-message').textContent=text;$('setup-course-message').dataset.error=String(error);},
  detecting(value){$('setup-detect').disabled=value;$('setup-detect').textContent=value?'正在检测课程…':'已登录，检测课程信息';},
  get active(){return enabled;}
 };
}
