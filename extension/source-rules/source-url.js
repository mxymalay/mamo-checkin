export function validateTestSourceUrl(value,{source,course,settings}){
 if(!String(value||'').trim())return undefined;
 let url;try{url=new URL(value);}catch{throw new Error('invalid-source-url');}
 if(url.protocol!=='https:'||url.username||url.password||url.port)throw new Error('invalid-source-url');
 const valid=source==='gmail'?url.hostname==='mail.google.com'&&/^\/mail\/u\/\d+\/$/.test(url.pathname)&&!url.search&&/^#(?:all|inbox)\/[A-Za-z0-9_-]{1,128}$/.test(url.hash):
 source==='ed'?url.hostname==='edstem.org'&&(settings.edUrls?.[course]||[]).some(root=>url.pathname===new URL(root).pathname||new RegExp('^'+new URL(root).pathname+'/discussion/\\d+/?$').test(url.pathname))&&!url.search&&!url.hash:
 source==='moodle'?url.hostname==='learning.monash.edu'&&['/course/view.php','/mod/forum/view.php','/mod/forum/discuss.php','/mod/page/view.php'].includes(url.pathname)&&[...url.searchParams].every(([k,v])=>['id','d','section','page'].includes(k)&&/^\d+$/.test(v))&&(url.pathname!=='/course/view.php'||(settings.moodleUrls?.[course]||[]).some(root=>new URL(root).searchParams.get('id')===url.searchParams.get('id'))):false;
 if(!valid)throw new Error('invalid-source-url');return url.href;
}
