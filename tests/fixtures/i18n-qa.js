import {installLanguageUI,translate} from '/extension/i18n.js';
import {installModulesHost} from '/extension/modules-host.js';
import {createPageTabs} from '/extension/page-tabs.js';
import {installPersonalSettingsMenu} from '/extension/personal-settings-menu.js';
import {request as practiceRequest} from './practice-wizard-qa.js';
const html=await (await fetch('/extension/options.html')).text(),parsed=new DOMParser().parseFromString(html,'text/html');
for(const script of parsed.querySelectorAll('script'))script.remove();
for(const node of parsed.querySelectorAll('link[href],img[src]')){const key=node.hasAttribute('src')?'src':'href';node.setAttribute(key,new URL(node.getAttribute(key),location.origin+'/extension/').href);}
document.head.innerHTML=parsed.head.innerHTML;
document.body.innerHTML=parsed.body.innerHTML;
const builtins=await Promise.all(['gmail','moodle','ed'].map(async source=>(await fetch(`/extension/source-rules/builtin/${source}.json`)).json()));
const catalog=(await(await fetch('/extension/source-rules/catalog.json')).json()).rules;
const rules=catalog.map(({path,sha256,demo,...rule})=>({...rule,origin:'community',key:'community:'+rule.id}));
const state={builtins,rules,settings:{devMode:true,courses:['FIT5122'],sourceModes:{FIT5122:'email'}},status:{}};
const host=installModulesHost({doc:document,pageTabs:createPageTabs(document),translate,request:async payload=>{
 if(payload.type.startsWith('practice')){const result=await practiceRequest(payload);if(payload.type==='practiceSummary')result.matching={...result.matching,rules:[...result.matching.rules,...rules]};return result;}
 return payload.type==='health'?{fallback:true}:state;
}});
const open=host.open('library');
installLanguageUI(document);
installPersonalSettingsMenu(document);
await open;
document.body.dataset.ready='true';
