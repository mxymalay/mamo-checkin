import {installerName,ocrEngine} from './platform.js';
const HOST='com.attendanceassistant.vision';
const connectionError=detail=>new Error('本地识别服务无法连接。请运行安装包中的“'+installerName+'”，然后重新加载马莫签到助手。'+(detail?'（'+detail+'）':''));

export async function localService({onProgress=async()=>{},timeoutMs=35000}={}){
  let port;
  try{port=chrome.runtime.connectNative(HOST);}catch(error){throw connectionError(error.message);}
  let pending=null,closed=false,queue=Promise.resolve(),failure=null;
  const report=async event=>{try{await onProgress(event);}catch{}};
  const onMessage=result=>{
    if(!pending)return;
    if(result?.ok)pending.resolve(result);
    else pending.reject(new Error(result?.error||'本地识别未返回有效结果'));
  };
  const onDisconnect=()=>{
    failure=connectionError(chrome.runtime.lastError?.message);
    closed=true;pending?.reject(failure);
  };
  port.onMessage.addListener(onMessage);port.onDisconnect.addListener(onDisconnect);
  const request=async payload=>{
    if(closed)throw failure||new Error('本地识别连接已关闭');
    let timer;
    try{
      return await new Promise((resolve,reject)=>{
        pending={resolve,reject};
        timer=setTimeout(()=>{failure=new Error('本地识别响应超时，已停止本次连接；原图由本机服务保存。');closed=true;reject(failure);port.disconnect();},payload.op==='ocr'?timeoutMs:Math.min(timeoutMs,10000));
        try{port.postMessage(payload);}catch(error){reject(connectionError(error.message));}
      });
    }finally{clearTimeout(timer);pending=null;}
  };
  return {call(payload){
    const job=queue.catch(()=>{}).then(async()=>{
      if(payload.op==='ocr')await report({message:'正在使用 本地识别（最多 30 秒）',service:{busy:true,stage:ocrEngine}});
      const started=Date.now();
      let result;
      try{result=await request(payload);}catch(error){if(payload.op==='ocr')await report({message:'图片识别失败：'+error.message,service:{busy:false,binaryReady:false,stage:'识别失败'}});throw error;}
      if(payload.op==='ping'&&!result.binaryReady)throw new Error('本地识别程序尚未就绪，请重新运行“'+installerName+'”。');
      if(payload.op==='ocr')await report({message:(result.cached?'复用 本地识别结果':'本地识别完成')+`（${((Date.now()-started)/1000).toFixed(2)} 秒）`,service:{busy:false,binaryReady:true,stage:ocrEngine},...(result.cached&&{increment:{cached:1}})});
      return result;
    });
    queue=job;return job;
  },async close(){
    if(!closed){closed=true;pending?.reject(new Error('本地识别连接已关闭'));port.disconnect();}
    port.onMessage.removeListener(onMessage);port.onDisconnect.removeListener(onDisconnect);
  }};
}
