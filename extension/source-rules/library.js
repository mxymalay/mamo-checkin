import {parseRule,validateRule,validateRuleId,ruleDigest,RuleValidationError} from './format.js';
import {freezeRules} from './builtins.js';
import {courseUsesSource} from '../course-sources.js';
import {approvedTestRules,ruleCanMatch} from './test-status.js';
const sources=['gmail','moodle','ed'];
const keys=['sourceRuleLibrary','sourceRuleBindings','sourceRuleRevisions','sourceRuleTests'];
const invalid=path=>{throw new RuleValidationError('binding',path);};
const safeKey=key=>!['__proto__','constructor','prototype'].includes(key);
const record=value=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).filter(([key])=>safeKey(key))):{};
const validOrigin=origin=>{if(!['local','community'].includes(origin))throw new RuleValidationError('origin','$.origin');return origin;};
const identity=value=>{
  if(typeof value!=='string')invalid('$.id');
  const parts=value.split(':'),origin=parts.length===1?'local':validOrigin(parts[0]),id=parts.at(-1);
  if(parts.length>2||id.length>256||!safeKey(id)||!/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/.test(id)||id.startsWith('builtin.'))invalid('$.id');
  return {id,origin,key:`${origin}:${id}`};
};
const storedIds=value=>[...new Set((Array.isArray(value)?value:[value]).flatMap(id=>{try{return [identity(id).key];}catch{return [];}}))].sort();
const revision=value=>Number.isSafeInteger(Number(value))&&Number(value)>=0&&Number(value)<Number.MAX_SAFE_INTEGER?Number(value):0;
export function normalizeRuleIds(value){
  if(!Array.isArray(value)||value.some(id=>typeof id!=='string'||!id||!safeKey(id)))invalid('$.binding');
  const ids=[...new Set(value.map(id=>{const ref=identity(id);validateRuleId(ref.id);return ref.key;}))].sort();if(ids.length>8)invalid('$.binding');return ids;
}
const bundleRule=value=>{
  if(!value||typeof value!=='object'||Array.isArray(value))invalid('$.sourceRules.rules');
  const {origin='local',...raw}=value;
  return {...validateRule(raw),origin:validOrigin(origin)};
};
const entryRule=(key,entry,field='current')=>{
  const ref=identity(key),rule=validateRule(entry?.[field]);
  if(rule.id!==ref.id||validOrigin(entry.origin===undefined?'local':entry.origin)!==ref.origin)invalid('$.id');
  return {rule,...ref};
};
const allowed=(settings,course,source)=>safeKey(course)&&settings.courses?.includes(course)&&sources.includes(source)&&courseUsesSource(settings,course,source==='gmail'?'email':source);
export function validateRuleBundle(bundle,settings){
  if(bundle===undefined)return {rules:[],bindings:{}};
  if(!bundle||typeof bundle!=='object'||Array.isArray(bundle)||Object.keys(bundle).some(k=>!['rules','bindings'].includes(k))||!Array.isArray(bundle.rules)||bundle.rules.length>40)invalid('$.sourceRules');
  const rules=bundle.rules.map(bundleRule),byId=new Map(rules.map(r=>[`${r.origin}:${r.id}`,r]));
  if(byId.size!==rules.length)invalid('$.sourceRules.rules');
  const bindings={};
  if(!bundle.bindings||typeof bundle.bindings!=='object'||Array.isArray(bundle.bindings))invalid('$.sourceRules.bindings');
  for(const [course,selection] of Object.entries(bundle.bindings)){
    if(!selection||typeof selection!=='object'||Array.isArray(selection))invalid('$.sourceRules.bindings');
    for(const [source,value] of Object.entries(selection)){
      const ids=normalizeRuleIds(typeof value==='string'?[value]:value);
      if(!allowed(settings,course,source))invalid('$.sourceRules.bindings');
      for(const id of ids){const rule=byId.get(id);if(!rule||rule.source!==source||!rule.courses.includes(course))invalid('$.sourceRules.bindings');}
      (bindings[course]||={})[source]=ids;
    }
  }
  return {rules,bindings};
}
export function createRuleLibrary({storage,builtins,getBuiltins}){
  let queue=Promise.resolve();
  const serial=fn=>{const pending=queue.then(fn);queue=pending.catch(()=>{});return pending;};
  const read=async()=>{
    const data=await storage.get(keys),bindings={},revisions={},library=record(data.sourceRuleLibrary);
    // Old package IDs and bindings always mean local, regardless of their ID prefix.
    for(const [id,entry] of Object.entries(library))if(!id.includes(':'))try{
      const {key}=identity(id);if(!Object.hasOwn(library,key))library[key]=entry;delete library[id];
    }catch{}
    for(const [course,entry] of Object.entries(record(data.sourceRuleBindings)))bindings[course]=Object.fromEntries(Object.entries(record(entry)).filter(([source])=>sources.includes(source)).map(([source,ids])=>[source,storedIds(ids)]));
    for(const [course,entry] of Object.entries(record(data.sourceRuleRevisions)))revisions[course]=record(entry);
    return {library,bindings,revisions,tests:record(data.sourceRuleTests)};
  };
  const bump=(data,course,source)=>{(data.revisions[course]||={})[source]=revision(data.revisions[course]?.[source])+1;};
  const affected=(data,id,remove=false)=>{for(const [course,binding] of Object.entries(data.bindings))for(const [source,ids] of Object.entries(binding))if(ids.includes(id)){bump(data,course,source);if(remove)binding[source]=ids.filter(ruleId=>ruleId!==id);}};
  const patch=data=>({sourceRuleLibrary:data.library,sourceRuleBindings:data.bindings,sourceRuleRevisions:data.revisions,...(Object.keys(data.tests).length?{sourceRuleTests:data.tests}:{})});
  const checkCapacity=data=>{if(Object.keys(data.library).length>40||new TextEncoder().encode(JSON.stringify(data.library)).length>524288)throw new RuleValidationError('library-size','$');};
  const write=async data=>{checkCapacity(data);await storage.set(patch(data));};
  const decorate=async({rule,origin,key})=>({...rule,origin,key,digest:await ruleDigest(rule)});
  const editToken=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(patch(data))))),b=>b.toString(16).padStart(2,'0')).join('');
  const boundRules=(data,course,source,errors=[])=>{
    const rules=[];
    for(const key of data.bindings[course]?.[source]||[])try{
      const entry=entryRule(key,data.library[key]),{rule}=entry;
      if(rule.source!==source||!rule.courses.includes(course)||rules.length>=8)invalid('$.binding');
      rules.push(entry);
    }catch{errors.push({course,source,...identity(key),reason:'invalid-rule'});}
    return rules;
  };
  return {
    skipTest:({course,source,ruleIds,editToken:expectedToken})=>serial(async()=>{
      const data=await read(),ids=normalizeRuleIds(ruleIds);if(expectedToken&&await editToken(data)!==expectedToken)throw new Error('rule-test-stale');if(!safeKey(course)||!ids.length)throw new Error('rule-test-required');
      for(const key of ids){const {rule}=entryRule(key,data.library[key]);if(rule.source!==source||!rule.courses.includes(course))throw new Error('rule-test-stale');(data.tests[key]||={})[course]={digest:await ruleDigest(rule),source,skipped:true,testedAt:Date.now()};}
      await write(data);return {ok:true};
    }),
    approveTest:report=>serial(async()=>{
      const selected=approvedTestRules(report),data=await read();
      for(const evidence of selected){const {key}=identity(evidence.key||evidence.id),{rule}=entryRule(key,data.library[key]);if(rule.source!==report.source||!rule.courses.includes(report.course)||await ruleDigest(rule)!==evidence.digest)throw new Error('rule-test-stale');}
      for(const evidence of selected){const {key}=identity(evidence.key||evidence.id);(data.tests[key]||={})[report.course]={digest:evidence.digest,source:report.source,testedAt:Date.now()};}
      await write(data);return {ok:true};
    }),
    editToken:()=>serial(async()=>editToken(await read())),
    saveGenerated:({rule:raw,settings,expectedToken,enableCourses=[],replace=false,beforeCommit=()=>{}})=>serial(async()=>{
      const rule=parseRule(JSON.stringify(raw)),data=await read(),key=identity(`local:${rule.id}`).key;
      if(await editToken(data)!==expectedToken)throw new Error('builder-library-changed');
      if(!Array.isArray(enableCourses)||enableCourses.some(course=>!rule.courses.includes(course)||!allowed(settings,course,rule.source)))invalid('$.binding');
      const old=data.library[key]?.current;if(old&&!replace)throw new RuleValidationError('replace-required','$.id');
      if(old)entryRule(key,data.library[key]);
      const changed=new Set();
      for(const [course,binding] of Object.entries(data.bindings))if(binding[rule.source]?.includes(key))changed.add(course);
      data.library[key]={origin:'local',current:rule,previous:old||null};
      if(old&&data.tests[key])affected(data,key,true);
      for(const course of new Set(enableCourses)){
        (data.bindings[course]||={})[rule.source]=normalizeRuleIds([...(data.bindings[course]?.[rule.source]||[]),key]);changed.add(course);
      }
      for(const course of changed)bump(data,course,rule.source);
      checkCapacity(data);const digest=await ruleDigest(rule);beforeCommit();await storage.set(patch(data));return {key,id:rule.id,digest,enabledCourses:[...new Set(enableCourses)]};
    }),
    list:()=>serial(async()=>{
      const official=getBuiltins?await getBuiltins():builtins;
      const data=await read(),rules=[],errors=[],bindings={};
      for(const [key,entry] of Object.entries(data.library))try{rules.push({...await decorate(entryRule(key,entry)),hasPrevious:Boolean(entry.previous)});}catch{
        let ref={key};try{ref=identity(key);}catch{}errors.push({...ref,reason:'invalid-rule'});
      }
      for(const [course,entry] of Object.entries(data.bindings))for(const source of Object.keys(entry))(bindings[course]||={})[source]=boundRules(data,course,source,errors).map(r=>r.key);
      return {rules,builtins:Object.values(official),bindings,errors,tests:data.tests};
    }),
    importRule:(text,{origin='local',replace=false}={})=>serial(async()=>{
      validOrigin(origin);
      const rule=parseRule(text),key=`${origin}:${rule.id}`,digest=await ruleDigest(rule),data=await read(),old=data.library[key]?.current;
      const result={id:rule.id,origin,key,version:rule.version,digest};
      if(old){entryRule(key,data.library[key]);if(await ruleDigest(old)===digest)return result;if(origin==='community'&&old.version===rule.version)throw new RuleValidationError('version-conflict','$.version');if(!replace)throw new RuleValidationError('replace-required','$.id');}
      data.library[key]={origin,current:rule,previous:old||null};affected(data,key,Boolean(data.tests[key]));await write(data);return result;
    }),
    bind:options=>serial(async()=>{
      const {course,source,settings}=options,ruleId=Object.hasOwn(options,'ruleKey')?options.ruleKey:options.ruleId;
      if(!allowed(settings,course,source))invalid('$.binding');
      const ids=normalizeRuleIds(Object.hasOwn(options,'ruleIds')?options.ruleIds:ruleId==null?[]:[ruleId]);
      const data=await read();for(const id of ids){const {rule}=entryRule(id,data.library[id]);if(rule.source!==source||!rule.courses.includes(course))invalid('$.binding');if(options.requireTest&&!ruleCanMatch({...rule,key:id,digest:await ruleDigest(rule)},data,course))throw new Error('rule-test-required');}
      if(JSON.stringify(data.bindings[course]?.[source]||[])===JSON.stringify(ids))return;
      (data.bindings[course]||={})[source]=ids;
      bump(data,course,source);await write(data);
    }),
    remove:ruleKey=>serial(async()=>{const {key}=identity(ruleKey),data=await read();delete data.library[key];affected(data,key,true);await write(data);}),
    rollback:ruleKey=>serial(async()=>{const {key}=identity(ruleKey),data=await read(),entry=data.library[key];if(!entry?.previous)invalid('$.previous');entryRule(key,entry,'previous');[entry.current,entry.previous]=[entry.previous,entry.current];affected(data,key,Boolean(data.tests[key]));await write(data);}),
    snapshot:settings=>serial(async()=>{
      const official=getBuiltins?await getBuiltins():builtins;
      const data=await read(),courses={},errors=[];
      for(const course of settings.courses||[]){courses[course]={};for(const source of sources){
        const builtin=Object.values(official).find(rule=>rule.source===source&&rule.courses?.includes(course))||official[source];
        if(!builtin)continue;
        const community=[];for(const rule of boundRules(data,course,source,errors))community.push(await decorate(rule));
        courses[course][source]={revision:revision(data.revisions[course]?.[source]),...(getBuiltins?{officialRevision:builtin.digest}:{}),fingerprint:`${builtin.digest||builtin.version}:${community.map(r=>`${r.key}:${r.digest}`).join(':')}`,builtin,community};
      }}
      return freezeRules({version:1,courses,errors});
    }),
    exportBundle:settings=>serial(async()=>{
      const data=await read(),bindings={},rules=[];
      for(const [key,entry] of Object.entries(data.library))try{const {rule,origin}=entryRule(key,entry);rules.push({...rule,origin});}catch{}
      for(const [course,entry] of Object.entries(data.bindings))for(const source of Object.keys(entry))if(allowed(settings,course,source)){
        const selected=boundRules(data,course,source);(bindings[course]||={})[source]=selected.map(r=>r.key);
      }
      return validateRuleBundle({rules,bindings},settings);
    }),
    configurationPatch:(bundle,settings)=>serial(async()=>{
      const valid=validateRuleBundle(bundle,settings),data=await read(),changed=new Set();
      for(const {origin,...rule} of valid.rules){
        const key=`${origin}:${rule.id}`,old=data.library[key]?.current;
        if(old)entryRule(key,data.library[key]);
        if(old&&await ruleDigest(old)===await ruleDigest(rule))continue;
        if(old&&origin==='community'&&old.version===rule.version)throw new RuleValidationError('version-conflict','$.version');
        data.library[key]={origin,current:rule,previous:old||null};changed.add(key);
      }
      for(const course of new Set([...Object.keys(data.bindings),...Object.keys(valid.bindings)]))for(const source of sources){
        const before=data.bindings[course]?.[source]||[],after=valid.bindings[course]?.[source]||[];
        if(JSON.stringify(before)!==JSON.stringify(after)||[...before,...after].some(id=>changed.has(id)))bump(data,course,source);
      }
      data.bindings=valid.bindings;checkCapacity(data);return patch(data);
    })
  };
}
