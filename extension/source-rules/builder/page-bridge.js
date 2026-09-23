import {gmailAdapter} from '../../gmail.js';
import {moodleAdapter} from '../../moodle.js';
import {edAdapter} from '../../ed-adapter.js';
import {installSourceRuleRuntime} from '../runtime.js';
import {installBuilderSelectorEngine} from './selector-generator.js';
import {installRulePicker} from './picker.js';

export function createBuilderPageBridge({scripting,tabs}){
 const adapters={gmail:gmailAdapter,moodle:moodleAdapter,ed:edAdapter};
 const inject=async(context,func,args=[])=>{
  const target=context.documentId?{tabId:context.tabId,documentIds:[context.documentId]}:{tabId:context.tabId,frameIds:[0]};
  let result;try{[result]=await scripting.executeScript({target,world:'ISOLATED',func,args});}catch{throw new Error('builder-source-changed');}
  if(!result?.documentId)throw new Error('builder-source-changed');return result;
 };
 const verify=async context=>{let tab;try{tab=await tabs.get(context.tabId);}catch{throw new Error('builder-source-changed');}if(tab.url!==context.url)throw new Error('builder-source-changed');};
 const describeRoots=context=>inject(context,adapters[context.source],['builderDescribe',{...context.settings,course:context.course,expectedCourseId:new URL(context.url).pathname.match(/^\/au\/courses\/(\d+)/)?.[1]}]);
 return {
  async describe(context){
   const tab=await tabs.get(context.tabId);if(context.url&&tab.url!==context.url)throw new Error('builder-source-changed');
   const first=await inject(context,installSourceRuleRuntime),pinned={...context,url:tab.url,documentId:first.documentId};
   try{await verify(pinned);await inject(pinned,installBuilderSelectorEngine);await inject(pinned,installRulePicker,[{sessionId:context.sessionId,expiresAt:context.expiresAt,labels:context.labels}]);
    const result=await describeRoots(pinned);if(!result.result?.roots?.length)throw new Error('builder-no-roots');
    return {url:pinned.url,documentId:pinned.documentId,...result.result};
   }catch(error){try{await inject(pinned,function(){globalThis.__mamoRulePicker?.dispose();});}catch{}throw error;}
  },
  async command(context,method,args={}){
   if(!['begin','inspect','mark','propose','evaluate'].includes(method))throw new Error('builder-command');
   await verify(context);await describeRoots(context);
   return (await inject(context,function(method,args){if(!globalThis.__mamoRulePicker)throw new Error('builder-session');return globalThis.__mamoRulePicker[method](args);},[method,{...args,sessionId:context.sessionId}])).result;
  },
  async dispose(context){if(!context.documentId)return;try{await inject(context,function(){globalThis.__mamoRulePicker?.dispose();});}catch{}}
 };
}
