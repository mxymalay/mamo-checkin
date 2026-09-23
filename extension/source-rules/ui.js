export function ruleUI(root,translate){
 const doc=root.ownerDocument;
 const el=(tag,text,className)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
 const t=key=>translate(key.startsWith('rules.')?key:'rules.'+key)||key;
 const button=(key,action)=>{const node=el('button',t(key),'subtle');node.type='button';node.dataset.ruleAction=action||key;return node;};
 let helpIndex=0;
 const help=(key,trigger)=>{const wrap=el('span',undefined,'help-wrap'),b=trigger||el('button','?','help-button'),tip=el('span',t(key),'tooltip');b.type='button';if(trigger){const icon=el('span','?','help-icon');icon.setAttribute('aria-hidden','true');b.append(icon);}else b.setAttribute('aria-label',t(key));tip.id=`${root.id}-help-${helpIndex++}`;b.setAttribute('aria-describedby',tip.id);tip.setAttribute('role','tooltip');wrap.append(b,tip);
  const place=()=>{const box=b.getBoundingClientRect(),view=doc.defaultView;tip.style.left=Math.max(10,Math.min(box.left,view.innerWidth-tip.offsetWidth-10))+'px';tip.style.top=Math.max(10,Math.min(box.bottom+8,view.innerHeight-tip.offsetHeight-10))+'px';wrap.dataset.tipReady='true';};
  const hide=()=>{delete wrap.dataset.tipReady;};
  wrap.addEventListener('mouseenter',place);wrap.addEventListener('focusin',place);
  wrap.addEventListener('mouseleave',()=>{if(!wrap.contains(doc.activeElement))hide();});wrap.addEventListener('focusout',hide);return wrap;};
 const field=(key,node)=>{const label=el('label',t(key));label.append(node);return label;};
 const options=(node,values,current)=>{node.replaceChildren();for(const [value,text] of values){const option=el('option',text);option.value=value;node.append(option);}if(values.some(([value])=>value===current))node.value=current;};
 const name=rule=>{const lang=doc.documentElement.lang;return rule.name?.[/TW|Hant|HK/i.test(lang)?'zh_TW':/^zh/i.test(lang)?'zh_CN':'en']||rule.name?.en||rule.id;};
 const nameNode=(rule,tag='span',suffix='')=>{
  const node=el(tag,name(rule)+suffix);node.dataset.ruleLiteral='';node.dataset.ruleName='';
  node.dataset.nameEn=rule.name?.en||rule.id;node.dataset.nameZh=rule.name?.zh_CN||node.dataset.nameEn;node.dataset.nameTw=rule.name?.zh_TW||node.dataset.nameEn;node.dataset.nameSuffix=suffix;
  return node;
 };
 return {doc,el,t,button,help,field,options,name,nameNode};
}
