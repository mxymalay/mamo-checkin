import {practiceSourceUrl} from './assets.js';
import {isPracticeDocument} from './ocr.js';

// A nonce identifies a recorded tab; it never authorizes a different tab or document.
export function createPracticeTabBridge({extensionId,tabs,now=Date.now,timeoutMs=15000,onLost=()=>{}}){
 const origin=`chrome-extension://${extensionId}`,records=new Map(),ownerEpochs=new Map();
 const ownerKey=owner=>`${owner.tab?.id}:${owner.documentId}`;
 const methods=new Set(['begin','inspect','mark','propose','evaluate','dispose']);
 function end(record,reason='builder-source-changed'){
  if(!record||record.ended)return;record.ended=true;records.delete(record.tabId);clearTimeout(record.timer);clearTimeout(record.expiryTimer);
  record.rejectReady?.(new Error(reason));for(const pending of record.pending.values()){clearTimeout(pending.timer);pending.reject(new Error(reason));}record.pending.clear();
  if(record.port){record.port.onMessage.removeListener(record.receive);record.port.onDisconnect.removeListener(record.disconnect);try{record.port.postMessage({type:'ended',sessionId:record.sessionId});record.port.disconnect();}catch{}}
  onLost(record.tabId);
 }
 const live=record=>{if(!record||record.ended||now()>=record.expiresAt){end(record);throw new Error('builder-source-changed');}return record;};
 const find=context=>{const record=live(records.get(context.tabId));if(!record.documentId||context.documentId&&context.documentId!==record.documentId||context.url&&context.url!==record.url)throw new Error('builder-source-changed');return record;};
 async function send(record,method,args){
  live(record);const tab=await tabs.get(record.tabId);live(record);if(tab?.url!==record.url){end(record);throw new Error('builder-source-changed');}
  if(record.pending.size>=4)throw new Error('builder-busy');
  const requestId=crypto.randomUUID(),revision=++record.revision;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{record.pending.delete(requestId);reject(new Error('builder-timeout'));},timeoutMs);
   record.pending.set(requestId,{resolve,reject,timer,revision});
   try{record.port.postMessage({type:'command',sessionId:record.sessionId,requestId,revision,method,args});}catch{end(record);}
  });
 }
 return {
  async open(owner,sessionId){
   if(!isPracticeDocument(owner,extensionId))throw new Error('practice-owner');
   const ownerId=ownerKey(owner),epoch=ownerEpochs.get(ownerId)||0;
   const tab=await tabs.create({url:'about:blank',active:true}),url=practiceSourceUrl(origin,sessionId);
   if(epoch!==(ownerEpochs.get(ownerId)||0))throw new Error('builder-cancelled');
   const record={tabId:tab.id,url,owner,sessionId,expiresAt:now()+600000,pending:new Map(),revision:0};records.set(tab.id,record);
   const ready=new Promise((resolve,reject)=>{record.resolveReady=resolve;record.rejectReady=reject;});
   // Attach the rejection handler before navigating: registration can be synchronous in tests.
   ready.catch(()=>{});record.timer=setTimeout(()=>end(record,'builder-timeout'),timeoutMs);
   record.expiryTimer=setTimeout(()=>end(record),600000);record.expiryTimer.unref?.();
   try{await tabs.update(tab.id,{url,active:true});await ready;live(record);return {tabId:tab.id,documentId:record.documentId,url};}catch(error){end(record);throw error;}
  },
  connect(port){
   if(port.name!=='rule-practice-source')return false;
   const sender=port.sender,record=records.get(sender?.tab?.id);
   if(!record||record.ended||now()>=record.expiresAt||record.port||sender.id!==extensionId||!sender.documentId||sender.frameId!==0||sender.url!==record.url)return false;
   record.port=port;record.documentId=sender.documentId;
   record.disconnect=()=>end(record);
   record.receive=message=>{
    if(record.ended||now()>=record.expiresAt){end(record);return;}
    if(message?.sessionId!==record.sessionId)return;
    if(message.type==='ready'&&message.role==='source'&&!record.ready){record.ready=true;clearTimeout(record.timer);record.resolveReady();port.postMessage({type:'registered',sessionId:record.sessionId,documentId:record.documentId,expiresAt:record.expiresAt,language:['en','zh-CN','zh-TW'].includes(record.owner.language)?record.owner.language:'en'});return;}
    if(!record.ready)return;
    if(message.type==='return'){void tabs.update(record.owner.tab.id,{active:true}).catch(()=>end(record));return;}
    if(message.type!=='reply')return;
    const pending=record.pending.get(message.requestId);if(!pending||message.revision!==pending.revision)return;
    record.pending.delete(message.requestId);clearTimeout(pending.timer);
    if(message.error)pending.reject(new Error(/^builder-[a-z-]+$/.test(message.error)?message.error:'builder-source-error'));else pending.resolve(message.result);
   };
   port.onMessage.addListener(record.receive);port.onDisconnect.addListener(record.disconnect);return true;
  },
  async describe(context){const record=find(context);const result=await send(record,'begin',{initialize:true,context:{sessionId:context.sessionId,expiresAt:Math.min(context.expiresAt,record.expiresAt),labels:context.labels}});return {url:record.url,documentId:record.documentId,...result};},
  async command(context,method,args={}){if(!methods.has(method))throw new Error('builder-command');return send(find(context),method,{...args,sessionId:context.sessionId});},
  async dispose(context){
   if(context?.owner){const id=ownerKey(context.owner);ownerEpochs.set(id,(ownerEpochs.get(id)||0)+1);for(const record of [...records.values()])if(ownerKey(record.owner)===id)end(record);}
   else end(records.get(context?.tabId));
  },
  invalidateTab(tabId,change){
   const record=records.get(tabId);
   if(change&&record){
    if(!record.ready&&(!change.url||change.url===record.url||change.url==='about:blank'))return;
    if(change.status!=='loading'&&change.url===record.url)return;
   }
   end(record);
  }
 };
}
