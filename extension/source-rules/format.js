export class RuleValidationError extends Error {
  constructor(code,path){super(`${code}: ${path}`);this.code=code;this.path=path;}
}
const fail=(code,path)=>{throw new RuleValidationError(code,path);};
const str=(v,path)=>{if(typeof v!=='string'||!v.trim()||[...v].length>256)fail('string',path);return v;};
export function validateRuleURL(value,path='$.sourceUrl'){
  if(typeof value!=='string'||value.length>2048||/[\s\\]/.test(value)||!/^https?:\/\//i.test(value))fail('url',path);
  let url;try{url=new URL(value);}catch{fail('url',path);}
  if(!url.hostname||url.username||url.password)fail('url',path);
  return value;
}
export function validateRuleMetadata(value){
  if(value.author!==undefined){
    if(typeof value.author==='string'){str(value.author,'$.author');if(/^[a-z][a-z0-9+.-]*:/i.test(value.author))validateRuleURL(value.author,'$.author');}
    else{object(value.author,['name','url'],'$.author');str(value.author.name,'$.author.name');if(value.author.url!==undefined)validateRuleURL(value.author.url,'$.author.url');}
  }
  if(value.sourceUrl!==undefined)validateRuleURL(value.sourceUrl);
}
export function validateRuleId(value,{builtin=false}={}){
  if(typeof value!=='string')fail('id-type','$.id');
  if(!value.trim())fail('id-empty','$.id');
  if([...value].length>256)fail('id-length','$.id');
  if(!builtin&&/builtin|demo/i.test(value))fail('id-reserved','$.id');
  if(!/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+(?![\s\S])/.test(value))fail('id-format','$.id');
  return value;
}
function object(v,keys,path){
  if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail('object',path);
  for(const key of Object.keys(v))if(!keys.includes(key))fail('unknown-field',`${path}.${key}`);
}
function array(v,path,max,check,min=0){
  if(!Array.isArray(v)||v.length<min||v.length>max)fail('array',path);
  v.forEach((x,i)=>check(x,`${path}[${i}]`));
  if(new Set(v).size!==v.length)fail('duplicate',path);
}
export function validateSelector(value,path='$.selector'){
  str(value,path);
  let rest=value.trim(),compound=false,expect=true;
  while(rest){
    const whitespace=rest.match(/^\s+/);
    if(whitespace){rest=rest.slice(whitespace[0].length);if(compound){expect=true;compound=false;}continue;}
    if(rest[0]===','||rest[0]==='>'){
      if(expect&&(!value.slice(0,value.length-rest.length).trim().match(/[\w\]"']$/)))fail('selector',path);
      rest=rest.slice(1).trimStart();if(!rest||rest[0]===','||rest[0]==='>')fail('selector',path);
      expect=true;compound=false;continue;
    }
    const token=rest.match(/^(?:[.#][A-Za-z_][\w-]*|\[[A-Za-z_][\w-]*(?:[*^$]?=(?:"[^"\\\r\n]*"|'[^'\\\r\n]*'))?\]|[A-Za-z][\w-]*)/);
    if(!token)fail('selector',path);
    if(/^(?:iframe|frame|script|style|html|body)$/i.test(token[0])||/^\[on/i.test(token[0]))fail('selector',path);
    if(/^[A-Za-z]/.test(token[0])&&compound)fail('selector',path);
    rest=rest.slice(token[0].length);compound=true;expect=false;
  }
  if(expect)fail('selector',path);
  return value;
}
export function validateRule(value,{builtin=false}={}){
  object(value,['schemaVersion','id','version','name','author','sourceUrl','source','courses','keywords','images','attachments'],'$');
  validateRuleMetadata(value);
  if(value.schemaVersion!==1)fail('schema-version','$.schemaVersion');
  validateRuleId(value.id,{builtin});
  if(typeof value.version!=='string'||!/^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(value.version))fail('version','$.version');
  if(!['gmail','moodle','ed'].includes(value.source))fail('source','$.source');
  object(value.name,['en','zh_CN','zh_TW'],'$.name');str(value.name.en,'$.name.en');
  for(const [locale,name] of Object.entries(value.name))str(name,`$.name.${locale}`);
  array(value.courses,'$.courses',20,(s,p)=>{str(s,p);if(!/^[A-Z]{2,10}\d{3,6}$/.test(s))fail('course',p);},builtin?0:1);
  if(value.keywords!==undefined){object(value.keywords,['navigation','context'],'$.keywords');for(const [key,list] of Object.entries(value.keywords))array(list,`$.keywords.${key}`,20,str);}
  object(value.images,['selectors','excludeSelectors','minWidth','minHeight','maxHeight'],'$.images');
  array(value.images.selectors,'$.images.selectors',8,validateSelector,1);
  if(value.images.excludeSelectors!==undefined)array(value.images.excludeSelectors,'$.images.excludeSelectors',8,validateSelector);
  for(const key of ['minWidth','minHeight','maxHeight'])if(value.images[key]!==undefined&&(!Number.isInteger(value.images[key])||value.images[key]<1||value.images[key]>4000))fail('dimensions',`$.images.${key}`);
  if((value.images.minHeight||20)>(value.images.maxHeight||4000))fail('dimensions','$.images.maxHeight');
  if(value.attachments!==undefined){object(value.attachments,['selectors'],'$.attachments');array(value.attachments.selectors,'$.attachments.selectors',8,validateSelector);if(value.source!=='ed'&&value.attachments.selectors.length)fail('attachments-source','$.attachments');}
  const json=JSON.stringify(value);if(new TextEncoder().encode(json).length>65536)fail('size','$');
  return JSON.parse(json);
}
export function parseRule(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>65536)fail('size','$');
  let value;try{value=JSON.parse(text);}catch{fail('json','$');}
  return validateRule(value);
}
export async function ruleDigest(rule){
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(rule))));
  return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
