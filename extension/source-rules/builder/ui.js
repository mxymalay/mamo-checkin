import {ruleUI} from '../ui.js';
import {courseUsesSource} from '../../course-sources.js';
import {parseRule} from '../format.js';
import {creationLayout} from '../creation-layout.js';

export function installRuleBuilderUI({root,request:transport,translate,chrome,onBack,onImports=()=>{},onSaved=()=>{}}){
 const {doc,el,t,options,field,help}=ruleUI(root,translate);
 const layout=creationLayout(el);
 const hints=new URLSearchParams(doc.defaultView.location.search);let useHint=true;
 let active=false,pending=false,saving=false,session=null,settings={},timer=null,expiryTimer=null,port=null,revision=0,tabRevision=0,lifecycle=0;
 let step=1,availableStep=1,ocrResult=null,adding=false,finished=false;
 const request=async message=>{const epoch=lifecycle,result=await transport(message);if(epoch!==lifecycle||!active){if(message.type==='builderStart')await transport({type:'builderCancel'});throw new Error('builder-cancelled');}return result;};
 root.classList.add('rule-builder','creation-flow');root.dataset.ruleUi='';
 const button=(key,action,fn)=>{const label=t('builder-'+key),b=el('button',label,['pick','preview','ocr','enable'].includes(key)?'primary':'subtle');b.type='button';b.dataset.builderAction=action;b.onclick=fn;if(['refresh','cancel'].includes(key)){const icon=el('span',undefined,'builder-tool-icon builder-icon-'+key);icon.setAttribute('aria-hidden','true');b.replaceChildren(icon);b.classList.add('builder-tool');b.title=label;b.setAttribute('aria-label',label);}return b;};
 const feedback=el('p',undefined,'rule-feedback creation-notice');feedback.setAttribute('role','status');
 const viewImports=el('button',t('view-imports'),'subtle');viewImports.type='button';viewImports.dataset.builderAction='view-imports';viewImports.onclick=()=>onImports();
 const notify=(message='',tone='info')=>{feedback.textContent=message;feedback.dataset.tone=tone;feedback.setAttribute('role',tone==='error'?'alert':'status');};
 const course=el('select'),source=el('select'),tab=el('select'),filters=layout.fields([]);filters.classList.add('builder-filters');
 const refresh=button('refresh','refresh',()=>perform(loadTabs));
 filters.append(field('course',course),field('source',source),field('builder-tab',tab));
 const start=button('pick','start',()=>perform(async()=>{
  session=adding?await send('builderSample',{course:course.value,tabId:Number(tab.value)}):await request({type:'builderStart',course:course.value,source:source.value,tabId:Number(tab.value),labels:{pick:t('builder-pick-instruction'),cancel:t('cancel-edit')}});adding=false;finished=false;ocrResult=null;await selectionChanged();poll();
 })),add=button('add-sample','sample',()=>{adding=true;step=1;availableStep=2;ocrResult=null;notify();updateControls();});
 start.className='primary';
 const next=button('continue','context',()=>{step=2;availableStep=Math.max(availableStep,2);notify();updateControls();});next.className='primary';
 const actions=layout.actions(next);actions.classList.add('builder-context-actions');
 const picking=layout.actions(start,help('builder-help'));
 const samples=el('div',undefined,'builder-samples'),details=el('details'),summary=el('summary',t('builder-json')),json=el('pre');json.tabIndex=0;json.dataset.ruleLiteral='';details.append(summary,json);
 const name=el('input');name.type='text';name.maxLength=100;const nameField=field('builder-name-label',name);nameField.className='builder-name';nameField.hidden=true;
 const id=el('input');id.type='text';id.name='ruleId';id.maxLength=256;id.autocomplete='off';id.spellcheck=false;const idField=field('builder-id-label',id);idField.className='builder-name';idField.hidden=true;
 name.oninput=id.oninput=()=>updateControls();
 const author=el('input'),authorUrl=el('input');author.name='authorName';author.maxLength=256;authorUrl.name='authorUrl';authorUrl.type='url';authorUrl.maxLength=2048;
 const authorFields=layout.fields([field('builder-author',author),field('builder-author-url',authorUrl)],'metadata');
 const matchesNext=button('matches-next','matches-next',()=>{if(!session?.canEnable)return;step=4;availableStep=4;notify();updateControls();});matchesNext.className='primary';
 const matchActions=layout.actions(matchesNext,add);
 const ocrRow=layout.recognition(),ocrImage=el('select'),ocrOutput=el('pre');ocrRow.classList.add('builder-ocr-row');ocrOutput.dataset.ruleLiteral='';
 const ocr=button('ocr','ocr',()=>perform(async()=>{ocrResult=null;availableStep=4;ocrOutput.textContent='';try{const result=await send('builderRecognize',{imageId:ocrImage.value});const text=(Array.isArray(result.text)?result.text:[result.text||'']).join('\n');ocrResult=text.trim()?'success':'failed';ocrOutput.textContent=text||t('builder-ocr-empty');notify(text.trim()?'':t('builder-ocr-empty'),text.trim()?'info':'warning');}catch(error){ocrResult='failed';throw error;}}));
 ocrImage.onchange=()=>{ocrOutput.textContent='';ocrResult=null;availableStep=4;notify();updateControls();};ocrRow.append(field('builder-image-alt',ocrImage),ocr);
 const ocrNext=button('ocr-next','ocr-next',()=>{step=availableStep=5;notify();updateControls();});ocrNext.className='primary';
 const skip=button('skip','skip',()=>{ocrResult='skipped';step=availableStep=5;notify();updateControls();});
 const ocrActions=layout.actions(ocrNext,skip);
 const draft=button('draft','draft',()=>save('draft')),enable=button('enable','enable',()=>save('matching'));enable.className='primary';
 const exportButton=button('export','export',()=>perform(async()=>{
  await send('builderExport');const rule=editedRule(),url=doc.defaultView.URL.createObjectURL(new Blob([JSON.stringify(rule,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download=rule.id+'.json';a.click();doc.defaultView.setTimeout(()=>doc.defaultView.URL.revokeObjectURL(url),1000);notify();
 }));
 const stop=button('cancel','cancel',()=>{void cancel().then(()=>{notify(t('builder-cancelled'),'success');updateControls();});});
 const toolbar=layout.toolbar(refresh,stop);toolbar.classList.add('builder-toolbar');
 const footer=layout.actions(draft,exportButton,enable);footer.classList.add('builder-footer');footer.hidden=true;
 const steps=el('ol',undefined,'practice-steps builder-steps');steps.setAttribute('aria-label',t('create-actual'));
 const currentStep=el('p',undefined,'practice-current');
 const panels=Array.from({length:5},()=>el('section',undefined,'builder-step creation-content'));
 panels[0].append(filters,actions);panels[1].append(picking);panels[2].append(matchActions,samples);panels[3].append(ocrRow,ocrActions,ocrOutput);panels[4].append(layout.fields([nameField,idField],'metadata'),authorFields,details,footer);
 root.replaceChildren(toolbar,currentStep,steps,...panels,feedback);
 const send=(type,extra={})=>request({type,sessionId:session?.sessionId,revision:session?.revision,...extra});
 function updateControls(){
  for(const b of root.querySelectorAll('button,select,input'))b.disabled=pending;
  stop.disabled=saving||!session&&!pending&&!finished;
  refresh.hidden=step!==1;
  footer.hidden=step!==5;for(const b of [draft,exportButton,enable])b.hidden=!session?.rule&&!finished;
  start.hidden=false;add.hidden=!session;source.disabled=pending||Boolean(session);
  start.disabled=pending||!tab.value||source.value==='ed';add.disabled=pending||!tab.value||session?.phase==='selecting'||(session?.samples?.length||0)>=5;
  for(const b of [draft,exportButton])b.disabled=pending||!session?.rule||session?.phase==='selecting'||step!==5;
  enable.disabled=pending||!session?.canEnable||ocrResult!=='success'||step!==5;details.hidden=!session?.rule&&!finished;nameField.hidden=!session?.rule&&!finished;idField.hidden=!session?.rule&&!finished;
  matchActions.hidden=!session?.rule;ocrRow.hidden=ocrOutput.hidden=!session?.matches?.length;
  ocr.disabled=pending||session?.phase!=='previewed'||!ocrImage.value;
  next.disabled=pending||!tab.value||source.value==='ed';matchesNext.disabled=pending||!session?.canEnable;
  ocrNext.disabled=pending||ocrResult!=='success';skip.disabled=pending||ocrResult!=='failed';name.disabled=id.disabled=pending||finished;
  author.disabled=authorUrl.disabled=pending||finished;
  panels.forEach((panel,index)=>panel.hidden=index!==step-1);root.dataset.builderStep=String(step);
  currentStep.textContent=`${step}/5 · ${t('builder-step-'+step)}`;
  layout.steps(steps,{labels:Array.from({length:5},(_,index)=>t('builder-step-'+(index+1))),current:step,completed:finished?5:availableStep-1,busy:pending,locked:finished,action:'builderAction',onSelect:index=>{step=index;notify();updateControls();}});
 }
 function editedRule(){const metadata=author.value.trim()||authorUrl.value.trim()?{name:author.value.trim(),...(authorUrl.value.trim()?{url:authorUrl.value.trim()}:{})}:undefined;return parseRule(JSON.stringify({...session.rule,id:id.value,name:{en:name.value.trim()},author:metadata}));}
 async function selectionChanged(){
  if(session?.phase==='selecting'){step=availableStep=2;await render();return;}
  step=availableStep=3;ocrResult=null;
  try{if(session?.rule)session=await send('builderPreview');}finally{await render();}
 }
 function errorText(error){if(error.path?.startsWith('$.author'))return t(error.path==='$.author.url'?'builder-author-url-error':'builder-author-error');if(error.code?.startsWith('id-'))return t('import-'+error.code);const code=String(error?.message||'').match(/builder-[a-z-]+/)?.[0];return t(code||'builder-source-error');}
 async function perform(fn){
  if(pending)return;pending=true;notify(t('builder-working'));updateControls();
  try{await fn();}catch(error){
   const text=errorText(error);
   if(error.message==='builder-stale-preview'&&session){try{session=await request({type:'builderStatus',sessionId:session.sessionId});await selectionChanged();}catch{await cancel();}}
   else if(/builder-(expired|session|source-changed|settings-changed)/.test(error.message))await cancel();
   notify(text,'error');
  }
  finally{pending=false;updateControls();}
 }
 async function loadTabs(){
  const epoch=++tabRevision;const result=await request({type:'builderTabs',course:course.value,source:source.value});if(epoch!==tabRevision||!active)return;
  options(tab,(result.tabs||[]).map(item=>[String(item.id),item.label]),useHint?hints.get('ruleTab'):tab.value);useHint=false;if(!tab.options.length)options(tab,[['',t('builder-no-tabs')]]);
  if(source.value==='ed')feedback.textContent=t('builder-identity-unverified');else feedback.textContent='';updateControls();
 }
 async function sources(){options(source,['gmail','moodle','ed'].filter(s=>courseUsesSource(settings,course.value,s==='gmail'?'email':s)).map(s=>[s,{gmail:'Gmail',moodle:'Moodle',ed:'Ed'}[s]]),useHint?hints.get('ruleSource'):source.value);await loadTabs();}
 course.onchange=()=>perform(()=>session?loadTabs():sources());source.onchange=()=>perform(loadTabs);
 async function save(destination){saving=true;try{await perform(async()=>{const rule=editedRule();await send('builderSave',{enable:false,id:rule.id,name:rule.name.en,...(rule.author?{author:rule.author}:{})});session=null;finished=true;step=availableStep=5;samples.replaceChildren();json.textContent=JSON.stringify(rule,null,2);notify(t('builder-saved'),'success');feedback.append(viewImports);clearTimeout(timer);clearTimeout(expiryTimer);await onSaved({destination});});}finally{saving=false;updateControls();}}
 async function render(){
  const epoch=++revision;samples.replaceChildren();json.textContent=session?.rule?JSON.stringify(session.rule,null,2):'';
  options(ocrImage,(session?.matches||[]).map((item,index)=>[item.id,`${t('builder-image-alt')} ${index+1}`]),ocrImage.value);ocrOutput.textContent='';
  clearTimeout(expiryTimer);if(session?.expiresAt)expiryTimer=doc.defaultView.setTimeout(()=>{void cancel().then(()=>{notify(t('builder-expired'),'warning');});},Math.max(0,session.expiresAt-Date.now()));
  name.value=session?.rule?.name?.en||'';
  id.value=session?.rule?.id||'';
  notify(session?.reasons?.length?session.reasons.map(reason=>t(reason)).join(' '):t('builder-'+(session?.phase||'ready')),session?.reasons?.length?'warning':'info');
  for(const sample of session?.samples||[]){
   const section=el('section',undefined,'builder-sample');section.append(el('h3',sample.course+' · '+sample.sampleId.slice(1).replace(/^\d+$/,n=>String(Number(n)+1))));
   const grid=el('div',undefined,'builder-image-grid');section.append(grid);samples.append(section);
   for(const item of sample.images){
    const card=el('article',undefined,'builder-image'),img=el('img');img.alt=t('builder-image-alt');img.loading='lazy';
    const choice=el('select');choice.setAttribute('aria-label',t('builder-mark'));options(choice,[['',t('builder-unmarked')],['include',t('builder-include')],['exclude',t('builder-exclude')]],item.marked===true?'include':item.marked===false?'exclude':'');
    choice.onchange=()=>{if(!choice.value)return;void perform(async()=>{session=await send('builderMark',{imageId:item.id,include:choice.value==='include'});await selectionChanged();});};
    card.append(img,choice);grid.append(card);
    const match=session.matches?.find(m=>m.id===item.id);
    if(match){
     const badge=el('small',t('builder-matched'));card.append(badge);
     if(item.marked!==true&&item.marked!==false){const confirm=el('input');confirm.type='checkbox';confirm.checked=match.confirmed;confirm.onchange=()=>perform(async()=>{session=await send('builderMark',{imageId:item.id,include:confirm.checked});await selectionChanged();});card.append(layout.confirmation(confirm,t('builder-confirm'),help('builder-confirm-help')));}
    }
    try{const payload=await send('builderImage',{imageId:item.id});if(epoch!==revision||!active)return;img.src=`data:${payload.mimeType};base64,${payload.imageBase64}`;}
    catch(error){if(epoch!==revision)return;img.remove();card.prepend(el('p',errorText(error)));}
   }
  }
  updateControls();
 }
 function poll(){
  clearTimeout(timer);if(!active||!session)return;
  timer=doc.defaultView.setTimeout(async()=>{
   if(pending){poll();return;}
   const phase=session?.phase,version=session?.revision;
   // Quiet status polls still verify the source but do not replace controls or move focus.
   pending=true;updateControls();
   try{session=await send('builderStatus');if(session.phase!==phase||session.revision!==version)await selectionChanged();}
   catch(error){const message=errorText(error);await cancel();notify(message,'error');}
   finally{pending=false;updateControls();}poll();
  },session.phase==='selecting'?750:3000);
 }
 async function cancel(){lifecycle++;revision++;tabRevision++;clearTimeout(timer);clearTimeout(expiryTimer);const hadSession=session||pending;session=null;step=availableStep=1;ocrResult=null;adding=finished=false;samples.replaceChildren();json.textContent='';ocrOutput.textContent='';ocrImage.replaceChildren();name.value='';updateControls();if(hadSession)try{await transport({type:'builderCancel'});}catch{}}
 const unload=()=>{void cancel();port?.disconnect();};doc.defaultView.addEventListener('pagehide',unload);
 return {
  async open(){
   if(active)return;active=true;port=chrome?.runtime?.connect?.({name:'rule-builder-owner'});
   await perform(async()=>{const result=await request({type:'ruleList'});settings=result.settings||{};options(course,(settings.courses||[]).map(c=>[c,c]),course.value);await sources();});course.focus({preventScroll:true});
  },
  async cancel(){active=false;await cancel();port?.disconnect();port=null;},
  async dispose(){active=false;await cancel();port?.disconnect();doc.defaultView.removeEventListener('pagehide',unload);}
 };
}
