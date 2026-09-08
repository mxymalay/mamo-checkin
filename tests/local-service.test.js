import test from 'node:test';
import assert from 'node:assert/strict';

let moduleSequence=0;
const loadService=async()=>{
  moduleSequence+=1;
  return (await import(`../extension/local-service.js?test=${moduleSequence}`)).localService;
};

function fakeChrome() {
  const values=new Map();
  const downloads=new Map();
  const events={createDocument:0,closeDocument:0,release:0,messages:[],downloadOptions:[]};
  const queuedDownloadStates=[];
  let contextOpen=false,nextDownloadId=1,nextBlobId=1;
  const chrome={
    runtime:{
      getURL:path=>`chrome-extension://attendance/${path}`,
      getContexts:async()=>contextOpen?[{contextType:'OFFSCREEN_DOCUMENT'}]:[],
      getPlatformInfo:async()=>({os:'mac'}),
      sendMessage:async message=>{
        events.messages.push(message);
        if(message.op==='release'){events.release+=1;return {ok:true};}
        if(message.op==='ping')return {ok:true,binaryReady:true,archiveDir:'Chrome downloads'};
        if(message.op==='blob')return {ok:true,url:`blob:attendance-${nextBlobId++}`};
        if(message.op==='ocr')return {ok:true,observations:[{text:'ABCDE',confidence:1,x:0,y:0,width:1,height:1}]};
        return {ok:false,error:'unexpected test operation'};
      }
    },
    offscreen:{
      createDocument:async()=>{events.createDocument+=1;contextOpen=true;},
      closeDocument:async()=>{events.closeDocument+=1;contextOpen=false;}
    },
    storage:{local:{
      get:async key=>{
        if(typeof key==='string')return {[key]:values.get(key)};
        return Object.fromEntries((key||[]).map(name=>[name,values.get(name)]));
      },
      set:async entries=>{for(const [key,value] of Object.entries(entries))values.set(key,value);}
    }},
    downloads:{
      download:async options=>{
        events.downloadOptions.push(options);
        const id=nextDownloadId++,state=queuedDownloadStates.shift()||{state:'complete'};
        downloads.set(id,{id,filename:`/Downloads/${options.filename}`,...state});
        return id;
      },
      search:async({id})=>downloads.has(id)?[{...downloads.get(id)}]:[]
    }
  };
  return {chrome,events,values,queueDownloadState:state=>queuedDownloadStates.push(state),isContextOpen:()=>contextOpen};
}

async function withChrome(run) {
  const previous=globalThis.chrome;
  const fixture=fakeChrome();
  globalThis.chrome=fixture.chrome;
  try{return await run(fixture);}finally{
    if(previous===undefined)delete globalThis.chrome;else globalThis.chrome=previous;
  }
}

test('two simultaneous clients share offscreen and only the last close releases it',async()=>withChrome(async fixture=>{
  const localService=await loadService();
  const [healthClient,runClient]=await Promise.all([localService(),localService()]);
  try{
    assert.equal(fixture.events.createDocument,1);
    assert.equal(fixture.isContextOpen(),true);
    assert.equal((await healthClient.call({op:'ping'})).binaryReady,true);

    await healthClient.close();
    assert.equal(fixture.isContextOpen(),true);
    assert.equal(fixture.events.closeDocument,0);
    assert.equal((await runClient.call({op:'ping'})).ok,true);

    await runClient.close();
    assert.equal(fixture.isContextOpen(),false);
    assert.equal(fixture.events.release,1);
    assert.equal(fixture.events.closeDocument,1);
  }finally{await healthClient.close();await runClient.close();}
}));

test('same image bytes reuse both archived download and verified OCR observations',async()=>withChrome(async fixture=>{
  const localService=await loadService(),service=await localService();
  const request={op:'ocr',imageBase64:btoa('image-bytes'),mimeType:'image/png',meta:{course:'FIT5120'}};
  try{
    const first=await service.call(request),second=await service.call(request);
    assert.equal(first.imageId,'2c8648d103e3dd7ad87660da0f126a1443b6d21ac1bd3ec000c5e24e2373a90c');
    assert.equal(second.imageId,first.imageId);
    assert.equal(second.imagePath,first.imagePath);
    assert.deepEqual(fixture.events.downloadOptions.map(item=>item.filename),[
      '签到助手/images/2c8648d103e3dd7ad87660da0f126a1443b6d21ac1bd3ec000c5e24e2373a90c.png'
    ]);
    assert.equal(fixture.events.messages.filter(message=>message.op==='ocr').length,1);
    assert.equal(second.cached,true);
    assert.equal(fixture.events.messages.filter(message=>message.op==='blob').length,1);
  }finally{await service.close();}
}));

