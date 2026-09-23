import {validateRuleMetadata} from './format.js';

export function sharedRuleAuthors(rules){
 const authors=new Map();
 for(const rule of rules){
  try{validateRuleMetadata(rule);}catch{continue;}
  if(!rule.author)continue;
  const author=rule.author,url=typeof author==='string'?(/^https?:\/\//i.test(author)?author:''):author.url||'';
  const name=typeof author==='string'?(url?new URL(url).hostname:author):author.name;
  const key=url?'url:'+new URL(url).href.replace(/\/$/,''):'name:'+name.trim().toLowerCase();
  if(!authors.has(key))authors.set(key,{name,url,ruleIds:new Set()});
  const entry=authors.get(key);entry.ruleIds.add(rule.id);
  if(url&&typeof author==='object')entry.name=name;
 }
 return [...authors.values()].map(({ruleIds,...author})=>({...author,count:ruleIds.size})).sort((a,b)=>a.name.localeCompare(b.name));
}
