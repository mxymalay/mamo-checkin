import {createPracticeStorage,serializePracticeMutation} from './storage.js';
import {practiceSettings,practiceMatchingSettings,validatePracticeSourceUrl} from './assets.js';
import {createPracticeTabBridge} from './tab-bridge.js';
import {createPracticeOcr,isPracticeDocument} from './ocr.js';
import {createPracticeAssetReader} from './asset-reader.js';
import {createBuilderSession} from '../builder/session.js';
import {createBuilderPreview} from '../builder/preview.js';
import {createRuleLibrary,normalizeRuleIds} from '../library.js';
import {ruleCanMatch} from '../test-status.js';

export function createPracticeBackground({extensionId,tabs,storage,connectOcr,isBusy,now=Date.now,fetchAsset,timeoutMs=15000}){
 const origin=`chrome-extension://${extensionId}`,owners=new Map(),sessions=new Map(),isolated=createPracticeStorage(storage);
 const library=createRuleLibrary({storage:isolated,builtins:[]});let resetEpoch=0,resetting=0;
 // Imported rules are read-only here; practice bindings never enter the live configuration.
 const matchingLibrary=createRuleLibrary({builtins:[],storage:{
  async get(keys){const local=await isolated.get(keys),shared=await storage.get(['sourceRuleLibrary','sourceRuleTests']);return {...local,sourceRuleTests:shared.sourceRuleTests,sourceRuleLibrary:{...shared.sourceRuleLibrary,...local.sourceRuleLibrary}};},
  async set(){throw new Error('practice-storage');}
 }});
 const types=new Set(['practiceOpen','practicePages','practiceBuilder','practiceReset','practiceCancel','practiceSummary','practiceBind']);
 const commands=new Set(['builderStart','builderStatus','builderDraft','builderMark','builderPreview','builderImage','builderRecognize','builderConfirm','builderSave','builderExport','builderCancel']);
 const key=sender=>`${sender.tab?.id}:${sender.documentId}`;
 const sameOwner=(a,b)=>isPracticeDocument(b,extensionId)&&a.id===b.id&&new URL(a.url).pathname===new URL(b.url).pathname&&a.documentId===b.documentId&&a.tab.id===b.tab.id;
 const authorize=sender=>{const owner=owners.get(key(sender));if(!isPracticeDocument(sender,extensionId)||!owner||!sameOwner(owner.sender,sender))throw new Error('practice-owner');return owner;};
 const bridge=createPracticeTabBridge({extensionId,tabs,now,timeoutMs,onLost:tabId=>{for(const record of sessions.values())if(record.source?.tabId===tabId)void cancel(record);}});
 const reader=createPracticeAssetReader({extensionOrigin:origin,fetchAsset});
 const ocr=createPracticeOcr({extensionId,getAsset:id=>reader.read(id),connectOcr,isBusy,ocrTimeoutMs:280000,authorizeOwner:(sender,message)=>{
  const record=sessions.get(key(sender));return Boolean(record&&!record.cancelled&&sameOwner(record.owner,sender)&&record.sessionId===message.sessionId&&now()<record.expiresAt);
 }});
 function live(record){
  if(record.cancelled||record.epoch!==resetEpoch||sessions.get(key(record.owner))!==record||!owners.has(key(record.owner))||now()>=record.expiresAt)throw new Error('builder-cancelled');
 }
 async function cancel(record){
  if(!record||record.cancelled)return;record.cancelled=true;clearTimeout(record.timer);sessions.delete(key(record.owner));
  // Invalidate before any await so a queued save's beforeCommit cannot survive cancellation.
  const pending=record.builder?.cancel();await bridge.dispose({owner:record.owner});
  await Promise.all([pending,ocr.cancelOwner(record.owner)]);record.reader?.clear();
 }
 const pages=record=>record.source?[{id:record.source.tabId,label:'DEMO1000 · moodle · '+record.source.tabId}]:[];
 async function envelope(record,state){live(record);const saved=await library.list();live(record);return {sessionId:record.sessionId,revision:record.revision,expiresAt:record.expiresAt,settings:structuredClone(practiceSettings),pages:pages(record),saved,...(state===undefined?{}:{state})};}
 function compose(record){
  const assetReader=record.reader=createPracticeAssetReader({extensionOrigin:origin,fetchAsset});
  const preview=createBuilderPreview({downloadImage:url=>assetReader.download(url),ocrTimeoutMs:300000,connectOcr:async()=>({
   async call(payload){live(record);const result=await ocr.handle({type:'practiceRecognize',sessionId:record.sessionId,assetId:assetReader.identify(payload)},record.owner);live(record);return {observations:result.text.map(text=>({text}))};},close(){}
  })});
  record.builder=createBuilderSession({extensionId,storage:isolated,now,preview,isBusy,
   authorizeOwner:sender=>{authorize(sender);if(!sameOwner(record.owner,sender))throw new Error('practice-owner');live(record);},
   validateSourceUrl:url=>validatePracticeSourceUrl(url,{extensionOrigin:origin,sessionId:record.sessionId}),
   getLibrary:async()=>({editToken:()=>library.editToken(),saveGenerated:options=>library.saveGenerated({...options,enableCourses:[],beforeCommit:()=>{live(record);options.beforeCommit();}})}),
   tabs:{query:async()=>[await tabs.get(record.source.tabId)],get:async id=>{live(record);if(id!==record.source.tabId)throw new Error('builder-source');return tabs.get(id);},update:async(id,patch)=>{live(record);if(![record.source.tabId,record.owner.tab.id].includes(id)||patch.url)throw new Error('builder-source');return tabs.update(id,patch);}},
   pageBridge:{describe:context=>bridge.describe({...context,documentId:record.source.documentId}),command:(context,method,args)=>bridge.command(context,method,args),dispose:async context=>{try{await bridge.command(context,'dispose');}catch{}}}
  });
 }
 return {
  owns:type=>types.has(type),get busy(){return ocr.busy||sessions.size>0||resetting>0;},
  connect(port){
   if(port.name==='rule-practice-source'){const accepted=bridge.connect(port);if(!accepted)port.disconnect();return accepted;}
   if(port.name!=='rule-practice-owner')return false;
   const sender=port.sender;if(!isPracticeDocument(sender,extensionId)){port.disconnect();return false;}
   const id=key(sender);if(owners.has(id)){port.disconnect();return false;}
   for(const [oldId,old] of owners)if(old.sender.tab.id===sender.tab.id){owners.delete(oldId);void cancel(sessions.get(oldId));old.port.disconnect();}
   owners.set(id,{sender,port});const disconnect=()=>{if(owners.get(id)?.port!==port)return;owners.delete(id);void cancel(sessions.get(id));port.onDisconnect.removeListener(disconnect);};port.onDisconnect.addListener(disconnect);return true;
  },
  async cancelOwner(sender){if(!isPracticeDocument(sender,extensionId))return;const record=sessions.get(key(sender));if(record&&sameOwner(record.owner,sender))await cancel(record);},
  async cancelTab(tabId,change){
   bridge.invalidateTab(tabId,change);
   await Promise.all([...sessions.values()].filter(record=>{
    // The bridge decides whether this source actually navigated and calls onLost.
    if(record.source?.tabId===tabId)return false;if(record.owner.tab.id!==tabId)return false;
    // Hash routes retain the same document; reload/navigation still revoke ownership.
    if(change?.url&&change.status!=='loading'&&sameOwner(record.owner,{...record.owner,url:change.url}))return false;
    return true;
   }).map(cancel));
  },
  async handle(message,sender){
   if(message?.type==='practiceSummary'){
    if(!isPracticeDocument(sender,extensionId))throw new Error('practice-owner');
    const saved=await library.list(),matching=await matchingLibrary.list();matching.rules=matching.rules.filter(rule=>rule.courses.some(course=>practiceMatchingSettings.courses.includes(course)));
    return {saved,matching,settings:structuredClone(practiceMatchingSettings)};
   }
   if(message?.type==='practiceBind'){
    if(!isPracticeDocument(sender,extensionId))throw new Error('practice-owner');
    if(!practiceMatchingSettings.courses.includes(message.course)||!['gmail','moodle','ed'].includes(message.source))throw new Error('builder-source');
    return serializePracticeMutation(storage,async()=>{
     const ids=normalizeRuleIds(message.ruleIds),current=await matchingLibrary.list();
     for(const id of ids){const rule=current.rules.find(rule=>rule.key===id&&rule.source===message.source&&rule.courses.includes(message.course));if(!rule)throw new Error('builder-source');if(!ruleCanMatch(rule,current,message.course))throw new Error('rule-test-required');}
     const data=await isolated.get(['sourceRuleBindings','sourceRuleRevisions']),bindings=data.sourceRuleBindings||{},revisions=data.sourceRuleRevisions||{};
     (bindings[message.course]||={})[message.source]=ids;
     const revision=Number(revisions[message.course]?.[message.source]);(revisions[message.course]||={})[message.source]=Number.isSafeInteger(revision)&&revision>=0&&revision<Number.MAX_SAFE_INTEGER?revision+1:1;
     await isolated.set({sourceRuleBindings:bindings,sourceRuleRevisions:revisions});return {ok:true};
    });
   }
   authorize(sender);if(!types.has(message?.type))throw new Error('builder-command');
   let record=sessions.get(key(sender));
   if(message.type==='practiceOpen'){
    if(resetting)throw new Error('builder-busy');
    if(record){live(record);await record.opening;live(record);await tabs.update(record.source.tabId,{active:true});return envelope(record);}
    if(isBusy())throw new Error('builder-busy');
    record={owner:sender,sessionId:crypto.randomUUID(),revision:0,expiresAt:now()+600000,epoch:resetEpoch,language:['en','zh-CN','zh-TW'].includes(message.language)?message.language:'en'};sessions.set(key(sender),record);
    record.timer=setTimeout(()=>void cancel(record),600000);record.timer.unref?.();
    record.opening=(async()=>{const source=await bridge.open({...sender,language:record.language},record.sessionId);record.source=source;try{live(record);compose(record);}catch(error){bridge.invalidateTab(source.tabId);throw error;}})();
    try{await record.opening;return await envelope(record);}catch(error){await cancel(record);throw error;}
   }
   if(message.type==='practiceCancel'&&message.sessionId===undefined&&message.revision===undefined){await cancel(record);return {ok:true};}
   const resetWithoutSession=message.type==='practiceReset'&&message.sessionId===undefined&&message.revision===undefined;
   if(!resetWithoutSession){
    if(!record||message.sessionId!==record.sessionId)throw new Error('builder-expired');live(record);
    if(message.revision!==record.revision)throw new Error('builder-stale-preview');
   }
   if(message.type==='practiceCancel'){await cancel(record);return {ok:true};}
   if(message.type==='practiceReset'){
    resetting++;resetEpoch++;const cancellations=[...sessions.values()].map(cancel);
    try{await serializePracticeMutation(storage,()=>isolated.reset());await Promise.all(cancellations);return {ok:true};}finally{resetting--;}
   }
   if(message.type==='practicePages'){await record.opening;return envelope(record);}
   const command=message.command;if(!command||!commands.has(command.type))throw new Error('builder-command');
   if(record.working)throw new Error('builder-busy');record.working=true;
   try{return await serializePracticeMutation(storage,async()=>{
    live(record);if(message.revision!==record.revision)throw new Error('builder-stale-preview');await record.opening;live(record);
    if(command.type==='builderStart'&&(command.course!=='DEMO1000'||command.source!=='moodle'||command.tabId!==record.source.tabId))throw new Error('builder-source');
    if(command.type==='builderSave'&&command.enable){
     const evidence=record.ocrRevision;
     if(evidence?.revision!==record.state?.revision||evidence?.sessionId!==record.state?.sessionId||(!evidence.success&&command.acknowledgeOcrSkip!==true))throw new Error('builder-preview-required');
    }
    let result;
    try{result=await record.builder.handle({...command,sessionId:record.state?.sessionId,revision:record.state?.revision},sender);}
    catch(error){
     if(command.type==='builderRecognize'&&record.state?.phase==='previewed'&&!/builder-(preview-required|stale-preview|cancelled|expired|source-changed)/.test(error.message))record.ocrRevision={sessionId:record.state.sessionId,revision:record.state.revision,success:false};
     throw error;
    }
    live(record);
    if(result.sessionId)record.state=result;
    if(command.type==='builderRecognize')record.ocrRevision={sessionId:record.state.sessionId,revision:record.state.revision,success:Boolean(result.text?.some(text=>text.trim()))};
    if(command.type==='builderCancel'||command.type==='builderStart'){record.ocrRevision=null;if(command.type==='builderCancel')record.state=null;}
    record.revision++;return envelope(record,result);
   });}finally{record.working=false;}
  }
 };
}
