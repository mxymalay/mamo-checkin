const MAX_IMAGE_BYTES=8*1024*1024;
const DOWNLOAD_BUDGET_MS=20000;

// Self-contained because Chrome serializes this same function into the source
// tab for the fallback. It reads response bytes; it never renders/re-encodes them.
async function readImage(url,timeoutMs,maxBytes,requirePage=false,deadline=0){
  let timer,controller,reader;
  const fail=(message,kind='validation')=>{const error=new Error(message);error.kind=kind;throw error;};
  const allowed=value=>{
    let u;try{u=new URL(value);}catch{fail('图片网址无效','source');}
    if(u.protocol!=='https:'||u.port||u.username||u.password||!(u.hostname==='mail.google.com'||u.hostname==='learning.monash.edu'||u.hostname.endsWith('.googleusercontent.com')))fail('图片来源不在许可范围','source');
    u.hash='';return u;
  };
  try{
    const initial=allowed(url);
    if(requirePage){
      if(document.location.origin!==initial.origin)fail('图片原页面已切换，无法在当前页面读取','page');
      const listed=Array.from(document.querySelectorAll('img')).some(img=>[img.currentSrc,img.src].filter(Boolean).some(value=>{
        try{const actual=new URL(value,document.location.href);actual.hash='';return actual.href===initial.href;}catch{return false;}
      }));
      if(!listed)fail('原页面中已找不到这张图片，请重新检查邮件或课程页面','page');
    }
    if(deadline)timeoutMs=Math.min(timeoutMs,deadline-Date.now());
    if(timeoutMs<=0)fail('图片读取超时（总计最多 20 秒），请稍后重试','timeout');
    controller=new AbortController();
    timer=setTimeout(()=>controller.abort(),timeoutMs);
    const response=await fetch(initial.href,{credentials:'include',redirect:'follow',signal:controller.signal});
    try{allowed(response.url);}catch{fail('图片跳转到未获许可的网站，可能需要重新登录 Gmail 或 Moodle','source');}
    if(!response.ok)fail(`图片下载失败（HTTP ${response.status}），请检查原页面登录和网络状态`,'http');
    const mimeType=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(!['image/png','image/jpeg'].includes(mimeType))fail(mimeType==='text/html'?'图片地址返回了 HTML 页面，请重新登录 Gmail 或 Moodle 后重试':'图片格式不是 PNG/JPEG，无法读取原图','format');
    if(Number(response.headers.get('content-length'))>maxBytes)fail('图片超过 8 MiB 大小限制','size');
    if(!response.body?.getReader)fail('图片响应没有可读取的内容','empty');
    reader=response.body.getReader();
    const chunks=[];let size=0;
    while(true){
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>maxBytes)fail('图片超过 8 MiB 大小限制','size');
      chunks.push(value);
    }
    if(!size)fail('图片内容为空，请重新检查原页面','empty');
    const bytes=new Uint8Array(size);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return {ok:true,imageBase64:btoa(binary),mimeType};
  }catch(error){
    if(reader)void reader.cancel().catch(()=>{});
    if(error.kind)return {ok:false,error:error.message,kind:error.kind};
    if(controller?.signal.aborted||error.name==='AbortError'||error.name==='TimeoutError')return {ok:false,error:'图片读取超时（总计最多 20 秒），请稍后重试',kind:'timeout'};
    return {ok:false,error:'图片网络请求未完成，请检查网络连接及原页面登录状态',kind:'network'};
  }finally{
    clearTimeout(timer);controller?.abort();
    try{reader?.releaseLock();}catch{}
  }
}

export async function getImage(url,tabId){
  const deadline=Date.now()+DOWNLOAD_BUDGET_MS;
  let timer;
  const attempt=async()=>{
    const direct=await readImage(url,Math.max(0,deadline-Date.now()),MAX_IMAGE_BYTES,false,deadline);
    if(direct.ok)return {imageBase64:direct.imageBase64,mimeType:direct.mimeType};
    let initial;try{initial=new URL(url);}catch{throw new Error(direct.error);}
    const pageHost=initial.hostname==='mail.google.com'||initial.hostname==='learning.monash.edu';
    const canFallback=pageHost&&Number.isInteger(tabId)&&tabId>=0&&globalThis.chrome?.scripting?.executeScript&&Date.now()<deadline&&!['source','size','timeout'].includes(direct.kind);
    if(!canFallback)throw new Error(direct.error);
    let results;
    try{
      results=await chrome.scripting.executeScript({target:{tabId},world:'ISOLATED',func:readImage,args:[url,Math.max(0,deadline-Date.now()),MAX_IMAGE_BYTES,true,deadline]});
    }catch{
      throw new Error(`${direct.error}；原页面读取也未完成，请确认该页面仍已登录并可访问图片`);
    }
    const fallback=results?.[0]?.result;
    if(!fallback?.ok)throw new Error(`${direct.error}；${fallback?.error||'原页面未返回图片，请重新检查邮件或课程页面'}`);
    return {imageBase64:fallback.imageBase64,mimeType:fallback.mimeType};
  };
  try{
    return await Promise.race([attempt(),new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error('图片读取超时（总计最多 20 秒），请稍后重试')),DOWNLOAD_BUDGET_MS);
    })]);
  }finally{clearTimeout(timer);}
}
