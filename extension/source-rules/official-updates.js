import {loadBuiltinRules} from './builtins.js';
import {verifyOfficialRelease,OFFICIAL_MAX_BYTES} from './official-release.js';
import {OFFICIAL_RULE_URL,OFFICIAL_PUBLIC_KEY} from './official-trust.js';

export const OFFICIAL_ALARM='official-rule-update';
export const OFFICIAL_INTERVAL=6*60*60*1000;
const storageKey='officialRuleUpdates';
export async function scheduleOfficialRules(alarms){
 const alarm=await alarms.get(OFFICIAL_ALARM);
 if(alarm?.periodInMinutes!==360)await alarms.create(OFFICIAL_ALARM,{delayInMinutes:1,periodInMinutes:360});
}
export function createOfficialRules({storage,fetchImpl=globalThis.fetch,loadBundled=loadBuiltinRules,publicKey=OFFICIAL_PUBLIC_KEY,now=Date.now}){
 let ready=null,state=null,bundled=null,active=null,previous=null,pending=null,rollbackPending=null,resetting=null,controller=null,epoch=0;
 const verify=envelope=>verifyOfficialRelease(envelope,{publicKey});
 const init=()=>ready||=(async()=>{
  bundled=await loadBundled();const saved=(await storage.get([storageKey]))[storageKey]||{};
  state={active:null,previous:null,highest:0,highestDigest:'',blocked:0,lastAttempt:0,lastChecked:0,error:null};
  for(const key of ['lastAttempt','lastChecked'])if(Number.isFinite(saved[key])&&saved[key]>=0)state[key]=saved[key];
  if(typeof saved.error==='string'&&/^official-[a-z-]+$/.test(saved.error))state.error=saved.error;
  for(const [name,target] of [['active',saved.active],['previous',saved.previous]])if(target)try{const value=await verify(target);if(name==='active')active=value;else previous=value;state[name]=target;}catch{state.error='official-cache-invalid';}
  if(!active&&previous){active=previous;state.active=state.previous;previous=null;state.previous=null;}
  const newest=[active,previous].filter(Boolean).sort((a,b)=>b.sequence-a.sequence)[0];
  state.highest=newest?.sequence||0;state.highestDigest=newest?.digest||'';
  if(Number.isSafeInteger(saved.highest)&&saved.highest>=state.highest&&/^[a-f0-9]{64}$/.test(saved.highestDigest)){state.highest=saved.highest;state.highestDigest=saved.highestDigest;}
  if(Number.isSafeInteger(saved.blocked)&&saved.blocked>0&&saved.blocked<=state.highest)state.blocked=saved.blocked;
 })().catch(error=>{ready=null;throw error;});
 const status=()=>({version:active?.version||'bundled',sequence:active?.sequence||0,source:active?'remote':'bundled',lastChecked:state.lastChecked||null,lastAttempt:state.lastAttempt||null,error:state.error,canRollback:Boolean(active)});
 async function readRemote(signal){
  const response=await fetchImpl(OFFICIAL_RULE_URL,{credentials:'omit',redirect:'error',cache:'no-store',signal});
  if(!response.ok)throw new Error('official-download');
  if(Number(response.headers.get('content-length'))>OFFICIAL_MAX_BYTES)throw new Error('official-size');
  const reader=response.body?.getReader();if(!reader)throw new Error('official-download');
  const chunks=[];let length=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>OFFICIAL_MAX_BYTES)throw new Error('official-size');chunks.push(value);}}
  catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new Error('official-invalid');}
 }
 const api={
  async rules(){if(resetting)await resetting;await init();if(resetting){await resetting;return api.rules();}return active?.rules||bundled;},
  async status(){if(resetting)await resetting;await init();if(resetting){await resetting;return api.status();}return status();},
  check({force=false}={}){
   if(resetting)return Promise.reject(new Error('official-resetting'));
   if(pending)return pending;
   const generation=epoch;
   pending=(async()=>{
    await rollbackPending;await init();if(generation!==epoch)return status();
    if(!force&&state.lastAttempt&&now()-state.lastAttempt<OFFICIAL_INTERVAL)return status();
    controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),10000),attempt=now();
    try{
     const envelope=await readRemote(controller.signal),release=await verify(envelope);
     if(generation!==epoch)return status();
     if(release.sequence<state.highest||release.sequence===state.highest&&release.digest!==state.highestDigest)throw new Error('official-replay');
     const next={...state,lastAttempt:attempt,lastChecked:now(),error:null};
     const changed=release.sequence>state.blocked&&release.sequence!==active?.sequence;
     if(changed)Object.assign(next,{previous:state.active,active:envelope,highest:release.sequence,highestDigest:release.digest});
     await storage.set({[storageKey]:next});state=next;
     if(changed){previous=active;active=release;}
    }catch(error){
     if(generation!==epoch)return status();
     const code=/^official-[a-z-]+$/.test(error.message)?error.message:controller.signal.aborted?'official-timeout':'official-download';
     state={...state,lastAttempt:attempt,error:code};try{await storage.set({[storageKey]:state});}catch{state.error='official-storage';}
    }finally{clearTimeout(timer);controller=null;}
    return status();
   })().finally(()=>{pending=null;});return pending;
  },
  rollback(){
   if(resetting)return Promise.reject(new Error('official-resetting'));
   if(rollbackPending)return rollbackPending;
   const checking=pending;
   rollbackPending=(async()=>{
    await checking;await init();if(!active)throw new Error('official-no-previous');
    const next={...state,active:state.previous,previous:null,blocked:state.highest,error:null};await storage.set({[storageKey]:next});state=next;active=previous;previous=null;return status();
   })().finally(()=>{rollbackPending=null;});return rollbackPending;
  },
  reset(clear=()=>storage.set({[storageKey]:null})){
   if(resetting)return resetting;
   epoch++;controller?.abort();
   resetting=(async()=>{await Promise.allSettled([pending,rollbackPending,ready]);await clear();ready=null;state=null;active=null;previous=null;bundled=null;})().finally(()=>{resetting=null;});
   return resetting;
  }
 };
 return api;
}
