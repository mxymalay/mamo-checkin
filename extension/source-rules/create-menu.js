export function createRuleMenu({doc,el,t,button,help,onCreate}){
 const group=el('div',undefined,'rule-create-action'),trigger=button('builder-title','create'),menu=el('div',undefined,'rule-create-menu');
 trigger.setAttribute('aria-expanded','false');menu.hidden=true;
 const heading=el('div',undefined,'rule-create-heading'),hint=help('builder-entry-help');heading.append(trigger,hint);
 menu.id='rule-create-children';trigger.setAttribute('aria-controls',menu.id);
 const practice=button('create-practice'),actual=button('create-actual');menu.append(practice,actual);group.append(heading,menu);
 const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');};
 trigger.onclick=()=>{const opening=menu.hidden;close();if(opening){menu.hidden=false;trigger.setAttribute('aria-expanded','true');practice.focus();}};
 const select=mode=>{for(const [key,b] of [['actual',actual],['practice',practice]]){if(key===mode)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}};
 const open=()=>{menu.hidden=false;trigger.setAttribute('aria-expanded','true');};
 actual.onclick=()=>{select('actual');onCreate('actual');};practice.onclick=()=>{select('practice');onCreate('practice');};
 group.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close();trigger.focus();}
  if(!menu.hidden&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const first=event.key==='Home'||event.key!=='End'&&doc.activeElement===actual;(first?practice:actual).focus();}
 });
 return {group,close,open,select,clear(){actual.removeAttribute('aria-current');practice.removeAttribute('aria-current');},dispose(){close();}};
}
