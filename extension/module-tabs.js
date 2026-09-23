export function installModuleTabs({doc,onLeaveTest=()=>{},onEnterCreate=()=>{},onLeaveCreate=()=>{},embedded=false,isWindows=false}){
 const nav=doc.querySelector('.module-tabs'),panels=[...doc.querySelectorAll('[data-module-panel]')];
 const tabs=[...nav.querySelectorAll('[data-module-tab]')];let active='',interacted=false;
 const recognition=tabs.find(tab=>tab.dataset.moduleTab==='recognition');if(recognition)recognition.hidden=isWindows;
 const creationMode=key=>/^create\/(actual|practice)$/.exec(key)?.[1];
 const keyForHash=()=>({'#rule-test':'test','#rule-manager':'library'}[doc.defaultView.location.hash]||doc.defaultView.location.hash.replace(/^#modules\/?/,'').replace(/^#/,''));
 function show(key,{focus=false,save=true,initializing=false}={}){
  if(!initializing)interacted=true;
  if(!creationMode(key)&&!tabs.some(tab=>tab.dataset.moduleTab===key))key='recognition';
  if(isWindows&&key==='recognition')key='library';
  if(active==='test'&&key!=='test')onLeaveTest();
  if(creationMode(active)&&active!==key)onLeaveCreate(creationMode(active));
  const panelKey=creationMode(key)?'library':key,selected=tabs.find(tab=>tab.dataset.moduleTab===panelKey);
  if(focus)selected.focus({preventScroll:true});
  for(const tab of tabs){const on=tab===selected;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;}
  for(const panel of panels)panel.hidden=panel.dataset.modulePanel!==panelKey;
  const previous=active;active=key;
  if(previous!==key)doc.dispatchEvent(new doc.defaultView.CustomEvent('mamo:modulechange',{detail:{page:key,previous}}));
  if(creationMode(key))onEnterCreate(creationMode(key));
  if(save)doc.defaultView.history.replaceState(null,'','#'+(embedded?'modules/':'')+key);
 }
 for(const tab of tabs){
  tab.onclick=()=>show(tab.dataset.moduleTab);
  tab.onkeydown=event=>{
   const available=tabs.filter(t=>!t.hidden),i=available.indexOf(tab);let next;
   if(event.key==='ArrowRight')next=(i+1)%available.length;
   if(event.key==='ArrowLeft')next=(i+available.length-1)%available.length;
   if(event.key==='Home')next=0;if(event.key==='End')next=available.length-1;
   if(next!==undefined){event.preventDefault();show(available[next].dataset.moduleTab,{focus:true});}
  };
 }
 const onHash=()=>show(keyForHash(),{save:false});doc.defaultView.addEventListener('hashchange',onHash);
 const initial=keyForHash();show(initial||'recognition',{save:false,initializing:true});let initialized=false;
 return {show,update(){const test=tabs.find(tab=>tab.dataset.moduleTab==='test');test.hidden=false;if(!initialized){initialized=true;if(!interacted)show(initial||'recognition',{save:false,initializing:true});}},dispose(){doc.defaultView.removeEventListener('hashchange',onHash);}};
}
