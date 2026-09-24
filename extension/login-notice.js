import {translate} from './i18n.js';

export function createLoginNotice(doc=document){
 const box=doc.createElement('aside');box.className='login-required-notice';box.hidden=true;box.setAttribute('role','alert');
 const title=doc.createElement('strong'),detail=doc.createElement('p'),button=doc.createElement('button');
 title.textContent=translate('需要完成网页登录');detail.textContent=translate('检测已暂停等待登录，不是系统故障。完成登录后会自动继续。');
 button.type='button';button.textContent=translate('前往登录');box.append(title,detail,button);
 let tabId;
 button.onclick=async()=>{
  try{
   const tab=await globalThis.chrome.tabs.update(tabId,{active:true});
   if(Number.isInteger(tab?.windowId))await globalThis.chrome.windows?.update(tab.windowId,{focused:true});
  }catch{detail.textContent=translate('登录页面已关闭，请重新发起检测。');detail.hidden=false;button.hidden=true;}
 };
 return {element:box,update(value){
  tabId=value?.loginTabId??value?.tabId;box.hidden=!value?.loginRequired;
  title.textContent=translate('需要网页登录');button.textContent=translate('前往登录');detail.hidden=true;
  button.hidden=!Number.isInteger(tabId);
  detail.textContent=translate('检测已暂停等待登录，不是系统故障。完成登录后会自动继续。');
 }};
}
