import test from 'node:test';
import assert from 'node:assert/strict';
import {localService} from '../extension/native-service.js';
test('store companion version gate does not change GitHub compatibility',async()=>{
 for(const id of ['mneachaobiledakoicnkinfdpcjkbnmm','nccgbccaamgcdcikjhljinefjbfcinfp']){
  let receive;globalThis.chrome={runtime:{id,connectNative:()=>({onMessage:{addListener(fn){receive=fn;},removeListener(){}},onDisconnect:{addListener(){},removeListener(){}},disconnect(){},postMessage(){queueMicrotask(()=>receive({ok:true,binaryReady:true,engine:'Apple Vision'}));}})}};
  const service=await localService();try{const reply=await service.call({op:'ping'});assert.equal(reply.binaryReady,id==='nccgbccaamgcdcikjhljinefjbfcinfp');}finally{await service.close();delete globalThis.chrome;}
 }
});
test('health preserves actionable startup diagnostics for the setup guide',async()=>{
 const handlers=[];
 globalThis.chrome={runtime:{connectNative(){return {onMessage:{addListener(fn){handlers.push(fn);},removeListener(){}},onDisconnect:{addListener(){},removeListener(){}},disconnect(){},postMessage(){queueMicrotask(()=>handlers[0]({ok:true,binaryReady:false,nativeBlocked:true,healthError:'Allow the OCR executable'}));}};}}};
 const service=await localService();
 try{const reply=await service.call({op:'ping'});assert.equal(reply.binaryReady,false);assert.equal(reply.healthError,'Allow the OCR executable');assert.equal(reply.nativeBlocked,true);}finally{await service.close();delete globalThis.chrome;}
});
