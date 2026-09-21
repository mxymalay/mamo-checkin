let creating=null,clients=0,lifecycle=Promise.resolve();
function exclusive(task){const result=lifecycle.catch(()=>{}).then(task);lifecycle=result;return result;}
export async function localService({onProgress=async()=>{}}={}){
  const documentUrl=chrome.runtime.getURL('offscreen.html');
  async function ensure(){
    const existing=await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT'],documentUrls:[documentUrl]});
    if(existing.length)return;
    if(!creating)creating=chrome.offscreen.createDocument({url:'offscreen.html',reasons:['WORKERS','BLOBS'],justification:'离线识别签到图片并保存用户授权的本地归档'}).finally(()=>{creating=null;});
    await creating;
  }
  await exclusive(async()=>{await ensure();clients++;});
  const report=async(message,extra={})=>{try{await onProgress({message,...extra});}catch{}};
  const callOffscreen=async payload=>{
    let timer;const timeout=payload.op==='ocr'?130000:45000;
    try{
      const result=await Promise.race([chrome.runtime.sendMessage({target:'ocr-offscreen',...payload}).catch(cause=>{const error=new Error('识别服务连接中断：'+(cause?.message||String(cause)));error.resetRequired=true;throw error;}),new Promise((_,reject)=>{timer=setTimeout(()=>{const error=new Error(`${payload.op==='ocr'?'图片识别':'识别服务状态查询'}响应超时（${timeout/1000} 秒）`);error.resetRequired=true;reject(error);},timeout);})]);
      if(!result?.ok){const error=new Error(result?.error||'图片识别服务没有响应');error.resetRequired=Boolean(result?.resetRequired);throw error;}return result;
    }finally{clearTimeout(timer);}
  };
  const reset=()=>exclusive(async()=>{await chrome.offscreen.closeDocument().catch(()=>{});await ensure();});
  // A Chrome API call during a run keeps the service worker alive; no desktop
  // interaction is needed. Stop the timer at the end of the run.
  const heartbeat=setInterval(()=>{void chrome.runtime.getPlatformInfo();},20000);
  let closed=false;
  return {call:async payload=>{
    if(closed)throw new Error('识别服务已关闭');
    if(payload.op==='ping')return {...await callOffscreen(payload),engine:'browser-wasm',fallback:true};
    if(payload.op==='ocr'){
      // Browser mode keeps everything inside extension storage: no visible
      // downloads, no local file archive (that is the companion's job).
      const bytes=Uint8Array.from(atob(payload.imageBase64),c=>c.charCodeAt(0));
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
      // Force one fresh pass after the structural-field verification update;
      // otherwise the store build could reuse observations from older code.
      const ocrKey='ocr:row-rescue-v4:'+hash;
      const cached=(await chrome.storage.local.get(ocrKey))[ocrKey];
      if(Array.isArray(cached?.observations)){
        await report('相同图片已识别，复用结果',{increment:{cached:1}});
        return {ok:true,observations:cached.observations,diagnostics:cached.diagnostics,imageId:hash,cached:true};
      }
      let result;
      for(let attempt=0;attempt<2;attempt++){
        let checking=false,lastStage='',monitoring=true;
        await report(attempt?'正在重新识别图片（第 2 次，最多 130 秒）':'正在识别图片（最多 130 秒）');
        const monitor=setInterval(async()=>{
          if(checking)return;checking=true;
          try{const service=await callOffscreen({op:'ping'});if(monitoring&&service.stage!==lastStage){lastStage=service.stage;await report(service.stage,{service,detail:true});}}catch{}finally{checking=false;}
        },1000);
        try{result=await callOffscreen(payload);if(attempt)await report('识别服务已恢复，重试成功');break;}
        catch(error){
          monitoring=false;clearInterval(monitor);
          if(!error.resetRequired)throw error;
          if(attempt)throw new Error('图片识别重试后仍失败，后续图片继续检查：'+error.message);
          await report('图片识别失败，正在重启识别服务并重试一次：'+error.message,{level:'warn'});
          await reset();
        }finally{monitoring=false;clearInterval(monitor);}
      }
      // The cache contains geometry and original verification evidence, never
      // row/course/date metadata. Bound storage to the 120 most recent images.
      const index=(await chrome.storage.local.get('ocrCacheIndex')).ocrCacheIndex||[];
      const next=[...index.filter(key=>key!==ocrKey),ocrKey];
      const removed=next.splice(0,Math.max(0,next.length-120));
      await chrome.storage.local.set({[ocrKey]:{observations:result.observations,diagnostics:result.diagnostics},ocrCacheIndex:next});
      if(removed.length)await chrome.storage.local.remove(removed);
      return {...result,imageId:hash,cached:false};
    }
    if(payload.op==='archive')return {ok:true};
    throw new Error('未知本地归档操作');
  },close:async()=>{if(closed)return;closed=true;clearInterval(heartbeat);await exclusive(async()=>{clients--;if(clients===0)try{await callOffscreen({op:'release'});}finally{await chrome.offscreen.closeDocument();}});}};
}
