import {courseUsesSource} from '../course-sources.js';
import {ruleHasTest} from './test-status.js';

export function ruleAppliedCourses(rule,state){
 const settings=state.settings||{},key=rule.key||rule.id;
 return (settings.courses||[]).filter(course=>{
  if(!rule.courses.includes(course)||!courseUsesSource(settings,course,rule.source==='gmail'?'email':rule.source))return false;
  const selected=state.bindings?.[course]?.[rule.source];
  return (Array.isArray(selected)?selected:[selected]).includes(key);
 });
}
export const unusedRuleCount=state=>(state.rules||[]).filter(rule=>!ruleAppliedCourses(rule,state).length).length;

export function draftRuleCounts(state){
 const counts={untested:0,tested:0};
 for(const rule of state.rules||[])if(!ruleAppliedCourses(rule,state).length)counts[ruleHasTest(rule,state)?'tested':'untested']++;
 return counts;
}

export function renderDraftNotices(root,state,{el,t}, {onImports,onMatching}={}){
 root.replaceChildren();const counts=draftRuleCounts(state);root.hidden=!counts.untested&&!counts.tested;
 for(const kind of ['untested','tested']){
  if(!counts[kind])continue;
  const notice=el('div',undefined,'rule-draft-notice'),link=el('a',t(kind==='untested'?'go-import-history':'go-matching')),arrow=el('span','↗');
  notice.dataset.draftState=kind;notice.setAttribute('role','status');arrow.setAttribute('aria-hidden','true');link.append(arrow);
  link.href=kind==='untested'?'#rule-manager':'#rule-bindings';link.onclick=event=>{const navigate=kind==='untested'?onImports:onMatching;if(navigate){event.preventDefault();navigate();}};
  notice.append(el('span',t(kind==='untested'?'draft-test-notice':'draft-notice').replace('{count}',String(counts[kind]))),link);root.append(notice);
 }
}
