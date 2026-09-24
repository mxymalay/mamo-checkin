const active=new WeakMap();

export function preserveGuidePosition(anchor,update){
 const win=anchor.ownerDocument.defaultView;
 const before=anchor.getBoundingClientRect();
 update();
 if(!before.height)return;
 // Compensate for newly revealed cards before the browser paints the frame.
 const delta=anchor.getBoundingClientRect().top-before.top;
 if(Math.abs(delta)>=1)win.scrollTo({top:win.scrollY+delta,behavior:'instant'});
}

export function scrollGuideTarget(node){
 if(!node)return;
 const doc=node.ownerDocument,win=doc.defaultView;
 active.get(win)?.();
 if(!win.requestAnimationFrame||win.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
  node.scrollIntoView?.({block:'center',behavior:'instant'});return;
 }
 const start=win.scrollY,rect=node.getBoundingClientRect();
 const limit=Math.max(0,doc.documentElement.scrollHeight-win.innerHeight);
 const end=Math.max(0,Math.min(limit,start+rect.top+rect.height/2-win.innerHeight/2));
 if(Math.abs(end-start)<1)return;
 let frame,started;
 const cancel=()=>{win.cancelAnimationFrame(frame);for(const event of ['wheel','touchstart','keydown'])win.removeEventListener(event,cancel);active.delete(win);};
 const tick=time=>{
  started??=time;
  const progress=Math.min(1,(time-started)/1000);
  const eased=progress<.5?4*progress**3:1-(-2*progress+2)**3/2;
  win.scrollTo({top:start+(end-start)*eased,behavior:'instant'});
  if(progress<1)frame=win.requestAnimationFrame(tick);else cancel();
 };
 active.set(win,cancel);
 for(const event of ['wheel','touchstart','keydown'])win.addEventListener(event,cancel,{passive:true});
 frame=win.requestAnimationFrame(tick);
}
