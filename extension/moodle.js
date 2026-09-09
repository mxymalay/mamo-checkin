// Serialized into Chrome's isolated page world. Navigation is returned as data.
export function moodleAdapter(command,args={},doc=document){
  if(command!=='read')throw new Error('未知 Moodle 操作');
  if(doc.location.pathname.startsWith('/login/')||doc.querySelector('form input[type="password"],#okta-sign-in'))throw new Error('[LOGIN_REQUIRED] Moodle 需要登录，请完成学校账号登录及验证后重试');
  if(doc.location.origin!=='https://learning.monash.edu')throw new Error('Moodle 需要重新登录');
  const text=el=>(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
  const identity=doc.querySelector('.usermenu [role="img"][title]')?.getAttribute('title')||doc.querySelector('.usermenu img[alt]')?.getAttribute('alt');
  if(identity!==args.name)throw new Error('Moodle 登录账号无法确认，请登录配置的学校账号');
  const main=doc.querySelector('[role="main"],main');if(!main)return {loading:true};
  const courseContext=[...doc.querySelectorAll('[aria-label="Breadcrumb"] a,h1')].map(text).join(' ');
  if(!new RegExp(`\\b${args.course}\\b`,'i').test(courseContext))throw new Error('Moodle 页面与配置课程不匹配');
  const years=courseContext.match(/\b20\d{2}\b/g)||[];
  if(years.length&&!years.includes(String(args.academicYear)))throw new Error('Moodle 课程年份与设置不符');
  const visible=el=>{for(let p=el;p&&p!==main;p=p.parentElement)if(p.hidden||p.getAttribute('aria-hidden')==='true'||doc.defaultView.getComputedStyle(p).display==='none')return false;return true;};
  const hasAttendance=s=>/attendance|签到|簽到/i.test(s);
  const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  function weekWindow(root,outerOnly=false){
    const ranges=[];
    for(const h of root.querySelectorAll('h2,h3,h4,.sectionname')){
      if(outerOnly&&h.closest('li.section,section[data-sectionid]'))continue;
      const m=text(h).match(/^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\w*\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{2}|20\d{2})\s*[-–—]\s*(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\w*\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{2}|20\d{2})$/i);
      if(!m)continue;
      const date=(day,month,year)=>{const y=+year<100?2000+(+year):+year,mo=months.indexOf(month.slice(0,3).toLowerCase());if(mo<0||y!==args.academicYear)return null;const d=new Date(Date.UTC(y,mo,+day));return d.getUTCDate()===+day&&d.getUTCMonth()===mo?d.toISOString().slice(0,10):null;};
      const from=date(m[1],m[2],m[3]),to=date(m[4],m[5],m[6]);
      if(from&&to&&to>=from&&Date.parse(to)-Date.parse(from)<=7*86400000)ranges.push({from,to});
    }
    const unique=[...new Map(ranges.map(r=>[r.from+'|'+r.to,r])).values()];return unique.length===1?unique[0]:null;
  }
  function rows(root){
    const cellText=node=>{if(node.nodeType===3)return node.textContent||'';if(node.nodeType!==1||!visible(node)||node.matches('blockquote,script,style'))return '';if(node.tagName==='BR')return ' ';return [...node.childNodes].map(cellText).join('');};
    const result=[...root.querySelectorAll('tr')].filter(row=>visible(row)&&!row.closest('blockquote')).map(row=>[...row.children].filter(c=>c.matches('th,td')).map(cellText).join(' ').replace(/\s+/g,' ').trim()).filter(Boolean);
    let plain='';
    function walk(node){
      if(node.nodeType===3){plain+=node.textContent;return;}
      if(node.nodeType!==1||!visible(node)||node.matches('table,blockquote,script,style,.userpicture,.activityiconcontainer'))return;
      const block=/^(P|DIV|LI|SECTION|BR|H[1-6])$/.test(node.tagName);if(block)plain+='\n';
      for(const child of node.childNodes)walk(child);if(block)plain+='\n';
    }
    walk(root);result.push(...plain.split(/\n+/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean));return [...new Set(result)];
  }
  const posts=[...main.querySelectorAll('article[data-post-id]')];
  const sections=[...main.querySelectorAll('li.section,section[data-sectionid]')].filter(s=>!s.parentElement.closest('li.section,section[data-sectionid]'));
  const roots=posts.length?posts.filter(p=>p.querySelector('.starter')).map(p=>({root:p.querySelector('.post-content-container'),post:p})): (sections.length?sections:[main]).map(root=>({root,post:null}));
  const pageWindow=weekWindow(main,sections.length>0),messages=[];let skipped=0;
  for(const {root,post} of roots){
    if(!root)continue;
    const range=post?null:weekWindow(root)||pageWindow;
    if(args.sinceDate&&range?.to<args.sinceDate){skipped++;continue;}
    const context=hasAttendance(text(root));
    const candidates=[...root.querySelectorAll('img')].filter(img=>visible(img)&&!img.closest('blockquote,.userpicture,.activityiconcontainer')&&!/avatar|logo|icon|emoji/i.test(`${img.className} ${img.alt}`));
    // A short, wide image can be the whole attendance table, with no caption.
    const images=candidates.filter(img=>!img.naturalWidth||(img.naturalWidth>=60&&img.naturalHeight>=20&&img.naturalHeight<=4000&&(context||(img.naturalWidth/img.naturalHeight>=3&&img.naturalHeight<=350)))).map(img=>img.currentSrc||img.getAttribute('src')||img.getAttribute('data-src')).filter(Boolean).map(value=>new URL(value,doc.location.href).href).filter(url=>url.startsWith('https://learning.monash.edu/'));
    const textRows=rows(root);
    if(!context&&!images.length&&!textRows.some(s=>/\b[A-Z0-9]{5}\b/.test(s)&&/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/.test(s)))continue;
    const sentAt=post?.querySelector('time[datetime]')?.getAttribute('datetime');
    const reliableDate=sentAt&&Number.isFinite(Date.parse(sentAt)),dateWindow=post?null:weekWindow(root)||pageWindow;
    messages.push({messageId:`moodle:${args.course}:${post?.getAttribute('data-post-id')||doc.location.href+':'+(root.id||'main')}`,course:args.course,subject:text(post?.querySelector('h3')||root.querySelector('h3')||doc.querySelector('h1'))||args.course,sourceUrl:doc.location.href,sourceType:'moodle',sentAt:reliableDate?sentAt:dateWindow?dateWindow.to+'T23:59:00+08:00':`${args.academicYear}-01-01T00:00:00+08:00`,dateReferenceOnly:!reliableDate&&!dateWindow,dateWindow,dateBasis:reliableDate?'posted-at':dateWindow?'week-range':'reference-year',textRows,images:[...new Set(images)]});
  }
  const safePaths=['/course/view.php','/mod/forum/view.php','/mod/forum/discuss.php','/mod/page/view.php'];
  const currentCourse=new URL(doc.location.href).pathname==='/course/view.php'?new URL(doc.location.href).searchParams.get('id'):null;
  const found=new Map();
  const currentLink=el=>/current/i.test(`${el.className} ${text(el)}`)||el.getAttribute('aria-current')==='page';
  const currentWeek=Number([...main.querySelectorAll('a[href],[onclick]')].find(el=>visible(el)&&currentLink(el)&&/week\s*\d+/i.test(text(el)))?.textContent.match(/week\s*(\d+)/i)?.[1]||0);
  for(const el of main.querySelectorAll('a[href],[onclick]')){
    if(!visible(el))continue;
    const label=text(el);if(!/attendance|签到|簽到|announcements?|week\s*\d+|current week|this week|^learning$|^forums$/i.test(label))continue;
    // Only read the known literal URL pattern; never execute page-provided code.
    const href=el.getAttribute('href')||el.getAttribute('onclick')?.match(/^\s*(?:window\.)?location\.href\s*=\s*(['"])(.*?)\1;?\s*$/)?.[2];
    if(!href)continue;let url;try{url=new URL(href,doc.location.href);}catch{continue;}
    if(url.origin!==doc.location.origin||!safePaths.includes(url.pathname))continue;
    if([...url.searchParams.keys()].some(k=>!['id','d','section','page'].includes(k)))continue;
    if(url.pathname==='/course/view.php'&&currentCourse&&url.searchParams.get('id')!==currentCourse)continue;
    url.hash='';if(url.href===doc.location.href.split('#')[0])continue;
    const week=Number(label.match(/week\s*(\d+)/i)?.[1]||0),isCurrent=currentLink(el);
    if(args.sinceDate&&currentWeek&&week&&(week<currentWeek-1||week>currentWeek)){skipped++;continue;}
    const enclosingRange=weekWindow(el.closest('li.section,section[data-sectionid]')||el);
    if(args.sinceDate&&enclosingRange?.to<args.sinceDate){skipped++;continue;}
    const priority=isCurrent?1000:hasAttendance(label)?500:week?100+week:0;
    if(!found.has(url.href)||found.get(url.href)<priority)found.set(url.href,priority);
  }
  const ordered=[...found].sort((a,b)=>b[1]-a[1]);
  return {messages,pageTitle:text(doc.querySelector('h1')),skipped,links:ordered.map(([url])=>url),priorityLinks:ordered.filter(([,priority])=>priority>=500).map(([url])=>url)};
}
