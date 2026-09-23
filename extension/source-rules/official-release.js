import {validateRule,ruleDigest} from './format.js';
import {freezeRules} from './builtins.js';
import {OFFICIAL_KEY_ID,OFFICIAL_PUBLIC_KEY} from './official-trust.js';

export const OFFICIAL_MAX_BYTES=512*1024;
const sources=['gmail','moodle','ed'];
const object=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));
const fail=code=>{throw new Error('official-'+code);};
export function validateOfficialPayload(value){
 if(!object(value,['schemaVersion','engineVersion','sequence','version','publishedAt','rules'])||value.schemaVersion!==1)fail('invalid');
 if(value.engineVersion!==1)fail('incompatible');
 if(!Number.isSafeInteger(value.sequence)||value.sequence<1||!/^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(value.version)||typeof value.publishedAt!=='string'||!Number.isFinite(Date.parse(value.publishedAt)))fail('invalid');
 if(!Array.isArray(value.rules)||value.rules.length<3||value.rules.length>100)fail('invalid');
 const ids=new Set(),assigned=new Set(),defaults=new Set();
 for(const raw of value.rules){
  if(new TextEncoder().encode(JSON.stringify(raw)).length>65536)fail('size');
  let rule;try{rule=validateRule(raw,{builtin:true});}catch{fail('invalid');}
  if(!rule.id.startsWith('builtin.')||ids.has(rule.id))fail('invalid');ids.add(rule.id);
  if(rule.id==='builtin.'+rule.source){if(rule.courses.length)fail('invalid');defaults.add(rule.source);}
  else if(!rule.courses.length)fail('invalid');
  for(const course of rule.courses){const key=rule.source+':'+course;if(assigned.has(key))fail('invalid');assigned.add(key);}
 }
 if(sources.some(source=>!defaults.has(source)))fail('invalid');
 return value;
}
export async function verifyOfficialRelease(envelope,{publicKey=OFFICIAL_PUBLIC_KEY}={}){
 if(!object(envelope,['keyId','payload','signature'])||envelope.keyId!==OFFICIAL_KEY_ID||typeof envelope.payload!=='string'||typeof envelope.signature!=='string')fail('signature');
 const bytes=new TextEncoder().encode(envelope.payload);if(bytes.length>OFFICIAL_MAX_BYTES)fail('size');
 if(!/^[A-Za-z0-9+/]{86}==$/.test(envelope.signature))fail('signature');
 try{
  const signature=Uint8Array.from(atob(envelope.signature),char=>char.charCodeAt(0));
  const key=await crypto.subtle.importKey('jwk',publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,signature,bytes))fail('signature');
 }catch{fail('signature');}
 let value;try{value=JSON.parse(envelope.payload);}catch{fail('invalid');}
 validateOfficialPayload(value);
 const rules={};for(const rule of value.rules)rules[rule.courses.length?rule.id:rule.source]={...rule,digest:await ruleDigest(rule)};
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 return freezeRules({...value,rules,digest});
}
