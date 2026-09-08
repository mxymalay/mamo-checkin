// Control/status operations never wait behind an image job.
export function createOcrController({createWorker,recognize,timeoutMs=45000}){
  let worker=null,workerPromise=null,queue=Promise.resolve(),generation=0;
  let status={binaryReady:false,busy:false,stage:'识别图片时自动启动',updatedAt:new Date().toISOString()};
  const update=patch=>{status={...status,...patch,updatedAt:new Date().toISOString()};};
  async function run(payload){
    const epoch=++generation;let timer;
    update({busy:true,stage:worker?'正在识别图片':'正在启动图片识别引擎'});
    const progress=stage=>{if(epoch===generation)update({stage});};
    const task=(async()=>{
      if(!workerPromise)workerPromise=Promise.resolve().then(()=>createWorker(progress)).then(value=>{
        if(epoch!==generation){void value.terminate();throw new Error('已取消旧识别引擎');}
        worker=value;update({binaryReady:true});return value;
      });
      const active=await workerPromise;
      progress('正在识别图片');
      return recognize(active,payload,progress);
    })();
    try{
      const result=await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`图片识别超时（${Math.round(timeoutMs/1000)} 秒，${status.stage}）`)),timeoutMs);})]);
      update({busy:false,stage:'图片识别完成'});return result;
    }catch(cause){
      generation++;
      if(worker)void worker.terminate().catch(()=>{});
      worker=null;workerPromise=null;
      update({binaryReady:false,busy:false,stage:'识别引擎需要重启'});
      const error=new Error(cause?.message||String(cause));error.resetRequired=true;throw error;
    }finally{clearTimeout(timer);}
  }
  return {health:()=>({ok:true,...status}),ocr:payload=>{const result=queue.catch(()=>{}).then(()=>run(payload));queue=result;return result;}};
}
