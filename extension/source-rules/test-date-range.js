import {parseMailDate} from '../core.js';
const dayMs=86400000,offset=8*3600000;
export const validTestDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function defaultTestDateRange(now=Date.now()){
 return {from:new Date(now+offset-13*dayMs).toISOString().slice(0,10),to:new Date(now+offset).toISOString().slice(0,10)};
}
export function validateTestDateRange(value){
 if(!value||!validTestDate(value.from)||!validTestDate(value.to)||value.from>value.to)throw new Error('invalid-test-date-range');
 return {from:value.from,to:value.to};
}
export function testMessageDateState(message,range){
 if(!range)return 'unknown';
 const window=message.dateWindow;
 if(window&&validTestDate(window.from)&&validTestDate(window.to))return window.to<range.from||window.from>range.to?'outside':'inside';
 if(message.dateReferenceOnly)return 'unknown';
 const value=message.sentAt||parseMailDate(message.sentAtText||'');
 const timestamp=Date.parse(validTestDate(value)?value+'T00:00:00+08:00':value);
 if(!Number.isFinite(timestamp))return 'unknown';
 const date=new Date(timestamp+offset).toISOString().slice(0,10);
 return date<range.from||date>range.to?'outside':'inside';
}
export function gmailTestDateBounds(range){
 const from=Date.parse(range.from+'T00:00:00+08:00'),to=Date.parse(range.to+'T00:00:00+08:00')+dayMs;
 return `after:${Math.floor(from/1000)-1} before:${Math.floor(to/1000)}`;
}
