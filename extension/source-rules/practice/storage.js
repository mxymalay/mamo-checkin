import {practiceSettings} from './assets.js';
const keys=['sourceRuleLibrary','sourceRuleBindings','sourceRuleRevisions','sourceRuleTests'];
const queues=new WeakMap();
export function serializePracticeMutation(storage,operation){
 const pending=(queues.get(storage)||Promise.resolve()).then(operation);queues.set(storage,pending.catch(()=>{}));return pending;
}
export function createPracticeStorage(storage){
 return {
  async get(requested){
   if(!Array.isArray(requested)||requested.some(k=>!keys.includes(k)&&k!=='settings'))throw new Error('practice-storage');
   const data=await storage.get(requested.filter(k=>k!=='settings').map(k=>'practice:'+k));
   return Object.fromEntries(requested.map(k=>[k,structuredClone(k==='settings'?practiceSettings:data['practice:'+k])]));
  },
  async set(patch){
   if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!keys.includes(k)))throw new Error('practice-storage');
   await storage.set(Object.fromEntries(Object.entries(patch).map(([k,v])=>['practice:'+k,structuredClone(v)])));
  },
  async reset(){
   // Preserve an epoch in the edit-token input, including when both stores are empty.
   await storage.set({'practice:sourceRuleLibrary':{},'practice:sourceRuleBindings':{},'practice:sourceRuleTests':{},'practice:sourceRuleRevisions':{'practice:epoch':{value:crypto.randomUUID()}}});
  }
 };
}
