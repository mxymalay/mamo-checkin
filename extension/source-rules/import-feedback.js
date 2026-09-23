import {createRuleDialog} from './dialog.js';
import {ruleError} from './strings.js';

export function showRuleToast(root,message,{duration=2400}={}){
 root.querySelector('.rule-toast')?.remove();
 const toast=root.ownerDocument.createElement('div');toast.className='rule-toast';toast.setAttribute('role','status');toast.textContent=message;root.append(toast);
 const timer=setTimeout(()=>toast.remove(),duration);
 return ()=>{clearTimeout(timer);toast.remove();};
}

export function showImportError({doc,translate,trigger,filename,text='',error}){
 const t=key=>translate('rules.'+key),modal=createRuleDialog({doc,translate,trigger,title:t('import-error-title'),dismissOnOutside:true});
 const code=error?.code||String(error?.message||'').split(':')[0],path=error?.path||String(error?.message||'').match(/\$[.\w\[\]-]*/)?.[0]||'$';
 let id;try{id=JSON.parse(text)?.id;}catch{}
 const fields=[...(filename?[[t('import-file'),filename]]:[]),[t('import-field'),path]];
 if(id!==undefined)fields.splice(1,0,['ID',typeof id==='string'?id:JSON.stringify(id)]);
 for(const [label,value] of fields){const p=doc.createElement('p'),strong=doc.createElement('strong'),literal=doc.createElement('span');strong.textContent=label;const text=String(value);literal.textContent=text.length>256?text.slice(0,256)+'…':text;literal.dataset.ruleLiteral='';p.append(strong,doc.createTextNode(': '),literal);modal.body.append(p);}
 const reason=doc.createElement('p');reason.className='rule-error';const known=t('import-'+code);reason.textContent=known&&known!=='rules.import-'+code?known:ruleError(error,translate);modal.body.append(reason);
 if(code.startsWith('id-')){const example=doc.createElement('p');example.textContent=t('import-id-example');modal.body.append(example);}
 modal.show();return modal;
}
