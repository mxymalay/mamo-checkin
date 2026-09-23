export function createBuilderPreview({downloadImage,connectOcr,timeoutMs=20000,ocrTimeoutMs=timeoutMs}){
 const payloads=new Map();let epoch=0;
 const live=version=>{if(version!==epoch)throw new Error('builder-cancelled');};
 async function timed(promise,budget=timeoutMs){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('builder-timeout')),budget);})]);}finally{clearTimeout(timer);}}
 async function acquire(item,version){
  if(payloads.has(item.id))return;
  if(payloads.size>=20)throw new Error('builder-budget');
  const payload=await timed(downloadImage(item.url,{tabId:item.tabId,documentId:item.documentId}));live(version);
  if(!['image/png','image/jpeg'].includes(payload.mimeType)||typeof payload.imageBase64!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(payload.imageBase64))throw new Error('builder-image');
  const bytes=Math.ceil(payload.imageBase64.length*3/4),total=bytes+[...payloads.values()].reduce((sum,p)=>sum+Math.ceil(p.imageBase64.length*3/4),0);
  if(bytes>8*1024*1024||total>32*1024*1024)throw new Error('builder-budget');
  payloads.set(item.id,{mimeType:payload.mimeType,imageBase64:payload.imageBase64});
 }
 return {
  clear(){epoch++;payloads.clear();},
  async load(images){
   this.clear();if(images.length>20)throw new Error('builder-budget');const version=epoch;
   try{for(const item of images)await acquire(item,version);}catch(error){if(epoch===version)this.clear();throw error;}
  },
  async thumbnail(item){await acquire(item,epoch);return this.image(item.id);},
  image(id){const payload=payloads.get(id);if(!payload)throw new Error('builder-image');return {...payload};},
  async recognize(id){
   const payload=this.image(id),version=epoch;let service,finished=false;
   try{
    // Late service creation must still close the transient OCR connection.
    service=await timed(Promise.resolve(connectOcr()).then(value=>{if(finished||version!==epoch){void value.close();throw new Error('builder-cancelled');}return value;}));live(version);
    const result=await timed(service.call({op:'ocr-preview',...payload}),ocrTimeoutMs);live(version);
    return (result.observations||[]).slice(0,100).map(o=>String(o.text||'').slice(0,2000));
   }finally{finished=true;try{await service?.close();}catch{}}
  }
 };
}
