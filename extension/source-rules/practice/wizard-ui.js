import {ruleUI} from '../ui.js';
import {parseRule} from '../format.js';
import {practiceText} from './wizard-strings.js';
import {creationLayout} from '../creation-layout.js';

export function createPracticeWizardState(){
 let state={step:1,completed:0,ocr:null};
 return {snapshot:()=>({...state}),dispatch(event){
  const requireStep=n=>{if(state.completed<n)throw new Error('practice-prerequisite');};
  const advance=n=>{requireStep(n-1);state.completed=n;state.step=n+1;};
  switch(event.type){
   case 'SOURCE_READY':advance(1);break;
   case 'CONTEXT_SELECTED':advance(2);state.ocr=null;break;
   case 'IMAGE_SELECTED':advance(3);state.ocr=null;break;
   case 'PREVIEWED':advance(4);state.ocr=null;break;
   case 'OCR_FINISHED':advance(5);state.ocr='success';break;
   case 'OCR_FAILED':requireStep(4);state.completed=4;state.step=5;state.ocr='failed';break;
   case 'OCR_RESET':requireStep(4);state.completed=4;state.step=5;state.ocr=null;break;
   case 'ACKNOWLEDGE_OCR_SKIP':advance(5);state.ocr='skipped';break;
   case 'RULE_CHANGED':requireStep(3);state.completed=3;state.step=4;state.ocr=null;break;
   case 'SAVED':requireStep(5);state.completed=6;state.step=6;break;
   case 'RESTORE_SAVED':state={step:6,completed:6,ocr:'success'};break;
   case 'BACK':if(!Number.isInteger(event.step)||event.step<1||event.step>Math.min(6,state.completed+1))throw new Error('practice-prerequisite');state.step=event.step;break;
   case 'SOURCE_LOST':case 'RESET':state={step:1,completed:0,ocr:null};break;
   default:throw new Error('practice-event');
  }
  return {...state};
 }};
}

