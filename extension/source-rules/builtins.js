import {validateRule,ruleDigest} from './format.js';
export function freezeRules(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freezeRules);Object.freeze(value);}return value;
}
export async function loadBuiltinRules({readJson=async url=>{const r=await fetch(url);if(!r.ok)throw new Error('Built-in rules unavailable');return r.json();}}={}){
  const result={};
  for(const source of ['gmail','moodle','ed']){
    const rule=validateRule(await readJson(new URL(`./builtin/${source}.json`,import.meta.url)),{builtin:true});
    result[source]={...rule,digest:await ruleDigest(rule)};
  }
  return freezeRules(result);
}
