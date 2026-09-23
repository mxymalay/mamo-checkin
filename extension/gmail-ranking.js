// Gmail list ranking: a plain chronological cap starves later courses once one
// unit posts many attendance announcements. Score threads, then round-robin the
// best candidates per course so every configured course gets a fair share.
const NOISE=/recording|consultation|reminder|discord|zoom|feedback|grades|marks|quiz|webinar/i;
export function scoreThread(subject){
 const s=String(subject||'').toLowerCase();let score=0;
 if(/attendance\s*codes?\b/i.test(s))score+=100;else if(/\battendance\b/i.test(s))score+=45;
 if(/\bweek\s*\d{1,2}\b/i.test(s))score+=15;
 if(/\bannouncement/i.test(s))score+=15;
 if(NOISE.test(s))score-=20;
 return score;
}
export function prioritiseThreads(threads,{limit=40,perCourse=4}={}){
 const scored=(threads||[]).map(thread=>({thread,score:scoreThread(thread.subject)+Math.min(40,Math.max(0,Number(thread.navigationPriority)||0))})).sort((a,b)=>b.score-a.score);
 const groups=new Map();
 for(const item of scored){const key=item.thread.course||'';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
 const picked=[],seen=new Set();
 const add=item=>{if(item&&!seen.has(item.thread.id)&&picked.length<limit){seen.add(item.thread.id);picked.push(item.thread);}};
 for(let round=0;round<perCourse;round++)for(const list of groups.values()){add(list[round]);if(picked.length>=limit)return picked;}
 for(const item of scored)add(item);
 return picked;
}
