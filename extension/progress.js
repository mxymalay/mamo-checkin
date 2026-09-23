export function createRunProgress(persist,now=()=>new Date().toISOString()){
  const startedAt=now();
  let status={running:true,startedAt,stepStartedAt:startedAt,updatedAt:startedAt,message:'准备检查最近 7 天的签到',context:{},counts:{pages:0,messages:0,images:0,cached:0,records:0,skipped:0},events:[]};
  let writing=Promise.resolve(),finished=false;
  return {update(event){
    if(finished)return writing;
    const background=event.background,{message}=event,context=event.context??status.context;
    const at=now(),changed=event.message&&event.message!==status.message;
    // Concurrent collection contributes events and counts without hiding login waits.
    if(background&&status.phase==='waiting')event={...event,phase:status.phase,waitingSite:status.waitingSite,loginDeadline:status.loginDeadline,message:status.message,context:status.context,detail:true};
    for(const [key,value] of Object.entries(event.increment||{}))status.counts[key]=(status.counts[key]||0)+value;
    status={...status,...event,context:event.context??status.context,updatedAt:at,stepStartedAt:changed&&!event.detail?at:status.stepStartedAt};
    delete status.increment;delete status.detail;delete status.level;delete status.background;
    if(message&&(changed||event.level||event.increment))status.events=[...status.events,{at,message,level:event.level||'info',context,metrics:Object.keys(event.increment||{})}].slice(-100);
    const snapshot=structuredClone(status);
    writing=writing.catch(()=>{}).then(()=>persist(snapshot));return writing;
  },finish(event){const result=this.update({running:false,finishedAt:now(),...event});finished=true;return result;}};
}
