// Runs only in the isolated world; DOM references never leave this registry.
export function installRulePicker({sessionId,expiresAt,labels={}},doc=document){
 globalThis.__mamoRulePicker?.dispose();
 const win=doc.defaultView,url=doc.location.href,roots=new Map(),nodes=new Map(),ids=new WeakMap(),marks=new Map();
 let phase='ready',selectedRoot=null,signature='',serial=0,host=null,outline=null,toolbar=null,index=0,observer=null,focusBefore=null;
 const src=n=>n.currentSrc||n.getAttribute(n.tagName==='A'?'href':'src')||n.getAttribute('data-src');
 const id=n=>{if(!ids.has(n))ids.set(n,'i'+(++serial));const key=ids.get(n);if(!nodes.has(key))nodes.set(key,{node:n,src:src(n)});return key;};
 const remove=()=>{host?.remove();host=null;outline=null;observer?.disconnect();observer=null;doc.removeEventListener('click',click,true);doc.removeEventListener('pointermove',move,true);doc.removeEventListener('keydown',key,true);win.removeEventListener('scroll',redraw,true);win.removeEventListener('resize',redraw);};
 const stop=value=>{phase=value;remove();if(focusBefore?.isConnected)focusBefore.focus?.({preventScroll:true});};
 const check=token=>{if(token!==sessionId)throw new Error('builder-session');if(Date.now()>=expiresAt)stop('expired');if(doc.location.href!==url)stop('invalidated');if(selectedRoot&&(!selectedRoot.root.isConnected||selectedRoot.root.innerHTML!==signature||[...marks.keys()].some(k=>{const value=nodes.get(k);return !value?.node.isConnected||!selectedRoot.root.contains(value.node)||src(value.node)!==value.src;})))stop('invalidated');};
 function candidates(entry){
  const rule={schemaVersion:1,id:'local.generated.selection',version:'1.0.0',name:{en:'Selection'},source:entry.source,courses:[entry.course],images:{selectors:['img']}};
  const found=globalThis.__mamoSourceRules.locate({root:entry.root,source:entry.source,course:entry.course,rules:[rule],mode:'community',isThread:entry.isThread,includeNodes:true});
  if(found.truncated)return [];
  return found.acceptedNodes.slice(0,200);
 }
 const all=()=>[...roots.values()].flatMap(entry=>candidates(entry).map(node=>({entry,node})));
 function draw(node){if(!outline||!node)return;const r=node.getBoundingClientRect();Object.assign(outline.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',display:'block'});}
 function redraw(){draw(all()[index]?.node);}
 function choose(value){selectedRoot=value.entry;signature=selectedRoot.root.innerHTML;marks.clear();marks.set(id(value.node),true);phase='selected';remove();doc.addEventListener('keydown',key,true);}
 function click(event){if(phase!=='picking'||host&&event.composedPath().includes(host))return;const value=all().find(v=>v.node===event.target);if(!value)return;event.preventDefault();event.stopImmediatePropagation();choose(value);}
 function move(event){const list=all(),at=list.findIndex(v=>v.node===event.target);if(at>=0){index=at;draw(list[at].node);}}
 function key(event){if(event.key==='Escape'){event.preventDefault();stop('cancelled');return;}if(phase!=='picking'||event.target?.matches?.('input,textarea,select,[contenteditable=true]'))return;
  const list=all();if(!list.length)return;
  if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(event.key)){event.preventDefault();index=(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+list.length)%list.length;list[index].node.scrollIntoView?.({block:'nearest'});draw(list[index].node);}
 }
 const hide=()=>stop('invalidated');win.addEventListener('pagehide',hide);win.addEventListener('hashchange',hide);win.addEventListener('popstate',hide);
 const timer=win.setTimeout(()=>stop('expired'),Math.max(0,Math.min(600000,expiresAt-Date.now())));
 function inspect({sessionId:token}){
  check(token);const images=selectedRoot?candidates(selectedRoot).map(n=>({imageId:id(n),url:new URL(src(n),url).href,width:n.naturalWidth||0,height:n.naturalHeight||0,marked:marks.has(id(n))?marks.get(id(n)):null})):[];
  return {phase,rootId:selectedRoot?.rootId,roots:[...roots.values()].map(r=>({rootId:r.rootId,course:r.course})),images,marks:[...marks].map(([imageId,include])=>({imageId,include}))};
 }
 globalThis.__mamoRulePicker={
  registerRoots({source,course,roots:items}){
   check(sessionId);if(selectedRoot&&(!items.some(item=>item.root===selectedRoot.root&&item.messageKey===selectedRoot.messageKey)||source!==selectedRoot.source||course!==selectedRoot.course))stop('invalidated');
   if(!roots.size)for(const item of items){if(!item.root)continue;const rootId='r'+roots.size;roots.set(rootId,{...item,rootId,source,course});}
   return {roots:[...roots.values()].map(r=>({rootId:r.rootId,course,imageCount:candidates(r).length}))};
  },
  begin({sessionId:token}){
   check(token);if(['invalidated','expired','cancelled'].includes(phase))throw new Error('builder-session');remove();phase='picking';focusBefore=doc.activeElement;
   host=doc.createElement('div');host.dataset.mamoPicker='';const shadow=host.attachShadow({mode:'closed'}),style=doc.createElement('style');
   style.textContent=':host{all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647}div{box-sizing:border-box}section{position:fixed;top:16px;left:50%;transform:translateX(-50%);max-width:90vw;background:#fff;color:#183744;border:1px solid #006dae;border-radius:8px;padding:12px;box-shadow:0 4px 20px #0002;pointer-events:auto;font:15px system-ui}button{margin-left:12px;padding:8px;border:1px solid #b8cad5;border-radius:4px;background:white;color:#006dae;font:inherit}.outline{position:fixed;border:3px solid #006dae;background:#006dae14;display:none;pointer-events:none}';
   toolbar=doc.createElement('section');toolbar.tabIndex=0;toolbar.setAttribute('role','region');toolbar.setAttribute('aria-label',labels.pick||'Select an image');toolbar.append(doc.createTextNode(labels.pick||'Select an image'));
   toolbar.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target===toolbar&&phase==='picking'){const value=all()[index];if(value){event.preventDefault();event.stopPropagation();choose(value);}}});
   const cancel=doc.createElement('button');cancel.type='button';cancel.textContent=labels.cancel||'Cancel';cancel.onclick=()=>stop('cancelled');toolbar.append(cancel);outline=doc.createElement('div');outline.className='outline';shadow.append(style,outline,toolbar);doc.documentElement.append(host);toolbar.focus();
   doc.addEventListener('click',click,true);doc.addEventListener('pointermove',move,true);doc.addEventListener('keydown',key,true);win.addEventListener('scroll',redraw,true);win.addEventListener('resize',redraw);redraw();
   observer=new win.MutationObserver(()=>{if(selectedRoot&&!selectedRoot.root.isConnected)stop('invalidated');});observer.observe(doc.body,{childList:true,subtree:true});return inspect({sessionId});
  },inspect,
  mark({sessionId:token,imageId,include}){check(token);const value=nodes.get(imageId);if(phase!=='selected'||!selectedRoot||!value||!selectedRoot.root.contains(value.node)||typeof include!=='boolean')throw new Error('builder-image');if(!marks.has(imageId)&&marks.size>=20)throw new Error('builder-budget');marks.set(imageId,include);return inspect({sessionId});},
  propose({sessionId:token,base}){check(token);if(phase!=='selected')throw new Error('builder-session');return globalThis.__mamoBuilderSelector.propose({root:selectedRoot.root,positives:[...marks].filter(([,yes])=>yes).map(([k])=>nodes.get(k).node),negatives:[...marks].filter(([,yes])=>!yes).map(([k])=>nodes.get(k).node),base});},
  evaluate({sessionId:token,rules}){check(token);if(phase!=='selected'||!Array.isArray(rules)||rules.length>64)throw new Error('builder-session');return rules.map(rule=>{const result=globalThis.__mamoBuilderSelector.evaluate({root:selectedRoot.root,positives:[...marks].filter(([,yes])=>yes).map(([k])=>nodes.get(k).node),negatives:[...marks].filter(([,yes])=>!yes).map(([k])=>nodes.get(k).node),rule,source:selectedRoot.source,course:selectedRoot.course,isThread:selectedRoot.isThread});return {eligible:result.eligible,reasons:result.reasons,images:result.nodes.map(n=>({imageId:id(n),url:new URL(src(n),url).href,width:n.naturalWidth||0,height:n.naturalHeight||0,marked:marks.has(id(n))?marks.get(id(n)):null}))};});},
  dispose(){stop('cancelled');win.clearTimeout(timer);win.removeEventListener('pagehide',hide);win.removeEventListener('hashchange',hide);win.removeEventListener('popstate',hide);roots.clear();nodes.clear();marks.clear();selectedRoot=null;}
 };
 return {ready:true};
}