test('failed OCR restarts the document immediately and retries once, with progress',async()=>withChrome(async fixture=>{
  const localService=await loadService(),events=[];
  const send=fixture.chrome.runtime.sendMessage;
  let attempts=0;
  fixture.chrome.runtime.sendMessage=async message=>message.op==='ocr'&&++attempts===1?{ok:false,resetRequired:true,error:'图片识别超时'}:send(message);
  const service=await localService({onProgress:async event=>events.push(event)});
  try{
    const result=await service.call({op:'ocr',imageBase64:btoa('recover'),mimeType:'image/png'});
    assert.equal(result.ok,true);assert.equal(attempts,2);
    assert.equal(fixture.events.createDocument,2);
    assert.equal(fixture.events.closeDocument,1);
    assert.ok(events.some(e=>/重启/.test(e.message)));
    assert.ok(events.some(e=>/重试成功/.test(e.message)));
  }finally{await service.close();}
}));

test('second OCR failure is visible, uncached and bounded to two attempts',async()=>withChrome(async fixture=>{
  const localService=await loadService(),send=fixture.chrome.runtime.sendMessage;let attempts=0;
  fixture.chrome.runtime.sendMessage=async message=>{if(message.op==='ocr'){attempts++;return {ok:false,resetRequired:true,error:'worker stopped'};}return send(message);};
  const service=await localService();
  try{
    await assert.rejects(service.call({op:'ocr',imageBase64:btoa('failed'),mimeType:'image/png'}),/重试后仍失败/);
    assert.equal(attempts,2);
    assert.equal([...fixture.values.keys()].some(key=>key.startsWith('ocr:')),false);
  }finally{await service.close();}
}));

test('a delayed monitor ping cannot report stale OCR progress after the image finishes',async()=>withChrome(async fixture=>{
  const localService=await loadService(),send=fixture.chrome.runtime.sendMessage,events=[];
  let releasePing,releaseOcr,pingStarted;
  const started=new Promise(resolve=>{pingStarted=resolve;});
  fixture.chrome.runtime.sendMessage=message=>{
    if(message.op==='ping')return new Promise(resolve=>{releasePing=resolve;pingStarted();});
    if(message.op==='ocr')return new Promise(resolve=>{releaseOcr=()=>resolve({ok:true,observations:[]});});
    return send(message);
  };
  const service=await localService({onProgress:async event=>events.push(event)});
  try{
    const pending=service.call({op:'ocr',imageBase64:btoa('late-ping'),mimeType:'image/png'});
    await started;releaseOcr();await pending;
    const count=events.length;
    releasePing({ok:true,stage:'stale-progress',busy:true});
    await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(events.length,count);
  }finally{releasePing?.({ok:true});releaseOcr?.();await service.close();}
}));

test('unchanged record snapshots skip downloads while changed records replace the archive',async()=>withChrome(async fixture=>{
  const localService=await loadService(),service=await localService();
  try{
    await service.call({op:'archive',records:[{id:'one',status:'ready'}]});
    await service.call({op:'archive',records:[{id:'one',status:'ready'}]});
    await service.call({op:'archive',records:[{id:'one',status:'submitted'}]});
    assert.deepEqual(fixture.events.downloadOptions.map(item=>item.filename),['签到助手/records.json','签到助手/records.json']);
    assert.equal(fixture.events.messages.filter(message=>message.op==='blob'&&message.mimeType==='application/json').length,2);
    assert.equal(typeof fixture.values.get('archiveDigest'),'string');
  }finally{await service.close();}
}));

test('interrupted archive download rejects and never commits its digest',async()=>withChrome(async fixture=>{
  const localService=await loadService(),service=await localService();
  const request={op:'archive',records:[{id:'one',status:'ready'}]};
  fixture.queueDownloadState({state:'interrupted',error:'NETWORK_FAILED'});
  try{
    await assert.rejects(service.call(request),/本地文件保存失败：NETWORK_FAILED/);
    assert.equal(fixture.values.has('archiveDigest'),false);

    fixture.queueDownloadState({state:'complete'});
    const retried=await service.call(request);
    assert.equal(retried.ok,true);
    assert.equal(fixture.events.downloadOptions.length,2);
    assert.equal(typeof fixture.values.get('archiveDigest'),'string');
  }finally{await service.close();}
}));
