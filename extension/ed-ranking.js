export function selectEdThreads(threads,sessions,{limit=4}={}){
  const days=sessions.map(s=>s.date).filter(Boolean);
  const weeks=new Set(sessions.map(s=>Number(s.week)).filter(n=>n>0));
  const ranked=threads.map((thread,index)=>{
    const item=typeof thread==='string'?{url:thread,label:''}:thread;
    const label=item.label||'',week=Number(label.match(/\bweek\s*(\d{1,2})\b/i)?.[1]);
    const dates=days.some(date=>{
      const d=new Date(date+'T12:00:00Z');
      const month=d.toLocaleString('en',{month:'short',timeZone:'UTC'});
      return label.includes(date)||new RegExp(`\\b${d.getUTCDate()}\\s+${month}\\w*\\b`,'i').test(label);
    });
    const target=dates||weeks.has(week);
    return {...item,week,index,target,score:(target?1000:0)+(/attendance|签到/i.test(label)?100:/\bcode\b/i.test(label)?50:0)+Math.min(40,Math.max(0,Number(item.navigationPriority)||0)),reason:target?'missing-session':week?'week-fallback':'general-fallback'};
  }).sort((a,b)=>b.score-a.score||a.index-b.index);
  const result=[],seen=new Set();
  // Give each explicitly matched week a place before filling remaining slots.
  for(const item of ranked.filter(t=>t.target))if(result.length<limit&&!seen.has(item.week||item.url)){result.push(item);seen.add(item.week||item.url);}
  for(const item of ranked)if(result.length<limit&&!result.some(r=>r.url===item.url))result.push(item);
  return result;
}