// Builder commands are never sent to the production router. The coordinator owns
// nested builder tokens; this view tracks only the outer practice revision.
export function installPracticeWizard({root,request:transport,translate=k=>k,chrome,onBack=()=>{},onSaved=()=>{},onReset=()=>{}}){
 const {doc,el,options,help,t:ruleT}=ruleUI(root,translate),view=doc.defaultView,guide=createPracticeWizardState();
 const layout=creationLayout(el);
 const t=key=>practiceText(key,doc.documentElement.lang||'en');
 let active=false,disposed=false,pending=false,generation=0,session=null,builder=null,saved=null,port=null,timer=null,expiry=null,cleanup=Promise.resolve();
 let pages=[],notice='',noticeError=false,ocrText='',ocrOutcome=null,selectedImage='',selectedPage='',editedName='',editedId='',finished=false;
 const payloads=new Map(),urls=new Set();
 root.classList.add('practice-wizard','creation-flow');root.dataset.ruleUi='';
 const dispatch=type=>guide.dispatch(typeof type==='string'?{type}:type);
 const clearTimers=()=>{view.clearTimeout(timer);view.clearTimeout(expiry);};
 const tokens=()=>session?{sessionId:session.sessionId,revision:session.revision}:{};
 async function request(message){
  const epoch=generation,result=await transport(message);
  if(epoch!==generation||!active){
   if(message.type==='practiceOpen'&&result?.sessionId)await transport({type:'practiceCancel',sessionId:result.sessionId,revision:result.revision}).catch(()=>{});
   throw new Error('practice-cancelled');
  }
  if(result?.sessionId){session={...session,...result};if(result.pages)pages=result.pages;if(result.saved)saved=result.saved;}
  return result;
 }
 async function command(type,args={}){const result=await request({type:'practiceBuilder',...tokens(),command:{type,...args}});return result.state;}
 function adopt(state){
  const changed=builder?.rule?.id!==state?.rule?.id||builder?.rule?.name?.en!==state?.rule?.name?.en;
  builder=state;if(state?.rule&&changed){editedName=state.rule.name?.en||'';editedId=state.rule.id;}
 }
 function invalidate({keepImages=false}={}){ocrText='';ocrOutcome=null;selectedImage='';if(!keepImages)payloads.clear();finished=false;}
 async function perform(fn,{quiet=false}={}){
  if(pending||!active||disposed)return;
  const epoch=generation,before=JSON.stringify([builder,guide.snapshot()]),beforeNotice=notice;
  const controls=quiet?[...root.querySelectorAll('button,select,input:not([name])')].filter(n=>!['back','cancel'].includes(n.dataset.practiceAction)).map(n=>[n,n.disabled]):[];
  pending=true;if(quiet){for(const [n] of controls)n.disabled=true;}else{notice='';noticeError=false;render();}
  try{await fn();}catch(error){
   if(epoch!==generation||!active)return;
   if(/builder-(expired|cancelled|source-changed|session|settings-changed)|practice-(expired|session|source)/.test(error.message)){
    await transport({type:'practiceCancel',...tokens()}).catch(()=>{});session=null;builder=null;invalidate();dispatch('SOURCE_LOST');clearTimers();notice=t('expired');
   }else if(error.message==='builder-stale-preview'&&builder){
    try{adopt(await command('builderStatus'));invalidate();dispatch('RULE_CHANGED');}catch{builder=null;dispatch('SOURCE_LOST');}
    notice=t('error');
   }else{const localized=translate('rules.'+(error.code||error.message));notice=localized&&localized!=='rules.'+(error.code||error.message)?localized:String(error.message||t('error')).slice(0,500);}
   if(ocrOutcome==='failed')notice=error.message==='builder-timeout'?t('ocr-timeout'):t('ocr-error')+' '+notice;
   noticeError=true;
  }finally{if(epoch===generation&&active){pending=false;if(quiet&&beforeNotice===notice&&before===JSON.stringify([builder,guide.snapshot()])){for(const [n,disabled] of controls)n.disabled=disabled;updateSaveButtons();}else render();poll();}}
 }
 function scheduleExpiry(){
  view.clearTimeout(expiry);if(!session?.expiresAt)return;
  const scheduledGeneration=generation;
  expiry=view.setTimeout(()=>{
   if(disposed||!active||generation!==scheduledGeneration)return;
   const cancelled=cancel(),cancelGeneration=generation;
   void cancelled.then(()=>{
    if(disposed||active||generation!==cancelGeneration)return;
    active=true;generation++;port=chrome?.runtime?.connect?.({name:'rule-practice-owner'});notice=t('expired');render();
   });
  },Math.max(0,session.expiresAt-Date.now()));
 }
 async function openSource(){
  if(builder)await command('builderCancel');
  const language=/TW|Hant|HK/i.test(doc.documentElement.lang)?'zh-TW':/^zh/i.test(doc.documentElement.lang)?'zh-CN':'en';
  const result=await request({type:'practiceOpen',...tokens(),language});
  if(!result.pages?.length)throw new Error('practice-source');
  selectedPage=String(result.pages[0].id);builder=null;invalidate();dispatch('RESET');dispatch('SOURCE_READY');scheduleExpiry();
 }
 async function loadImages(){
  for(const item of builder?.samples?.flatMap(s=>s.images)||[]){
   if(payloads.has(item.id))continue;
   const payload=await command('builderImage',{imageId:item.id});
   if(/^image\/(png|jpeg|webp|gif)$/.test(payload?.mimeType)&&typeof payload.imageBase64==='string')payloads.set(item.id,`data:${payload.mimeType};base64,${payload.imageBase64}`);
  }
 }
 async function checkSelection(){
  const previous=builder?.revision;adopt(await command('builderStatus'));
  if(builder?.rule&&builder.phase!=='selecting'&&(guide.snapshot().completed<3||previous!==builder.revision)){
   invalidate();dispatch('IMAGE_SELECTED');await previewMatches();
  }
 }
 async function previewMatches(){
  invalidate({keepImages:true});dispatch('IMAGE_SELECTED');builder={...builder,canEnable:false,matches:[],phase:'editing'};
  await loadImages();adopt(await command('builderPreview'));
 }
 function poll(){
  view.clearTimeout(timer);if(!active||!builder||finished)return;
  timer=view.setTimeout(()=>{if(pending){poll();return;}void perform(checkSelection,{quiet:true});},builder.phase==='selecting'?750:3000);
 }
 function button(key,fn,{disabled=false,action=key}={}){
  const primary=['open-source','context','pick','check-selection','preview','matches-next','recognize','ocr-next','draft','enable'].includes(key);
  const b=el('button',t(key),primary?'primary':'subtle');b.type='button';b.dataset.practiceAction=action;b.disabled=pending||disabled;b.onclick=()=>void perform(fn);
  if(['reset','cancel','refresh'].includes(key)){const icon=el('span',undefined,'practice-tool-icon practice-icon-'+key);icon.setAttribute('aria-hidden','true');b.replaceChildren(icon);b.classList.add('practice-tool');b.title=t(key);b.setAttribute('aria-label',t(key));}
  return b;
 }
 function field(key,node){const label=el('label',t(key));label.append(node);return label;}
 function render(){
  if(disposed)return;
  const state=guide.snapshot(),step=state.step;root.dataset.practiceStep=String(step);
  const focused=doc.activeElement,hadFocus=root.contains(focused),focusAction=hadFocus?focused.dataset.practiceAction:null;
  const focusName=hadFocus?focused.name:null,selection=focusName&&focused.tagName==='INPUT'?[focused.selectionStart,focused.selectionEnd]:null;
  const top=layout.toolbar();top.classList.add('practice-toolbar');
  if(step===2)top.append(button('refresh',async()=>{await request({type:'practicePages',...tokens()});if(!pages.length){builder=null;invalidate();dispatch('SOURCE_LOST');}}));
  const resetButton=button('reset',async()=>{});resetButton.disabled=pending||!active;resetButton.onclick=()=>void reset();
  const stop=button('cancel',async()=>{});stop.disabled=false;stop.onclick=()=>{void reset().then(()=>cancel()).then(onBack);};top.append(resetButton,stop);
  const header=el('div',undefined,'practice-header'),steps=el('ol',undefined,'practice-steps');header.append(top);steps.setAttribute('aria-label',t('title'));
  layout.steps(steps,{labels:t('steps'),current:step,completed:state.completed,busy:pending,locked:finished,onSelect:value=>{dispatch({type:'BACK',step:value});render();}});
  const compact=el('p',`${step}/6 · ${t('steps')[step-1]}`,'practice-current');
  const content=el('section',undefined,'practice-content creation-content');content.setAttribute('aria-label',t('steps')[step-1]);
  const feedback=el('p',pending?t('busy'):notice,'rule-feedback creation-notice');feedback.dataset.tone=!pending&&noticeError?'error':!pending&&finished?'success':'info';feedback.setAttribute('role',!pending&&noticeError?'alert':'status');feedback.setAttribute('aria-live','polite');
  if(step===1)content.append(layout.actions(button('open-source',openSource)));
  if(step===2){
   const course=el('select'),source=el('select'),page=el('select');course.name='course';source.name='source';page.name='page';
   options(course,[['DEMO1000','DEMO1000']]);options(source,[['moodle','Moodle']]);options(page,pages.map(p=>[String(p.id),p.label]),selectedPage);selectedPage=page.value;
   for(const n of [course,source,page])n.disabled=pending;
   page.onchange=()=>{selectedPage=page.value;};content.append(layout.fields([field('course',course),field('source',source),field('page',page)]));const actions=layout.actions();actions.classList.add('practice-context-actions');actions.append(button('reopen',openSource),button('context',async()=>{
    if(builder)await command('builderCancel');builder=null;invalidate();dispatch('CONTEXT_SELECTED');
   },{disabled:!page.value}));content.append(actions);
  }
  if(step===3)content.append(layout.actions(button('pick',async()=>{
   if(builder)await command('builderCancel');builder=null;invalidate();dispatch('CONTEXT_SELECTED');
   adopt(await command('builderStart',{course:'DEMO1000',source:'moodle',tabId:Number(selectedPage),labels:{pick:t('guide3'),cancel:t('cancel')}}));
  }),button('check-selection',checkSelection,{disabled:!builder})));
  if(step===4){
   content.append(layout.actions(button('matches-next',async()=>{if(builder?.phase!=='previewed')await previewMatches();if(builder?.canEnable)dispatch('PREVIEWED');else notice=t('review-needed');},{disabled:!builder?.rule||!builder?.canEnable})));
   if(builder?.phase==='previewed'&&!builder.canEnable)content.append(el('p',t('review-needed'),'practice-review-notice'));
   for(const reason of builder?.reasons||[]){const key='rules.'+reason,message=translate(key);content.append(el('p',message&&message!==key?message:t('error'),'rule-feedback'));}
   const grid=el('div',undefined,'practice-images');
   for(const item of builder?.samples?.flatMap(s=>s.images)||[]){
    const card=el('article',undefined,'practice-image'),img=el('img');img.alt=t('image');if(payloads.has(item.id))img.src=payloads.get(item.id);
    const select=el('select');select.setAttribute('aria-label',t('image'));select.disabled=pending;options(select,[['',t('unmarked')],['include',t('include')],['exclude',t('exclude')]],item.marked===true?'include':item.marked===false?'exclude':'');
    select.onchange=()=>{if(select.value)void perform(async()=>{adopt(await command('builderMark',{imageId:item.id,include:select.value==='include'}));await previewMatches();});};card.append(img,select);
    const match=builder.matches?.find(m=>m.id===item.id);if(match){card.append(el('small',t('matched')));if(item.marked!==true&&item.marked!==false){const check=el('input');check.type='checkbox';check.checked=Boolean(match.confirmed);check.disabled=pending;check.onchange=()=>void perform(async()=>{adopt(await command('builderMark',{imageId:item.id,include:check.checked}));await previewMatches();});card.append(layout.confirmation(check,ruleT('builder-confirm'),help('builder-confirm-help')));}}
    grid.append(card);
   }
   content.append(grid);
  }
  if(step===5){
   const image=el('select');image.name='ocrImage';options(image,(builder?.matches||[]).map((m,i)=>[m.id,`${t('image')} ${i+1}`]),selectedImage);selectedImage=image.value;image.disabled=pending;
   image.onchange=()=>{selectedImage=image.value;ocrText='';ocrOutcome=null;notice='';noticeError=false;dispatch('OCR_RESET');render();};
   const row=layout.recognition(),actions=layout.actions();row.classList.add('practice-ocr-row');actions.classList.add('practice-ocr-actions');
   row.append(field('image',image),button('recognize',async()=>{
    ocrText='';ocrOutcome=null;dispatch('OCR_RESET');
    try{const result=await command('builderRecognize',{imageId:image.value});ocrText=(Array.isArray(result.text)?result.text:[result.text||'']).join('\n');ocrOutcome=ocrText.trim()?'success':'empty';if(ocrOutcome!=='success')dispatch('OCR_FAILED');}
    catch(error){if(error.message!=='practice-cancelled'){ocrOutcome='failed';dispatch('OCR_FAILED');}throw error;}
   },{disabled:!image.value}));
   actions.append(button('ocr-next',async()=>dispatch('OCR_FINISHED'),{disabled:ocrOutcome!=='success'}),button('skip',async()=>dispatch('ACKNOWLEDGE_OCR_SKIP'),{disabled:!['failed','empty'].includes(ocrOutcome)}));
   const output=el('pre',ocrOutcome==='empty'?t('empty'):ocrText);output.hidden=!output.textContent;output.dataset.ruleLiteral='';content.append(row,actions,output);
  }
  if(step===6){
   const name=el('input'),id=el('input');name.name='ruleName';name.maxLength=100;name.value=editedName;id.name='ruleId';id.maxLength=256;id.value=editedId;name.disabled=id.disabled=pending||finished;
   name.oninput=()=>{editedName=name.value;updateSaveButtons();};id.oninput=()=>{editedId=id.value;updateSaveButtons();};
   content.append(layout.fields([field('name',name),field('id',id)],'metadata'));
   const json=el('pre',builder?.rule?JSON.stringify(builder.rule,null,2):'');json.dataset.ruleLiteral='';const details=el('details'),summary=el('summary',t('json'));details.append(summary,json);content.append(details);
   content.append(layout.actions(button('export',async()=>{await command('builderExport');const rule=editedRule(),url=view.URL.createObjectURL(new view.Blob([JSON.stringify(rule,null,2)],{type:'application/json'}));urls.add(url);const a=el('a');a.href=url;a.download=rule.id+'.json';a.click();view.URL.revokeObjectURL(url);urls.delete(url);},{disabled:finished}),button('enable',save,{disabled:finished||!builder?.canEnable||!['success','skipped'].includes(state.ocr)})));
  }
  root.replaceChildren(header,compact,steps,content,feedback);updateSaveButtons();
  if(focusAction)root.querySelector(`[data-practice-action="${focusAction}"]`)?.focus({preventScroll:true});
  if(focusName){const target=root.querySelector(`[name="${focusName}"]`);target?.focus({preventScroll:true});if(selection&&target?.setSelectionRange)target.setSelectionRange(...selection);}
 }
 function updateSaveButtons(){
  for(const action of ['enable','export']){const b=root.querySelector(`[data-practice-action="${action}"]`);if(b)b.disabled=pending||finished||!builder?.rule||(action==='enable'&&(!builder.canEnable||!['success','skipped'].includes(guide.snapshot().ocr)));}
 }
 function editedRule(){return parseRule(JSON.stringify({...builder.rule,id:editedId,name:{en:editedName.trim()}}));}
 async function save(){
  const rule=editedRule();await command('builderSave',{enable:true,id:rule.id,name:rule.name.en,acknowledgeOcrSkip:guide.snapshot().ocr==='skipped'});builder.rule=rule;finished=true;clearTimers();dispatch('SAVED');notice=t('enabled');
  await request({type:'practicePages',...tokens()});
  await transport({type:'practiceCancel',...tokens()});session=null;await onSaved(saved);
 }
 function cancel({preserveCompleted=false}={}){
  const keep=preserveCompleted&&finished;
  const old=tokens(),oldPort=port;port=null;generation++;active=false;pending=false;clearTimers();session=null;
  if(!keep){builder=null;pages=[];editedName='';editedId='';invalidate();dispatch('RESET');}
  for(const url of urls)view.URL.revokeObjectURL(url);urls.clear();
  cleanup=cleanup.then(async()=>{try{await transport({type:'practiceCancel',...old});}catch{}finally{oldPort?.disconnect();}});
  if(!disposed)render();return cleanup;
 }
 function restore(summary){
  saved=summary?.saved;
  const entry=saved?.rules?.at(-1);
  if(entry){adopt({rule:entry.rule||entry,canEnable:true,phase:'saved'});finished=true;clearTimers();dispatch('RESTORE_SAVED');notice=t('enabled');noticeError=false;}
  else if(finished){builder=null;editedName='';editedId='';invalidate();dispatch('RESET');notice='';}
  render();
 }
 async function open(){
  const epoch=generation;await cleanup;if(disposed||active||epoch!==generation)return;active=true;generation++;notice='';port=chrome?.runtime?.connect?.({name:'rule-practice-owner'});render();
  await perform(async()=>restore(await request({type:'practiceSummary'})));
 }
 async function reset(){
  await cancel();await open();
  await perform(async()=>{await request({type:'practiceReset'});builder=null;session=null;saved=null;pages=[];editedName='';editedId='';invalidate();dispatch('RESET');clearTimers();await onReset();});
 }
 const unload=()=>{void cancel();};view.addEventListener('pagehide',unload);
 return {
  open,cancel,reset,restore,
  async dispose(){if(disposed)return;disposed=true;view.removeEventListener('pagehide',unload);await cancel();root.replaceChildren();},
  refreshLanguage(){render();}
 };
}
