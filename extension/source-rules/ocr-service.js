// Never send production OCR operations to a companion that archives images.
export async function previewOcrService({isWindows,nativeService,browserService}){
 if(!isWindows){
  let service;
  try{
   service=await nativeService();const health=await service.call({op:'ping'});
   if(!health.binaryReady||!health.previewOcr)throw new Error('preview-unavailable');
   return {engine:'apple-vision',call:({imageBase64,mimeType})=>service.call({imageBase64,mimeType,op:'ocr-preview'}),close:()=>service.close()};
  }catch{try{await service?.close();}catch{}}
 }
 const service=await browserService({transient:true});
 return {...service,engine:'browser-wasm',call:({imageBase64,mimeType})=>service.call({op:'ocr',imageBase64,mimeType})};
}
