// Serialized into Chrome's isolated page world. Navigation is returned as data.
// Ed renders thread bodies without stable public class names, so extraction
// walks generic blocks the same way as the Moodle adapter; thread links use
// the stable /au/courses/{id}/discussion/{threadId} URL shape.
export function edAdapter(command,args={},doc=document){
  if(!['read','builderDescribe'].includes(command))throw new Error('未知 Ed 操作');
  if(doc.location.pathname.startsWith('/login')||doc.querySelector('form input[type="password"]'))throw new Error('[LOGIN_REQUIRED] Ed 需要登录，请完成学校账号登录及验证后重试');
  if(doc.location.origin!=='https://edstem.org')throw new Error('Ed 需要重新登录');
  const text=el=>(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
  const courseId=doc.location.pathname.match(/^\/au\/courses\/(\d+)/)?.[1];
  if(!courseId)throw new Error('Ed 页面与配置课程不匹配');
  if(args.expectedCourseId&&courseId!==String(args.expectedCourseId))throw new Error('Ed 页面与配置课程不匹配');
  // A pasted Moodle course_id opens a different Ed course; the configured code
  // must appear in the page identity so a wrong id cannot be scanned silently.
  if(args.course&&!(new RegExp(`\\b${args.course}\\b`,'i')).test(`${text(doc.querySelector('h1'))} ${doc.title}`))throw new Error('Ed 页面与配置课程不匹配，请核对 Ed course_id（与 Moodle 的不同）');
  // Course access alone cannot prove which account is active for rule authoring.
  if(command==='builderDescribe')throw new Error('builder-identity-unverified');
  const main=doc.querySelector('[role="main"],main');if(!main)return {loading:true};
  const visible=el=>{for(let p=el;p&&p!==main;p=p.parentElement){if(p.hidden||p.getAttribute('aria-hidden')==='true'||doc.defaultView.getComputedStyle(p).display==='none')return false;}return true;};
  const hasAttendance=s=>/attendance|签到|簽到/i.test(s);
  const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  function rows(root){
    const cellText=node=>{if(node.nodeType===3)return node.textContent||'';if(node.nodeType!==1||!visible(node)||node.matches('blockquote,script,style'))return '';if(node.tagName==='BR')return ' ';return [...node.childNodes].map(cellText).join('');};
    const result=[...root.querySelectorAll('tr')].filter(row=>visible(row)&&!row.closest('blockquote')).map(row=>[...row.children].filter(c=>c.matches('th,td')).map(cellText).join(' ').replace(/\s+/g,' ').trim()).filter(Boolean);
    let plain='';
    function walk(node){
      if(node.nodeType===3){plain+=node.textContent;return;}
      if(node.nodeType!==1||!visible(node)||node.matches('table,blockquote,script,style,button,svg,.user-picture'))return;
      const block=/^(P|DIV|LI|SECTION|ARTICLE|H[1-6])$/.test(node.tagName);if(block)plain+='\n';
      for(const child of node.childNodes)walk(child);if(block)plain+='\n';
    }
    walk(root);result.push(...plain.split(/\n+/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean));return [...new Set(result)];
  }
  const threadId=doc.location.pathname.match(/\/discussion\/(\d+)/)?.[1];
  if(!globalThis.__mamoSourceRules)throw new Error('Source rule runtime unavailable');
  const selection=args.sourceRules?.courses?.[args.course]?.ed;
  // Multiple posts must not borrow the first post's timestamp. Use disjoint
  // timestamp subtrees; ambiguous shared content is left unassigned.
  const timestamps=[...main.querySelectorAll('time[datetime]')].filter(visible);
  const roots=timestamps.length<2?[main]:[...new Set(timestamps.map(time=>{
    let root=time.parentElement;
    if(root.querySelectorAll('time[datetime]').length!==1)return null;
    while(root.parentElement&&root.parentElement!==main&&root.parentElement.querySelectorAll('time[datetime]').length===1)root=root.parentElement;
    return root;
  }).filter(Boolean))];
  const messages=[];
  for(const [postIndex,root] of roots.entries()){
  const context=hasAttendance(text(root));
  const located=globalThis.__mamoSourceRules.locate({root,source:'ed',course:args.course,rules:selection?[selection.builtin,selection.community].flat().filter(Boolean):undefined,mode:args.ruleMode||'combined',contextText:text(root),collectTrace:Boolean(args.ruleTrace),isThread:Boolean(threadId)});
  const images=located.images.map(i=>i.url);
  const textRows=rows(root);
  // Ed attachments keep a real file link even when the <img> is lazy or rendered
  // undersized; the anchor URL is a first-class OCR candidate (a one-row Workshop
  // table can vanish entirely whenever its thumbnail stays below the size gate).
  const sentAt=[...root.querySelectorAll('time[datetime]')].map(t=>t.getAttribute('datetime')).find(v=>v&&Number.isFinite(Date.parse(v)));
  const hasCodeRow=textRows.some(s=>/\b[A-Z0-9]{5}\b/.test(s)&&/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/.test(s));
  // Thread bodies qualify on attendance context alone; a course list page must
  // show actual code rows or images, so link labels never create empty work.
  const qualifies=threadId?(context||images.length||hasCodeRow):(images.length||hasCodeRow);
  if(qualifies||args.ruleTrace){
    if(args.testDateRange||!args.sinceDate||!sentAt||sentAt.slice(0,10)>=args.sinceDate){
      messages.push({messageId:`ed:${args.course}:${threadId||courseId}:${sentAt||'page'}${roots.length>1?':'+(root.getAttribute('data-post-id')||root.id||postIndex):''}`,course:args.course,subject:threadId?text(root.querySelector('h1'))||args.course:args.course,sourceUrl:doc.location.href,sourceType:'ed',sentAt:sentAt||`${args.academicYear||new Date().getFullYear()}-01-01T00:00:00+08:00`,dateReferenceOnly:!sentAt,dateBasis:sentAt?'posted-at':'reference-year',textRows,images:[...new Set(images)],imageEvidence:located.images,ruleTrace:located.trace,ruleTruncated:located.truncated});
    }
  }
  }
  // A thread heading can sit outside an individual timestamp subtree.
  if(threadId)for(const message of messages)message.weekContext=[...main.querySelectorAll('h1')].filter(visible).map(text);
  const found=new Map();
  const labels=new Map();
  const hints=args.ruleMode==='builtin'?[]:[selection?.community].flat().flatMap(rule=>rule?.keywords?.navigation||[]).filter(word=>typeof word==='string');
  const hintScore=label=>hints.some(w=>label.toLowerCase().includes(w.toLowerCase()))?40:0;
  for(const el of main.querySelectorAll('a[href]')){
    if(!visible(el))continue;
    const href=el.getAttribute('href');if(!href)continue;
    let url;try{url=new URL(href,doc.location.href);}catch{continue;}
    const match=url.pathname.match(/^\/au\/courses\/(\d+)\/discussion\/(\d+)\/?$/);
    if(url.origin!==doc.location.origin||!match||match[1]!==courseId)continue;
    if(url.href.split('#')[0]===doc.location.href.split('#')[0])continue;
    const label=text(el);
    labels.set(url.href,label);
    const priority=(hasAttendance(label)?500:/\bcode\b/i.test(label)?300:100)+hintScore(label);
    if(!found.has(url.href)||found.get(url.href)<priority)found.set(url.href,priority);
  }
  const ordered=[...found].sort((a,b)=>b[1]-a[1]).map(([url])=>url);
  // Ed renders only ~30 recent threads and hides older weeks behind a
  // "Load more" button. Click it once per poll and ask the caller to re-read;
  // the counter caps the expansion so a huge course cannot loop forever.
  const clicks=Number(doc.documentElement.dataset.edExpanded||0);
  const loadMore=[...doc.querySelectorAll('button,[role="button"],a')].find(el=>/^(?:加载更多|load more)/i.test((el.textContent||'').trim()));
  if(loadMore&&clicks<12){
    // One click per poll: each poll re-reads the grown list until the button
    // disappears (fully expanded) or the cap is hit.
    doc.documentElement.dataset.edExpanded=String(clicks+1);
    loadMore.click();
    return {loading:true,threadLinks:ordered,pageTitle:text(doc.querySelector('h1'))||args.course,skipped:0};
  }
  if(threadId&&!text(main)&&!main.querySelector('img'))return {loading:true};
  return {messages,threadLinks:ordered,threads:ordered.map(url=>({url,label:labels.get(url),navigationPriority:hintScore(labels.get(url))})),pageTitle:text(doc.querySelector('h1'))||args.course,skipped:0};
}
