import {practiceAssetPaths,practiceAssetId} from './assets.js';
export function createPracticeAssetReader({extensionOrigin,fetchAsset=fetch}){
 const byPayload=new Map();
 return {
  async read(id){
   if(!Object.hasOwn(practiceAssetPaths,id))throw new Error('practice-asset');
   const response=await fetchAsset(extensionOrigin+practiceAssetPaths[id]);if(!response.ok)throw new Error('builder-image');
   const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>8*1024*1024)throw new Error('builder-budget');
   let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   const payload={mimeType:'image/png',imageBase64:btoa(binary)};byPayload.set(payload.imageBase64,id);return payload;
  },
  async download(url){return this.read(practiceAssetId(url,extensionOrigin));},
  identify(payload){const id=byPayload.get(payload.imageBase64);if(!id)throw new Error('practice-asset');return id;},
  clear(){byPayload.clear();}
 };
}
