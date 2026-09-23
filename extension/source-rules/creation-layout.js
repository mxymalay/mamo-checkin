// Shared layout primitives; each creator keeps its own workflow and state.
export function creationLayout(el){
 const group=(kind,nodes,extra='')=>{const node=el('div',undefined,`creation-${kind} ${extra}`.trim());node.append(...nodes);return node;};
 return {
  steps:(node,{labels,current,completed,busy=false,locked=false,action='practiceAction',onSelect})=>{
   node.classList.add('practice-steps');node.style.setProperty('--creation-steps',String(labels.length));node.replaceChildren();
   labels.forEach((label,index)=>{const item=el('li'),button=el('button'),number=el('span',String(index+1),'practice-step-number');number.setAttribute('aria-hidden','true');button.append(number,el('span',label,'practice-step-label'));button.type='button';button.dataset[action]='step-'+(index+1);button.setAttribute('aria-label',`${index+1}. ${label}`);button.disabled=busy||locked||index>completed;item.dataset.future=String(index>completed);item.dataset.complete=String(index<completed);if(current===index+1)button.setAttribute('aria-current','step');button.onclick=()=>onSelect(index+1);item.append(button);node.append(item);});
  },
  toolbar:(...nodes)=>group('toolbar',nodes),
  fields:(nodes,kind='context')=>group('fields',nodes,`creation-${kind}-fields`),
  actions:(...nodes)=>group('actions',nodes),
  recognition:(...nodes)=>group('ocr-row',nodes),
  confirmation:(checkbox,label,tooltip)=>{const text=el('label');text.append(checkbox,el('span',label));return group('confirmation',[text,tooltip]);}
 };
}
