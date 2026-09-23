export function installPersonalSettingsMenu(doc=document){
 return installHeaderMenu(doc,{triggerId:'personal-settings',panelId:'personal-settings-menu'});
}
export function installHeaderMenu(doc,{triggerId,panelId}){
 const trigger=doc.getElementById(triggerId),panel=doc.getElementById(panelId),root=trigger.parentElement;
 const actions=()=>[...panel.querySelectorAll('button')].filter(button=>!button.disabled);
 const close=(focus=false)=>{panel.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();};
 const open=()=>{panel.hidden=false;trigger.setAttribute('aria-expanded','true');actions()[0]?.focus();};
 trigger.onclick=()=>panel.hidden?open():close();
 const choose=event=>{if(event.target.closest('button'))close(true);};panel.addEventListener('click',choose);
 const outside=event=>{if(!root.contains(event.target))close();};doc.addEventListener('click',outside);
 const blur=event=>{if(!root.contains(event.relatedTarget))close();};root.addEventListener('focusout',blur);
 const key=event=>{if(event.key==='Escape'){event.preventDefault();close(true);}else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();if(panel.hidden){open();return;}const items=actions(),index=items.indexOf(doc.activeElement);items[event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:items.length-1))%items.length]?.focus();}};root.addEventListener('keydown',key);
 return {close,dispose(){doc.removeEventListener('click',outside);root.removeEventListener('focusout',blur);root.removeEventListener('keydown',key);panel.removeEventListener('click',choose);trigger.onclick=null;close();}};
}
