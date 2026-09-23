import {parseRule,validateRuleMetadata} from './format.js';
const base='https://raw.githubusercontent.com/mxymalay/mamo-checkin-rules/main/';
export function catalogURL(entry){
 const match=/^examples\/(shared|[A-Z]{2,10}\d{3,6})\/[a-z0-9-]+\.json$/.exec(entry?.path||'');
 if(!match||match[1]&&match[1]!=='shared'&&!entry.courses?.includes(match[1]))throw new Error('catalog-invalid');
 return base+entry.path;
}
function validateEntry(entry){
 catalogURL(entry);
 try{validateRuleMetadata(entry);}catch{throw new Error('catalog-invalid');}
 if(!entry||typeof entry.id!=='string'||entry.id.startsWith('builtin.')||!/^\d+\.\d+\.\d+$/.test(entry.version)||!['gmail','moodle','ed'].includes(entry.source)||!Array.isArray(entry.courses)||!entry.courses.length||entry.courses.length>20||entry.courses.some(c=>typeof c!=='string'||!/^[A-Z]{2,10}\d{3,6}$/.test(c))||typeof entry.name?.en!=='string'||entry.name.en.length>256||!['en','zh_CN','zh_TW'].every(lang=>entry.name[lang]===undefined||typeof entry.name[lang]==='string'&&entry.name[lang].length<=256)||!/^[a-f0-9]{64}$/.test(entry.sha256))throw new Error('catalog-invalid');
 return entry;
}
async function readBounded(url,limit,fetchImpl){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetchImpl(url,{credentials:'omit',redirect:'error',signal:controller.signal,cache:'no-cache'});
  if(!response.ok)throw new Error('catalog-download-error');
  if(Number(response.headers.get('content-length'))>limit)throw new Error('size');
  const reader=response.body?.getReader();if(!reader)throw new Error('catalog-download-error');
  const chunks=[];let length=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit)throw new Error('size');chunks.push(value);}}
  catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return bytes;
 }finally{clearTimeout(timer);}
}
export async function loadRuleCatalog({fetchImpl=globalThis.fetch}={}){
 const data=JSON.parse(new TextDecoder().decode(await readBounded(new URL('./catalog.json',import.meta.url),131072,fetchImpl)));
 if(data.schemaVersion!==1||!Array.isArray(data.rules)||data.rules.length>100)throw new Error('catalog-invalid');
 const entries=data.rules.map(validateEntry);if(new Set(entries.map(r=>r.id)).size!==entries.length)throw new Error('catalog-invalid');return entries;
}
export async function downloadCatalogRule(entry,{fetchImpl=globalThis.fetch}={}){
 // A published file may retain an older CDN response at its unversioned path.
 validateEntry(entry);const bytes=await readBounded(catalogURL(entry)+'?sha256='+entry.sha256,65536,fetchImpl);
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
 if(hash!==entry.sha256)throw new Error('catalog-integrity');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),rule=parseRule(text);
 if(rule.id!==entry.id||rule.version!==entry.version||rule.source!==entry.source||JSON.stringify(rule.courses)!==JSON.stringify(entry.courses))throw new Error('catalog-integrity');
 if(JSON.stringify(rule.author)!==JSON.stringify(entry.author)||rule.sourceUrl!==entry.sourceUrl)throw new Error('catalog-integrity');
 return text;
}
