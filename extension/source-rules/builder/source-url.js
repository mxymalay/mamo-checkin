import {validateTestSourceUrl} from '../source-url.js';
// Unlike collector test URLs, this route is never navigated to by the builder.
export function validateBuilderSourceUrl(value,context){
 if(context.source!=='gmail')return validateTestSourceUrl(value,context);
 let url;try{url=new URL(value);}catch{throw new Error('builder-source');}
 if(url.protocol!=='https:'||url.hostname!=='mail.google.com'||url.port||url.username||url.password||url.search||!/^\/mail\/u\/\d+\/$/.test(url.pathname)||!/^#(?:all|inbox|sent|imp|starred|(?:label|search)\/[^/]+)\/[A-Za-z0-9_-]{1,128}$/.test(url.hash))throw new Error('builder-source');
 return url.href;
}
