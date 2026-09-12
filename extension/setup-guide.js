import {bindIdentityReader} from './identity-input.js';
import {installIdentityChecks} from './email-input.js';
import {isWindows} from './platform.js';
import {installCompanionDownload} from './companion-setup.js';
import {schoolEmail,emailPrefix,configureEmailInput} from './school-email.js';

const nativeHealthErrors=new Map([
 ['Install Tesseract OCR with English language data, then click Check service again.','请安装 Tesseract OCR，并保留 English 语言数据，然后点击“重新检测”。'],
 ['Bundled English model is missing. Run the latest Install Windows OCR.exe again.','缺少内置英文模型，请重新运行最新版安装 Windows OCR.exe。'],
 ['Please run the latest Install Windows OCR.exe to install the corrected English model.','请重新运行最新版安装 Windows OCR.exe，安装修正后的英文模型。'],
 ['Allow the OCR executable','请在系统安全设置中允许识别程序，然后点击“重新检测”。']
]);
function normalizeNativeHealthError(value,language=''){
 const raw=String(value||'').trim();
 const generic=/本地识别服务无法连接|native messaging host not found|specified native messaging host not found/i.test(raw);
 if(generic)return '';
 return (nativeHealthErrors.get(raw)||raw).replace(/\s*[（(][^（）()]*[）)]\s*$/,'').trim();
}

