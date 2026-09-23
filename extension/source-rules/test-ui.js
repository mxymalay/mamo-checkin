import {ruleUI} from './ui.js';
import {ruleError} from './strings.js';
import {courseUsesSource} from '../course-sources.js';
import {approvedTestRules,ruleWasTested} from './test-status.js';
import {createRuleDialog} from './dialog.js';
import {creationLayout} from './creation-layout.js';
import {defaultTestDateRange,validateTestDateRange} from './test-date-range.js';
const ruleKey=rule=>rule.key||rule.id;
export function installRuleTestUI({root,request,translate,onApproved=()=>{},onMatching=()=>{}}){
 const ui=ruleUI(root,translate),{doc,el,t,button,help,field,options}=ui,win=doc.defaultView;
 const layout=creationLayout(el);
 let settings={},library=[],bindings={},selectionKey='',selectionEdited=false,selectedRules=new Set(),testId=null,result=null,timer=null,disposed=false,busy=false,generation=0,signature='';const urls=new Map();
 let step=1,imageId='',dialog=null,diagnosticOpen=false;const reviewed=new Set();
 let tests={};
 root.dataset.ruleUi='';root.classList.add('rule-test','creation-flow');
 const steps=el('ol'),compact=el('p',undefined,'practice-current'),stepLabels=['test-select','test-review','test-finish'].map(t);
 const course=el('select'),source=el('select'),rules=el('fieldset',undefined,'rule-test-rules'),url=el('input');url.type='url';url.placeholder='https://';
 const from=el('input'),to=el('input'),defaults=defaultTestDateRange();from.type=to.type='date';from.value=defaults.from;to.value=defaults.to;from.dataset.testDate='from';to.dataset.testDate='to';
 const urlField=el('label'),urlTitle=el('span',undefined,'test-field-title');urlTitle.append(el('span',t('test-page')),help('test-page-help'));urlField.append(urlTitle,url);
 const inputs=layout.fields([field('course',course),field('source',source),urlField,field('test-from',from),field('test-to',to)]);
 const segment=(label,values,initial)=>{const group=el('fieldset',undefined,'rule-segment'),legend=el('legend',t(label));group.append(legend);if(label==='scope')legend.append(help('scope-help'));for(const value of values){const wrap=el('label'),input=el('input');input.type='radio';input.name=root.id+'-'+label;input.value=value;input.checked=value===initial;wrap.append(input,el('span',t(value)));group.append(wrap);}return group;};
 const stage=segment('stage',['locate','recognize'],'locate'),mode=segment('scope',['builtin','community','combined'],'combined');
 const switches=el('div',undefined,'rule-switches'),switchNodes={};
 for(const key of ['show-images','show-trace','force-ocr']){const label=el('label',undefined,'rule-inline'),input=el('input');input.type='checkbox';input.checked=key==='show-images';input.dataset.ruleTest=key;label.append(input,el('span',t(key)),help(key+'-help'));switches.append(label);switchNodes[key]=input;}
 const start=button('start'),stop=button('cancel'),clear=button('clear'),exportButton=button('export'),skip=button('test-skip'),approve=button('test-approve'),matching=button('matching'),again=button('test-again');
 start.className=approve.className=matching.className='primary';
 for(const [control,icon] of [[clear,'reset'],[stop,'cancel']]){control.title=control.textContent;control.setAttribute('aria-label',control.textContent);control.className='practice-tool';const glyph=el('span',undefined,'practice-tool-icon practice-icon-'+icon);glyph.setAttribute('aria-hidden','true');control.replaceChildren(glyph);}
 const toolbar=layout.toolbar(clear,stop),feedback=el('p',t('idle'),'rule-feedback creation-notice');feedback.setAttribute('role','status');const output=el('div',undefined,'rule-results');output.setAttribute('aria-live','polite');
 const setup=el('section',undefined,'creation-content'),review=el('section',undefined,'creation-content'),complete=el('section',undefined,'creation-content');
 const settingsDetails=el('details',undefined,'test-settings'),settingsBody=el('div',undefined,'test-settings-body');settingsBody.append(stage,mode,switches);settingsDetails.append(el('summary',t('test-options')),settingsBody);
 const testedReminder=el('p',undefined,'rule-tested-reminder creation-notice');testedReminder.setAttribute('role','status');testedReminder.dataset.tone='info';
 setup.append(inputs,rules,testedReminder,settingsDetails,layout.actions(start,skip));
 review.append(output,layout.actions(approve));
 const completion=el('p',t('test-approved'),'creation-notice');completion.dataset.tone='success';complete.append(completion,layout.actions(matching,again));
 root.replaceChildren(toolbar,compact,steps,setup,review,complete,feedback);
 const selected=group=>group.querySelector('input:checked')?.value;
 const fail=error=>{feedback.textContent=ruleError(error,t);feedback.dataset.tone='error';feedback.setAttribute('role','alert');};
 function controls(){
  const testedCount=library.filter(rule=>selectedRules.has(ruleKey(rule))&&ruleWasTested(rule,{tests},course.value)).length;
  testedReminder.hidden=!testedCount||selected(mode)==='builtin';testedReminder.textContent=t('test-already-tested').replace('{count}',String(testedCount));
  setup.hidden=step!==1;review.hidden=step!==2;complete.hidden=step!==3;
  if(step===1&&switches.parentElement!==settingsBody)settingsBody.append(switches);
  feedback.hidden=step===3||(step===1&&feedback.textContent===t('idle'));
  compact.textContent=`${step}/3 · ${stepLabels[step-1]}`;
  layout.steps(steps,{labels:stepLabels,current:step,completed:step===3?3:result?1:0,busy,locked:step===3,action:'ruleAction',onSelect:value=>{step=value;controls();}});
  for(const control of [...inputs.querySelectorAll('input,select'),...stage.querySelectorAll('input'),...mode.querySelectorAll('input')])control.disabled=busy;
  start.disabled=busy||!course.value||!source.value||(selected(mode)==='community'&&!selectedRules.size);stop.disabled=!busy;clear.disabled=!result&&!testId;exportButton.disabled=!result;
  for(const input of rules.querySelectorAll('input'))input.disabled=busy||selected(mode)==='builtin'||!input.checked&&selectedRules.size>=8;
  switchNodes['force-ocr'].disabled=busy||step===1&&selected(stage)!=='recognize';
  skip.disabled=busy||!selectedRules.size;approve.disabled=true;stop.hidden=!busy;clear.disabled=busy||!result&&!testId;
  try{approvedTestRules(result||{});approve.disabled=busy||result.images.some(item=>!reviewed.has(item.id));}catch{}
 }
 const revoke=()=>{for(const value of urls.values())win.URL.revokeObjectURL?.(value);urls.clear();};
 function fillRules(){
  const key=course.value+':'+source.value;if(selectionKey!==key){selectionKey=key;selectionEdited=false;}
  const compatible=library.filter(r=>r.source===source.value&&r.courses.includes(course.value)),valid=new Set(compatible.map(ruleKey));
  if(!selectionEdited){const value=bindings[course.value]?.[source.value];selectedRules=new Set((Array.isArray(value)?value:[value]).filter(Boolean));}
  selectedRules=new Set([...selectedRules].filter(id=>valid.has(id)));rules.replaceChildren(el('legend',t('test-rules')));
  for(const rule of compatible){const key=ruleKey(rule),label=el('label',undefined,'test-rule-choice'),input=el('input'),text=el('span',undefined,'test-rule-copy');text.append(ui.nameNode(rule,'strong'),el('small',`${rule.id} · ${rule.version}`));input.type='checkbox';input.value=key;input.dataset.testRule='';input.checked=selectedRules.has(key);input.onchange=()=>{selectionEdited=true;if(input.checked)selectedRules.add(key);else selectedRules.delete(key);controls();};label.append(input,text);rules.append(label);}
  if(!compatible.length)rules.append(el('p',t('no-compatible'),'muted'));controls();
 }
 function fillSources(){options(source,['gmail','moodle','ed'].filter(s=>courseUsesSource(settings,course.value,s==='gmail'?'email':s)||library.some(rule=>rule.source===s&&rule.courses.includes(course.value))).map(s=>[s,s==='gmail'?'Gmail':s==='moodle'?'Moodle':'Ed']),source.value);fillRules();}
 async function reload(){const data=await request({type:'ruleTestList'});if(disposed)return;library=data.rules||[];tests=data.tests||{};bindings=data.bindings||{};settings=data.settings||settings;options(course,[...new Set([...(settings.courses||[]),...library.flatMap(rule=>rule.courses)])].map(c=>[c,c]),course.value);fillSources();}
 async function showImage(item,img,epoch){
  const id=testId,key=id+':'+item.id;
  try{
   if(!urls.has(key)){const payload=await request({type:'ruleTestImage',testId:id,imageId:item.id});if(disposed||epoch!==generation||testId!==id)return;
    const bytes=Uint8Array.from(atob(payload.imageBase64),c=>c.charCodeAt(0));urls.set(key,win.URL.createObjectURL(new win.Blob([bytes],{type:payload.mimeType})));
   }
   if(epoch===generation)img.src=urls.get(key);
  }catch{if(epoch===generation)img.replaceWith(el('p',t('image-unavailable'),'rule-error'));}
 }
 function render(){
  output.replaceChildren();controls();if(!result)return;
  feedback.textContent=t(result.phase==='source'?'source-phase':result.phase);
  feedback.dataset.tone=['partial','error','interrupted'].includes(result.phase)?'error':'info';feedback.setAttribute('role',feedback.dataset.tone==='error'?'alert':'status');
  const diagnostics=el('details',undefined,'test-diagnostics'),counts=el('dl',undefined,'rule-counts');diagnostics.open=diagnosticOpen;diagnostics.ontoggle=()=>{if(diagnostics.isConnected)diagnosticOpen=diagnostics.open;};diagnostics.append(el('summary',t('test-diagnostics')));for(const key of ['pages','found','downloaded','excluded','recognized']){const entry=el('div');entry.append(el('dt',t(key)),el('dd',String(result.counts?.[key]||0)));counts.append(entry);}if(step!==1)diagnostics.append(switches);diagnostics.append(counts,layout.actions(exportButton,help('report-help')));
  if(result.truncated)output.append(el('p',t('budget'),'rule-error'));
  for(const reason of new Set((result.trace||[]).map(entry=>entry.reason).filter(reason=>['login-required','source-error'].includes(reason))))output.append(el('p',t(reason),'rule-error'));
  if(!busy&&result.phase==='complete'&&!result.truncated&&!result.images?.length)output.append(el('p',t('no-images'),'muted'));
  const images=result.images||[];
  if(!images.some(item=>item.id===imageId))imageId=images[0]?.id||'';
  const imageControls=layout.recognition(),picker=el('select');picker.dataset.testImage='';picker.setAttribute('aria-label',t('test-review-image'));options(picker,images.map((item,index)=>[item.id,`${index+1} / ${images.length} · ${t(item.state)}${reviewed.has(item.id)?' ✓':''}`]),imageId);picker.onchange=()=>{imageId=picker.value;render();};imageControls.append(field('test-image',picker));if(images.length)output.append(imageControls);
  for(const item of images.filter(item=>item.id===imageId)){
   const row=el('div',undefined,'rule-image-row'),meta=el('div',undefined,'rule-image-meta'),label=el('strong',`${item.course||course.value} · ${item.width||'?'} × ${item.height||'?'}`);label.dataset.ruleLiteral='';
   meta.append(label,el('span',t(item.state),'rule-status-tag'));
   if(item.dateState==='unknown')meta.append(el('span',t('test-date-unknown'),'rule-status-tag'));
   if(item.sourceUrl){try{const u=new URL(item.sourceUrl);if(u.protocol==='https:'&&['mail.google.com','learning.monash.edu','edstem.org'].includes(u.hostname)){const link=el('a',t('source-link'));link.href=u.href;link.target='_blank';link.rel='noopener noreferrer';meta.append(link);}}catch{}}
   diagnostics.append(meta);
   if(switchNodes['show-images'].checked&&!['download-error','downloading','budget'].includes(item.state)){const img=el('img');img.className='rule-preview';img.alt=`${item.course||course.value} · ${item.id}`;img.loading='lazy';row.append(img);void showImage(item,img,generation);}
   {const ocr=button('ocr-one');ocr.className='primary';ocr.disabled=busy||['download-error','downloading','budget'].includes(item.state)||result.phase==='cancelled';ocr.onclick=()=>act(async()=>{reviewed.delete(item.id);await request({type:'ruleTestRecognize',testId,imageId:item.id,forceOcr:switchNodes['force-ocr'].checked});poll();},true);imageControls.append(ocr);}
   if(item.ocr){
    const records=item.ocr.records||[],text=el('pre',(item.ocr.observations||[]).map(o=>o.text).join('\n'),'test-ocr-text');text.dataset.ruleLiteral='';
    if(records.length){const table=el('table',undefined,'test-records'),head=el('tr'),body=el('tbody');for(const key of ['course','test-session','test-date','test-code'])head.append(el('th',t(key)));const thead=el('thead');thead.append(head);table.append(thead,body);for(const record of records){const tr=el('tr');for(const value of [record.course||course.value,record.session||record.type||'—',record.date||'—',record.code||'—']){const cell=el('td',String(value));cell.dataset.ruleLiteral='';tr.append(cell);}body.append(tr);}const scroll=el('div',undefined,'test-records-wrap');scroll.append(table);row.append(scroll);}else row.append(text.cloneNode(true));
    const raw=el('details',undefined,'test-raw');raw.append(el('summary',t('test-raw')),text);diagnostics.append(raw);
   }
   const check=el('input');check.type='checkbox';check.checked=reviewed.has(item.id);check.disabled=busy||!['downloaded','recognized'].includes(item.state);check.onchange=()=>{if(check.checked)reviewed.add(item.id);else reviewed.delete(item.id);controls();};row.append(layout.confirmation(check,t('test-reviewed'),help('test-review-help')));output.append(row);
  }
  if(switchNodes['show-trace'].checked){const trace=el('ol',undefined,'rule-trace');for(const entry of result.trace||[])trace.append(el('li',`${entry.ruleId?entry.ruleId+' · ':''}${t(entry.reason)}`));diagnostics.append(trace);}output.append(diagnostics);
 }
 async function poll(){
  clearTimeout(timer);if(!testId||disposed)return;const id=testId;
  try{const data=await request({type:'ruleTestStatus',testId:id});if(disposed||id!==testId)return;result=data;busy=Boolean(data.busy)||['source','locating','recognizing'].includes(data.phase);render();if(busy)timer=setTimeout(poll,600);}
  catch(error){busy=false;fail(error);controls();}
 }
 async function act(fn,running=false){if(busy)return;busy=true;feedback.dataset.tone='info';controls();try{await fn();}catch(error){fail(error);running=false;}finally{if(!running)busy=false;controls();}}
 async function cancel(){dialog?.close();clearTimeout(timer);generation++;if(testId||busy)try{await request({type:'ruleTestClear',testId});}catch{}testId=null;busy=false;revoke();result=null;step=1;reviewed.clear();output.replaceChildren();feedback.textContent=t('idle');controls();}
 start.onclick=()=>act(async()=>{const dateRange=validateTestDateRange({from:from.value,to:to.value});const epoch=++generation;revoke();reviewed.clear();result=null;feedback.textContent=t('source-phase');const data=await request({type:'ruleTestStart',dateRange,course:course.value,source:source.value,ruleIds:selected(mode)==='builtin'?[]:[...selectedRules].sort(),sourceUrl:url.value,mode:selected(mode),stage:selected(stage),forceOcr:switchNodes['force-ocr'].checked});if(disposed||epoch!==generation){await request({type:'ruleTestClear',testId:data.testId});return;}testId=data.testId;step=2;void poll();},true);
 stop.onclick=async()=>{try{if(!testId){await cancel();return;}await request({type:'ruleTestCancel',testId});void poll();}catch(error){feedback.textContent=ruleError(error,t);}};
 clear.onclick=async()=>{await cancel();result=null;output.replaceChildren();feedback.textContent=t('idle');controls();};
 const download=(text,filename)=>{const href=win.URL.createObjectURL(new win.Blob([text],{type:'application/json'})),a=el('a');a.href=href;a.download=filename;a.click();setTimeout(()=>win.URL.revokeObjectURL(href),1000);};
 exportButton.onclick=()=>act(async()=>{const report=(await request({type:'ruleTestExport',testId})).report;download(JSON.stringify(report,null,2),'mamo-rule-diagnostics.json');});
 approve.onclick=()=>act(async()=>{await request({type:'ruleTestApprove',testId});step=3;completion.textContent=t('test-approved');completion.dataset.tone='success';await onApproved();});
 again.onclick=()=>cancel();matching.onclick=()=>onMatching();
 function confirmSkip(second=false,token){
  dialog?.close();dialog=createRuleDialog({doc,title:t(second?'test-skip-final':'test-skip'),trigger:skip,translate});
  const active=dialog,message=el('p',t(second?'test-skip-warning-2':'test-skip-warning-1'),'rule-notice');message.dataset.tone='warning';
  const context=el('p',`${course.value} · ${source.value} · ${[...selectedRules].map(id=>ui.name(library.find(rule=>ruleKey(rule)===id)||{id})).join(', ')}`),no=button('cancel-edit','cancel'),yes=button(second?'test-skip-final':'test-next'),error=el('p',undefined,'rule-error');
  yes.classList.add('primary');
  no.onclick=()=>active.close();yes.onclick=async()=>{yes.disabled=true;try{if(second){await request({type:'ruleTestSkipConfirm',token,confirmed:true});active.close();step=3;completion.textContent=t('test-skipped-warning');completion.dataset.tone='warning';await onApproved();controls();}else{const result=await request({type:'ruleTestSkipPrepare',course:course.value,source:source.value,ruleIds:[...selectedRules]});confirmSkip(true,result.token);}}catch(e){error.textContent=ruleError(e,t);yes.disabled=false;}};
  active.body.append(message,context,error);active.actions.append(no,yes);active.show();
 }
 skip.onclick=()=>confirmSkip();
 course.onchange=fillSources;source.onchange=fillRules;stage.onchange=controls;mode.onchange=controls;
 switchNodes['show-images'].onchange=render;switchNodes['show-trace'].onchange=render;
 const onHide=()=>{void cancel();};win.addEventListener('pagehide',onHide);
 controls();
 return {async update(state){settings=state.settings||settings;root.hidden=false;const key=JSON.stringify([settings.courses,settings.sourceModes,settings.senders,settings.moodleUrls,settings.edUrls,doc.documentElement.lang]);if(signature!==key){signature=key;try{await reload();}catch(error){feedback.textContent=ruleError(error,t);}}},
  async open(selection){await reload();if(selection.course)course.value=selection.course;fillSources();if(selection.source)source.value=selection.source;fillRules();selectedRules=new Set(selection.ruleIds||(selection.ruleId?[selection.ruleId]:[]));selectionEdited=true;fillRules();if(selection.mode)for(const radio of mode.querySelectorAll('input'))radio.checked=radio.value===selection.mode;controls();root.scrollIntoView?.({behavior:'smooth',block:'start'});},
  reload,cancel,async dispose(){disposed=true;win.removeEventListener('pagehide',onHide);await cancel();root.replaceChildren();}};
}
