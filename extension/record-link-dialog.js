export function showRecordLink({doc=document,source,candidates,translate=s=>s,save}){
 const dialog=doc.createElement('dialog'),title=doc.createElement('h2');title.id='record-link-title';title.textContent=translate('关联到已有场次');dialog.setAttribute('aria-labelledby',title.id);
 const context=doc.createElement('p');context.textContent=[source.course,source.rawText].filter(Boolean).join(' · ');context.style.overflowWrap='anywhere';
 const form=doc.createElement('form'),select=doc.createElement('select');select.required=true;select.setAttribute('aria-label',translate('选择对应场次'));select.style.width='100%';
 const placeholder=doc.createElement('option');placeholder.value='';placeholder.textContent=translate('选择对应场次');select.append(placeholder);
 for(const r of candidates){const option=doc.createElement('option');option.value=r.id;option.textContent=[r.course,r.date,r.time,r.type,r.group,r.code].filter(Boolean).join(' · ');select.append(option);}
 const error=doc.createElement('p');error.setAttribute('role','alert');
 const useLabel=doc.createElement('label');useLabel.className='toggle';useLabel.style.marginTop='20px';
 const useCode=doc.createElement('input');useCode.type='checkbox';useCode.name='use-code';
 const useText=doc.createElement('span');useText.textContent=translate('使用此签到码补全目标场次');useLabel.append(useText,useCode);
 const hint=doc.createElement('p');hint.className='muted';hint.textContent=translate('请核对日期、时间、类型和组别。补全后仅保存为待提交，下一次运行仍核对学校网站；演示记录不会提交。');
 select.onchange=()=>{const target=candidates.find(r=>r.id===select.value);useLabel.hidden=!source.code||!target||Boolean(target.code)||!['waiting_code','review'].includes(target.status)||Boolean(target.attemptedAt);useCode.checked=false;};select.onchange();
 const actions=doc.createElement('div');actions.className='result-actions';const cancel=doc.createElement('button');cancel.type='button';cancel.textContent=translate('取消');cancel.onclick=()=>dialog.close();
 const submit=doc.createElement('button');submit.type='submit';submit.textContent=translate('确认关联');submit.disabled=!candidates.length;actions.append(cancel,submit);
 if(!candidates.length)error.textContent=translate('没有可关联的匹配场次');
 form.append(select,useLabel,hint,error,actions);dialog.append(title,context,form);doc.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 form.onsubmit=async event=>{event.preventDefault();if(submit.disabled||!select.value)return;submit.disabled=true;try{await save(select.value,!useLabel.hidden&&useCode.checked);dialog.close();}catch(e){error.textContent=translate(e.message);submit.disabled=false;}};
 dialog.showModal();return dialog;
}
