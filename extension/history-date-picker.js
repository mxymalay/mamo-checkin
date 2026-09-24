const iso=date=>date.toISOString().slice(0,10);
const parse=value=>new Date(value+'T12:00:00Z');
export function installHistoryDates({host,translate,now=()=>new Date()}){
 const doc=host.ownerDocument,fields=['from','to'].map(key=>host.querySelector('#history-'+key));
 const triggers=['from','to'].map(key=>host.querySelector('[data-date="'+key+'"]'));
 const panel=doc.createElement('div');panel.className='history-calendar';panel.id=(host.id||'history')+'-calendar';panel.hidden=true;panel.dataset.i18nLiteral='';
 panel.innerHTML='<div class="calendar-navigation"><button type="button" data-month-step="-1">‹</button><select class="calendar-month"></select><select class="calendar-year"></select><button type="button" data-month-step="1">›</button></div><div class="calendar-weekdays"></div><div class="calendar-days"></div>';
 host.querySelector('.history-range').after(panel);
 const month=panel.querySelector('.calendar-month'),year=panel.querySelector('.calendar-year'),days=panel.querySelector('.calendar-days');
 const today=()=>{const date=now();return new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate(),12));};
 let active=0,view=today(),focusDate='';
 const locale=()=>doc.documentElement.lang||'en';
 function labels(){fields.forEach((field,i)=>{triggers[i].textContent=field.value?new Intl.DateTimeFormat(locale(),{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(parse(field.value)):translate('选择日期');triggers[i].removeAttribute('aria-labelledby');triggers[i].setAttribute('aria-label',translate(i?'结束日期':'开始日期')+' '+triggers[i].textContent);});}
 function render(){
  labels();month.setAttribute('aria-label',translate('月份'));year.setAttribute('aria-label',translate('年份'));
  panel.querySelector('[data-month-step="-1"]').title=translate('上个月');panel.querySelector('[data-month-step="1"]').title=translate('下个月');
  panel.querySelectorAll('[data-month-step]').forEach(button=>button.setAttribute('aria-label',button.title));
  month.replaceChildren(...Array.from({length:12},(_,i)=>{const option=doc.createElement('option');option.value=i;option.textContent=new Intl.DateTimeFormat(locale(),{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,i,1)));return option;}));month.value=view.getUTCMonth();
  year.replaceChildren(...Array.from({length:101},(_,i)=>{const option=doc.createElement('option');option.value=option.textContent=String(2000+i);return option;}));year.value=view.getUTCFullYear();
  panel.querySelector('.calendar-weekdays').replaceChildren(...Array.from({length:7},(_,i)=>{const label=doc.createElement('span');label.textContent=new Intl.DateTimeFormat(locale(),{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2026,8,7+i)));return label;}));
  const first=new Date(Date.UTC(view.getUTCFullYear(),view.getUTCMonth(),1,12)),offset=(first.getUTCDay()+6)%7;
  days.replaceChildren(...Array.from({length:42},(_,i)=>{
   const date=new Date(first);date.setUTCDate(i-offset+1);const value=iso(date),button=doc.createElement('button');button.type='button';button.textContent=date.getUTCDate();button.dataset.day=value;
   button.classList.toggle('outside-month',date.getUTCMonth()!==view.getUTCMonth());button.classList.toggle('in-range',Boolean(fields[0].value&&fields[1].value&&value>=fields[0].value&&value<=fields[1].value));
   button.setAttribute('aria-label',new Intl.DateTimeFormat(locale(),{dateStyle:'full',timeZone:'UTC'}).format(date));button.setAttribute('aria-pressed',String(value===fields[active].value));button.tabIndex=value===(focusDate||fields[active].value||iso(first))?0:-1;
   button.onclick=()=>{fields[active].value=value;fields[active].dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));close();labels();};return button;
  }));
 }
 function close(){panel.hidden=true;triggers.forEach(button=>button.setAttribute('aria-expanded','false'));triggers[active].focus();}
 triggers.forEach((button,i)=>{button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');button.onclick=()=>{if(!panel.hidden&&active===i){close();return;}active=i;view=parse(fields[i].value||iso(today()));focusDate=fields[i].value||iso(view);panel.hidden=false;triggers.forEach((b,j)=>b.setAttribute('aria-expanded',String(j===i)));render();days.querySelector('[tabindex="0"]')?.focus();};});
 panel.querySelectorAll('[data-month-step]').forEach(button=>button.onclick=()=>{view=new Date(Date.UTC(view.getUTCFullYear(),view.getUTCMonth()+Number(button.dataset.monthStep),1,12));focusDate=iso(view);render();});
 month.onchange=year.onchange=()=>{view=new Date(Date.UTC(Number(year.value),Number(month.value),1,12));focusDate=iso(view);render();};
 panel.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
  if(!event.target.dataset.day)return;
  const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];if(!offset)return;
  event.preventDefault();const next=parse(event.target.dataset.day);next.setUTCDate(next.getUTCDate()+offset);view=next;focusDate=iso(next);render();days.querySelector('[data-day="'+focusDate+'"]')?.focus();
 });
 function preset(count){const current=now(),end=new Date(Date.UTC(current.getFullYear(),current.getMonth(),current.getDate(),12)),start=new Date(end);start.setUTCDate(start.getUTCDate()-count+1);fields[0].value=iso(start);fields[1].value=iso(end);fields[0].dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));panel.hidden=true;triggers.forEach(b=>b.setAttribute('aria-expanded','false'));labels();}
 host.querySelectorAll('[data-days]').forEach(button=>button.onclick=()=>preset(Number(button.dataset.days)));
 const observer=new doc.defaultView.MutationObserver(()=>render());observer.observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
 doc.defaultView.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
 host.addEventListener('input',labels);render();
 return {refresh:labels,preset};
}
