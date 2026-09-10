export function appendRecordHelp(cell,doc=cell.ownerDocument){
 const wrap=doc.createElement('span');wrap.className='help-wrap record-code-help-wrap';
 const help=doc.createElement('button');help.type='button';help.className='help-button record-code-help';help.textContent='?';help.setAttribute('aria-label','为什么没有签到码？');
 const tip=doc.createElement('span');tip.className='tooltip';tip.setAttribute('role','tooltip');tip.setAttribute('popover','manual');
 tip.id='record-help-'+doc.querySelectorAll('.record-code-help').length;
 tip.textContent='已检测到该场次已签到，因此没有重复查询签到码。';help.setAttribute('aria-describedby',tip.id);
 const show=()=>{
  // Set the final coordinates before opening the top-layer popover so it never paints at (0, 0).
  tip.style.visibility='hidden';tip.style.transition='none';tip.style.transform='none';
  const rect=help.getBoundingClientRect(),width=tip.offsetWidth||260,height=tip.offsetHeight||54,view=doc.defaultView;
  tip.style.left=`${Math.max(8,Math.min(rect.left,view.innerWidth-width-8))}px`;
  tip.style.top=`${Math.max(8,rect.top-height-8)}px`;
  tip.showPopover?.();
  tip.style.removeProperty('visibility');
 };
 const hide=()=>{tip.hidePopover?.();};
 wrap.addEventListener('mouseenter',show);wrap.addEventListener('focusin',show);help.addEventListener('click',show);
 wrap.addEventListener('mouseleave',()=>{if(doc.activeElement!==help)hide();});wrap.addEventListener('focusout',hide);
 help.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
 wrap.append(help,tip);cell.append(wrap);return {help,tip};
}
