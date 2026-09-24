// Self-contained: Chrome serializes this function into its isolated page world.
export function gmailAdapter(command,args={},doc=document) {
  if(doc.location.hostname==='accounts.google.com'||doc.querySelector('form input[name="identifier"],form input[type="password"],#okta-sign-in'))throw new Error('[LOGIN_REQUIRED] Gmail 需要登录，请完成学校账号登录及验证后重试');
  const text=el=>(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
  const accounts=Array.from(doc.querySelectorAll('[aria-label],[data-tooltip],[title],img[alt]')).filter(el=>{
   for(let p=el;p;p=p.parentElement)if(p.hidden||p.getAttribute('aria-hidden')==='true'||doc.defaultView.getComputedStyle(p).display==='none'||doc.defaultView.getComputedStyle(p).visibility==='hidden')return false;
   const labels=[el.getAttribute('aria-label'),el.getAttribute('data-tooltip'),el.getAttribute('title'),el.getAttribute('alt')].filter(Boolean).join(' ');
   return !el.closest('main,[role="main"],[role="dialog"]')&&(/Google\s*(?:Account|帐号|账号|帐户|账户|帳號|帳戶)\s*[:：]/i.test(labels)||/@student\.monash\.edu\b/i.test(labels));
 });
  const emails=[...new Set(accounts.flatMap(el=>[el.getAttribute('aria-label'),el.getAttribute('data-tooltip'),el.getAttribute('title'),el.getAttribute('alt')].filter(Boolean).flatMap(label=>label.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[])).map(s=>s.toLowerCase()))];
  const email=emails.length===1?emails[0]:null;
  if(!email)throw new Error('[LOGIN_REQUIRED] Gmail 当前登录账号无法唯一确认，请打开目标邮箱后重试；未读取邮件');
  if(command==='identity')return {email,url:doc.location.href};
  if(email!==args.email?.trim().toLowerCase()) throw new Error(`[LOGIN_REQUIRED] Gmail 当前账号是 ${email}，目标账号是 ${args.email||'未设置'}。请切换到目标邮箱后重试；未读取邮件`);
  const main=doc.querySelector('[role="main"],main');
  if(!main) return {loading:true};
  const visible=el=>{for(let p=el;p&&p!==main;p=p.parentElement){if(p.hidden||p.getAttribute('aria-hidden')==='true'||doc.defaultView.getComputedStyle(p).display==='none') return false;}return true;};
  const senderAllowed=(sender,course)=>Boolean(sender&&(!args.senders?.[course]||sender===args.senders[course].trim().toLowerCase()));
  const courseFor=title=>{
    const matches=(args.courses||[]).filter(c=>String(title).toLowerCase().includes(String(args.subjectKeywords?.[c]||c).toLowerCase()));
    if(matches.length>1)throw new Error('多个课程规则同时匹配邮件主题，请修改课程关键词');
    return matches[0];
  };
  const olderButton=()=>[...doc.querySelectorAll('[role="button"],button')].find(el=>visible(el)&&['aria-label','data-tooltip','title'].some(key=>/^(Older|Next page|较早|較早|更早|下一页|下一頁)$/i.test((el.getAttribute(key)||'').trim().split(' (')[0])));
  if(command==='nextPage'){
    const button=olderButton();
    if(!button||button.disabled||button.getAttribute('aria-disabled')==='true')return {advanced:false};
    button.click();return {advanced:true};
  }
  if(command==='list') {
    if(main.matches('[aria-busy="true"]')||Array.from(main.querySelectorAll('[aria-busy="true"]')).some(visible))return {loading:true};
    if(!main.querySelector('[role="grid"]') && !/No messages matched/.test(text(main))) return {loading:true};
    // Gmail's default search ranking is "most relevant", which buries the newest
    // Week N announcement. Best-effort flip to "most recent", at most once per
    // page load; the caller's poll re-reads the settled list afterwards. Non-
    // English UIs never match the label and are left untouched.
    if(!doc.documentElement.dataset.mamoRankedFlipped && /most\s+relevant/i.test(text(main)) && !/most\s+recent/i.test(text(main))) {
      doc.documentElement.dataset.mamoRankedFlipped='1';
      try{
        const dropdown=[...doc.querySelectorAll("[role='button'],button,[aria-haspopup='menu']")].find(node=>/most\s+relevant/i.test(text(node)));
        if(dropdown){
          dropdown.click();
          const recent=[...doc.querySelectorAll("[role='menuitem'],[role='menuitemradio'],[role='option']")].find(node=>/most\s+recent/i.test(text(node)));
          if(recent){recent.click();return {loading:true};}
          dropdown.click();
        }
      }catch{}
    }
    const threads=[];
    for(const row of main.querySelectorAll('[role="row"],[role="grid"] tr')) {
      if(!visible(row)) continue;
      const item=row.matches('[data-legacy-thread-id]')?row:row.querySelector('[data-legacy-thread-id]');
      // Metadata can be on the row or separate from Gmail's subject span.
      const subject=text(row.querySelector('.bog')||item),course=courseFor(subject);
      const sender=row.querySelector('[email]')?.getAttribute('email')?.toLowerCase();
      if(!item||!course||!senderAllowed(sender,course)) continue;
      const id=item.getAttribute('data-legacy-thread-id');
      const words=args.ruleMode==='builtin'?[]:[args.sourceRules?.courses?.[course]?.gmail?.community].flat().flatMap(rule=>rule?.keywords?.navigation||[]).filter(word=>typeof word==='string');
      const navigationPriority=words.some(w=>subject.toLowerCase().includes(w.toLowerCase()))?40:0;
      const lastMessageId=item.getAttribute('data-legacy-last-message-id')||row.getAttribute('data-legacy-last-message-id')||row.querySelector('[data-legacy-last-message-id]')?.getAttribute('data-legacy-last-message-id')||null;
      if(!threads.some(t=>t.id===id)) threads.push({id,subject,course,sender,lastMessageId,navigationPriority});
    }
    const older=olderButton(),rows=[...main.querySelectorAll('[data-legacy-thread-id]')].filter(visible);
    return {email,threads,...(args.historyLookup?{pageSignature:rows.map(r=>r.getAttribute('data-legacy-thread-id')).join('|'),hasMore:older?!older.disabled&&older.getAttribute('aria-disabled')!=='true':null}: {})};
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
  if(command==='messages'||command==='builderDescribe') {
    // The thread list truncates long subjects, so the h2 on the conversation
    // page may differ from the list text; the last-message id and the course
    // carried over from the list row are the reliable identity signals.
    const subject=text(main.querySelector('h2'));
    let course;if(command==='builderDescribe'){course=courseFor(subject);if(course!==args.course)throw new Error('builder-course-mismatch');}
    else try{course=courseFor(subject)||args.threadCourse;}catch{course=args.threadCourse;}
    const messageNodes=Array.from(main.querySelectorAll('[data-legacy-message-id]'));
    if(args.expectedLastMessageId&&!messageNodes.some(msg=>msg.getAttribute('data-legacy-message-id')===args.expectedLastMessageId))return {loading:true,bodiesReady:false};
    if(!course||!messageNodes.length) return {loading:true,bodiesReady:false};
    if(command==='builderDescribe')return globalThis.__mamoRulePicker.registerRoots({source:'gmail',course,roots:messageNodes.filter(msg=>senderAllowed(msg.querySelector('[email]')?.getAttribute('email')?.toLowerCase(),course)).map(msg=>({root:msg.querySelector('.a3s'),messageKey:msg.getAttribute('data-legacy-message-id')})).filter(item=>item.root&&visible(item.root))});
    const allBodiesReadable=messageNodes.every(msg=>{
      const sender=msg.querySelector('[email]')?.getAttribute('email')?.toLowerCase();
      const body=msg.querySelector('.a3s');
      return Boolean(sender&&(!senderAllowed(sender,course)||(body&&visible(body))));
    });
    if(args.requireBodiesReady&&!allBodiesReadable)return {loading:true,bodiesReady:false};
    const messages=[];
    for(const msg of messageNodes) {
      const body=msg.querySelector('.a3s');
      const sender=msg.querySelector('[email]')?.getAttribute('email')?.toLowerCase();
      if(!body||!visible(body)||!senderAllowed(sender,course)) continue;
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
      if(!globalThis.__mamoSourceRules)throw new Error('Source rule runtime unavailable');
      const selection=args.sourceRules?.courses?.[course]?.gmail;
      const located=globalThis.__mamoSourceRules.locate({root:body,source:'gmail',course,rules:selection?[selection.builtin,selection.community].flat().filter(Boolean):undefined,mode:args.ruleMode||'combined',contextText:subject+' '+text(clone),collectTrace:Boolean(args.ruleTrace)});
      if(located.loading)return {loading:true,bodiesReady:false};
      const images=located.images.map(i=>i.url);
      if(!args.ruleTrace&&!attendanceContext&&!images.length&&!textRows.some(row=>/\b[A-Z0-9]{5}\b/.test(row)&&/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/.test(row)))continue;
      if(!images.length&&!textRows.length&&!args.ruleTrace) continue;
      const timestamp=msg.querySelector('.g3[title],.g3[aria-label],time[datetime],[data-tooltip*="202"],[data-tooltip*="20"]');
      const sentAtText=timestamp?.getAttribute('title')||timestamp?.getAttribute('aria-label')||timestamp?.getAttribute('datetime')||timestamp?.getAttribute('data-tooltip')||text(timestamp);
      messages.push({messageId:msg.getAttribute('data-legacy-message-id'),subject,course,sender,sentAtText,sourceUrl:doc.location.href,sourceType:'gmail',textRows,images,imageEvidence:located.images,ruleTrace:located.trace,ruleTruncated:located.truncated});
    }
    return {email,messages,bodiesReady:Boolean(args.requireBodiesReady&&allBodiesReadable)};
  }
  throw new Error('未知邮件操作');
}
