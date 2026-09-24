export function prefetchCall(signal,work){
 if(!signal)return work();
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(signal.reason);
  signal.addEventListener('abort',abort,{once:true});
  Promise.resolve().then(()=>{signal.throwIfAborted();return work();}).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
 });
}
