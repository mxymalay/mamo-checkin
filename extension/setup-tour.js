const STORAGE_KEY='mamo-setup-tour-v1';

const copy={
 zh:{
  skip:'跳过引导',next:'知道了',finish:'完成引导',step:'步骤',
  installTitle:'先选择识别方式',
  installText:'点击这里即可使用内置识别，无需安装。也可以按上方步骤安装 Apple Vision 配套包。',
  identityTitle:'确认学校身份',
  identityText:'登录 Attendance 后，助手会自动读取姓名。核对无误后继续。',
  coursesTitle:'检测并配置课程',
  coursesText:'课程会自动读取。为每门课选择 Gmail、Moodle 或其他来源后保存。',
  completeTitle:'准备开始签到',
  completeText:'初始化完成。点击这里开始第一次自动检查。'
 },
 en:{
  skip:'Skip guide',next:'Got it',finish:'Finish guide',step:'Step',
  installTitle:'Choose your recognition method',
  installText:'Choose this to use built-in recognition with no installation. Or follow the steps above to install the Apple Vision helper.',
  identityTitle:'Confirm your school identity',
  identityText:'Sign in to Attendance and the assistant will read your name automatically. Check it before continuing.',
  coursesTitle:'Detect and configure courses',
  coursesText:'Courses are detected automatically. Choose Gmail, Moodle or another source for each course, then save.',
  completeTitle:'Ready to check in',
  completeText:'Setup is complete. Click here to start your first automatic check.'
 }
};

function makeStorage(doc,provided){
 if(provided)return provided;
 try{return doc.defaultView?.localStorage||null;}catch{return null;}
}
function readFlag(storage){try{return storage?.getItem(STORAGE_KEY)==='done';}catch{return false;}}
function saveFlag(storage){try{storage?.setItem(STORAGE_KEY,'done');}catch{} }
function isHidden(node){return !node||node.hidden||node.closest('[hidden]')||getComputedStyleSafe(node).display==='none';}
function getComputedStyleSafe(node){try{return node.ownerDocument.defaultView.getComputedStyle(node);}catch{return {display:''};}}

