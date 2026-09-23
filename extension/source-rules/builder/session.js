import {parseRule} from '../format.js';
import {validateBuilderSourceUrl} from './source-url.js';
import {courseUsesSource} from '../../course-sources.js';

// Only the owning extension document can operate this memory-only session.
export function createBuilderSession({extensionId,storage,tabs,pageBridge,getLibrary,preview,isBusy,now=Date.now,authorizeOwner,validateSourceUrl=validateBuilderSourceUrl}){
 let current=null,working=false,starting=false,generation=0,startingOwner=null;
 const types=new Set(['builderTabs','builderStart','builderSample','builderStatus','builderDraft','builderMark','builderPreview','builderImage','builderRecognize','builderConfirm','builderSave','builderExport','builderCancel']);
 const authorize=authorizeOwner|| (sender=>{
  let url;try{url=new URL(sender.url);}catch{}
  if(sender.id!==extensionId||url?.protocol!=='chrome-extension:'||url.host!==extensionId||!['/options.html','/modules.html'].includes(url.pathname)||!sender.documentId)throw new Error('builder-owner');
 });
 const live=session=>{if(current!==session||now()>=session.expiresAt)throw new Error('builder-expired');};
 async function cancel(){generation++;const old=current;current=null;preview.clear();if(old){clearTimeout(old.timer);await Promise.all(old.samples.map(sample=>pageBridge.dispose(sample)));}}
 const config=async session=>{live(session);const {settings}=await storage.get(['settings']);live(session);if(JSON.stringify(settings)!==session.settingsToken){await cancel();throw new Error('builder-settings-changed');}};
 const validSource=(settings,course,source)=>settings?.courses?.includes(course)&&['gmail','moodle','ed'].includes(source)&&courseUsesSource(settings,course,source==='gmail'?'email':source);
 const publicState=session=>({sessionId:session.sessionId,revision:session.revision,expiresAt:session.expiresAt,phase:session.phase,rule:session.rule,canEnable:Boolean(session.canEnable),reasons:session.reasons||[],samples:session.samples.map(sample=>{
  const score=image=>(session.matches?.some(m=>m.id===sample.sampleId+':'+image.imageId)?2:0)+Number(typeof image.marked==='boolean');
  return {sampleId:sample.sampleId,course:sample.course,phase:sample.state?.phase,images:[...(sample.state?.images||[])].sort((a,b)=>score(b)-score(a)).slice(0,20).map(({imageId,width,height,marked})=>({id:sample.sampleId+':'+imageId,imageId,width,height,marked,matched:session.matches?.some(m=>m.id===sample.sampleId+':'+imageId)||false}))};
 }),matches:(session.matches||[]).map(({id,marked})=>({id,marked,confirmed:session.confirmed.has(id)}))});
 const invalidate=session=>{session.revision++;session.canEnable=false;session.previewed=false;if(session.phase==='previewed')session.phase='editing';session.confirmed.clear();session.matches=[];preview.clear();};
 const base=session=>({schemaVersion:1,id:session.ruleId,version:'1.0.0',name:{en:session.name||`${session.samples[0].course} ${session.source}`},source:session.source,courses:[...new Set(session.samples.map(s=>s.course))]});
 async function validateSamples(session){
  for(const sample of session.samples){
   const state=await pageBridge.command(sample,'inspect');live(session);
   if(state.phase!=='selected')throw new Error('builder-source-changed');sample.state=state;
  }
 }
 async function generate(session){
  invalidate(session);session.phase='editing';let candidates=[];const proposals=[];
  for(const sample of session.samples){const proposed=await pageBridge.command(sample,'propose',{base:base(session)});live(session);candidates.push(...proposed);proposals.push(proposed);}
  if(proposals.length>1)for(let i=0;i<Math.min(8,...proposals.map(p=>p.length));i++){
   const selectors=[...new Set(proposals.flatMap(p=>p[i].images.selectors))];if(selectors.length<=8)candidates.unshift({...base(session),images:{selectors}});
  }
  candidates=[...new Map(candidates.map(rule=>[JSON.stringify(rule.images),rule])).values()].slice(0,64).map(rule=>parseRule(JSON.stringify(rule)));
  if(!candidates.length){session.rule=null;session.reasons=['builder-unmatched'];return;}
  const results=[];for(const sample of session.samples){results.push(await pageBridge.command(sample,'evaluate',{rules:candidates}));live(session);}
  let index=candidates.findIndex((_,i)=>results.every(result=>result[i]?.eligible));if(index<0)index=0;
  session.rule=candidates[index];session.reasons=[...new Set(results.flatMap(result=>result[index]?.reasons||['builder-unmatched']))];
 }
 async function addSample(session,message){
  if(session.samples.length>=5)throw new Error('builder-budget');
  const course=message.course||session.samples[0]?.course;
  if(!validSource(session.settings,course,session.source)||!Number.isInteger(message.tabId))throw new Error('builder-source');
  const tab=await tabs.get(message.tabId);live(session);
  const url=validateSourceUrl(tab.url,{settings:session.settings,course,source:session.source});
  if(session.samples.some(s=>s.tabId===message.tabId))throw new Error('builder-duplicate-sample');
  invalidate(session);
  const sample={sessionId:session.sessionId,sampleId:'s'+session.samples.length,tabId:message.tabId,url,source:session.source,course,settings:session.settings,expiresAt:session.expiresAt,labels:session.labels};
  session.samples.push(sample);
  try{Object.assign(sample,await pageBridge.describe(sample));live(session);sample.state=await pageBridge.command(sample,'begin');live(session);session.phase='selecting';await tabs.update(sample.tabId,{active:true});}
  catch(error){await pageBridge.dispose(sample);session.samples=session.samples.filter(s=>s!==sample);throw error;}
 }
 const locateImage=(session,id)=>{for(const sample of session.samples){const image=sample.state?.images?.find(i=>sample.sampleId+':'+i.imageId===id);if(image)return {...image,id,tabId:sample.tabId,documentId:sample.documentId,sample};}throw new Error('builder-image');};
 return {
  owns:type=>types.has(type),get busy(){return starting||Boolean(current)||working;},cancel,
  async cancelOwner(sender){if(current?.owner===sender.documentId||startingOwner===sender.documentId)await cancel();},
  async cancelTab(tabId){if(current&&(current.ownerTab===tabId||current.samples.some(s=>s.tabId===tabId)))await cancel();},
  async handle(message,sender){
   authorize(sender);const type=message.type;
   if(type==='builderTabs'){
    const {settings}=await storage.get(['settings']);
    if(!validSource(settings,message.course,message.source))return {tabs:[]};
    return {tabs:(await tabs.query({})).flatMap(tab=>{try{const url=validateSourceUrl(tab.url,{settings,course:message.course,source:message.source});return url?[{id:tab.id,label:`${message.course} · ${message.source} · ${tab.id}`}]:[];}catch{return [];}})};
   }
   if(type==='builderCancel'){if(current&&current.owner!==sender.documentId||startingOwner&&startingOwner!==sender.documentId)throw new Error('builder-owner');await cancel();return {ok:true};}
   if(type==='builderStart'){
    if(this.busy||isBusy())throw new Error('builder-busy');starting=true;startingOwner=sender.documentId;const epoch=generation;
    try{
     const {settings}=await storage.get(['settings']);if(epoch!==generation)throw new Error('builder-cancelled');if(!validSource(settings,message.course,message.source))throw new Error('builder-source');
     if(message.source==='ed')throw new Error('builder-identity-unverified');
     const library=await getLibrary(),sessionId=crypto.randomUUID(),expiresAt=now()+600000;
     const session={sessionId,revision:0,owner:sender.documentId,ownerTab:sender.tab?.id,source:message.source,settings:structuredClone(settings),settingsToken:JSON.stringify(settings),libraryToken:await library.editToken(),expiresAt,samples:[],ruleId:'local.generated.'+crypto.randomUUID().replaceAll('-',''),confirmed:new Set(),labels:message.labels};
     if(epoch!==generation)throw new Error('builder-cancelled');current=session;session.timer=setTimeout(()=>{if(current===session)void cancel();},600000);session.timer.unref?.();
     try{await addSample(session,message);return publicState(session);}catch(error){await cancel();throw error;}
    }finally{starting=false;startingOwner=null;}
   }
   const session=current;if(!session||message.sessionId!==session.sessionId)throw new Error('builder-expired');if(session.owner!==sender.documentId)throw new Error('builder-owner');
   if(working)throw new Error('builder-busy');working=true;
   try{
    await config(session);
    if(type!=='builderStatus'&&message.revision!==undefined&&message.revision!==session.revision)throw new Error('builder-stale-preview');
    if(type==='builderStatus'){
     if(session.phase==='selecting'){
      const sample=session.samples.at(-1);sample.state=await pageBridge.command(sample,'inspect');live(session);
      if(sample.state.phase==='selected'){await validateSamples(session);await generate(session);if(session.ownerTab!==undefined)await tabs.update(session.ownerTab,{active:true});}
      else if(sample.state.phase!=='picking')throw new Error('builder-source-changed');
     }else await validateSamples(session);
     return publicState(session);
    }
    if(type==='builderSample'){await addSample(session,message);return publicState(session);}
    await validateSamples(session);
    if(type==='builderDraft'){
     if(!session.rule||typeof message.name!=='string'||!message.name.trim()||message.name.length>100)throw new Error('builder-name');
     const name=message.name.trim(),id=Object.hasOwn(message,'id')?message.id:session.rule.id;
     const rule=parseRule(JSON.stringify({...session.rule,id,name:{en:name}}));
     if(name!==session.rule.name.en||id!==session.rule.id){session.name=name;session.ruleId=id;session.rule=rule;invalidate(session);}
     return publicState(session);
    }
    if(type==='builderMark'){
     const item=locateImage(session,message.imageId);item.sample.state=await pageBridge.command(item.sample,'mark',{imageId:item.imageId,include:message.include});live(session);await generate(session);return publicState(session);
    }
    if(type==='builderPreview'){
     if(!session.rule)throw new Error('builder-unmatched');invalidate(session);session.reasons=[];
     for(const sample of session.samples){
      const [result]=await pageBridge.command(sample,'evaluate',{rules:[session.rule]});live(session);
      session.reasons.push(...result.reasons);session.matches.push(...result.images.map(image=>({...image,id:sample.sampleId+':'+image.imageId,tabId:sample.tabId,documentId:sample.documentId})));
     }
     if(!session.matches.length)throw new Error('builder-unmatched');
     await preview.load(session.matches);live(session);await validateSamples(session);session.previewed=true;
     session.canEnable=!session.reasons.length&&session.matches.every(image=>image.marked===true);session.phase='previewed';return publicState(session);
    }
    if(type==='builderImage'){
     const image=locateImage(session,message.imageId);
     // Excluded sample images still need thumbnails; OCR remains match-gated below.
     try{return preview.image(image.id);}catch{}
     const payload=await preview.thumbnail(image);live(session);await validateSamples(session);return payload;
    }
    if(type==='builderRecognize'){if(!session.previewed||!session.matches.some(i=>i.id===message.imageId))throw new Error('builder-preview-required');const text=await preview.recognize(message.imageId);live(session);await validateSamples(session);return {text};}
    if(type==='builderConfirm'){
     if(!session.previewed||!session.matches.some(i=>i.id===message.imageId&&i.marked!==false))throw new Error('builder-preview-required');
     if(message.confirmed===true)session.confirmed.add(message.imageId);else session.confirmed.delete(message.imageId);
     session.canEnable=!session.reasons.length&&session.matches.every(image=>image.marked===true||session.confirmed.has(image.id));return publicState(session);
    }
    if(type==='builderExport'){if(!session.rule)throw new Error('builder-unmatched');return {text:JSON.stringify(parseRule(JSON.stringify(session.rule)),null,2)};}
    if(type==='builderSave'){
     if(!session.rule)throw new Error('builder-unmatched');if(message.enable&&(!session.previewed||!session.canEnable))throw new Error('builder-preview-required');
     const rule=parseRule(JSON.stringify({...session.rule,...(message.id!==undefined?{id:message.id}:{}),...(message.name!==undefined?{name:{en:message.name}}:{}),...(message.author!==undefined?{author:message.author}:{})}));
     // Re-evaluate against live DOM before enabling, even if the UI still displays an older preview.
     if(message.enable)for(const sample of session.samples){
      const [result]=await pageBridge.command(sample,'evaluate',{rules:[session.rule]});live(session);if(!result.eligible)throw new Error('builder-preview-required');
      const currentMatches=result.images.map(i=>[sample.sampleId+':'+i.imageId,i.url]).sort(),reviewed=session.matches.filter(i=>i.id.startsWith(sample.sampleId+':')).map(i=>[i.id,i.url]).sort();
      if(JSON.stringify(currentMatches)!==JSON.stringify(reviewed)){invalidate(session);throw new Error('builder-stale-preview');}
     }
     await config(session);const library=await getLibrary();live(session);
     const result=await library.saveGenerated({rule,settings:session.settings,expectedToken:session.libraryToken,enableCourses:message.enable?rule.courses:[],beforeCommit:()=>live(session)});
     await cancel();return {ok:true,phase:'saved',...result};
    }
    throw new Error('builder-command');
   }catch(error){if(['builder-source-changed','builder-expired'].includes(error.message))await cancel();throw error;}
   finally{working=false;}
  }
 };
}
