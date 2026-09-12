export const STORE_ID='mneachaobiledakoicnkinfdpcjkbnmm';
export function installCompanionDownload(box,{doc=document,isWindows=false,downloads}={}){
 const section=box.querySelector('[data-setup="install"]');
 if(!section)return;
 const instructions=section.querySelector('.setup-instructions');
 const download=section.querySelector('a[href="https://github.com/mxymalay/mamo-checkin/releases/latest"]');
 if(!download||!instructions)return;
 download.id='download-companion';download.className='identity-check companion-download';
 download.href='https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-'+(isWindows?'windows':'mac')+'.zip';
 download.textContent=isWindows?'下载 Windows OCR 配套程序':'下载 Mac OCR 配套程序';
 const downloadsApi=downloads||globalThis.chrome?.downloads;
 const title=(text)=>{const element=doc.createElement('strong');element.className='authorization-title';element.textContent=text;return element;};
 const panel=(text,number)=>{const element=doc.createElement('li');element.className='setup-step-panel';element.dataset.stepPanel=String(number);element.append(title(text));return element;};
 const first=panel(isWindows?'第一步：下载 Windows OCR 配套包':'第一步：下载 Mac OCR 配套包',1);
 const row=doc.createElement('div');row.className='companion-download-row';
 const hint=doc.createElement('span');hint.className='muted companion-download-hint';hint.textContent='请下载后解压。随后进行以下步骤。';
 download.remove();row.append(download);first.append(row,hint);
 const second=panel('第二步：打开解压后的 OCR 包。',2);
 const authorizationSteps=[...instructions.children].filter(element=>element.classList.contains('authorization-step'));
 if(authorizationSteps.length){const authorizationList=doc.createElement('ol');authorizationList.className='setup-authorization-list';authorizationList.append(...authorizationSteps);second.append(authorizationList);}
 const installDivider=section.querySelector('.setup-install-divider'),platformHelp=section.querySelector('details');
 if(installDivider)second.append(installDivider);
 if(platformHelp)second.append(platformHelp);
 const third=panel('第三步：回到此页面，等待检测通过，自动进入下一步。',3);
 for(const id of ['setup-health','setup-check','setup-reload']){const element=section.querySelector('#'+id);if(element)third.append(element);}
 instructions.replaceChildren(first,second,third);instructions.classList.add('setup-step-track');
 const viewport=doc.createElement('div');viewport.className='setup-step-viewport';instructions.replaceWith(viewport);viewport.append(instructions);
 const controls=doc.createElement('div');controls.className='setup-step-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','安装步骤');
 const previous=doc.createElement('button');previous.type='button';previous.className='setup-step-arrow';previous.textContent='←';previous.setAttribute('aria-label','上一步');previous.title='上一步';
 const dots=doc.createElement('div');dots.className='setup-step-dots';dots.setAttribute('role','tablist');dots.setAttribute('aria-label','安装步骤');
 const next=doc.createElement('button');next.type='button';next.className='setup-step-arrow';next.textContent='→';next.setAttribute('aria-label','下一步');next.title='下一步';
 let current=0;
 const dotButtons=[];
 const resize=()=>{const active=instructions.children[current];if(!active)return;viewport.style.height='auto';const height=active.scrollHeight||active.offsetHeight;if(height)viewport.style.height=`${height}px`;};
 const update=()=>{instructions.style.transform=`translateX(-${current*100}%)`;previous.disabled=current===0;next.disabled=current===2;dotButtons.forEach((button,index)=>{const active=index===current;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});resize();};
 for(let index=0;index<3;index++){const dot=doc.createElement('button');dot.type='button';dot.className='setup-step-dot';dot.textContent='';dot.setAttribute('role','tab');dot.setAttribute('aria-label',`第${index+1}步`);dot.setAttribute('aria-selected',String(index===0));dot.tabIndex=index===0?0:-1;dot.onclick=()=>{current=index;update();};dots.append(dot);dotButtons.push(dot);}
 previous.onclick=()=>{if(current>0){current--;update();}};next.onclick=()=>{if(current<2){current++;update();}};
 controls.append(previous,dots,next);viewport.after(controls);update();
 const trackDownload=async event=>{
  if(!downloadsApi?.download||!downloadsApi?.search)return;
  event.preventDefault();
  if(download.dataset.downloadState==='active')return;
  download.dataset.downloadState='active';download.setAttribute('aria-busy','true');
  try{
   const id=await downloadsApi.download({url:download.href,saveAs:false,conflictAction:'uniquify'});
   const deadline=Date.now()+120000;
   while(Date.now()<deadline){
    const [item]=await downloadsApi.search({id});
    if(item?.state==='complete'){current=1;update();return;}
    if(item?.state==='interrupted')return;
    await new Promise(resolve=>doc.defaultView.setTimeout(resolve,250));
   }
  }catch{}
  finally{delete download.dataset.downloadState;download.removeAttribute('aria-busy');}
 };
 download.addEventListener('click',event=>{void trackDownload(event);});
 doc.defaultView.addEventListener('resize',resize);
 if(typeof doc.defaultView.ResizeObserver==='function'){const observer=new doc.defaultView.ResizeObserver(resize);for(const step of instructions.children)observer.observe(step);}
}
