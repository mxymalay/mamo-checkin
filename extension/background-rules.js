import {createSourceCollectors} from './source-collection.js';
import {createRuleTestRunner} from './source-rules/test-runner.js';
import {exportRuleTestReport} from './source-rules/trace.js';
import {validateTestSourceUrl} from './source-rules/source-url.js';
import {parseRule,ruleDigest} from './source-rules/format.js';
import {normalizeRuleIds,createRuleLibrary} from './source-rules/library.js';
import {courseUsesSource} from './course-sources.js';
import {parseImageRows,parseMailDate} from './core.js';
import {checkDateBasis} from './workflow.js';
import {parseConfigurationBundle,exportConfiguration} from './configuration.js';
import {defaultTestDateRange,validateTestDateRange} from './source-rules/test-date-range.js';

export function createBackgroundRules({storage,getLibrary,officialRules,tabs,readAdapter,connectOcr,downloadImage,isBusy}){
 let preparing=false,mutation=false,generation=0,skipChallenge=null;
 const testLibrary=createRuleLibrary({builtins:[],storage:{async get(keys){const data=await storage.get([...keys,'practice:sourceRuleLibrary']);return {...data,sourceRuleLibrary:{...data.sourceRuleLibrary,...data['practice:sourceRuleLibrary']}};},async set(patch){await storage.set({sourceRuleTests:patch.sourceRuleTests||{}});}}});
 const types=new Set(['ruleList','ruleImport','ruleBind','ruleRemove','ruleRollback','ruleTestList','ruleTestStart','ruleTestStatus','ruleTestImage','ruleTestRecognize','ruleTestCancel','ruleTestClear','ruleTestExport','ruleTestApprove','ruleTestSkipPrepare','ruleTestSkipConfirm','importConfiguration','exportConfiguration']);
 const runner=createRuleTestRunner({createCollectors:createSourceCollectors,downloadImage,connectOcr,
  parseObservations:(observations,msg)=>checkDateBasis(parseImageRows(observations,{course:msg.course,messageId:msg.messageId,sourceType:msg.sourceType,sourceUrl:msg.sourceUrl,sentAt:msg.sentAt||parseMailDate(msg.sentAtText),imageId:'preview'}),msg),
  openSourceSession:async({signal})=>{
   const owned=[];
   const check=()=>{if(signal.aborted)throw new Error('cancelled');};
   const pause=ms=>new Promise((resolve,reject)=>{check();const abort=()=>{clearTimeout(timer);reject(new Error('cancelled'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);signal.addEventListener('abort',abort,{once:true});});
   const safeTabs={...tabs,get:async id=>{check();return tabs.get(id);},update:async(id,patch)=>{check();return tabs.update(id,patch);}};
   return {verifiedLogin:{},io:{tabs:safeTabs,readAdapter:async(...args)=>{check();return readAdapter(...args);},
    navigate:async(id,url)=>{check();await tabs.update(id,{url});},
    createOwnedTab:async url=>{check();const tab=await tabs.create({url,active:false});owned.push(tab.id);check();return tab.id;},delay:pause,now:Date.now,
    recoverGmail:async()=>{throw new Error('[LOGIN_REQUIRED] Gmail');}},
    release:async()=>{for(const id of owned)try{await tabs.remove(id);}catch{}}};
  }});
 const busy=()=>preparing||runner.busy;
 return {
  get busy(){return busy();},owns:type=>types.has(type),cancel:()=>{generation++;return runner.clear();},
  async handle(message){
   const type=message.type;
   if(type==='ruleTestCancel'||type==='ruleTestClear'){generation++;await runner[type==='ruleTestCancel'?'cancel':'clear'](message.testId);return {ok:true};}
   if(type==='ruleTestStart'){
    if(isBusy()||busy()||mutation)throw new Error('rule-test-busy');preparing=true;const epoch=++generation;
    try{
     const {settings}=await storage.get(['settings']);
     const {course,source}=message;
     if(!settings.courses?.includes(course)||!['gmail','moodle','ed'].includes(source)||!courseUsesSource(settings,course,source==='gmail'?'email':source))throw new Error('invalid-rule-test');
     const library=await getLibrary(),snapshot=structuredClone(await library.snapshot(settings));
     if(Object.hasOwn(message,'ruleIds')||Object.hasOwn(message,'ruleKey')||Object.hasOwn(message,'ruleId')){
      const ruleKey=Object.hasOwn(message,'ruleKey')?message.ruleKey:message.ruleId;
      const ids=normalizeRuleIds(Object.hasOwn(message,'ruleIds')?message.ruleIds:ruleKey==null?[]:[ruleKey]);
      const available=new Map((await library.list()).rules.map(rule=>[rule.key||`local:${rule.id}`,rule])),community=[];
      for(const id of ids){
       const entry=available.get(id);if(!entry||entry.source!==source||!entry.courses.includes(course))throw new Error('select-community-rule');
       const {digest,hasPrevious,key,origin='local',...raw}=entry;
       const rule=parseRule(JSON.stringify(raw));community.push({...rule,key:id,origin,digest:await ruleDigest(rule)});
      }
      snapshot.courses[course][source].community=community;
     }
     const sourceUrl=validateTestSourceUrl(message.sourceUrl,{source,course,settings}),dateRange=message.dateRange===undefined?defaultTestDateRange():validateTestDateRange(message.dateRange);
     if(epoch!==generation)throw new Error('cancelled');
     return await runner.start({settings,snapshot,course,source,sourceUrl,dateRange,mode:message.mode,stage:message.stage,forceOcr:Boolean(message.forceOcr)});
    }finally{preparing=false;}
   }
   const {settings,records=[]}=await storage.get(['settings','records']);
   if(type.startsWith('ruleTest')){
    if(type==='ruleTestList'){const list=await testLibrary.list();return {...list,settings};}
    if(type==='ruleTestSkipPrepare'){
     const library=testLibrary,ids=normalizeRuleIds(message.ruleIds),available=(await library.list()).rules;
     if(!ids.length||ids.some(id=>!available.some(rule=>rule.key===id&&rule.source===message.source&&rule.courses.includes(message.course))))throw new Error('rule-test-required');
     skipChallenge={token:crypto.randomUUID(),expires:Date.now()+120000,editToken:await library.editToken(),course:message.course,source:message.source,ruleIds:ids};return {token:skipChallenge.token};
    }
    if(type==='ruleTestSkipConfirm'){
     const challenge=skipChallenge;skipChallenge=null;
     if(!challenge||message.token!==challenge.token||Date.now()>challenge.expires||message.confirmed!==true)throw new Error('rule-test-required');
     if(busy()||mutation)throw new Error('rule-test-busy');mutation=true;
     try{const library=testLibrary;if(await library.editToken()!==challenge.editToken)throw new Error('rule-test-stale');return await library.skipTest(challenge);}finally{mutation=false;}
    }
    if(type==='ruleTestStatus')return runner.status(message.testId);
    if(type==='ruleTestImage')return runner.image(message);
    if(type==='ruleTestRecognize'){if(isBusy()||preparing)throw new Error('rule-test-busy');return runner.recognize(message);}
    if(type==='ruleTestExport')return {report:exportRuleTestReport(runner.status(message.testId))};
    if(type==='ruleTestApprove'){if(busy()||mutation)throw new Error('rule-test-busy');mutation=true;try{return await (await getLibrary()).approveTest(runner.status(message.testId));}finally{mutation=false;}}
   }
   const library=await getLibrary();
   if(type==='ruleList')return {...await library.list(),...(officialRules?{official:await officialRules.status()}:{}),courses:settings?.courses||[],settings};
   if(type==='exportConfiguration')return {text:exportConfiguration(settings,await library.exportBundle(settings))};
   if(mutation||busy())throw new Error('rule-test-busy');mutation=true;
   try{
    if(type==='ruleImport')return {ok:true,...await library.importRule(message.text,{origin:message.origin,replace:Boolean(message.replace)})};
    if(type==='ruleBind'){await library.bind({...message,settings,requireTest:true});return {ok:true};}
    if(type==='ruleRemove'){await library.remove(Object.hasOwn(message,'ruleKey')?message.ruleKey:message.ruleId);return {ok:true};}
    if(type==='ruleRollback'){await library.rollback(Object.hasOwn(message,'ruleKey')?message.ruleKey:message.ruleId);return {ok:true};}
    if(type==='importConfiguration'){
     if(isBusy())throw new Error('rule-test-busy');
     const parsed=parseConfigurationBundle(message.text,settings,records.length>0);
     const patch=await library.configurationPatch(parsed.sourceRules,parsed.settings);
     await storage.set({...patch,settings:parsed.settings});return {ok:true};
    }
    throw new Error('unknown-rule-request');
   }finally{mutation=false;}
  }
 };
}
