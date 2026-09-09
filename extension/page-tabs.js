export function createPageTabs(doc=document){
 const panels={settings:doc.querySelector('#settings>.columns'),courses:doc.querySelector('.courses-card'),records:doc.querySelector('.records')};
 const nav=doc.createElement('nav');nav.className='page-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','助手页面');
 const names={settings:'设置',courses:'课程来源与课表',records:'签到记录'},buttons={};
 const show=key=>{if(!panels[key])return;for(const [id,panel] of Object.entries(panels)){panel.hidden=id!==key;buttons[id].setAttribute('aria-selected',String(id===key));buttons[id].tabIndex=id===key?0:-1;}doc.body.dataset.page=key;};
 for(const [key,panel] of Object.entries(panels)){
  panel.id||='page-'+key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-'+key);
  const button=doc.createElement('button');button.id='tab-'+key;button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);button.textContent=names[key];button.onclick=()=>show(key);buttons[key]=button;nav.append(button);
  button.onkeydown=event=>{const keys=Object.keys(panels),i=keys.indexOf(key);let next;if(event.key==='ArrowRight')next=(i+1)%keys.length;if(event.key==='ArrowLeft')next=(i+keys.length-1)%keys.length;if(event.key==='Home')next=0;if(event.key==='End')next=keys.length-1;if(next!=null){event.preventDefault();show(keys[next]);buttons[keys[next]].focus();}};
 }
 doc.querySelector('#settings').before(nav);show('settings');
 doc.querySelector('#settings').addEventListener('invalid',event=>{show(event.target.closest('.courses-card')?'courses':'settings');},true);
 return {show};
}
