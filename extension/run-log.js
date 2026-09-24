function topic(event){
 const message=event.message||'',url=event.context?.sourceUrl||'';
 if(/登录|身份|账号/.test(message))return '检查登录与身份';
 if(/提交|重试签到/.test(message)&&!/不会提交|未提交|不提交/.test(message))return '提交与确认签到';
 if(/本轮.*(?:完成|结束)|回查完成|回查结束/.test(message))return '本轮结果';
 if(/暂停|恢复|预读取完成|无需恢复/.test(message))return '协调来源检测';
 if(/图片|OCR|识别缓存|补扫/.test(message))return '识别图片与读取缓存';
 if(/Gmail|邮件|会话/.test(message))return '查找 Gmail 邮件';
 if(/Moodle/.test(message))return '查找 Moodle 内容';
 if(/\bEd\b|讨论帖/.test(message))return '查找 Ed 帖子';
 if(/Attendance|网站.*签到|网站.*场次|核对.*签到记录|课表计划/.test(message))return '读取 Attendance 场次';
 if(/mail\.google\.com/.test(url))return '查找 Gmail 邮件';
 if(/learning\.monash\.edu/.test(url))return '查找 Moodle 内容';
 if(/edstem\.org/.test(url))return '查找 Ed 帖子';
 if(/attendance\.monash/.test(url))return '读取 Attendance 场次';
 return '运行准备与进度';
}

export function logSessionLabels(event){
 const sessions=event.sessions?.length?event.sessions:[event.context||{}];
 return [...new Set(sessions.filter(s=>s.date||s.time).map(s=>[s.course,s.date,s.time,s.type,s.group].filter(Boolean).join(' · ')))];
}

export function groupRunLog(events=[],translate=value=>value){
 const groups=[];
 for(const event of events){
  const title=[translate(topic(event)),event.context?.course].filter(Boolean).join(' · ');
  if(groups.at(-1)?.title!==title)groups.push({title,events:[]});
  groups.at(-1).events.push(event);
 }
 return groups;
}

export function renderRunLog(root,events=[],translate=value=>value){
 const doc=root.ownerDocument,scroll=root.scrollTop;
 root.replaceChildren();
 for(const group of groupRunLog(events,translate)){
  const divider=doc.createElement('li');divider.className='run-log-divider';divider.textContent=group.title;root.append(divider);
  for(const event of group.events){
   const li=doc.createElement('li'),time=doc.createElement('time');time.textContent=event.at?new Date(event.at).toLocaleTimeString(doc.documentElement.lang||'zh-CN',{hour12:false}):'—';
   li.append(time,doc.createTextNode(translate(event.message||'运行状态已更新')));
   if(['error','warning'].includes(event.level))li.classList.add(event.level);
   if(event.context?.subject){const subject=doc.createElement('div');subject.className='run-log-subject';subject.textContent=event.context.subject;li.append(subject);}
   for(const label of logSessionLabels(event)){const session=doc.createElement('div');session.className='run-log-session';session.textContent=label;li.append(session);}
   if(/^https:\/\//.test(event.context?.sourceUrl||'')){const link=doc.createElement('a');link.href=event.context.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent=translate('查看来源');li.append(link);}
   root.append(li);
  }
 }
 if(!events.length){const li=doc.createElement('li');li.textContent=translate('暂无运行明细');root.append(li);}
 root.scrollTop=scroll;
}
