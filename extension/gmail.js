// Self-contained: Chrome serializes this function into its isolated page world.
export function gmailAdapter(command,args={},doc=document) {
  if(doc.location.hostname==='accounts.google.com'||doc.querySelector('form input[name="identifier"],form input[type="password"],#okta-sign-in'))throw new Error('[LOGIN_REQUIRED] Gmail 需要登录，请完成学校账号登录及验证后重试');
  const text=el=>(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
  const account=Array.from(doc.querySelectorAll('[aria-label]')).map(el=>el.getAttribute('aria-label')).find(s=>/Google Account:/.test(s));
  const email=account?.match(/\(([^()\s]+@[^()\s]+)\)/)?.[1]?.toLowerCase();
  if(email!==args.email?.toLowerCase()) throw new Error('Gmail 登录账号无法确认，请在 Chrome 登录配置的学校邮箱');
  const main=doc.querySelector('[role="main"],main');
  if(!main) return {loading:true};
  const visible=el=>{for(let p=el;p&&p!==main;p=p.parentElement){if(p.hidden||p.getAttribute('aria-hidden')==='true'||doc.defaultView.getComputedStyle(p).display==='none') return false;}return true;};
  const courseFor=title=>{
    const matches=(args.courses||[]).filter(c=>String(title).toLowerCase().includes(String(args.subjectKeywords?.[c]||c).toLowerCase()));
    if(matches.length>1)throw new Error('多个课程规则同时匹配邮件主题，请修改课程关键词');
    return matches[0];
  };
  if(command==='list') {
    if(!main.querySelector('[role="grid"]') && !/No messages matched/.test(text(main))) return {loading:true};
    const threads=[];
    for(const row of main.querySelectorAll('[role="row"]')) {
      if(!visible(row)) continue;
      const item=row.querySelector('[data-legacy-thread-id]');
      const subject=text(item),course=courseFor(subject);
      const sender=row.querySelector('[email]')?.getAttribute('email')?.toLowerCase();
      if(!item||!course||sender!==args.senders[course]) continue;
      const id=item.getAttribute('data-legacy-thread-id');
      if(!threads.some(t=>t.id===id)) threads.push({id,subject,course,sender,lastMessageId:item.getAttribute('data-legacy-last-message-id')});
    }
    return {email,threads};
  }
  if(command==='openThread') {
    const target=Array.from(main.querySelectorAll('[data-legacy-thread-id]')).find(el=>el.getAttribute('data-legacy-thread-id')===args.threadId && visible(el));
    const row=target?.closest('[role="row"]');
    if(!row) throw new Error('邮件列表已变化，请重新扫描');
    const link=row.querySelector('[role="link"]')||target;
    link.click(); return {opened:true};
  }
  if(command==='expand') {
    const button=main.querySelector('[aria-label="Expand all"], [data-tooltip="Expand all"]');
    if(button) button.click();
    return {expanded:Boolean(button)};
  }
  if(command==='messages') {
    const subject=text(main.querySelector('h2'));
    const course=courseFor(subject);
    if(args.expectedSubject&&subject!==args.expectedSubject)return {loading:true,bodiesReady:false};
    const messageNodes=Array.from(main.querySelectorAll('[data-legacy-message-id]'));
    if(args.expectedLastMessageId&&!messageNodes.some(msg=>msg.getAttribute('data-legacy-message-id')===args.expectedLastMessageId))return {loading:true,bodiesReady:false};
    if(!course||!messageNodes.length) return {loading:true,bodiesReady:false};
    const allBodiesReadable=messageNodes.every(msg=>{
      const sender=msg.querySelector('[email]')?.getAttribute('email')?.toLowerCase();
      const body=msg.querySelector('.a3s');
      return Boolean(sender&&(sender!==args.senders[course]||(body&&visible(body))));
    });
    if(args.requireBodiesReady&&!allBodiesReadable)return {loading:true,bodiesReady:false};
    const messages=[];
    for(const msg of messageNodes) {
      const body=msg.querySelector('.a3s');
      const sender=msg.querySelector('[email]')?.getAttribute('email')?.toLowerCase();
      if(!body||!visible(body)||sender!==args.senders[course]) continue;
      const clone=body.cloneNode(true);
      clone.querySelectorAll('.gmail_quote,blockquote,.gmail_signature').forEach(el=>el.remove());
      const attendanceContext=/attendance|签到/i.test(subject+' '+text(clone));
      const excluded=el=>Boolean(el.closest('.gmail_quote,blockquote,.gmail_signature,script,style'));
      const textRows=[];
      let current='';
      const flush=()=>{const value=current.replace(/\s+/g,' ').trim();if(value)textRows.push(value);current='';};
      const inlineText=node=>{
        if(node.nodeType===3)return node.textContent||'';
        if(node.nodeType!==1||excluded(node)||!visible(node))return '';
        if(node.tagName==='BR')return ' ';
        return Array.from(node.childNodes).map(inlineText).join('');
      };
      const readLines=node=>{
        if(node.nodeType===3){
          const parts=(node.textContent||'').split(/\r?\n/);
          for(const [index,part] of parts.entries()){if(index)flush();current+=part;}
          return;
        }
        if(node.nodeType!==1||excluded(node)||!visible(node))return;
        if(node.tagName==='BR'){flush();return;}
        if(node.tagName==='TR'){
          flush();
          const cells=Array.from(node.children).filter(cell=>cell.matches('th,td')).map(inlineText);
          current=cells.join(' ');flush();return;
        }
        const block=node.matches('div,p,li,section,ul,ol,table,pre,h1,h2,h3,h4,h5,h6');
        if(block)flush();
        // Parent list labels are not complete attendance rows; retain leaf items.
        const children=node.matches('li')&&node.querySelector('li')?Array.from(node.children).filter(child=>child.matches('ul,ol')):node.childNodes;
        for(const child of children)readLines(child);
        if(block)flush();
      };
      readLines(body);flush();
      const candidates=Array.from(body.querySelectorAll('img')).filter(img=>!img.closest('.gmail_quote,blockquote,.gmail_signature')&&visible(img)&&!/avatar|profile|emoji|icon/i.test(`${img.className||''} ${img.alt||''} ${img.getAttribute('aria-label')||''}`));
      if(candidates.some(img=>!img.complete && !img.naturalWidth)) return {loading:true,bodiesReady:false};
      const images=candidates.filter(img=>img.naturalWidth>=60 && img.naturalHeight>=20 && img.naturalHeight<=2000&&(attendanceContext||(img.naturalWidth/img.naturalHeight>=3&&img.naturalHeight<=350))).map(img=>img.currentSrc||img.src);
      if(!attendanceContext&&!images.length&&!textRows.some(row=>/\b[A-Z0-9]{5}\b/.test(row)&&/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/.test(row)))continue;
      if(!images.length&&!textRows.length) continue;
      messages.push({messageId:msg.getAttribute('data-legacy-message-id'),subject,course,sender,sentAtText:msg.querySelector('.g3[title]')?.getAttribute('title'),sourceUrl:doc.location.href,sourceType:'gmail',textRows,images});
    }
    return {email,messages,bodiesReady:Boolean(args.requireBodiesReady&&allBodiesReadable)};
  }
  throw new Error('未知邮件操作');
}
