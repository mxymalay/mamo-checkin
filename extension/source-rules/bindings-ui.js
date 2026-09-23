import {ruleUI} from './ui.js';
import {createRuleDialog} from './dialog.js';
import {ruleError} from './strings.js';
import {courseUsesSource} from '../course-sources.js';
import {renderDraftNotices} from './draft-status.js';
import {ruleWasTested,ruleCanMatch} from './test-status.js';

const sources=['gmail','moodle','ed'];
const sourceName=source=>({gmail:'Gmail',moodle:'Moodle',ed:'Ed'}[source]);
const ids=value=>[...new Set((Array.isArray(value)?value:[value]).filter(v=>typeof v==='string'&&v))];
const ruleKey=rule=>rule.key||rule.id;
export function installRuleBindings({root,request,translate,onSaved,onImports,onTest,readOnly=false,showBuiltins=true,noticeRoot,showDraftNotice=true}){
 const {el,t,button,name,nameNode}=ruleUI(root,translate);root.dataset.ruleUi='';root.classList.add('rule-bindings');
 const draftNotice=el('div',undefined,'rule-draft-notices'),status=el('p',undefined,'rule-feedback'),wrap=el('div',undefined,'rule-matching-wrap');status.setAttribute('role','status');draftNotice.hidden=true;
 if(noticeRoot){noticeRoot.append(draftNotice,status);root.replaceChildren(wrap);}else root.replaceChildren(draftNotice,status,wrap);let state={},modal=null,disposed=false;
 function choose(course,source,trigger){
  modal?.close();modal=createRuleDialog({doc:root.ownerDocument,title:t('choose-rules'),trigger,translate});
  modal.dialog.classList.add('rule-picker-dialog');
  const current=modal,available=(state.rules||[]).filter(rule=>rule.source===source&&rule.courses.includes(course)),valid=new Set(available.map(ruleKey));
  const tested=rule=>ruleWasTested(rule,state,course);
  const eligible=rule=>ruleCanMatch(rule,state,course);
  const chosen=new Set(ids(state.bindings?.[course]?.[source]).filter(id=>valid.has(id)&&available.some(rule=>ruleKey(rule)===id&&eligible(rule))));
  const context=el('p',`${course} · ${sourceName(source)}`,'rule-dialog-context');context.dataset.ruleLiteral='';
  const search=el('input');search.type='search';search.placeholder=t('search-rules');search.setAttribute('aria-label',t('search-rules'));
  const list=el('div',undefined,'rule-choice-list'),count=el('p',undefined,'rule-choice-count'),feedback=el('p',undefined,'rule-feedback');feedback.setAttribute('role','status');
  const builtin=el('label',undefined,'rule-choice'),locked=el('input');locked.type='checkbox';locked.checked=true;locked.disabled=true;builtin.append(locked,el('span',t('builtin-always')));if(showBuiltins)list.append(builtin);
  const choices=[];
  const filters=el('div',undefined,'rule-picker-tabs');filters.setAttribute('role','tablist');let filter='all';
  for(const key of ['all','tested','untested']){const b=button('filter-'+key);b.setAttribute('role','tab');b.onclick=()=>{filter=key;applyFilter();};filters.append(b);}
  for(const rule of available){
   const row=el('div',undefined,'rule-choice'),input=el('input'),label=el('label',undefined,'rule-choice-copy'),heading=nameNode(rule,'strong'),meta=el('small',`${rule.id} · ${rule.version}`),title=el('span',undefined,'rule-choice-title');
   title.append(heading);const badge=el('span',t(tested(rule)?'filter-tested':eligible(rule)?'test-skipped':'draft'),'rule-choice-badge');badge.dataset.tested=String(tested(rule));title.append(badge);
   if(!tested(rule))row.title=t(eligible(rule)?'test-skipped':'rule-test-required');
   input.type='checkbox';input.id=current.dialog.getAttribute('aria-labelledby')+'-'+choices.length;label.htmlFor=input.id;input.dataset.ruleId=rule.id;input.dataset.ruleKey=ruleKey(rule);input.checked=chosen.has(ruleKey(rule));heading.dataset.ruleLiteral='';label.append(title,meta);row.append(input,label);list.append(row);choices.push({row,input,rule});
   input.onchange=()=>{if(input.checked&&eligible(rule))chosen.add(ruleKey(rule));else{chosen.delete(ruleKey(rule));input.checked=false;}sync();};
   if(onTest&&!tested(rule)){const test=button('test');test.onclick=event=>{event.preventDefault();current.close();void onTest({course,source,ruleIds:[ruleKey(rule)],mode:'community'});};row.append(test);}
  }
  if(!available.length)list.append(el('p',t('no-compatible'),'muted'));
  function sync(){count.textContent=`${chosen.size} / 8`;for(const {input,rule} of choices)input.disabled=!eligible(rule)||!input.checked&&chosen.size>=8;}
  function applyFilter(){const value=search.value.trim().toLowerCase();for(const {row,rule} of choices)row.hidden=!`${name(rule)} ${rule.id}`.toLowerCase().includes(value)||(filter==='tested'&&!tested(rule))||(filter==='untested'&&tested(rule));for(const b of filters.children)b.setAttribute('aria-selected',String(b.dataset.ruleAction==='filter-'+filter));builtin.hidden=filter==='untested';}
  search.oninput=applyFilter;
  const cancel=button('cancel-edit','cancel-binding'),save=button('save-binding');cancel.onclick=current.close;save.classList.add('primary');
  let saving=false;
  save.onclick=async()=>{
   if(saving)return;saving=true;feedback.textContent='';
   for(const control of current.dialog.querySelectorAll('input,button'))control.disabled=true;
   try{await request({type:'ruleBind',course,source,ruleIds:[...chosen].sort()});await onSaved();if(!disposed)status.textContent=t('saved');current.close();}
   catch(error){feedback.textContent=ruleError(error,t);}
   finally{saving=false;for(const control of current.dialog.querySelectorAll('input,button'))control.disabled=false;locked.disabled=true;sync();}
  };
  const tools=el('div',undefined,'rule-picker-tools');tools.append(filters,search);
  current.body.append(context,tools,list,feedback);current.actions.append(count,cancel,save);sync();applyFilter();current.show();
 }
 function update(next){
  if(disposed)return;state=next;wrap.replaceChildren();status.textContent='';const settings=state.settings||{},rules=state.rules||[];
  renderDraftNotices(draftNotice,state,{el,t},{onImports,onMatching:()=>wrap.scrollIntoView?.({behavior:'smooth',block:'start'})});draftNotice.hidden||=!showDraftNotice;
  if(!settings.courses?.length){wrap.append(el('p',t('no-courses'),'muted'));return;}
  const table=el('table',undefined,'rule-matching-table'),head=el('thead'),header=el('tr'),body=el('tbody');
  for(const label of [t('course'),'Gmail','Moodle','Ed']){const th=el('th',label);th.scope='col';header.append(th);}head.append(header);table.append(head,body);
  for(const course of settings.courses){
   const row=el('tr');row.dataset.course=course;const heading=el('th',course);heading.scope='row';heading.dataset.ruleLiteral='';row.append(heading);
   for(const source of sources){
    const cell=el('td');cell.dataset.source=source;row.append(cell);
    if(!courseUsesSource(settings,course,source==='gmail'?'email':source)){cell.append(el('span',t('source-off'),'muted'));continue;}
    const selected=ids(state.bindings?.[course]?.[source]),compatible=rules.filter(rule=>rule.source===source&&rule.courses.includes(course)),active=compatible.filter(rule=>selected.includes(ruleKey(rule)));
    if(showBuiltins){const defaults=el('p',t('builtin'),'rule-builtin-label');cell.append(defaults);}
    const list=el('ul',undefined,'rule-selected-list');for(const rule of active){const item=el('li'),label=nameNode(rule);item.append(label,el('small',t(rule.origin==='community'?'origin-community':'origin-local'),'rule-origin'));list.append(item);}cell.append(list);
    if(selected.some(id=>!compatible.some(rule=>ruleKey(rule)===id)))cell.append(el('p',t('binding-fallback'),'rule-error'));
    if(!readOnly){const edit=button('choose-rules');edit.onclick=()=>choose(course,source,edit);cell.append(edit);}
   }
   body.append(row);
  }
  wrap.append(table);
 }
 return {update,dispose(){disposed=true;modal?.close();draftNotice.remove();status.remove();root.replaceChildren();}};
}
