export function createRunProgress(persist,now=()=>new Date().toISOString()){
  const startedAt=now();
  let status={running:true,startedAt,stepStartedAt:startedAt,updatedAt:startedAt,message:'准备检查最近 7 天的签到',context:{},counts:{pages:0,messages:0,images:0,cached:0,records:0,skipped:0},events:[],items:[]};
  let writing=Promise.resolve(),finished=false;
  return {update(event){
    if(finished)return writing;
    const background=event.background,{message}=event,context=event.context??status.context;
    const at=now(),changed=event.message&&event.message!==status.message;
    const sessions=(event.sessions||event.item?.records||[]).map(({course,date,time,type,group})=>({course,date,time,type,group}));
    const item=event.item||(event.increment?.pages?{kind:'pages',id:context.sourceUrl||at,course:context.course,sourceUrl:context.sourceUrl,title:context.subject,state:'complete'}:null);
    const items=[item];
    if(event.increment?.skipped&&!event.item)items.push({kind:'skipped',id:at+':'+status.counts.skipped,course:context.course,sourceUrl:context.sourceUrl,title:context.subject,state:'skipped',quantity:event.increment.skipped,reason:'来源仅返回跳过数量，未提供逐项原因'});
    for(const detail of items.filter(Boolean)){const index=status.items.findIndex(existing=>existing.kind===detail.kind&&existing.id===detail.id);if(index>=0)status.items[index]={...status.items[index],...detail,updatedAt:at};else status.items.push({...detail,updatedAt:at});}
    if(status.items.length>500){status.itemsTruncated=true;status.items=status.items.slice(-500);}
    // Concurrent collection contributes events and counts without hiding login waits.
    if(background&&status.phase==='waiting')event={...event,phase:status.phase,waitingSite:status.waitingSite,loginDeadline:status.loginDeadline,message:status.message,context:status.context,detail:true};
    for(const [key,value] of Object.entries(event.increment||{}))status.counts[key]=(status.counts[key]||0)+value;
    status={...status,...event,context:event.context??status.context,updatedAt:at,stepStartedAt:changed&&!event.detail?at:status.stepStartedAt};
    delete status.increment;delete status.detail;delete status.level;delete status.background;delete status.item;delete status.sessions;
    if(message&&(changed||event.level||event.increment))status.events=[...status.events,{at,message,level:event.level||'info',context,metrics:Object.keys(event.increment||{}),...(sessions.length?{sessions}:{})}].slice(-100);
    const snapshot=structuredClone(status);
    writing=writing.catch(()=>{}).then(()=>persist(snapshot));return writing;
  },finish(event){const result=this.update({running:false,finishedAt:now(),...event});finished=true;return result;}};
}
