const states={working:'处理中',complete:'处理完成',review:'需要核对',failed:'处理失败',partial:'部分处理',empty:'未提取到签到码',skipped:'已跳过'};
function safeUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}

export function renderRunDetails(root,status={},metric,translate=value=>value){
 const signature=JSON.stringify([status.items,status.itemsTruncated,status.events,status.counts,status.running,metric,root.ownerDocument.documentElement.lang]);
 if(root._detailsSignature===signature)return;
 root._detailsSignature=signature;
 const expanded=root.querySelector('details')?.open,scroll=root.scrollTop,doc=root.ownerDocument;
 const el=(tag,text,className)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
 const link=(parent,url,label)=>{const href=safeUrl(url);if(!href)return;const a=el('a',translate(label));a.href=href;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);};
 const items=(status.items||[]).filter(item=>metric==='cached'?item.kind==='images'&&item.cached:item.kind===metric);
 root.replaceChildren();
 root.append(el('p',`${translate('本轮计数')} ${status.counts?.[metric]||0} · ${translate('已保留明细')} ${items.length}`,'metric-summary'));
 if(status.itemsTruncated)root.append(el('p',translate('仅保留最近 500 项明细，计数包含更早项目'),'metric-meta'));
 if(!items.length)root.append(el('p',translate(status.running?'明细尚未生成':'该次运行未保存此类明细，可重新检查'),'metric-empty'));
 const list=el('div',undefined,'metric-items');root.append(list);
 for(const item of items){
  const row=el('article',undefined,'metric-item'),body=el('div',undefined,'metric-item-body');
  if((metric==='images'||metric==='cached')&&safeUrl(item.imageUrl)){
   const preview=el('a',undefined,'metric-preview');preview.href=safeUrl(item.imageUrl);preview.target='_blank';preview.rel='noopener noreferrer';
   const img=el('img');img.alt=translate('来源图片');img.loading='lazy';img.referrerPolicy='no-referrer';img.src=preview.href;
   img.addEventListener('error',()=>{preview.textContent=translate('预览不可用，查看原图');});preview.append(img);row.append(preview);
  }
  const head=el('div',undefined,'metric-item-heading');head.append(el('strong',[item.course,item.title||safeUrl(item.sourceUrl)&&new URL(item.sourceUrl).hostname].filter(Boolean).join(' · ')||translate('来源未记录')));
  const badge=el('span',translate(states[item.state]||'状态未记录'),'metric-state');badge.dataset.state=item.state||'';head.append(badge);body.append(head);
  const meta=[item.sourceType,item.sentAt,item.position?`${translate('图片')} ${item.position}`:null,item.quantity>1?`${translate('数量')} ${item.quantity}`:null,item.cached?translate('复用识别缓存'):null].filter(Boolean);
  if(meta.length)body.append(el('p',meta.join(' · '),'metric-meta'));
  if(item.reason)body.append(el('p',translate(item.reason),'metric-reason'));
  if(item.records?.length){
   const results=el('ul',undefined,'metric-results');
   for(const record of item.records){const result=el('li');result.append(el('code',record.code||translate('未找到签到码')),el('span',[record.date,record.time,record.type,record.group].filter(Boolean).join(' · ')));if(record.status==='review')result.append(el('span',translate(record.reason||'需要核对'),'metric-reason'));results.append(result);}
   body.append(results);
  }
  link(body,item.sourceUrl,'查看来源');row.append(body);list.append(row);
 }
 const events=(status.events||[]).filter(event=>event.metrics?.includes(metric));
 if(events.length){const details=el('details',undefined,'metric-technical');details.open=Boolean(expanded);details.append(el('summary',translate('查看技术详情')));for(const event of events){const p=el('p',`${event.at?new Date(event.at).toLocaleTimeString(doc.documentElement.lang||'zh-CN'):''} ${translate(event.message||'')}`);link(p,event.context?.sourceUrl,'查看来源');details.append(p);}root.append(details);}
 root.scrollTop=scroll;
}
