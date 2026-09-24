// Only explicit labels count. Multiple weeks cannot safely label a whole message.
export function sourceWeek(message={}){
 const sources=[['title',message.subject],['body',(message.textRows||[]).join('\n')],['section',(message.weekContext||[]).join('\n')],['image',message.rawText]];
 const evidence=[];
 for(const [source,text] of sources){
  if(/\bweeks?\s*[:#-]?\s*\d{1,2}\s*(?:[-–—/&]|to|and)\s*\d{1,2}\b/i.test(String(text||'')))return null;
  for(const match of String(text||'').matchAll(/\bweek\s*[:#-]?\s*(\d{1,2})\b|第\s*(\d{1,2})\s*[周週]/gi)){
   const number=Number(match[1]||match[2]);if(number>=1&&number<=53)evidence.push({number,source,label:match[0]});
  }
 }
 return new Set(evidence.map(e=>e.number)).size===1?{number:evidence[0].number,evidence}:null;
}
