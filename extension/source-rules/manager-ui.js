import {ruleUI} from './ui.js';
import {ruleError} from './strings.js';
import {courseUsesSource} from '../course-sources.js';
import {parseRule,ruleDigest} from './format.js';
import {installRuleBindings} from './bindings-ui.js';
import {createRuleDialog} from './dialog.js';
import {loadRuleCatalog,downloadCatalogRule,catalogURL} from './catalog-client.js';
import {ruleAppliedCourses,unusedRuleCount,renderDraftNotices} from './draft-status.js';
import {createRuleMenu} from './create-menu.js';
import {showImportError,showRuleToast} from './import-feedback.js';
import {appendRuleAttribution,ruleCourseTags} from './attribution-ui.js';
import {ruleHasTest,ruleCanMatch} from './test-status.js';
import {sharedRuleAuthors} from './shared-authors.js';
const ruleKey=rule=>rule.key||rule.id;
const rawRule=({digest,hasPrevious,key,origin,...raw})=>raw;

export function installRuleManager({root,bindingsRoot,bindingsNoticeRoot,request,translate,onTest,onCreate,onLibrary,onPrepareImport,onMatching,creationPanels={},loadCatalog=loadRuleCatalog,downloadRule=downloadCatalogRule}){
 const {doc,el,t,button,nameNode,help}=ruleUI(root,translate);
 let state={},signature='',disposed=false,pending=false,detailsDialog=null,authorDialog=null,confirmDialog=null,errorDialog=null,catalog=null,catalogPending=false,catalogError=false,activeLibrary='',noticeRevision=0;
 root.dataset.ruleUi='';root.classList.add('rule-manager');
 const file=el('input'),importButton=button('import'),status=el('p',undefined,'rule-feedback rule-notice'),nav=el('nav',undefined,'rule-library-tabs');
 const draftNotice=el('div',undefined,'rule-draft-notices');draftNotice.hidden=true;
 const tabList=el('div',undefined,'rule-library-tab-items');tabList.setAttribute('role','tablist');tabList.setAttribute('aria-label',t('library'));nav.append(tabList);
 file.type='file';file.accept='.json,application/json';file.hidden=true;status.setAttribute('role','status');nav.setAttribute('aria-label',t('library'));
 const upload=button('import-dropzone','upload-rule');upload.className='rule-import-dropzone';
 const uploadIcon=el('span',undefined,'rule-import-icon');uploadIcon.setAttribute('aria-hidden','true');upload.prepend(uploadIcon);
 upload.onclick=()=>file.click();
 const importToolbar=el('div',undefined,'rule-import-toolbar'),importModes=el('div',undefined,'rule-import-modes'),template=el('a',t('download-template'),'rule-template-download');
 importModes.setAttribute('role','tablist');importModes.setAttribute('aria-label',t('import'));
 template.href=new URL('./template.json',import.meta.url).href;template.download='attendance-rule-template.json';
 importToolbar.append(importModes,template);
 const filePanel=el('div'),jsonPanel=el('div',undefined,'rule-json-panel'),jsonInput=el('textarea'),jsonSubmit=button('import-json-text','import-json-text');
 jsonInput.rows=12;jsonInput.spellcheck=false;jsonInput.setAttribute('aria-label',t('json-content'));jsonInput.dataset.ruleLiteral='';jsonInput.placeholder='{\n  "schemaVersion": 1,\n  ...\n}';
 jsonSubmit.classList.add('primary');jsonSubmit.disabled=true;jsonInput.oninput=()=>{jsonSubmit.disabled=pending||!jsonInput.value.trim();};
 jsonPanel.append(jsonInput,jsonSubmit);filePanel.append(upload,file);
 const importPanels={file:filePanel,json:jsonPanel},modeButtons={};
 function showImportMode(mode){for(const [key,control] of Object.entries(modeButtons)){const selected=key===mode;control.setAttribute('aria-selected',String(selected));control.tabIndex=selected?0:-1;importPanels[key].hidden=!selected;}}
 for(const mode of ['file','json']){
  const control=button('import-mode-'+mode,'import-mode-'+mode);control.id=root.id+'-import-'+mode;control.setAttribute('role','tab');control.setAttribute('aria-controls',control.id+'-panel');
  importPanels[mode].id=control.id+'-panel';importPanels[mode].setAttribute('role','tabpanel');importPanels[mode].setAttribute('aria-labelledby',control.id);
  modeButtons[mode]=control;importModes.append(control);control.onclick=()=>showImportMode(mode);
  control.onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'file':event.key==='End'?'json':mode==='file'?'json':'file';showImportMode(next);modeButtons[next].focus();}};
 }
 showImportMode('file');
 jsonSubmit.onclick=()=>{if(!jsonInput.value.trim())return;void perform(async()=>{const text=jsonInput.value;try{const imported=await importText(text,'local',jsonSubmit);if(imported){jsonInput.value='';lockStates.set(jsonSubmit,true);}return imported;}catch(error){if(!disposed){errorDialog?.close();errorDialog=showImportError({doc,translate,trigger:jsonSubmit,text,error});}return false;}},'imported');};
 const createMenu=onCreate?createRuleMenu({doc,el,t,button,help,onCreate}):null;
 const filters={local:'',community:''};let examplesExpanded=false;
 const exampleCourses=()=>{
  const examples=new Set((catalog||[]).filter(rule=>rule.demo===true).flatMap(rule=>rule.courses));
  for(const rule of catalog||[])if(rule.demo!==true)for(const course of rule.courses)examples.delete(course);
  return examples;
 };
 const tabs={},panels={},importGroup=el('div',undefined,'rule-import-nav'),importMenu=el('div',undefined,'rule-import-menu');
 importMenu.id=root.id+'-import-menu';importMenu.hidden=true;importButton.setAttribute('aria-expanded','false');importButton.setAttribute('aria-controls',importMenu.id);
 const expandImport=value=>{importMenu.hidden=!value;importButton.setAttribute('aria-expanded',String(value));};
 importButton.onclick=()=>{expandImport(importMenu.hidden);};
 importGroup.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();expandImport(false);importButton.focus();}});
 const sharedGroup=el('div',undefined,'rule-shared-nav'),sharedHeading=el('div',undefined,'rule-community-nav'),sharedButton=button('library-community','shared-rules'),sharedMenu=el('div',undefined,'rule-shared-menu');
 sharedMenu.id=root.id+'-shared-menu';sharedMenu.hidden=true;sharedButton.setAttribute('aria-expanded','false');sharedButton.setAttribute('aria-controls',sharedMenu.id);
 const expandShared=value=>{sharedMenu.hidden=!value;sharedButton.setAttribute('aria-expanded',String(value));};
 sharedButton.onclick=()=>expandShared(sharedMenu.hidden);
 sharedGroup.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();expandShared(false);sharedButton.focus();}});
 for(const key of ['builtin','community','share-new','shared-authors','local','import-new']){
  const tab=button(key==='local'?'import-history':key==='import-new'?'import-new':key==='community'?'shared-browse':['share-new','shared-authors'].includes(key)?key:'library-'+key),panel=el('div',undefined,'rule-library');
  tab.id=`${root.id}-tab-${key}`;tab.dataset.libraryTab=key;tab.setAttribute('role','tab');panel.id=`${root.id}-panel-${key}`;panel.dataset.libraryPanel=key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);tab.setAttribute('aria-controls',panel.id);
  tabs[key]=tab;panels[key]=panel;tabList.append(tab);tab.onclick=()=>{onLibrary?.();show(key);};
  tab.onkeydown=event=>{const keys=Object.keys(tabs).filter(id=>(!['local','import-new'].includes(id)||!importMenu.hidden)&&(!['community','share-new','shared-authors'].includes(id)||!sharedMenu.hidden)),i=keys.indexOf(key);let next;if(['ArrowRight','ArrowDown'].includes(event.key))next=(i+1)%keys.length;if(['ArrowLeft','ArrowUp'].includes(event.key))next=(i+keys.length-1)%keys.length;if(event.key==='Home')next=0;if(event.key==='End')next=keys.length-1;if(next!==undefined){event.preventDefault();onLibrary?.();show(keys[next]);tabs[keys[next]].focus();}};
 }
 if(createMenu)tabs.local.before(createMenu.group);
 tabs.local.before(importGroup);importGroup.append(importButton,importMenu);importMenu.append(tabs.local,tabs['import-new']);
 const link=el('a',undefined,'rule-repository-link');link.href='https://github.com/mxymalay/mamo-checkin-rules';link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',t('community-site'));link.title=t('community-site');
 const external=el('span','↗');external.setAttribute('aria-hidden','true');link.append(external);
 tabs.community.before(sharedGroup);sharedHeading.append(sharedButton,link);sharedMenu.append(tabs.community,tabs['share-new'],tabs['shared-authors']);sharedGroup.append(sharedHeading,sharedMenu);
 const layout=el('div',undefined,'rule-library-layout'),content=el('div',undefined,'rule-library-content');content.append(draftNotice,status,...Object.values(panels),...Object.values(creationPanels));layout.append(nav,content);
 const narrow=doc.defaultView.matchMedia?.('(max-width:600px)'),orientation=()=>tabList.setAttribute('aria-orientation',narrow?.matches?'horizontal':'vertical');orientation();narrow?.addEventListener('change',orientation);
 root.replaceChildren(layout);
 if(!bindingsRoot){bindingsRoot=el('section');root.append(bindingsRoot);}
 const bindings=installRuleBindings({root:bindingsRoot,noticeRoot:bindingsNoticeRoot,request,translate,onTest,onSaved:()=>refresh(),onImports:()=>{onLibrary?.();show('local');}});
 const setNotice=(text='',tone='info')=>{status.textContent=text;status.dataset.tone=tone;status.setAttribute('role',tone==='error'?'alert':'status');};
 const clearNotice=()=>{noticeRevision++;setNotice();};
 doc.addEventListener('mamo:modulechange',clearNotice);doc.addEventListener('mamo:pagechange',clearNotice);
 const hasDraftNotice=()=>['community','local'].includes(activeLibrary)&&unusedRuleCount(state)>0;
 function show(key){if(activeLibrary!==key){clearNotice();activeLibrary=key;}const importing=['local','import-new'].includes(key),sharing=['community','share-new','shared-authors'].includes(key);if(importing)expandImport(true);if(sharing)expandShared(true);sharedGroup.classList.toggle('has-active-child',sharing);importGroup.classList.toggle('has-active-child',importing);const creating=Object.hasOwn(creationPanels,key);for(const [id,tab] of Object.entries(tabs)){const on=id===key;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;panels[id].hidden=!on;}for(const [id,panel] of Object.entries(creationPanels))panel.hidden=id!==key;if(creating){createMenu?.open();createMenu?.select(key);}else createMenu?.clear();createMenu?.group.classList.toggle('has-active-child',creating);draftNotice.hidden=!hasDraftNotice();if(['community','shared-authors'].includes(key)&&catalog===null&&!catalogPending)void fetchCatalog();}
 const lockStates=new Map();
 function locked(on){for(const control of root.querySelectorAll('button,input,select,textarea')){if(Object.values(creationPanels).some(panel=>panel.contains(control)))continue;if(on){if(!lockStates.has(control))lockStates.set(control,control.disabled);control.disabled=true;}else control.disabled=Boolean(lockStates.get(control))||control.dataset.unavailable==='true';}if(!on)lockStates.clear();}
 async function perform(fn,notice){if(pending)return;pending=true;locked(true);setNotice();const revision=noticeRevision;try{if(await fn()===false)return;await refresh();if(revision===noticeRevision)setNotice(notice==='imported'?'':t(notice));}catch(error){if(revision===noticeRevision)setNotice(ruleError(error,t),'error');}finally{pending=false;if(!disposed)locked(false);}}
 function showAuthor({name,url},trigger){
  authorDialog?.close();authorDialog=createRuleDialog({doc,title:t('author'),trigger,translate,dismissOnOutside:true});
  authorDialog.dialog.classList.add('rule-author-dialog');const label=el('p',name,'rule-author-name');label.dataset.ruleLiteral='';authorDialog.body.append(label);
  if(url){const link=el('a',t('author-page')+' ↗','rule-author-page');link.href=url;link.target='_blank';link.rel='noopener noreferrer';authorDialog.body.append(link);}
  authorDialog.show();
 }
 function showDetails(rule,trigger){
  detailsDialog?.close();let clearToast=()=>{};detailsDialog=createRuleDialog({doc,title:t('details'),trigger,translate,dismissOnOutside:true,onClose:()=>clearToast()});
  const current=detailsDialog,heading=nameNode(rule,'h3'),meta=el('p',`${rule.id} · ${rule.version} · ${rule.source}`,'rule-dialog-context'),pre=el('pre',JSON.stringify(rawRule(rule),null,2));
  heading.dataset.ruleLiteral='';meta.dataset.ruleLiteral='';pre.dataset.ruleLiteral='';pre.tabIndex=0;
  const copy=button('copy-json'),download=button('download-json'),feedback=el('p',undefined,'rule-feedback');feedback.setAttribute('role','status');
  download.onclick=()=>{try{const url=doc.defaultView.URL.createObjectURL(new doc.defaultView.Blob([pre.textContent+'\n'],{type:'application/json'})),a=el('a');a.href=url;a.download=rule.id+'.json';a.click();doc.defaultView.setTimeout(()=>doc.defaultView.URL.revokeObjectURL(url),1000);}catch(error){feedback.textContent=ruleError(error,t);}};
  copy.onclick=async()=>{copy.disabled=true;try{await doc.defaultView.navigator.clipboard.writeText(pre.textContent);if(current.dialog.isConnected){clearToast();clearToast=showRuleToast(current.dialog,t('copied'));}}catch{if(current.dialog.isConnected)feedback.textContent=t('copy-error');}finally{copy.disabled=false;}};
  current.body.append(heading,meta,pre,feedback);current.actions.append(copy,download);current.show();
 }
 function confirmReplacement(old,rule,trigger){
  return new Promise(resolve=>{
   confirmDialog?.close();let approved=false;
   const modal=createRuleDialog({doc,title:t('replace-confirm'),trigger,translate,onClose:()=>resolve(approved)});confirmDialog=modal;
   const id=el('p',rule.id,'rule-dialog-context');id.dataset.ruleLiteral='';
   modal.body.append(id,el('p',`${old.version} → ${rule.version}`),el('p',t('replace-copy-warning')));
   const cancel=button('cancel-edit'),accept=button('replace');accept.classList.add('primary');cancel.onclick=modal.close;accept.onclick=()=>{approved=true;modal.close();};modal.actions.append(cancel,accept);modal.show();
  });
 }
 async function importText(text,origin,trigger){
  const rule=parseRule(text),existing=(state.rules||[]).find(r=>r.id===rule.id&&(r.origin||'local')===origin);
  let replace=false;
  if(existing&&await ruleDigest(rawRule(existing))!==await ruleDigest(rule)){replace=await confirmReplacement(existing,rule,trigger);if(!replace||disposed)return false;}
  await onPrepareImport?.();if(disposed)return false;
  await request({type:'ruleImport',text,origin,replace});filters[origin]='';onLibrary?.();show(origin);return true;
 }
 function matchesCourse(rule,origin){
  if(origin==='community'&&!examplesExpanded&&(rule.demo===true||(catalog||[]).some(entry=>entry.id===rule.id&&entry.demo===true)))return false;
  return !filters[origin]||rule.courses.includes(filters[origin]);
 }
 function appendFilters(origin){
  const rules=(state.rules||[]).filter(rule=>(rule.origin==='community'?'community':'local')===origin);
  const courses=[...new Set([...(state.settings?.courses||[]),...rules.flatMap(rule=>rule.courses),...(origin==='community'?catalog||[]:[]).flatMap(rule=>rule.courses)])].sort();
  if(filters[origin]&&!courses.includes(filters[origin]))filters[origin]='';
  const group=el('div',undefined,'rule-course-filters');group.setAttribute('role','group');group.setAttribute('aria-label',t('filter-courses'));
  const demos=origin==='community'?exampleCourses():new Set(),visible=['',...courses.filter(course=>!demos.has(course)),...(examplesExpanded?courses.filter(course=>demos.has(course)):[])];
  for(const course of visible){const choice=el('button',course||t('all-courses'));choice.type='button';choice.dataset.filterCourse=course;choice.setAttribute('aria-pressed',String(filters[origin]===course));choice.onclick=()=>{filters[origin]=course;clearNotice();render(state);panels[origin].querySelector(`[data-filter-course="${course}"]`)?.focus();};
   if(demos.has(course)){const tag=el('span',undefined,'rule-example-filter'),close=el('button','×','rule-example-close');close.type='button';close.dataset.collapseExamples='';close.setAttribute('aria-label',t('collapse-examples'));close.title=t('collapse-examples');close.onclick=()=>{examplesExpanded=false;if(demos.has(filters.community))filters.community='';render(state);panels.community.querySelector('[data-rule-action=expand-examples]')?.focus();};tag.append(choice,close);group.append(tag);}else group.append(choice);
  }
  if(demos.size&&!examplesExpanded){const expand=button('expand-examples');expand.setAttribute('aria-expanded','false');expand.onclick=()=>{examplesExpanded=true;render(state);panels.community.querySelector('.rule-example-filter button')?.focus();};group.append(expand);}
  panels[origin].append(group);
 }
 function appendRule(rule,builtin=false){
  const origin=builtin?'builtin':rule.origin==='community'?'community':'local',list=panels[origin],settings=state.settings||{},key=ruleKey(rule);
  if(!builtin&&!matchesCourse(rule,origin))return;
  const item=el('div',undefined,'rule-library-row'),heading=nameNode(rule,'strong'),main=el('div',undefined,'rule-library-info');
  item.dataset.ruleKind=builtin?'builtin':'community';item.dataset.ruleId=rule.id;item.dataset.ruleKey=key;
  const headingRow=el('div',undefined,'rule-name-row');headingRow.append(heading);appendRuleAttribution({heading:headingRow,rule,el,t,onAuthor:showAuthor});if(builtin)headingRow.append(el('span',t('bundled'),'rule-status-tag'));main.append(headingRow,el('small',`${rule.id} · ${rule.version} · ${rule.source}`));
  const overridden=builtin&&!rule.courses.length?new Set((state.builtins||[]).filter(candidate=>candidate.source===rule.source).flatMap(candidate=>candidate.courses)):new Set();
  const compatible=(settings.courses||[]).filter(c=>courseUsesSource(settings,c,rule.source==='gmail'?'email':rule.source)&&((builtin&&!rule.courses.length&&!overridden.has(c))||rule.courses.includes(c)));
  const courses=builtin?compatible:ruleAppliedCourses(rule,state);
  if(!builtin){const eligible=rule.courses.some(course=>ruleCanMatch(rule,state,course)),status=courses.length?'matched-rule':eligible?'awaiting-match':'draft';headingRow.append(el('span',t(status),'rule-draft-badge rule-state-'+status));if(eligible&&!ruleHasTest(rule,state))headingRow.append(el('span',t('test-skipped'),'rule-status-tag'));}
  if(!builtin||compatible.length)main.append(ruleCourseTags(builtin?compatible:rule.courses,el));
  const usage=el('div',undefined,'rule-usage');if(!builtin&&courses.length)usage.append(el('span',t('enabled')));
  if(courses.length&&!builtin)usage.append(ruleCourseTags(courses,el));else if(builtin&&!courses.length)usage.append(el('span',t('not-in-use'),'rule-status-tag neutral'));
  if(usage.childNodes.length)main.append(usage);const controls=el('div',undefined,'rule-actions'),details=button('details');details.onclick=()=>showDetails(rule,details);controls.append(details);
  if(onTest){if(compatible.length||!builtin){const test=button(!builtin&&ruleHasTest(rule,state)?'test-again-rule':'test','test');test.onclick=()=>onTest({ruleIds:builtin?[]:[key],source:rule.source,mode:builtin?'builtin':'community',course:courses[0]||compatible[0]||rule.courses[0]});controls.append(test);}else main.append(el('small',t('test-source-missing'),'rule-test-unavailable'));}
  if(!builtin){const remove=button('delete');remove.onclick=()=>{if(doc.defaultView.confirm(t('confirm-delete')))void perform(()=>request({type:'ruleRemove',ruleKey:key}),'updated');};controls.append(remove);
   if(rule.hasPrevious){const rollback=button('rollback');rollback.onclick=()=>perform(()=>request({type:'ruleRollback',ruleKey:key}),'updated');controls.append(rollback);}}
  item.append(main,controls);list.append(item);
 }
 function officialError(error){
  const code=error?.code||error?.message||error;
  const known=['official-download','official-signature','official-invalid','official-incompatible','official-size','official-replay','official-cache-invalid','official-timeout','official-storage','official-no-previous','official-resetting'].includes(code);
  return `${t(known?code:'official-error')} ${t('official-retained')}`;
 }
 function renderOfficial(){
  const official=state.official||{},row=el('div',undefined,'rule-official-status'),meta=el('div',undefined,'rule-official-meta');
  const version=el('span',`${t('official-version')}: ${!official.version||official.version==='bundled'?t('official-bundled-version'):official.version}`),checked=el('span',t('official-last-checked')+': ');
  if(official.lastChecked!=null){const date=new Date(official.lastChecked),time=el('time',date.toLocaleString(doc.documentElement.lang||'en'));time.dateTime=date.toISOString();checked.append(time);}else checked.append(t('official-never-checked'));
  const source=el('small',t(official.source==='remote'?'official-source-remote':'official-source-bundled'),'rule-official-source muted');
  meta.append(version,source,checked);
  const actions=el('div',undefined,'rule-actions'),check=button('official-check'),rollback=button('official-rollback');
  for(const [control,icon] of [[check,'check'],[rollback,'rollback']]){const image=el('span',undefined,'rule-official-icon rule-official-icon-'+icon);image.setAttribute('aria-hidden','true');control.prepend(image);}
  rollback.disabled=!official.canRollback;rollback.dataset.unavailable=String(!official.canRollback);
  const run=type=>perform(async()=>{
   const revision=noticeRevision;
   try{const result=await request({type});if(result.official)state={...state,official:result.official};await refresh();}
   catch(error){if(!disposed&&revision===noticeRevision)setNotice(officialError(error),'error');}
   return false;
  });
  check.onclick=()=>void run('officialRulesCheck');
  rollback.onclick=()=>{if(!pending&&state.official?.canRollback&&doc.defaultView.confirm(t('official-rollback-confirm')))void run('officialRulesRollback');};
  actions.append(check,rollback);row.append(meta,actions);panels.builtin.append(row);
  if(official.error){const notice=el('p',officialError(official.error),'rule-notice');notice.dataset.tone='error';notice.setAttribute('role','alert');panels.builtin.append(notice);}
 }
 function renderCatalog(){
  if(catalog===null){
   const message=el('p',t(catalogError?'catalog-error':catalogPending?'catalog-loading':'catalog-idle'),catalogError?'rule-notice':'muted');if(catalogError){message.dataset.tone='error';message.setAttribute('role','alert');}panels.community.append(message);
   if(catalogError){const retry=button('catalog-retry');retry.onclick=()=>{if(!catalogPending)void fetchCatalog();};panels.community.append(retry);}return;
  }
  for(const entry of catalog){
   if(!matchesCourse(entry,'community'))continue;
   const installed=(state.rules||[]).find(r=>r.origin==='community'&&r.id===entry.id);
   if(installed&&installed.version===entry.version)continue;
   const row=el('div',undefined,'rule-library-row'),main=el('div',undefined,'rule-library-info'),heading=nameNode(entry,'strong');
   const headingRow=el('div',undefined,'rule-name-row');headingRow.append(heading);appendRuleAttribution({heading:headingRow,rule:{...entry,sourceUrl:entry.sourceUrl||catalogURL(entry)},el,t,onAuthor:showAuthor});
   main.append(headingRow,el('small',`${entry.id} · ${entry.version} · ${entry.source}`),ruleCourseTags(entry.courses,el));
   const actions=el('div',undefined,'rule-actions'),download=button(installed?'download-update':'download-install','download-install');
   download.onclick=()=>perform(async()=>importText(await downloadRule(entry),'community',download),'imported');actions.append(download);row.append(main,actions);panels.community.append(row);
  }
  if(!panels.community.querySelector('.rule-library-row'))panels.community.append(el('div',t('catalog-empty'),'rule-empty-state'));
 }
 async function fetchCatalog(){
  catalogPending=true;catalogError=false;render(state);
  try{catalog=await loadCatalog();}catch{catalogError=true;}finally{catalogPending=false;if(!disposed)render(state);}
 }
 function renderSharing(){
  const panel=panels['share-new'];
  const links=el('div',undefined,'rule-actions');
  for(const [key,path] of [['share-guide','/blob/main/CONTRIBUTING.md'],['share-submit','/compare']]){const link=el('a',t(key));link.href='https://github.com/mxymalay/mamo-checkin-rules'+path;link.target='_blank';link.rel='noopener noreferrer';links.append(link);}
  panel.append(el('p',t('share-privacy'),'rule-notice'),links);
 }
 function renderAuthors(){
  const panel=panels['shared-authors'];
  if(catalog===null){const message=el('p',t(catalogError?'catalog-error':catalogPending?'catalog-loading':'catalog-idle'),catalogError?'rule-notice':'muted');if(catalogError)message.dataset.tone='error';panel.append(message);if(catalogError){const retry=button('catalog-retry');retry.onclick=()=>{if(!catalogPending)void fetchCatalog();};panel.append(retry);}return;}
  const authors=sharedRuleAuthors(catalog),list=el('ul',undefined,'shared-author-list');
  for(const author of authors){
   const row=el('li'),icon=el('span',undefined,'rule-meta-icon rule-author-icon'),name=el(author.url?'a':'span',author.name),count=el('span',t('shared-author-count').replace('{count}',String(author.count)),'muted');
   icon.setAttribute('aria-hidden','true');name.dataset.ruleLiteral='';
   if(author.url){name.href=author.url;name.target='_blank';name.rel='noopener noreferrer';const arrow=el('span',' ↗');arrow.setAttribute('aria-hidden','true');name.append(arrow);}
   row.append(icon,name,count);list.append(row);
  }
  panel.append(authors.length?list:el('div',t('shared-authors-empty'),'rule-empty-state'));
 }
 function render(data){
  const focused=root.contains(doc.activeElement)&&doc.activeElement.hasAttribute('data-filter-course')?{course:doc.activeElement.dataset.filterCourse,origin:doc.activeElement.closest('[data-library-panel]')?.dataset.libraryPanel}:null;
  if(disposed)return;state={...state,...data};bindings.update(state);for(const panel of Object.values(panels))panel.replaceChildren();
  renderDraftNotices(draftNotice,state,{el,t},{onImports:()=>{onLibrary?.();show('local');},onMatching});draftNotice.hidden=!hasDraftNotice();
  panels['import-new'].append(importToolbar,filePanel,jsonPanel);appendFilters('local');appendFilters('community');
  renderOfficial();for(const rule of state.builtins||[])appendRule(rule,true);for(const rule of state.rules||[])appendRule(rule);
  if(!panels.local.querySelector('.rule-library-row'))panels.local.append(el('div',t(filters.local?'course-empty':'local-empty'),'rule-empty-state'));
  renderCatalog();renderSharing();renderAuthors();
  const invalidKeys=new Set();
  for(const error of state.errors||[]){const key=error.key||error.id;if(!key||invalidKeys.has(key))continue;invalidKeys.add(key);const warning=el('div',undefined,'rule-library-row rule-error'),info=el('div',undefined,'rule-library-info'),label=el('small',key),remove=button('delete');warning.dataset.invalidRule=key;label.dataset.ruleLiteral='';remove.onclick=()=>{if(doc.defaultView.confirm(t('confirm-delete')))void perform(()=>request({type:'ruleRemove',ruleKey:key}),'updated');};info.append(el('strong',t('invalid-package')),label);warning.append(info,remove);const panel=panels[error.origin==='community'||key.startsWith('community:')?'community':'local'];panel.querySelector('.rule-empty-state')?.remove();panel.append(warning);}
  if(pending)locked(true);
  if(focused){const choices=[...(panels[focused.origin]?.querySelectorAll('[data-filter-course]')||[])];(choices.find(choice=>choice.dataset.filterCourse===focused.course)||choices[0])?.focus({preventScroll:true});}
 }
 async function refresh(){const data=await request({type:'ruleList'});render(data);}
 function importFiles(files){
  if(disposed||pending||!files?.length)return;
  if(files.length!==1){setNotice(t('import-one-file'),'error');return;}
  const selected=files[0];
  if(selected.name&&!/\.json$/i.test(selected.name)){setNotice(t('import-json-file'),'error');return;}
  void perform(async()=>{let text='';try{if(selected.size>65536)throw new Error('size: $');text=await selected.text();return await importText(text,'local',upload);}catch(error){if(!disposed){errorDialog?.close();errorDialog=showImportError({doc,translate,trigger:upload,filename:selected.name,text,error});}return false;}finally{file.value='';}},'imported');
 }
 file.onchange=()=>importFiles(file.files);
 let dragDepth=0;
 upload.ondragenter=event=>{event.preventDefault();if(!pending){dragDepth++;upload.dataset.dragging='true';}};
 upload.ondragover=event=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect=pending?'none':'copy';};
 upload.ondragleave=event=>{event.preventDefault();if(--dragDepth<=0){dragDepth=0;delete upload.dataset.dragging;}};
 upload.ondrop=event=>{event.preventDefault();dragDepth=0;delete upload.dataset.dragging;importFiles(event.dataTransfer?.files);};
 show('builtin');
 return {show,async update(next){state={...state,...next};const key=JSON.stringify([next.settings?.courses,next.settings?.sourceModes,next.settings?.moodleUrls,next.settings?.edUrls,next.settings?.senders,next.settings?.devMode,doc.documentElement.lang]);if(key===signature)return;signature=key;try{await refresh();}catch(error){if(!disposed)setNotice(ruleError(error,t),'error');}},refresh,dispose(){disposed=true;createMenu?.dispose();doc.removeEventListener('mamo:modulechange',clearNotice);doc.removeEventListener('mamo:pagechange',clearNotice);narrow?.removeEventListener('change',orientation);detailsDialog?.close();authorDialog?.close();confirmDialog?.close();errorDialog?.close();bindings.dispose();root.replaceChildren();}};
}