export function createSetupTour({doc=document,windows=false,storage}={}){
 const saved=makeStorage(doc,storage);
 const root=doc.createElement('div');root.id='setup-tour';root.hidden=true;root.setAttribute('aria-hidden','true');
 root.innerHTML='<div class="setup-tour-spotlight" aria-hidden="true"></div><section class="setup-tour-bubble" role="dialog" aria-modal="false" aria-labelledby="setup-tour-title" aria-describedby="setup-tour-text"><div class="setup-tour-meta"><span id="setup-tour-progress"></span><button id="setup-tour-skip" type="button"></button></div><h2 id="setup-tour-title"></h2><p id="setup-tour-text"></p><div class="setup-tour-actions"><button id="setup-tour-next" type="button" class="primary"></button></div></section>';
 doc.body.append(root);
 const spotlight=root.querySelector('.setup-tour-spotlight'),bubble=root.querySelector('.setup-tour-bubble'),progress=root.querySelector('#setup-tour-progress'),title=root.querySelector('#setup-tour-title'),text=root.querySelector('#setup-tour-text'),skip=root.querySelector('#setup-tour-skip'),next=root.querySelector('#setup-tour-next');
 const stages=windows?['identity','courses','complete']:['install','identity','courses','complete'];
 let state=null,current='',target=null,frame=0,observer=null,started=false,dismissed=readFlag(saved),destroyed=false;
 const acknowledged=new Set();
 const lang=()=>/^en(?:-|$)/i.test(doc.documentElement?.lang||'')?'en':'zh';
 const targetFor=stage=>{
  const selectors=stage==='install'?['#setup-skip-ocr']:stage==='identity'?['#setup-name','#setup-identity']:stage==='courses'?['#courses [data-field="source-mode"]','.setup-course-header','#setup-course-message']:['#scan'];
  for(const selector of selectors){const node=doc.querySelector(selector);if(!isHidden(node)){const rect=node.getBoundingClientRect();if(rect.width>0&&rect.height>0)return node;}}
  return null;
 };
 const indexOf=stage=>Math.max(0,stages.indexOf(stage));
 function position(){
  if(root.hidden||!target)return;
  const rect=target.getBoundingClientRect(),margin=12,gap=18,bubbleWidth=Math.min(380,doc.defaultView.innerWidth-margin*2);
  bubble.style.width=`${bubbleWidth}px`;
  const bubbleHeight=bubble.offsetHeight||180;
  let top=rect.bottom+gap;
  if(top+bubbleHeight>doc.defaultView.innerHeight-margin)top=rect.top-bubbleHeight-gap;
  top=Math.max(margin,Math.min(top,doc.defaultView.innerHeight-bubbleHeight-margin));
  const left=Math.max(margin,Math.min(rect.left,doc.defaultView.innerWidth-bubbleWidth-margin));
  bubble.dataset.side=top<rect.top?'above':'below';
  bubble.style.setProperty('--tour-arrow',`${Math.max(20,Math.min(rect.left+rect.width/2-left,bubbleWidth-20))}px`);
  Object.assign(spotlight.style,{left:`${Math.max(4,rect.left-6)}px`,top:`${Math.max(4,rect.top-6)}px`,width:`${Math.max(20,rect.width+12)}px`,height:`${Math.max(20,rect.height+12)}px`});
  Object.assign(bubble.style,{left:`${left}px`,top:`${top}px`,width:`${bubbleWidth}px`});
 }
 function schedulePosition(){if(frame||destroyed)return;frame=doc.defaultView.setTimeout(()=>{frame=0;if(state)update(state);},16);}
 function hide(){root.hidden=true;root.setAttribute('aria-hidden','true');target=null;}
 function show(stage){
  const node=targetFor(stage);if(!node){hide();return false;}
  const changed=target!==node,rect=node.getBoundingClientRect();
  if(changed&&(rect.top<12||rect.bottom>doc.defaultView.innerHeight-220))node.scrollIntoView?.({block:'center',behavior:'auto'});
  const c=copy[lang()];target=node;current=stage;
  const setText=(element,value)=>{if(element.textContent!==value)element.textContent=value;};
  setText(progress,`${c.step} ${indexOf(stage)+1} / ${stages.length}`);setText(title,c[`${stage}Title`]);setText(text,c[`${stage}Text`]);setText(skip,c.skip);setText(next,stage==='complete'?c.finish:c.next);
  root.hidden=false;root.setAttribute('aria-hidden','false');position();return true;
 }
 function stageFromState(value){
  const stage=doc.body.dataset.setup;
  if(stage&&stages.includes(stage))return stage;
  if(value?.setupGuide!==true)return '';
  const settings=value.settings||{};
  if(!windows&&!value.ocrPreference&&!settings.name)return 'install';
  if(!settings.name)return 'identity';
  return settings.courses?.length?'complete':'courses';
 }
 function update(value={}){
  state=value||{};
  if(destroyed||dismissed||readFlag(saved)||value.setupGuide!==true){hide();return;}
  const config=value.settings||{};
  if(!started&&config.name&&config.courses?.length&&config.courses.every(course=>config.senders?.[course]||config.moodleUrls?.[course]?.length||config.edUrls?.[course]?.length)){hide();return;}
  const stage=stageFromState(value);if(!stage){hide();return;}
  if(stage==='complete'&&!started){hide();return;}
  if(stage!=='complete')started=true;
  if(acknowledged.has(stage)){hide();return;}
  if(doc.querySelector('dialog[open]')){hide();return;}
  show(stage);
 }
 function dismiss(){dismissed=true;saveFlag(saved);hide();}
 skip.onclick=dismiss;
 next.onclick=()=>{if(current==='complete'){dismiss();return;}acknowledged.add(current);hide();};
 const onKey=event=>{if(event.key==='Escape'&&!root.hidden)dismiss();};
 doc.addEventListener('keydown',onKey);
 const reposition=()=>schedulePosition();
 doc.defaultView.addEventListener('resize',reposition);doc.defaultView.addEventListener('scroll',reposition,true);
 if(doc.defaultView.MutationObserver){observer=new doc.defaultView.MutationObserver(mutations=>{if(mutations.some(item=>!root.contains(item.target)))schedulePosition();});observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style','data-setup','open']});observer.observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});}
 return {update,hide,reset(){try{saved?.removeItem(STORAGE_KEY);}catch{}dismissed=false;started=false;current='';acknowledged.clear();hide();},get active(){return !root.hidden;},destroy(){destroyed=true;doc.defaultView.clearTimeout(frame);observer?.disconnect();doc.removeEventListener('keydown',onKey);doc.defaultView.removeEventListener('resize',reposition);doc.defaultView.removeEventListener('scroll',reposition,true);root.remove();}};
}
