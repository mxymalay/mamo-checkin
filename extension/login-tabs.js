export function trackLoginTabs(tabs,storage){
 let writing=Promise.resolve();
 const exclusive=action=>{
  const result=writing.catch(()=>{}).then(action);writing=result;return result;
 };
 const tracked={
  get:(...args)=>tabs.get(...args),query:(...args)=>tabs.query(...args),update:(...args)=>tabs.update(...args),
  async create(options){
   const tab=await tabs.create(options);
   await exclusive(async()=>{
    const {loginTabs=[]}=await storage.get(['loginTabs']);
    await storage.set({loginTabs:[...loginTabs,{id:tab.id,origin:new URL(options.url).origin}]});
   });
   return tab;
  }
 };
 return {tabs:tracked,release:verifiedLogin=>exclusive(async()=>{
  const used=new Set(Object.values(verifiedLogin).map(entry=>entry?.tabId));
  const {loginTabs=[]}=await storage.get(['loginTabs']),keep=[];
  for(const entry of loginTabs){
   if(!used.has(entry.id)){keep.push(entry);continue;}
   try{
    const tab=await tabs.get(entry.id);
    // A user may have repurposed a helper-created tab during the run.
    if(new URL(tab.pendingUrl||tab.url).origin===entry.origin)await tabs.remove(entry.id);
   }catch{}
  }
  await storage.set({loginTabs:keep});
 })};
}
