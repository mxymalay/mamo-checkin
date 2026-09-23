import {ruleUI} from './ui.js';
let sequence=0;
export function createRuleDialog({doc,title,trigger,translate,onClose=()=>{},dismissOnOutside=false}){
 const dialog=doc.createElement('dialog');dialog.className='rule-dialog';dialog.dataset.ruleUi='';
 const {el,t,button}=ruleUI(dialog,translate),heading=el('h2',title),header=el('div',undefined,'rule-dialog-header'),dismiss=button('close','close-dialog'),body=el('div',undefined,'rule-dialog-body'),actions=el('div',undefined,'rule-dialog-actions');
 heading.id='rule-dialog-title-'+(++sequence);heading.tabIndex=-1;dialog.setAttribute('aria-labelledby',heading.id);
 dismiss.textContent='×';dismiss.setAttribute('aria-label',t('close'));dismiss.title=t('close');dismiss.classList.add('rule-dialog-close');
 header.append(heading,dismiss);dialog.append(header,body,actions);
 let finished=false;
 const cleanup=()=>{if(finished)return;finished=true;dialog.remove();if(trigger?.isConnected&&!trigger.closest('[hidden]'))trigger.focus({preventScroll:true});else doc.querySelector('.module-tabs [aria-selected=true]')?.focus({preventScroll:true});onClose();};
 const close=()=>{if(typeof dialog.close==='function'&&dialog.open)dialog.close();cleanup();};
 dismiss.onclick=close;dialog.addEventListener('close',cleanup,{once:true});dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{if(!dismissOnOutside||event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();});
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
 return {dialog,heading,body,actions,close,show(){doc.body.append(dialog);if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');heading.focus({preventScroll:true});}};
}
