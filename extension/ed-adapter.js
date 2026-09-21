// Serialized into Chrome's isolated page world. Navigation is returned as data.
// Ed renders thread bodies without stable public class names, so extraction
// walks generic blocks the same way as the Moodle adapter; thread links use
// the stable /au/courses/{id}/discussion/{threadId} URL shape.
export function edAdapter(command,args={},doc=document){
  if(command!=='read')throw new Error('未知 Ed 操作');
  if(doc.location.pathname.startsWith('/login')||doc.querySelector('form input[type="password"]'))throw new Error('[LOGIN_REQUIRED] Ed 需要登录，请完成学校账号登录及验证后重试');
  if(doc.location.origin!=='https://edstem.org')throw new Error('Ed 需要重新登录');
  const text=el=>(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
  const courseId=doc.location.pathname.match(/^\/au\/courses\/(\d+)/)?.[1];
  if(!courseId)throw new Error('Ed 页面与配置课程不匹配');
  if(args.expectedCourseId&&courseId!==String(args.expectedCourseId))throw new Error('Ed 页面与配置课程不匹配');
  // A pasted Moodle course_id opens a different Ed course; the configured code
  // must appear in the page identity so a wrong id cannot be scanned silently.
  if(args.course&&!(new RegExp(`\\b${args.course}\\b`,'i')).test(`${text(doc.querySelector('h1'))} ${doc.title}`))throw new Error('Ed 页面与配置课程不匹配，请核对 Ed course_id（与 Moodle 的不同）');
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
  const root=main;
  const context=hasAttendance(text(root));
  const candidates=[...root.querySelectorAll('img')].filter(img=>visible(img)&&!img.closest('blockquote')&&!/avatar|logo|icon|emoji|reaction|favicon|badge|ytimg|teaching[-_ ]award/i.test(`${img.className} ${img.alt}`));
  const images=candidates.filter(img=>!img.naturalWidth||(img.naturalWidth>=60&&img.naturalHeight>=20&&img.naturalHeight<=4000&&(context||(img.naturalWidth/img.naturalHeight>=3&&img.naturalHeight<=350)))).map(img=>img.currentSrc||img.getAttribute('src')||img.getAttribute('data-src')).filter(Boolean).map(value=>{try{return new URL(value,doc.location.href).href;}catch{return null;}}).filter(url=>url&&(url.startsWith('https://cdn.edusercontent.com/')||/\.edusercontent\.com\//.test(url)));
  const textRows=rows(root);
  // Ed attachments keep a real file link even when the <img> is lazy or rendered
  // undersized; the anchor URL is a first-class OCR candidate (a one-row Workshop
  // table can vanish entirely whenever its thumbnail stays below the size gate).
  if(threadId){
   const known=new Set(images);
   for(const anchor of root.querySelectorAll("a[href*='edusercontent.com/files/']")){
    let abs;try{abs=new URL(anchor.getAttribute('href')||anchor.href||'',doc.location.href).href;}catch{continue;}
    if(!/^https:\/\/[^/]*edusercontent\.com\//.test(abs)||known.has(abs))continue;
    images.push(abs);known.add(abs);
   }
  }
  const sentAt=[...root.querySelectorAll('time[datetime]')].map(t=>t.getAttribute('datetime')).find(v=>v&&Number.isFinite(Date.parse(v)));
  const messages=[];
  const hasCodeRow=textRows.some(s=>/\b[A-Z0-9]{5}\b/.test(s)&&/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/.test(s));
  // Thread bodies qualify on attendance context alone; a course list page must
  // show actual code rows or images, so link labels never create empty work.
  const qualifies=threadId?(context||images.length||hasCodeRow):(images.length||hasCodeRow);
  if(qualifies){
    if(!args.sinceDate||!sentAt||sentAt.slice(0,10)>=args.sinceDate){
      messages.push({messageId:`ed:${args.course}:${threadId||courseId}:${sentAt||'page'}`,course:args.course,subject:threadId?text(root.querySelector('h1'))||args.course:args.course,sourceUrl:doc.location.href,sourceType:'ed',sentAt:sentAt||`${args.academicYear||new Date().getFullYear()}-01-01T00:00:00+08:00`,dateReferenceOnly:!sentAt,dateBasis:sentAt?'posted-at':'reference-year',textRows,images:[...new Set(images)]});
    }
  }
  const found=new Map();
  const labels=new Map();
  for(const el of main.querySelectorAll('a[href]')){
    if(!visible(el))continue;
    const href=el.getAttribute('href');if(!href)continue;
    let url;try{url=new URL(href,doc.location.href);}catch{continue;}
    const match=url.pathname.match(/^\/au\/courses\/(\d+)\/discussion\/(\d+)\/?$/);
    if(!match||match[1]!==courseId)continue;
    if(url.href.split('#')[0]===doc.location.href.split('#')[0])continue;
    const label=text(el);
    labels.set(url.href,label);
    const priority=hasAttendance(label)?500:/\bcode\b/i.test(label)?300:100;
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
  if(threadId&&!textRows.length&&!images.length)return {loading:true};
  return {messages,threadLinks:ordered,threads:ordered.map(url=>({url,label:labels.get(url)})),pageTitle:text(doc.querySelector('h1'))||args.course,skipped:0};
}
