export const messageSourceKey=({course,source,revision=0,officialRevision='',messageId})=>revision||officialRevision?`rule:${course}:${source}:${revision}:${officialRevision?'official:'+officialRevision+':':''}${messageId}`:messageId;
export const threadSourceKey=({course,revision=0,officialRevision='',threadId})=>messageSourceKey({course,source:'gmail',revision,officialRevision,messageId:threadId});
export const sourceFrontierVersion=({academicYear,course,revision=0,officialRevision='',sinceDate=''})=>`${academicYear}:recent-v1:${sinceDate}${revision?`:rule:${course}:${revision}`:''}${officialRevision?':official:'+officialRevision:''}`;
export const messageCacheKey=(state,msg)=>messageSourceKey({course:msg.course,source:msg.sourceType||'gmail',...state.sourceRules?.courses?.[msg.course]?.[msg.sourceType||'gmail'],messageId:msg.messageId});
export function pruneRuleCache(cache,snapshot){
 for(const key of Object.keys(cache||{})){
  const match=key.match(/^rule:([A-Z]+\d+):(gmail|moodle|ed):(\d+):(?:official:([a-f0-9]{64}):)?/);if(!match)continue;
  const selection=snapshot?.courses?.[match[1]]?.[match[2]];
  if(selection&&(Number(match[3])!==selection.revision||(match[4]||'')!==(selection.officialRevision||'')))delete cache[key];
 }
 return cache;
}
