import {installSourceRuleRuntime} from '../runtime.js';
import {installBuilderSelectorEngine} from '../builder/selector-generator.js';
import {installRulePicker} from '../builder/picker.js';
import {practiceAssetId,validatePracticeSourceUrl} from './assets.js';

const copy={
 en:{loading:'Loading sample materials...',ready:'Sample page ready',ended:'This practice session has ended. Return to creation to start again.',back:'Return to creation'},
 'zh-CN':{loading:'正在加载示例课程...',ready:'示例页面已准备好',ended:'本次练习已结束。请返回创建页面重新开始。',back:'返回创建'},
 'zh-TW':{loading:'正在載入範例課程...',ready:'範例頁面已準備好',ended:'本次練習已結束。請返回建立頁面重新開始。',back:'返回建立'}
};
export async function installPracticeCourse({doc=document,chrome=globalThis.chrome}){
 const url=new URL(doc.location.href),origin=`chrome-extension://${chrome.runtime.id}`,sessionId=url.searchParams.get('session');
 validatePracticeSourceUrl(url.href,{extensionOrigin:origin,sessionId});
 const language=doc.defaultView.navigator.language||'en';let text=copy[/^zh/i.test(language)?(/TW|HK|Hant/i.test(language)?'zh-TW':'zh-CN'):'en'];
 const status=doc.querySelector('#session-status'),back=doc.querySelector('#return-to-creation'),root=doc.querySelector('#course-material');
 status.textContent=text.loading;back.textContent=text.back;let channel,registered=false,ended=false,lastRevision=0,expiryTimer,heartbeat;
 const toggles=[...root.querySelectorAll('.activity-toggle')];
 const toggle=event=>{const button=event.currentTarget,panel=doc.getElementById(button.getAttribute('aria-controls')),open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));panel.hidden=!open;button.lastElementChild.textContent=open?'−':'+';};
 toggles.forEach(button=>button.addEventListener('click',toggle));
 function end(){if(ended)return;ended=true;registered=false;clearTimeout(expiryTimer);clearInterval(heartbeat);globalThis.__mamoRulePicker?.dispose();status.dataset.state='ended';status.textContent=text.ended;back.disabled=false;}
 const returnToOwner=async()=>{
  if(registered&&!ended){try{channel.postMessage({type:'return',sessionId});return;}catch{end();}}
  back.disabled=true;
  try{
   const tabs=await chrome.tabs.query({}),existing=tabs.find(tab=>tab.url?.split('#')[0]===origin+'/options.html');
   const target=origin+'/options.html#modules/create/practice';
   if(existing)await chrome.tabs.update(existing.id,{active:true,url:target});else await chrome.tabs.create({url:target,active:true});
  }catch{status.textContent=text.ended;}finally{back.disabled=false;}
 };back.addEventListener('click',returnToOwner);
 const receive=message=>{
  if(ended||message?.sessionId!==sessionId)return;
  if(message.type==='ended'){end();return;}
  if(message.type==='registered'&&!registered&&typeof message.documentId==='string'&&Number.isFinite(message.expiresAt)){
   if(Object.hasOwn(copy,message.language)){text=copy[message.language];doc.documentElement.lang=message.language;back.textContent=text.back;}
   registered=true;installSourceRuleRuntime({},{extensionOrigin:origin,sessionId,documentId:message.documentId});installBuilderSelectorEngine();
   status.dataset.state='ready';status.textContent=text.ready;back.disabled=false;expiryTimer=setTimeout(end,Math.max(0,Math.min(600000,message.expiresAt-Date.now())));
   // An idle MV3 port alone does not keep the coordinator's in-memory session alive.
   heartbeat=setInterval(()=>{try{channel.postMessage({type:'heartbeat',sessionId});}catch{end();}},20000);heartbeat.unref?.();return;
  }
  if(!registered||message.type!=='command'||typeof message.requestId!=='string'||message.requestId.length>128||!Number.isSafeInteger(message.revision)||message.revision<=lastRevision)return;
  lastRevision=message.revision;let result,error;
  try{
   if(!['begin','inspect','mark','propose','evaluate','dispose'].includes(message.method))throw new Error('builder-command');
   if(message.method==='begin'&&message.args?.initialize){
    const context=message.args.context;installRulePicker({sessionId:context.sessionId,expiresAt:context.expiresAt,labels:context.labels},doc);
    result=globalThis.__mamoRulePicker.registerRoots({source:'moodle',course:'DEMO1000',roots:[{root,messageKey:'practice-course-material'}]});
   }else if(message.method==='dispose'){globalThis.__mamoRulePicker?.dispose();result={ok:true};}
   else{if(!globalThis.__mamoRulePicker)throw new Error('builder-session');result=globalThis.__mamoRulePicker[message.method](message.args||{});}
  }catch(caught){error=/^builder-[a-z-]+$/.test(caught.message)?caught.message:'builder-source-error';}
  channel.postMessage({type:'reply',sessionId,requestId:message.requestId,revision:message.revision,...(error?{error}:{result})});
 };
 const dispose=()=>{end();toggles.forEach(button=>button.removeEventListener('click',toggle));back.removeEventListener('click',returnToOwner);doc.defaultView.removeEventListener('pagehide',dispose);channel?.onMessage.removeListener(receive);channel?.onDisconnect.removeListener(end);try{channel?.disconnect();}catch{}};
 doc.defaultView.addEventListener('pagehide',dispose);
 try{
  await Promise.all([...root.querySelectorAll('img')].map(async image=>{practiceAssetId(image.src,origin);await image.decode();}));
  if(!ended){channel=chrome.runtime.connect({name:'rule-practice-source'});channel.onMessage.addListener(receive);channel.onDisconnect.addListener(end);channel.postMessage({type:'ready',role:'source',sessionId});}
 }catch{end();}
 return {dispose};
}
if(globalThis.chrome?.runtime?.id&&globalThis.document)void installPracticeCourse({}).catch(()=>{
 const status=document.querySelector('#session-status');if(status){status.dataset.state='ended';status.textContent='Practice source unavailable';}
});
