export function showManualCode({doc=document,record,translate=s=>s,save}){
 const dialog=doc.createElement('dialog');dialog.className='manual-code-dialog';
 const title=doc.createElement('h2');title.textContent=translate('手动补充签到码');title.id='manual-code-title';dialog.setAttribute('aria-labelledby',title.id);
 const details=doc.createElement('p');details.textContent=[record.course,record.date,record.time,record.type,record.group].join(' · ');
 const form=doc.createElement('form'),label=doc.createElement('label');label.textContent=translate('签到码');
 const input=doc.createElement('input');input.required=true;input.maxLength=5;input.pattern='[A-Za-z0-9]{5}';input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-label',translate('签到码'));label.append(input);
 const error=doc.createElement('p');error.setAttribute('role','alert');error.className='manual-code-error';
 const actions=doc.createElement('div');actions.className='result-actions';
 const cancel=doc.createElement('button');cancel.type='button';cancel.textContent=translate('取消');cancel.onclick=()=>dialog.close();
 const submit=doc.createElement('button');submit.type='submit';submit.className='primary';submit.textContent=translate('保存并重试');actions.append(cancel,submit);
 form.append(label,error,actions);dialog.append(title,details,form);doc.body.append(dialog);
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(submit.disabled)return;submit.disabled=true;input.disabled=true;cancel.disabled=true;
  try{await save(input.value);dialog.close();}catch(e){error.textContent=translate(e.message);submit.disabled=false;input.disabled=false;cancel.disabled=false;}
 });
 dialog.showModal();input.focus();return dialog;
}
