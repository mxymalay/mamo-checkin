import {detectLanguage,translate} from './i18n.js';

export async function localizeNotification(options,chrome=globalThis.chrome){
 let choice='auto';
 try{choice=(await chrome?.storage?.local?.get('uiLanguage'))?.uiLanguage||'auto';}catch{}
 const locale=detectLanguage(choice==='auto'?chrome?.i18n?.getUILanguage?.()||'en':choice);
 return {...options,title:translate(options.title,locale),message:translate(options.message,locale)};
}
