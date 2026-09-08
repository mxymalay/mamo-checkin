import {recognizeTable} from './ocr-engine.js';
import {createOcrController} from './ocr-controller.js';
const urls=new Set();
const engine=createOcrController({createWorker:async progress=>Tesseract.createWorker('eng',1,{workerPath:chrome.runtime.getURL('vendor/worker.min.js'),langPath:chrome.runtime.getURL('vendor'),corePath:chrome.runtime.getURL('vendor'),workerBlobURL:false,cacheMethod:'none',logger:info=>{if(info.status!=='recognizing text')progress('正在加载识别引擎：'+({ 'loading tesseract core':'核心模块','initializing tesseract':'初始化','loading language traineddata':'英语识别数据','initializing api':'识别接口'}[info.status]||info.status));},errorHandler:()=>{}}, {load_system_dawg:'0',load_freq_dawg:'0'}),recognize:async(worker,message,progress)=>{
  const source=`data:${message.mimeType};base64,${message.imageBase64}`;
  const img=new Image();img.src=source;await img.decode();
  if(img.width*img.height>20000000)throw new Error('图片尺寸过大');
  const crop=async box=>{const canvas=document.createElement('canvas');canvas.width=box.width+20;canvas.height=box.height+20;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,box.left,box.top,box.width,box.height,10,10,box.width,box.height);return canvas.toDataURL('image/png');};
  return recognizeTable(worker,source,img.width,img.height,crop,progress);
}});
async function handle(message){
  if(message.op==='ping')return {...engine.health(),archiveDir:'Chrome 下载目录 / 签到助手'};
  if(message.op==='release'){for(const url of urls)URL.revokeObjectURL(url);urls.clear();return {ok:true};}
  if(message.op==='blob'){
    const blob=message.base64?await(await fetch(`data:${message.mimeType};base64,${message.base64}`)).blob():new Blob([message.text],{type:message.mimeType});
    const url=URL.createObjectURL(blob);urls.add(url);return {ok:true,url};
  }
  if(message.op!=='ocr')throw new Error('未知图片处理操作');
  const observations=await engine.ocr(message);
  return {ok:true,observations};
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(message.target!=='ocr-offscreen'||sender.id!==chrome.runtime.id)return false;
  handle(message).then(respond,e=>respond({ok:false,error:e.message,resetRequired:Boolean(e.resetRequired)}));return true;
});
