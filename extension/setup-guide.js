import {isWindows} from './platform.js';
import {schoolEmail,emailPrefix,configureEmailInput} from './school-email.js';
export function createSetupGuide({doc=document,request,refresh,detect,checkHealth,reload,reset}){
 const box=doc.createElement('section');box.id='setup-guide';box.className='card';box.innerHTML=`
 <ol class="setup-steps"><li>1 安装识别服务</li><li>2 填写身份</li><li>3 登录并配置课程</li></ol>
 <div data-setup="install"><h2>先安装 Mac 识别服务</h2><p>完成这一步后，才能识别签到图片。</p><ol class="setup-instructions"><li>打开下载并解压的安装包。</li><li class="authorization-step"><span class="authorization-number" aria-hidden="true">1</span><div><strong class="authorization-title">安装命令授权</strong><p>双击 <strong>安装Mac识别服务.command</strong>，按终端提示安装。</p><p>如被阻止：系统设置 → 隐私与安全性 → 仍要打开。</p></div></li><li class="authorization-step"><span class="authorization-number" aria-hidden="true">2</span><div><strong class="authorization-title">attendance-ocr 授权</strong><p>第一步允许后，识别程序还需要单独授权。</p><p>如果 <strong>attendance-ocr</strong> 被阻止，请再次前往 <strong>系统设置 → 隐私与安全性 → 仍要打开</strong>，允许后回到这里重新检测。</p></div></li><li>回到此页面，等待检测通过，再点击“刷新并继续”。</li></ol><p id="setup-health" role="status">正在检查识别服务…</p><button id="setup-check" type="button">我已安装，立即检测</button><button id="setup-reload" type="button" hidden>安装成功 · 刷新并继续</button><details><summary>macOS 提示无法验证开发者、打不开？</summary><p>确认文件来自本项目 Release 后，先尝试打开一次，再进入 <strong>系统设置 → 隐私与安全性 → 安全性 → 仍要打开</strong>，按提示确认。只允许这个文件，不需要关闭系统安全保护。</p><a href="https://support.apple.com/zh-cn/102445" target="_blank" rel="noreferrer">查看 Apple 操作说明 ↗</a></details><a href="https://github.com/mxymalay/mamo-checkin/releases/latest" target="_blank" rel="noreferrer">下载安装包 ↗</a></div>
 <div data-setup="identity" hidden><h2>填写你的学校身份</h2><p>用于核对登录账号，避免在错误账号下签到。</p><form id="setup-identity"><label>学校邮箱<input id="setup-email" type="email" required autocomplete="email" placeholder="student@example.edu"></label><label>签到系统显示的姓名<input aria-describedby="setup-name-hint" id="setup-name" required autocomplete="name" placeholder="与学校系统完全一致"><small id="setup-name-hint" class="name-hint"><a href="https://attendance.monash.edu.my/student/Default.aspx" target="_blank" rel="noopener noreferrer">Attendance系统</a> · 填写最上方的姓名</small></label><button type="submit">保存身份 · 下一步</button></form><p id="setup-identity-error" role="alert"></p></div>
 <div data-setup="courses" hidden><h2>登录学校网站，再检测课程</h2><p>请在当前 Chrome 配置文件登录签到系统。点击检测后会生成课表，再为每门课选择邮件或 Moodle 来源。</p><div class="setup-links"><a href="https://attendance.monash.edu.my/student/Units.aspx" target="_blank" rel="noreferrer">① 打开签到系统并登录 ↗</a><a href="https://mail.google.com/" target="_blank" rel="noreferrer">登录学校 Gmail ↗</a><a href="https://learning.monash.edu/" target="_blank" rel="noreferrer">登录 Moodle ↗</a></div><button id="setup-detect" type="button">② 已登录，检测课程信息</button><button id="setup-back" type="button">修改姓名或邮箱</button><p id="setup-course-message" role="status">检测完成后，请在下方核对课程、选择来源并保存，完成后才会显示完整页面。</p></div>`;
 if(isWindows){
  const section=box.querySelector('[data-setup="install"]');
  section.querySelector('h2').textContent='先安装 Windows 识别服务';
  section.querySelector('.setup-instructions').innerHTML=`<li>打开下载并解压的安装包。</li><li class="authorization-step"><span class="authorization-number">1</span><div><strong>安装 Tesseract OCR</strong><p><a href="https://github.com/tesseract-ocr/tesseract/releases/download/5.5.0/tesseract-ocr-w64-setup-5.5.0.20241111.exe" target="_blank" rel="noreferrer">下载 Tesseract Windows 安装程序 ↗</a></p><p>使用默认安装位置，保留 English 语言数据。</p></div></li><li class="authorization-step"><span class="authorization-number">2</span><div><strong>连接浏览器</strong><p>双击 Install Windows OCR.exe，等待安装成功。</p><p>无需安装 Python，也无需开启定时签到。</p></div></li><li>回到此页面，等待检测通过，再点击“刷新并继续”。</li>`;
  section.querySelector('details').innerHTML='<summary>Windows 阻止了安装程序？</summary><p>确认文件来自本项目 Release 后，在 SmartScreen 中选择“更多信息 → 仍要运行”。学校管理的电脑若不允许，请联系管理员。</p>';
 }
 const resetButton=doc.createElement('button');resetButton.id='setup-reset';resetButton.type='button';resetButton.className='subtle danger-action';resetButton.textContent='清空所有配置与缓存';resetButton.onclick=()=>reset?.();const toolbar=doc.createElement('div');toolbar.className='setup-toolbar';toolbar.append(resetButton);box.prepend(toolbar);
 doc.querySelector('header').after(box);let enabled=true,healthy=false,blocked=false,failed=false,reloadRequired=false,state={},identityEdit=false;
 const $=id=>doc.getElementById(id);configureEmailInput($('setup-email'));
 function render(){
  const cfg=state.settings||{},identity=Boolean(cfg.email&&cfg.name),complete=identity&&cfg.courses?.length&&cfg.courses.every(c=>cfg.senders?.[c]||cfg.moodleUrls?.[c]?.length);
  const step=!healthy||reloadRequired?'install':!identity||identityEdit?'identity':!complete?'courses':'complete';
  doc.body.dataset.setup=enabled?step:'complete';box.hidden=!enabled||step==='complete';
  for(const section of box.querySelectorAll('[data-setup]'))section.hidden=section.dataset.setup!==step;
  [...box.querySelectorAll('.setup-steps li')].forEach((li,i)=>li.setAttribute('aria-current',i===['install','identity','courses'].indexOf(step)?'step':'false'));
  $('setup-reload').hidden=!reloadRequired;$('setup-check').hidden=reloadRequired;
  if(!doc.activeElement?.id?.startsWith('setup-')&&identity&&!identityEdit){$('setup-email').value=emailPrefix(cfg.email);$('setup-name').value=cfg.name;}
 }
 $('setup-check').onclick=()=>checkHealth();$('setup-reload').onclick=()=>reload();
 $('setup-detect').onclick=()=>detect();$('setup-back').onclick=()=>{$('setup-email').value=emailPrefix(state.settings?.email);$('setup-name').value=state.settings?.name||'';identityEdit=true;render();};
 $('setup-identity').onsubmit=async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;$('setup-identity-error').textContent='正在保存…';try{await request({type:'identity',email:schoolEmail($('setup-email').value),name:$('setup-name').value});identityEdit=false;$('setup-identity-error').textContent='';await refresh(true);}catch(error){$('setup-identity-error').textContent=error.message;}finally{button.disabled=false;}};
 render();return {
  update(value){state=value;enabled=value.setupGuide===true;render();},
  health(result,error){blocked=Boolean(result?.nativeBlocked);error=result?.healthError||error;$('setup-check').textContent=blocked?'已在系统设置允许，重新检测':'我已安装，立即检测';healthy=Boolean(result?.binaryReady);if(!healthy)failed=true;else if(failed)reloadRequired=true;$('setup-health').textContent=healthy?(reloadRequired?'已检测到识别服务安装成功。请点击下方按钮刷新，继续填写身份。':'识别服务已就绪。'):(blocked?'attendance-ocr 未通过启动自检。请按提示更新或允许程序，再手动点击重新检测。':'尚未连接识别服务。请完成安装；本页每 5 秒自动重试，无需反复刷新。')+(error?' '+error:'');render();},
  needsHealth(){return enabled&&!healthy&&!blocked;},
  message(text,error=false){$('setup-course-message').textContent=text;$('setup-course-message').dataset.error=String(error);},
  detecting(value){$('setup-detect').disabled=value;$('setup-detect').textContent=value?'正在检测课程（最多 30 秒）…':'② 已登录，检测课程信息';},
  get active(){return enabled;}
 };
}
