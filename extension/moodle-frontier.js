export async function crawlMoodle({roots,previous,read,persist,maxPages=8,deadline=Infinity,version='',shouldContinue=()=>true}){
  const signature=JSON.stringify([roots,version]);
  const same=previous?.signature===signature;
  const visited=new Set(same?previous.visited:[]);
  const queue=[...roots.map(url=>({url,depth:0})),...(same?previous.pending:[])];
  for(const url of roots)visited.delete(url);
  let pages=0,priorityCount=0;const prioritized=new Set();
  const snapshot=()=>({signature,visited:queue.length?[...visited]:[],pending:queue});
  while(queue.length&&pages<maxPages&&Date.now()<deadline&&shouldContinue()){
    const item=queue.shift();if(visited.has(item.url))continue;
    visited.add(item.url);pages++;
    const result=await read(item.url);
    const links=Array.isArray(result)?result:result?.links||[];
    if(item.depth<3){
      const extraSlots=maxPages-roots.length;
      const hot=(Array.isArray(result)?[]:result?.priorityLinks||[]).filter(url=>!roots.includes(url)&&!prioritized.has(url)).slice(0,Math.max(0,Math.min(2,extraSlots>1?extraSlots-1:extraSlots)-priorityCount));
      for(const url of hot) {prioritized.add(url);visited.delete(url);const index=queue.findIndex(p=>p.url===url);if(index>=0)queue.splice(index,1);}
      queue.unshift(...hot.map(url=>({url,depth:item.depth+1})));priorityCount+=hot.length;
      for(const url of links)if(!visited.has(url)&&!queue.some(p=>p.url===url))queue.push({url,depth:item.depth+1});
    }
    await persist(snapshot());
  }
  const progress=snapshot();await persist(progress);return progress;
}
