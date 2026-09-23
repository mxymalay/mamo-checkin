import {modulesView} from './modules-view.js';
import {installModulesPage} from './modules-page.js';
export function installModulesHost({doc,pageTabs,request,translate,chrome,isWindows=false,onInstallCompanion=()=>{}}){
 const root=doc.createElement('section');root.id='module-page';root.className='modules-shell modules-page-content';root.hidden=true;
 doc.querySelector('main>footer').before(root);pageTabs.register('modules',root);
 let page=null,disposed=false;
 function back(){pageTabs.show('settings');doc.defaultView.history.replaceState(null,'','#settings');doc.querySelector('.module-entry-card .modules-link')?.focus({preventScroll:true});}
 async function open(key='recognition'){
  if(disposed)return;pageTabs.show('modules');
  if(!page){
   doc.defaultView.history.replaceState(null,'','#modules/'+(['recognition','library','matching','test','create/actual','create/practice'].includes(key)?key:'recognition'));
   root.innerHTML=modulesView;
   for(const node of root.querySelectorAll('*')){if(node.childNodes.length===1&&node.firstChild.nodeType===3&&node.textContent.startsWith('rules.')){node.dataset.i18nKey=node.textContent;node.textContent=translate(node.dataset.i18nKey);}if(node.getAttribute('aria-label')?.startsWith('rules.'))node.setAttribute('aria-label',translate(node.getAttribute('aria-label')));}
   page=installModulesPage({doc,request,translate,chrome,isWindows,embedded:true,onInstallCompanion:()=>{back();return onInstallCompanion();}});
   doc.querySelector('#back-settings').onclick=event=>{event.preventDefault();back();};
  }else page.show(key);
  await page.ready;
 }
 const onClick=event=>{const link=event.target.closest?.('.modules-link');if(!link)return;event.preventDefault();void open(link.dataset.moduleTarget||'recognition');};
 const onPage=event=>{if(event.detail.previous==='modules'&&event.detail.page!=='modules')void page?.cancel();};
 const onHash=()=>{const hash=doc.defaultView.location.hash;if(hash.startsWith('#modules'))void open(hash.split('/').slice(1).join('/')||'recognition');else if(hash==='#settings'&&!root.hidden)back();};
 doc.addEventListener('click',onClick);doc.addEventListener('mamo:pagechange',onPage);doc.defaultView.addEventListener('hashchange',onHash);onHash();
 return {open,async dispose(){disposed=true;doc.removeEventListener('click',onClick);doc.removeEventListener('mamo:pagechange',onPage);doc.defaultView.removeEventListener('hashchange',onHash);await page?.dispose();root.remove();}};
}
