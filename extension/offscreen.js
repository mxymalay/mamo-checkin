import {recognizeTable} from './ocr-engine.js';
import {createOcrController} from './ocr-controller.js';
const engine=createOcrController({createWorker:async progress=>{
  if(typeof Tesseract==='undefined')throw new Error('内置识别引擎脚本未加载（vendor/tesseract.min.js 缺失），请在 chrome://extensions 重新加载扩展后再试；若反复出现请重新构建安装包。');
  return Tesseract.createWorker('eng',1,{workerPath:chrome.runtime.getURL('vendor/worker.min.js'),langPath:chrome.runtime.getURL('vendor'),corePath:chrome.runtime.getURL('vendor/tesseract-core-simd-lstm.wasm.js'),workerBlobURL:false,cacheMethod:'none',logger:info=>{if(info.status!=='recognizing text')progress('正在加载识别引擎：'+({ 'loading tesseract core':'核心模块','initializing tesseract':'初始化','loading language traineddata':'英语识别数据','initializing api':'识别接口'}[info.status]||info.status));},errorHandler:()=>{}}, {load_system_dawg:'0',load_freq_dawg:'0'});},recognize:async(worker,message,progress)=>{
  // Decode via createImageBitmap on a Blob: the DOM image loader inside an
  // offscreen document can leave decode() pending forever, while bitmap
  // decoding is synchronous work with no document dependency.
  const bytes=Uint8Array.from(atob(message.imageBase64),c=>c.charCodeAt(0));
  const sourceBlob=new Blob([bytes],{type:message.mimeType});
  const timeoutAfter=(ms,message)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms));
  let sourceImage,width,height;
  try{
    const bitmap=await Promise.race([
      createImageBitmap(sourceBlob),
      timeoutAfter(15000,`图片解码超时（${bytes.length} 字节，${message.mimeType}），请稍后重试`)
    ]);
    width=bitmap.width;height=bitmap.height;sourceImage=bitmap;
  }catch(bitmapError){
    if(!/解码超时/.test(String(bitmapError?.message)))throw bitmapError;
    const img=new Image();img.src=`data:${message.mimeType};base64,${message.imageBase64}`;
    await Promise.race([img.decode(),timeoutAfter(15000,`图片解码超时（${bytes.length} 字节，${message.mimeType}），请稍后重试`)]);
    width=img.naturalWidth;height=img.naturalHeight;sourceImage=img;
  }
  if(width*height>20000000)throw new Error('图片尺寸过大');
  // Preprocess: screenshots lack DPI metadata and often arrive small, so upscale
  // (wide one-row strips scale by height), binarize, and pre-cut the right-hand
  // code column. Tesseract then reads clean, larger glyphs — faster and sharper.
  const wideShort=width/Math.max(1,height)>=4&&height<=160;
  const scale=wideShort?Math.max(1,Math.min(6,280/Math.max(1,height),5200/Math.max(1,width))):(width<1800?Math.min(2.4,2200/width,2600/height):1);
  const main=document.createElement('canvas');main.width=Math.max(1,Math.round(width*scale));main.height=Math.max(1,Math.round(height*scale));
  const mainCtx=main.getContext('2d');mainCtx.fillStyle='#fff';mainCtx.fillRect(0,0,main.width,main.height);mainCtx.imageSmoothingEnabled=true;mainCtx.drawImage(sourceImage,0,0,main.width,main.height);
  const binarize=(canvas,threshold)=>{const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const ctx=out.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(canvas,0,0);const frame=ctx.getImageData(0,0,out.width,out.height);const px=frame.data;for(let i=0;i<px.length;i+=4){const lum=px[i]*.299+px[i+1]*.587+px[i+2]*.114;const value=lum<threshold?0:255;px[i]=value;px[i+1]=value;px[i+2]=value;px[i+3]=255;}ctx.putImageData(frame,0,0);return out;};
  const mainBin=binarize(main,190);
  const crop=async box=>{const canvas=document.createElement('canvas');canvas.width=box.width+20;canvas.height=box.height+20;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(main,box.left,box.top,box.width,box.height,10,10,box.width,box.height);return canvas.toDataURL('image/png');};
  const zoneCanvas=(source,ratio=.3)=>{const cropWidth=Math.min(source.width,Math.max(120,Math.round(source.width*ratio)));const x=Math.max(0,source.width-cropWidth);const pad=10;const canvas=document.createElement('canvas');canvas.width=cropWidth+pad*2;canvas.height=source.height+pad*2;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,x,0,cropWidth,source.height,pad,pad,cropWidth,source.height);return canvas;};
  const zone=zoneCanvas(main);const zoneBin=binarize(zone,188);
  const cropThreshold=async box=>{const canvas=document.createElement('canvas');canvas.width=box.width+20;canvas.height=box.height+20;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(mainBin,box.left,box.top,box.width,box.height,10,10,box.width,box.height);return canvas.toDataURL('image/png');};
  let diagnostics;
  const zoneMeta={left:main.width-(zone.width-20),padding:10};
  try{
    const observations=await recognizeTable(worker,main.toDataURL('image/png'),main.width,main.height,crop,progress,{layoutRescue:true,codeZone:width/height>=2.2?[zone,zoneBin].map(canvas=>({...zoneMeta,image:canvas.toDataURL('image/png')})):[],cropThreshold,diagnostics:value=>{diagnostics=value;}});
    return {observations,diagnostics:{...diagnostics,originalWidth:width,originalHeight:height}};
  }finally{sourceImage.close?.();}
}});
async function handle(message){
  if(message.op==='ping')return {...engine.health(),archiveDir:'浏览器扩展存储（无本机归档）'};
  if(message.op==='release')return {ok:true};
  if(message.op!=='ocr')throw new Error('未知图片处理操作');
  return {ok:true,...await engine.ocr(message)};
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  // Only the service worker may dispatch OCR; extension pages must use its
  // session, asset and concurrency checks instead of addressing this receiver.
  if(message?.target!=='ocr-offscreen'||sender?.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL('background.js')||sender.tab!==undefined||sender.documentId!==undefined||sender.frameId!==undefined)return false;
  handle(message).then(respond,e=>respond({ok:false,error:e.message,resetRequired:Boolean(e.resetRequired)}));return true;
});
