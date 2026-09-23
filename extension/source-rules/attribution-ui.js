import {validateRuleMetadata} from './format.js';

export function appendRuleAttribution({heading,rule,el,t,onAuthor}){
 // Stored metadata is untrusted even when a caller bypasses package validation.
 try{validateRuleMetadata(rule);}catch{return;}
 const external=(node,url)=>{node.href=url;node.target='_blank';node.rel='noopener noreferrer';};
 const icon=kind=>{const node=el('span',undefined,'rule-meta-icon '+kind);node.setAttribute('aria-hidden','true');return node;};
 const group=el('span',undefined,'rule-attribution');
 if(rule.author){
  const author=rule.author,url=typeof author==='string'?(/^https?:\/\//i.test(author)?author:null):author.url;
  const name=typeof author==='string'?(url?new URL(url).hostname:author):author.name;
  const node=el('button',undefined,'rule-author');node.type='button';node.title=t('author');node.setAttribute('aria-label',t('author'));node.setAttribute('aria-haspopup','dialog');
  node.append(icon('rule-author-icon'));node.onclick=()=>onAuthor({name,url},node);group.append(node);
 }
 if(rule.sourceUrl){
  const node=el('a',undefined,'rule-source-link');external(node,rule.sourceUrl);node.title=t('rule-source');node.setAttribute('aria-label',t('rule-source'));node.append(icon('rule-source-icon'));group.append(node);
 }
 if(group.childNodes.length)heading.append(group);
}

export function ruleCourseTags(courses,el){
 const group=el('div',undefined,'rule-supported-courses');group.dataset.ruleLiteral='';
 for(const course of courses)group.append(el('span',course,'rule-status-tag neutral rule-course-tag'));
 return group;
}
