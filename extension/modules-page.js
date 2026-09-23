import {installRuleManager} from './source-rules/manager-ui.js';
import {installRuleTestUI} from './source-rules/test-ui.js';
import {installModuleTabs} from './module-tabs.js';
import {installRuleBuilderUI} from './source-rules/builder/ui.js';
import {installPracticeWizard} from './source-rules/practice/wizard-ui.js';
import {installRuleBindings} from './source-rules/bindings-ui.js';
import {practiceText} from './source-rules/practice/wizard-strings.js';

export function installModulesPage({doc,request,translate,chrome,isWindows=false,embedded=false,onInstallCompanion}){
 const $=id=>doc.getElementById(id),t=key=>translate('rules.'+key);
 let state={},service=null,checking=false,switching=false,disposed=false,refreshing=false,queued=false,checkedManually=false,practiceRefresh=0;
 const notice=message=>{const node=$('modules-notice');node.classList.add('rule-notice');node.textContent=message;node.hidden=!message;node.dataset.tone=message?'error':'info';node.setAttribute('role',message?'alert':'status');};
 const tests=installRuleTestUI({root:$('rule-test'),request,translate,onApproved:async()=>{await manager.refresh();await refreshPractice();},onMatching:()=>tabs.show('matching',{focus:true})});
 const builderRoot=doc.createElement('section'),practiceRoot=doc.createElement('section');builderRoot.id='rule-builder';practiceRoot.id='rule-practice';builderRoot.hidden=true;practiceRoot.hidden=true;
 let tabs;const backToLibrary=()=>{tabs.show('library',{focus:true});manager.show('local');};
 const sample=doc.createElement('section'),sampleHeading=doc.createElement('div'),sampleTitle=doc.createElement('h3'),removeSample=doc.createElement('button'),sampleTable=doc.createElement('div'),realTitle=doc.createElement('h3'),realBindings=doc.createElement('div');
 sample.className='practice-matching';sample.hidden=true;sampleHeading.className='practice-matching-heading';removeSample.type='button';removeSample.className='practice-remove-sample';removeSample.dataset.practiceAction='remove-sample';
 const matchingNotices=doc.createElement('div');matchingNotices.className='rule-matching-notices';
 const removeIcon=doc.createElement('span');removeIcon.setAttribute('aria-hidden','true');removeSample.append(removeIcon);sampleHeading.append(sampleTitle,removeSample);sample.append(sampleHeading,sampleTable);realTitle.hidden=true;realTitle.className='practice-real-heading';$('rule-bindings').replaceChildren(matchingNotices,sample,realTitle,realBindings);
 const sampleBindings=installRuleBindings({root:sampleTable,noticeRoot:matchingNotices,request:payload=>request({...payload,type:'practiceBind'}),translate,showBuiltins:false,showDraftNotice:false,onSaved:refreshPractice,onTest:selection=>{tabs.show('test',{focus:true});return tests.open(selection);}});
 async function refreshPractice(){
  const epoch=++practiceRefresh,summary=await request({type:'practiceSummary'});if(disposed||epoch!==practiceRefresh)return;
  const hasSample=Boolean(summary.saved?.rules?.length);
  sample.hidden=realTitle.hidden=!hasSample;
  const pt=key=>practiceText(key,doc.documentElement.lang||'en');
  sampleTitle.textContent=pt('sample-courses');realTitle.textContent=pt('real-courses');removeSample.title=pt('remove-sample');removeSample.setAttribute('aria-label',pt('remove-sample'));
  sampleBindings.update({...summary.matching,settings:summary.settings});
  practice.restore(summary);
 }
 const builder=installRuleBuilderUI({root:builderRoot,request,translate,chrome,onBack:backToLibrary,onImports:backToLibrary,onSaved:async({destination})=>{await manager.refresh();if(destination==='matching')tabs.show('matching',{focus:true});}});
 const practice=installPracticeWizard({root:practiceRoot,request,translate,chrome,onBack:backToLibrary,onSaved:async()=>{await refreshPractice();tabs.show('matching',{focus:true});},onReset:refreshPractice});
 removeSample.onclick=async()=>{removeSample.disabled=true;try{await practice.reset();}finally{removeSample.disabled=false;}};
 const manager=installRuleManager({root:$('rule-manager'),bindingsRoot:realBindings,bindingsNoticeRoot:matchingNotices,request,translate,creationPanels:{actual:builderRoot,practice:practiceRoot},onLibrary:()=>tabs?.show('library'),onPrepareImport:async()=>{tabs.show('library');await transition;},onMatching:()=>tabs.show('matching',{focus:true}),onCreate:mode=>tabs.show('create/'+mode),onTest:selection=>{tabs.show('test',{focus:true});return tests.open(selection).catch(()=>notice(t('page-load-error')));}});
 const controllers={actual:builder,practice};let transition=Promise.resolve(),routeEpoch=0;
 tabs=installModuleTabs({doc,embedded,isWindows,onLeaveTest:()=>{void tests.cancel();},onEnterCreate:mode=>{manager.show(mode);const epoch=++routeEpoch;transition=transition.then(()=>epoch===routeEpoch?controllers[mode].open():undefined).catch(()=>notice(t('page-load-error')));},onLeaveCreate:mode=>{routeEpoch++;transition=transition.then(()=>controllers[mode].cancel({preserveCompleted:mode==='practice'})).catch(()=>{});manager.show('builtin');}});
 function renderEngine(){
  const browser=isWindows||service?.fallback;
  const healthKey=checking?'engine-checking':!service||!browser&&!service.binaryReady?'engine-error':service.busy?'engine-busy':browser?'browser-engine':'vision-engine';
  $('health').dataset.i18nKey='rules.'+healthKey;$('health').textContent=t(healthKey);
  $('engine-desc').textContent=service&&(browser||service.binaryReady)?t(browser?'engine-browser-info':'engine-vision-info'):'';
  $('prefer-companion').hidden=isWindows||!service||!browser&&service.binaryReady;
  $('prefer-companion').textContent=t('install-vision');
  $('check-health').classList.toggle('primary',!checkedManually);$('check-health').classList.toggle('subtle',checkedManually);
  for(const id of ['check-health','prefer-companion'])$(id).disabled=checking||switching||Boolean(state.status?.running);
 }
 async function checkHealth(manual=false){
  if(checking||disposed)return;checking=true;renderEngine();
  try{service=await request({type:'health'});if(manual)checkedManually=Boolean(service&&!service.busy&&(service.fallback||service.binaryReady));}catch{service=null;checkedManually=false;}
  finally{checking=false;if(!disposed)renderEngine();}
 }
 async function refresh(){
  if(disposed)return;if(refreshing){queued=true;return;}refreshing=true;
  try{
   do{
    queued=false;const next=await request({type:'status'});if(disposed)return;state=next;
    const dev=Boolean(state.settings?.devMode);
    tabs.update(dev);
    if(!embedded){$('open-advanced').dataset.i18nKey='rules.'+(dev?'to-normal':'to-developer');$('open-advanced').textContent=t(dev?'to-normal':'to-developer');$('open-advanced').setAttribute('aria-expanded',String(dev));}
    await tests.update(state);await manager.update(state);renderEngine();
   }while(queued&&!disposed);
  }catch{notice(t('page-load-error'));}finally{refreshing=false;}
 }
 $('check-health').onclick=()=>checkHealth(true);
 async function installCompanion(){
  if(switching||checking)return;switching=true;renderEngine();notice('');
  try{
   await request({type:'resetOcrPreference'});
   if(embedded)await onInstallCompanion?.();else doc.defaultView.location.href='options.html';
  }catch(error){notice(translate(error.message));}finally{switching=false;renderEngine();}
 }
 $('prefer-companion').onclick=()=>installCompanion();
 if(!embedded)$('open-advanced').onclick=async()=>{
  const button=$('open-advanced');button.disabled=true;notice('');
  try{
   const on=!state.settings?.devMode,settings={devMode:on};
   if(!on){settings.recognitionOnly=false;settings.fastInterval=false;if(state.settings?.intervalMinutes===0.5)settings.intervalMinutes=1440;}
   await request({type:'settings',scope:'automation',settings});await refresh();
  }catch(error){notice(translate(error.message));}finally{button.disabled=false;}
 };
 const changed=(changes,area)=>{
  if(area!=='local'||disposed)return;
  if(changes.settings||changes.status||changes.ocrPreference)void refresh();
  if(changes.ocrPreference)void checkHealth();
  if(changes['practice:sourceRuleLibrary']||changes['practice:sourceRuleBindings'])void refreshPractice().catch(()=>notice(t('page-load-error')));
  if(changes.sourceRuleLibrary||changes.sourceRuleBindings||changes.sourceRuleTests){void manager.refresh().catch(()=>notice(t('page-load-error')));void refreshPractice().catch(()=>notice(t('page-load-error')));void tests.reload().catch(()=>notice(t('page-load-error')));}
  if(changes.officialRuleUpdates)void manager.refresh().catch(()=>notice(t('page-load-error')));
 };
 const languageChanged=()=>{practice.refreshLanguage?.();void refresh();void refreshPractice().catch(()=>notice(t('page-load-error')));};
 // Deep links can mount this page before the language picker exists.
 const languageObserver=new doc.defaultView.MutationObserver(languageChanged);
 languageObserver.observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
 chrome?.storage?.onChanged?.addListener(changed);
 const ready=Promise.all([refresh(),checkHealth(),refreshPractice().catch(()=>notice(t('page-load-error')))]).then(()=>{if(!disposed&&doc.defaultView.location.hash==='#rule-test'&&!$('rule-test').hidden)$('rule-test').scrollIntoView?.({block:'start'});});
 return {ready,refresh,show:key=>tabs.show(key,{focus:true}),async cancel(){routeEpoch++;await transition;await tests.cancel();await builder.cancel();await practice.cancel({preserveCompleted:true});},async dispose(){disposed=true;routeEpoch++;languageObserver.disconnect();chrome?.storage?.onChanged?.removeListener?.(changed);tabs.dispose();await transition;await tests.dispose();await builder.dispose();await practice.dispose();sampleBindings.dispose();manager.dispose();}};
}