export function createSetupGuide({doc=document,request,refresh,detect,checkHealth,reload,reset}){
 const box=doc.createElement('section');box.id='setup-guide';box.className='card';box.innerHTML=`
 <ol class="setup-steps"><li>1 安装识别服务</li><li>2 填写身份</li><li>3 登录并配置课程</li></ol>
 <div data-setup="install"><h2>先安装 Mac 识别服务</h2><ol class="setup-instructions"><li>第二步：打开解压后的 OCR 包。</li><li class="authorization-step"><span class="authorization-number" aria-hidden="true">1</span><div><strong class="authorization-title">安装命令授权</strong><p>双击 <strong>安装 Mac 识别服务.command</strong>，按终端提示安装。</p><p>如被阻止：系统设置 → 隐私与安全性 → 仍要打开。</p></div></li><li class="authorization-step"><span class="authorization-number" aria-hidden="true">2</span><div><strong class="authorization-title">attendance-ocr 授权</strong><p>第一步允许后，识别程序还需要单独授权。</p><p>如果 <strong>attendance-ocr</strong> 被阻止，请再次前往 <strong>系统设置 → 隐私与安全性 → 仍要打开</strong>，允许后回到这里重新检测。</p></div></li><li>第三步：回到此页面，等待检测通过，自动进入下一步。</li></ol><p id="setup-health" role="status"><span id="setup-health-activity" class="setup-health-progress" role="img" aria-label="正在检查识别服务"><span id="setup-health-ring" aria-hidden="true"></span></span><span id="setup-health-success" class="setup-health-success" hidden aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m5 12 4 4L19 6"/></svg></span><span id="setup-health-message" class="setup-health-message">暂未检测到，5 秒后自动检查</span></p><button id="setup-check" type="button">我已安装，立即检测</button><button id="setup-reload" type="button" hidden>安装成功 · 刷新并继续</button><div class="setup-install-divider" aria-hidden="true"></div><details><summary>macOS 提示无法验证开发者、打不开？</summary><p>确认文件来自本项目 Release 后，先尝试打开一次，再进入 <strong>系统设置 → 隐私与安全性 → 安全性 → 仍要打开</strong>，按提示确认。只允许这个文件，不需要关闭系统安全保护。</p><a href="https://support.apple.com/zh-cn/102445" target="_blank" rel="noreferrer">查看 Apple 操作说明 ↗</a></details><a href="https://github.com/mxymalay/mamo-checkin/releases/latest" target="_blank" rel="noreferrer">下载 OCR 配套包 ↗</a></div>
 <div data-setup="identity" hidden><h2>登录并确认学校身份</h2><p>用于核对登录账号，避免在错误账号下签到。</p><button id="setup-read-name" type="button">登录并读取姓名</button><p id="setup-read-name-status" role="status"></p><form id="setup-identity"><label>学校邮箱<input id="setup-email" type="email" required autocomplete="email" placeholder="student@example.edu"></label><div class="setup-identity-divider" aria-hidden="true"></div><label>签到系统显示的姓名<input aria-describedby="setup-name-hint" id="setup-name" required autocomplete="name" placeholder="登录后自动检测并自动填写"><small id="setup-name-hint" class="name-hint"><a href="https://attendance.monash.edu.my/student/Default.aspx" target="_blank" rel="noopener noreferrer">Attendance系统</a> · 自动读取登录后的姓名，也可手动修改</small></label><button type="submit">保存身份 · 下一步</button></form><p id="setup-identity-error" role="alert"></p></div>
 <div data-setup="courses" hidden><div class="setup-course-header"><h2>课程配置</h2><details id="setup-edit-identity"><summary>需要修改姓名或邮箱？</summary><button id="setup-back" type="button">修改姓名或邮箱</button></details></div><button id="setup-detect" type="button" hidden>已登录，检测课程信息</button><p id="setup-course-message" role="status">正在检测课程，请稍候。</p></div>`;
 if(isWindows){
  const section=box.querySelector('[data-setup="install"]');
  section.querySelector('h2').textContent='先安装 Windows 识别服务';
  section.querySelector('.setup-instructions').innerHTML=`<li>第二步：打开解压后的 OCR 包。</li><li class="authorization-step"><span class="authorization-number">1</span><div><strong>安装 Tesseract OCR</strong><p><a href="https://github.com/tesseract-ocr/tesseract/releases/download/5.5.0/tesseract-ocr-w64-setup-5.5.0.20241111.exe" target="_blank" rel="noreferrer">下载 Tesseract Windows 安装程序 ↗</a></p><p>使用默认安装位置，保留 English 语言数据。</p></div></li><li class="authorization-step"><span class="authorization-number">2</span><div><strong>连接浏览器</strong><p>双击 安装 Windows OCR.exe，等待安装成功。</p><p>无需安装 Python，也无需开启定时签到。</p></div></li><li>第三步：回到此页面，等待检测通过，自动进入下一步。</li>`;
  section.querySelector('.setup-install-divider').hidden=true;
  section.querySelector('details').innerHTML='<summary>Windows 阻止了安装程序？</summary><p>确认文件来自本项目 Release 后，在 SmartScreen 中选择“更多信息 → 仍要运行”。学校管理的电脑若不允许，请联系管理员。</p>';
 }
 installCompanionDownload(box,{doc,isWindows});
 const importDetails=doc.createElement('details');importDetails.id='setup-import';importDetails.innerHTML='<summary>您有旧的配置？</summary><p>可以导入以前导出的个人配置，跳过重复填写。</p><button id="setup-import-button" type="button">显示导入配置</button>';
 importDetails.querySelector('button').onclick=()=>{importDetails.open=true;doc.getElementById('settings-file')?.click();};
 const resetButton=doc.createElement('button');resetButton.id='setup-reset';resetButton.type='button';resetButton.className='subtle danger-action';resetButton.textContent='清空所有配置与缓存';resetButton.onclick=()=>reset?.();const toolbar=doc.createElement('div');toolbar.className='setup-toolbar setup-toolbar-row';toolbar.append(importDetails,resetButton);box.prepend(toolbar);
 doc.querySelector('header').after(box);let enabled=true,healthy=false,blocked=false,failed=false,reloadRequired=false,healthError='',state={},identityEdit=false,identityStepReadStarted=false,identityEmailCheckStarted=false,identityEmailDiscoveryStarted=false,lastStep='',courseDetectionStarted=false,healthTimer;
 const $=id=>doc.getElementById(id);configureEmailInput($('setup-email'));const identityBindings={},identitySubmit=$('setup-identity').querySelector('button[type=submit]');const syncIdentitySubmit=()=>{identitySubmit.hidden=!(identityBindings.email?.verified&&identityBindings.attendance?.verified);};const scheduleIdentitySubmit=()=>doc.defaultView.setTimeout(syncIdentitySubmit,0);
 identityBindings.attendance=bindIdentityReader({input:$('setup-name'),button:$('setup-read-name'),status:$('setup-read-name-status'),request,doc,onChange:()=>{if(!identityBindings.attendance?.running)identityEdit=true;syncIdentitySubmit();},onVerified:scheduleIdentitySubmit});
 identityBindings.email=installIdentityChecks({email:$('setup-email'),name:$('setup-name'),nameButton:$('setup-read-name'),nameStatus:$('setup-read-name-status'),request,doc,onChange:syncIdentitySubmit,onVerified:scheduleIdentitySubmit});syncIdentitySubmit();
 const emailChooser=doc.createElement('dialog');emailChooser.id='setup-email-chooser';emailChooser.setAttribute('aria-labelledby','setup-email-chooser-title');emailChooser.innerHTML='<h2 id="setup-email-chooser-title">选择学校邮箱</h2><p>检测到多个已登录的学校邮箱，请选择一个继续。</p><form><fieldset><legend>学校邮箱</legend><div id="setup-email-choices"></div></fieldset><div class="setup-email-chooser-actions"><button type="button" data-cancel>取消</button><button type="submit">继续检测</button></div></form>';doc.body.append(emailChooser);
 function chooseEmail(accounts){
  const choices=emailChooser.querySelector('#setup-email-choices');choices.replaceChildren();
  for(const [index,email] of accounts.entries()){
   const label=doc.createElement('label');label.className='setup-email-choice';const input=doc.createElement('input');input.type='radio';input.name='setup-email-choice';input.value=email;input.checked=index===0;const text=doc.createElement('span');text.textContent=email;label.append(input,text);choices.append(label);
  }
  return new Promise(resolve=>{
   let settled=false;
   const finish=value=>{if(settled)return;settled=true;emailChooser.removeEventListener('cancel',onCancel);emailChooser.removeEventListener('close',onClose);emailChooser.querySelector('form').removeEventListener('submit',onSubmit);emailChooser.querySelector('[data-cancel]').removeEventListener('click',onCancel);if(emailChooser.close)emailChooser.close();else emailChooser.removeAttribute('open');resolve(value);};
   const onSubmit=event=>{event.preventDefault();finish(choices.querySelector('input:checked')?.value||null);};
   const onCancel=event=>{event.preventDefault();finish(null);};
   const onClose=()=>finish(null);
   emailChooser.querySelector('form').addEventListener('submit',onSubmit);emailChooser.querySelector('[data-cancel]').addEventListener('click',onCancel);emailChooser.addEventListener('cancel',onCancel);emailChooser.addEventListener('close',onClose);
   if(emailChooser.showModal)emailChooser.showModal();else emailChooser.setAttribute('open','');
  });
 }
 const startEmailVerification=email=>{$('setup-email').value=emailPrefix(email);identityBindings.email.reset();identityEmailCheckStarted=true;void identityBindings.email.start();};
 async function discoverEmailAccounts(){
  try{
   const result=await request({type:'listGmailAccounts'}),accounts=[];
   for(const value of result?.accounts||[]){try{const email=schoolEmail(value);if(!accounts.includes(email))accounts.push(email);}catch{}}
   if(!accounts.length||identityEdit||$('setup-email').value.trim()||doc.body.dataset.setup!=='identity')return;
   if(accounts.length===1){startEmailVerification(accounts[0]);return;}
   $('setup-email-check-status').textContent='检测到多个已登录的学校邮箱，请选择一个。';
   const selected=await chooseEmail(accounts);
   if(selected&&!identityEdit&&!$('setup-email').value.trim()&&doc.body.dataset.setup==='identity')startEmailVerification(selected);
  }catch{}
 }
 function render(){
 const cfg=state.settings||{},identity=Boolean(cfg.email&&cfg.name),complete=identity&&cfg.courses?.length&&cfg.courses.every(c=>cfg.senders?.[c]||cfg.moodleUrls?.[c]?.length);
  const step=!healthy||reloadRequired?'install':!identity||identityEdit?'identity':!complete?'courses':'complete';
  const enteredIdentity=step==='identity'&&lastStep!=='identity';
  if(step!=='courses')courseDetectionStarted=false;
  if(step!=='identity'){identityStepReadStarted=false;identityEmailCheckStarted=false;identityEmailDiscoveryStarted=false;}
  doc.body.dataset.setup=enabled?step:'complete';box.hidden=!enabled||step==='complete';toolbar.hidden=step==='install';
  for(const section of box.querySelectorAll('[data-setup]'))section.hidden=section.dataset.setup!==step;
  [...box.querySelectorAll('.setup-steps li')].forEach((li,i)=>li.setAttribute('aria-current',i===['install','identity','courses'].indexOf(step)?'step':'false'));
  $('setup-reload').hidden=!reloadRequired;$('setup-check').hidden=reloadRequired;
  if(!doc.activeElement?.id?.startsWith('setup-')&&!identityEdit){
   if(cfg.email)$('setup-email').value=emailPrefix(cfg.email);
   if(cfg.name)$('setup-name').value=cfg.name;
  }
  lastStep=step;
  if(enteredIdentity&&!identityStepReadStarted&&!identityEdit&&!$('setup-name').value.trim()&&!identityBindings.attendance.verified&&!identityBindings.attendance.running){
   identityStepReadStarted=true;
   doc.defaultView.setTimeout(()=>{if(enabled&&doc.body.dataset.setup==='identity'&&!identityEdit&&!$('setup-name').value.trim()&&!identityBindings.attendance.verified&&!identityBindings.attendance.running)void identityBindings.attendance.start();},0);
  }
  let validEmail=false;try{schoolEmail($('setup-email').value);validEmail=true;}catch{}
  if(enteredIdentity&&!identityEmailCheckStarted&&!identityEdit&&validEmail&&!identityBindings.email.verified&&!identityBindings.email.running){
   identityEmailCheckStarted=true;
   doc.defaultView.setTimeout(()=>{let ready=false;try{schoolEmail($('setup-email').value);ready=true;}catch{}if(enabled&&doc.body.dataset.setup==='identity'&&!identityEdit&&ready&&!identityBindings.email.verified&&!identityBindings.email.running)void identityBindings.email.start();},0);
  }
  if(enteredIdentity&&!identityEmailDiscoveryStarted&&!identityEdit&&!$('setup-email').value.trim()&&!validEmail){
   identityEmailDiscoveryStarted=true;
   doc.defaultView.setTimeout(()=>{if(enabled&&doc.body.dataset.setup==='identity'&&!identityEdit&&!$('setup-email').value.trim()&&!identityBindings.email.verified&&!identityBindings.email.running)void discoverEmailAccounts();},0);
  }
  if(enabled&&step==='courses'&&!courseDetectionStarted){courseDetectionStarted=true;doc.defaultView.setTimeout(()=>{if(enabled&&doc.body.dataset.setup==='courses')detect?.();},0);}
 }
 $('setup-check').onclick=()=>checkHealth();$('setup-reload').onclick=()=>reload();
 $('setup-detect').onclick=()=>detect();$('setup-back').onclick=()=>{$('setup-email').value=emailPrefix(state.settings?.email);$('setup-name').value=state.settings?.name||'';identityEdit=true;render();};
 $('setup-identity').onsubmit=async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;$('setup-identity-error').textContent='正在保存…';try{await request({type:'identity',email:schoolEmail($('setup-email').value),name:$('setup-name').value});identityEdit=false;$('setup-identity-error').textContent='';await refresh(true);}catch(error){$('setup-identity-error').textContent=error.message;}finally{button.disabled=false;}};
 render();return {
  update(value){state=value;enabled=value.setupGuide===true;render();},
  health(result,error){blocked=Boolean(result?.nativeBlocked);healthError=normalizeNativeHealthError(result?.healthError||error,doc.documentElement?.lang||'');$('setup-check').textContent=blocked?'已在系统设置允许，重新检测':'我已安装，立即检测';healthy=Boolean(result?.binaryReady);if(!healthy)failed=true;else reloadRequired=false;const message=healthy?'检测成功':(blocked?'attendance-ocr 未通过启动自检。请按提示更新或允许程序，再手动点击重新检测。':healthError||'');$('setup-health-message').textContent=message;$('setup-health-message').dataset.state=healthy?'ready':healthError||blocked?'error':'pending';$('setup-health-success').hidden=!healthy;render();},
  needsHealth(){return enabled&&!healthy&&!blocked;},
  checking(value,seconds=5){const activity=$('setup-health-activity'),ring=$('setup-health-ring'),message=$('setup-health-message');doc.defaultView.clearInterval(healthTimer);if(!value&&!healthy&&!blocked&&!reloadRequired&&!healthError){value=true;seconds=5;}activity.hidden=!value;$('setup-health-success').hidden=!healthy;if(!value){ring.style.setProperty('--health-progress','0%');return;}message.dataset.state='pending';const deadline=Date.now()+seconds*1000;const tick=()=>{const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));ring.style.setProperty('--health-progress',`${Math.max(0,remaining/seconds*100)}%`);message.textContent=`暂未检测到，${remaining} 秒后自动检查`;activity.setAttribute('aria-label',`正在检查识别服务，剩余 ${remaining} 秒`);};tick();healthTimer=doc.defaultView.setInterval(tick,1000);},
  message(text,error=false){$('setup-course-message').textContent=text;$('setup-course-message').dataset.error=String(error);},
  detecting(value){$('setup-detect').disabled=value;$('setup-detect').textContent=value?'正在检测课程…':'已登录，检测课程信息';},
  get active(){return enabled;}
 };
}
