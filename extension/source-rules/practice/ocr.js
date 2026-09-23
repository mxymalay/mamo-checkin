import {practiceAssetPaths} from './assets.js';
import {createBuilderPreview} from '../builder/preview.js';

export const isPracticeDocument=(sender,extensionId)=>{
 let url;try{url=new URL(sender?.url);}catch{return false;}
 return sender?.id===extensionId&&url.protocol==='chrome-extension:'&&url.host===extensionId&&!url.username&&!url.password&&['/options.html','/modules.html'].includes(url.pathname)&&!url.search&&typeof sender.documentId==='string'&&Boolean(sender.documentId)&&Number.isInteger(sender.tab?.id)&&sender.tab.id>=0&&(sender.frameId===undefined||sender.frameId===0);
};
export function createPracticeOcr({extensionId,getAsset,connectOcr,isBusy,authorizeOwner=()=>false,timeoutMs=20000,ocrTimeoutMs=timeoutMs}){
 let current=null;
 return {
  get busy(){return Boolean(current);},
  async cancelOwner(sender){
   if(!isPracticeDocument(sender,extensionId)||current?.owner!==sender.documentId||current?.tabId!==sender.tab.id)return;
   const job=current;job.preview.clear();job.reject(new Error('builder-cancelled'));await job.done;
  },
  async handle(message,sender){
   if(!isPracticeDocument(sender,extensionId)||!authorizeOwner(sender,message))throw new Error('practice-owner');
   if(message.type==='practiceCancel'){await this.cancelOwner(sender);return {ok:true};}
   if(message.type!=='practiceRecognize'||!Object.hasOwn(practiceAssetPaths,message.assetId))throw new Error('practice-asset');
   if(current||isBusy())throw new Error('builder-busy');
   const job={owner:sender.documentId,tabId:sender.tab.id,finished:false};let finish;
   job.done=new Promise(resolve=>{finish=resolve;});current=job;
   const cancelled=new Promise((_,reject)=>{job.reject=reject;});
   const preview=job.preview=createBuilderPreview({downloadImage:getAsset,timeoutMs,ocrTimeoutMs,connectOcr:async()=>{
    const service=await connectOcr();let closing;
    const close=()=>closing||=(Promise.resolve().then(()=>service.close()));
    if(job.finished){await close();throw new Error('builder-cancelled');}
    job.close=close;return {call:message=>service.call(message),close};
   }});
   try{return await Promise.race([cancelled,(async()=>{await preview.load([{id:message.assetId,url:message.assetId}]);return {text:await preview.recognize(message.assetId)};})()]);}
   finally{job.finished=true;preview.clear();try{await job.close?.();}finally{if(current===job)current=null;finish();}}
  }
 };
}
