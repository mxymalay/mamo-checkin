import {createPracticeTabBridge} from '../../extension/source-rules/practice/tab-bridge.js';
export function event(){const listeners=new Set();return {addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn),emit:arg=>{for(const fn of [...listeners])fn(arg);}};}
export function port(sender,name='rule-practice-source'){
 return {sender,name,onMessage:event(),onDisconnect:event(),sent:[],postMessage(message){this.sent.push(message);this.respond?.(message);},disconnect(){this.onDisconnect.emit();}};
}
export const owner={id:'test',url:'chrome-extension://test/options.html',documentId:'owner-one',tab:{id:1},frameId:0};
export function harness(options={}){
 let next=10;const records=new Map(),ports=[];
 const tabs={async create(){const tab={id:next++,url:'about:blank'};records.set(tab.id,tab);return tab;},async get(id){if(!records.has(id))throw Error('missing');return records.get(id);},async update(id,patch){const tab=records.get(id);if(tab)Object.assign(tab,patch);if(patch.url){const p=port({id:'test',url:patch.url,documentId:'source-'+id,tab:{id},frameId:0});ports.push(p);options.onNavigate?.(p);}return tab;}};
 const bridge=createPracticeTabBridge({extensionId:'test',tabs,timeoutMs:30,...options});return {bridge,tabs,ports,records};
}
