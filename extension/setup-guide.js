export function createSetupGuide({doc=document,request,refresh,detect,checkHealth,reload,reset}){
 const box=doc.createElement('section');box.id='setup-guide';box.className='card';box.innerHTML=`
 <ol class="setup-steps"><li>1 安装识别服务</li><li>2 填写身份</li><li>3 登录并配置课程</li></ol>
 <div data-setup="install"><h2>先安装 Mac 识别服务</h2><p>完成这一步后，才能识别签到图片。</p><ol class="setup-instructions"><li>打开下载并解压的安装包。</li><li>双击 <strong>安装Mac识别服务.command</strong>，按终端提示安装。</li><li>回到此页面，等待检测通过，再点击“刷新并继续”。</li></ol><p id="setup-health" role="status">正在检查识别服务…</p><button id="setup-check" type="button">我已安装，立即检测</button><button id="setup-reload" type="button" hidden>安装成功 · 刷新并继续</button><details><summary>macOS 提示无法验证开发者、打不开？</summary><p>确认文件来自本项目 Release 后，先尝试打开一次，再进入 <strong>系统设置 → 隐私与安全性 → 安全性 → 仍要打开</strong>，按提示确认。只允许这个文件，不需要关闭系统安全保护。</p><a href="https://support.apple.com/zh-cn/102445" target="_blank" rel="noreferrer">查看 Apple 操作说明 ↗</a></details><a href="https://github.com/mxymalay/mamo-checkin/releases/latest" target="_blank" rel="noreferrer">下载安装包 ↗</a></div>
 <div data-setup="identity" hidden><h2>填写你的学校身份</h2><p>用于核对登录账号，避免在错误账号下签到。</p><form id="setup-identity"><label>学校邮箱<input id="setup-email" type="email" required autocomplete="email" placeholder="student@example.edu"></label><label>签到系统显示的姓名<input id="setup-name" required autocomplete="name" placeholder="与学校系统完全一致"></label><button type="submit">保存身份 · 下一步</button></form><p id="setup-identity-error" role="alert"></p></div>
 <div data-setup="courses" hidden><h2>登录学校网站，再检测课程</h2><p>请在当前 Chrome 配置文件登录签到系统。点击检测后会生成课表，再为每门课选择邮件或 Moodle 来源。</p><div class="setup-links"><a href="https://attendance.monash.edu.my/student/Units.aspx" target="_blank" rel="noreferrer">① 打开签到系统并登录 ↗</a><a href="https://mail.google.com/" target="_blank" rel="noreferrer">登录学校 Gmail ↗</a><a href="https://learning.monash.edu/" target="_blank" rel="noreferrer">登录 Moodle ↗</a></div><button id="setup-detect" type="button">② 已登录，检测课程信息</button><button id="setup-back" type="button">修改姓名或邮箱</button><p id="setup-course-message" role="status">检测完成后，请在下方核对课程、选择来源并保存，完成后才会显示完整页面。</p></div>`;
 const resetButton=doc.createElement('button');resetButton.id='setup-reset';resetButton.type='button';resetButton.className='subtle danger-action';resetButton.textContent='清空配置与缓存，重新开始';resetButton.onclick=()=>reset?.();box.append(resetButton);
 doc.querySelector('header').after(box);let enabled=true,healthy=false,failed=false,reloadRequired=false,state={},identityEdit=false;
 const $=id=>doc.getElementById(id);
 function render(){
  const cfg=state.settings||{},identity=Boolean(cfg.email&&cfg.name),complete=identity&&cfg.courses?.length&&cfg.courses.every(c=>cfg.senders?.[c]||cfg.moodleUrls?.[c]?.length);
  const step=!healthy||reloadRequired?'install':!identity||identityEdit?'identity':!complete?'courses':'complete';
  doc.body.dataset.setup=enabled?step:'complete';box.hidden=!enabled||step==='complete';
  for(const section of box.querySelectorAll('[data-setup]'))section.hidden=section.dataset.setup!==step;
  [...box.querySelectorAll('.setup-steps li')].forEach((li,i)=>li.setAttribute('aria-current',i===['install','identity','courses'].indexOf(step)?'step':'false'));
  $('setup-reload').hidden=!reloadRequired;$('setup-check').hidden=reloadRequired;
  if(!doc.activeElement?.id?.startsWith('setup-')&&identity&&!identityEdit){$('setup-email').value=cfg.email;$('setup-name').value=cfg.name;}
 }
 $('setup-check').onclick=()=>checkHealth();$('setup-reload').onclick=()=>reload();
 $('setup-detect').onclick=()=>detect();$('setup-back').onclick=()=>{$('setup-email').value=state.settings?.email||'';$('setup-name').value=state.settings?.name||'';identityEdit=true;render();};
 $('setup-identity').onsubmit=async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;$('setup-identity-error').textContent='正在保存…';try{await request({type:'identity',email:$('setup-email').value,name:$('setup-name').value});identityEdit=false;$('setup-identity-error').textContent='';await refresh(true);}catch(error){$('setup-identity-error').textContent=error.message;}finally{button.disabled=false;}};
 render();return {
  update(value){state=value;enabled=value.setupGuide===true;render();},
  health(result,error){healthy=Boolean(result?.binaryReady);if(!healthy)failed=true;else if(failed)reloadRequired=true;$('setup-health').textContent=healthy?(reloadRequired?'已检测到识别服务安装成功。请点击下方按钮刷新，继续填写身份。':'识别服务已就绪。'):'尚未连接识别服务。请完成安装；本页每 5 秒自动重试，无需反复刷新。'+(error?' '+error:'');render();},
  needsHealth(){return enabled&&!healthy;},
  message(text,error=false){$('setup-course-message').textContent=text;$('setup-course-message').dataset.error=String(error);},
  detecting(value){$('setup-detect').disabled=value;$('setup-detect').textContent=value?'正在检测课程（最多 30 秒）…':'② 已登录，检测课程信息';},
  get active(){return enabled;}
 };
}
