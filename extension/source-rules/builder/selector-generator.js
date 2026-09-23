// Self-contained for Chrome's isolated-world injection.
export function installBuilderSelectorEngine(){
 const classes=new Set('attendance summary content post-content post-content-container message body code code-image attachment attachments table row cell notice announcement image images entry-content formatted'.split(' '));
 const tokens=node=>[node.tagName.toLowerCase(),...[...node.classList].filter(c=>classes.has(c)).map(c=>'.'+c)];
 function propose({root,positives,negatives=[],base}){
  if(!positives.length||positives.length+negatives.length>20)return [];
  const choices=positives.map(node=>{
   const result=new Set(tokens(node));let parent=node.parentElement,depth=0,path=node.tagName.toLowerCase();
   while(parent&&parent!==root&&depth++<6){
    for(const token of tokens(parent))result.add(token+' '+node.tagName.toLowerCase());
    path=parent.tagName.toLowerCase()+' > '+path;result.add(path);parent=parent.parentElement;
   }
   return [...result].filter(s=>s.length<=256).slice(0,64);
  });
  const selectors=[...new Set(choices.flat())].slice(0,64),sets=selectors.map(s=>[s]);
  if(positives.length<=8)for(let i=0;i<Math.min(8,...choices.map(c=>c.length));i++)sets.push([...new Set(choices.map(c=>c[i]))]);
  const result=[],seen=new Set();
  for(const set of sets){
   const key=set.slice().sort().join(',');if(seen.has(key))continue;seen.add(key);
   if(!positives.every(n=>set.some(s=>n.matches(s)))||negatives.some(n=>set.some(s=>n.matches(s))))continue;
   result.push({...base,images:{selectors:set}});if(result.length>=64)break;
  }
  return result.sort((a,b)=>Number(b.images.selectors.some(s=>s.includes('.')))-Number(a.images.selectors.some(s=>s.includes('.')))||a.images.selectors.join().length-b.images.selectors.join().length);
 }
 function evaluate({root,positives=[],negatives=[],rule,source,course,isThread=false}){
  const reasons=[],nodes=new Set();
  for(const selector of rule.images.selectors)for(const n of root.querySelectorAll(selector))if(n.tagName==='IMG')nodes.add(n);
  if(source==='ed'&&isThread)for(const selector of rule.attachments?.selectors||[])for(const n of root.querySelectorAll(selector))if(n.tagName==='A')nodes.add(n);
  for(const node of [...nodes])if((rule.images.excludeSelectors||[]).some(s=>node.matches(s)))nodes.delete(node);
  if(negatives.some(n=>nodes.has(n)))reasons.push('builder-negative-match');
  if(!positives.length||positives.some(n=>!nodes.has(n)))reasons.push('builder-unmatched');
  const located=globalThis.__mamoSourceRules.locate({root,source,course,rules:[rule],mode:'community',collectTrace:true,isThread,includeNodes:true});
  const accepted=located.acceptedNodes;
  if(positives.some(n=>!accepted.includes(n)))reasons.push('builder-filtered');
  if(located.truncated||located.loading||accepted.length>20)reasons.push('builder-incomplete');
  return {eligible:reasons.length===0,reasons:[...new Set(reasons)],nodes:accepted,located};
 }
 globalThis.__mamoBuilderSelector=Object.freeze({propose,evaluate});
}
