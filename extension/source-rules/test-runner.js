import {safeTrace} from './trace.js';
import {testMessageDateState,validateTestDateRange} from './test-date-range.js';

export function createRuleTestRunner({createCollectors,openSourceSession,downloadImage,connectOcr,parseObservations,now=Date.now}){
 let current=null,busy=false;
 const live=test=>{if(current!==test||test.controller.signal.aborted)throw new Error('cancelled');};
 const stopTimer=test=>{clearTimeout(test.timer);test.timer=null;};
 const discard=test=>{test.payloads.clear();test.messages.clear();test.result.images=[];test.bytes=0;};
 const touch=test=>{stopTimer(test);if(test.controller.signal.aborted)return;test.timer=setTimeout(()=>{test.controller.abort();test.result.phase='cancelled';discard(test);},120000);test.timer.unref?.();};
 const trace=(test,value)=>{if(test.result.trace.length<500)test.result.trace.push(safeTrace(value));else test.result.truncated=true;};
 const ocrImage=async(test,item,force)=>{
  live(test);const payload=test.payloads.get(item.id);if(!payload)throw new Error('image-unavailable');
  test.result.phase='recognizing';let service;
  try{
   service=await connectOcr();live(test);
   const result=await service.call({op:'ocr',...payload,meta:test.messages.get(item.id),force:Boolean(force)});live(test);
   const observations=(result.observations||[]).slice(0,1000).map(o=>({...o,text:String(o.text||'').slice(0,2000)}));
   item.ocr={engine:service.engine||'native',cached:Boolean(result.cached),observations,records:parseObservations(observations,test.messages.get(item.id))};
   item.state=observations.length?'recognized':'ocr-empty';test.result.counts.recognized++;
  }catch(error){if(test.controller.signal.aborted)throw error;item.state='ocr-error';trace(test,{reason:'ocr-error'});}
  finally{try{await service?.close();}catch{}}
 };
 const acquire=async(test,messages,{tabId})=>{
  for(const msg of messages){
   const dateState=testMessageDateState(msg,test.request.dateRange);
   if(dateState==='outside'){test.result.counts.excluded+=new Set(msg.images||[]).size;continue;}
   live(test);test.result.truncated||=Boolean(msg.ruleTruncated);
   for(const value of msg.ruleTrace||[])trace(test,value);
   test.result.counts.excluded+=(msg.ruleTrace||[]).filter(t=>!['accepted','duplicate','selector-miss'].includes(t.reason)).length;
   for(const url of [...new Set(msg.images||[])]){
    live(test);test.result.counts.found++;
    if(test.result.images.length>=20){test.result.truncated=true;trace(test,{reason:'budget'});continue;}
    const id=String(test.result.images.length+1),evidence=msg.imageEvidence?.find(i=>i.url===url);
    const item={id,messageId:msg.messageId,sourceUrl:msg.sourceUrl,course:msg.course,matches:evidence?.matches||[],width:evidence?.width||0,height:evidence?.height||0,state:'downloading'};
    item.dateState=dateState;test.result.images.push(item);test.result.phase='locating';
    test.messages.set(id,{...msg,images:undefined,textRows:undefined,ruleTrace:undefined});
    try{
     const payload=await downloadImage(url,{tabId,signal:test.controller.signal});live(test);
     const bytes=Math.ceil(payload.imageBase64.length*3/4);
     if(!['image/png','image/jpeg'].includes(payload.mimeType)||bytes>8*1024*1024)throw new Error('invalid-image');
     if(test.bytes+bytes>32*1024*1024){test.result.truncated=true;item.state='budget';trace(test,{reason:'budget'});continue;}
     test.bytes+=bytes;test.payloads.set(id,payload);item.state='downloaded';test.result.counts.downloaded++;
     if(test.request.stage==='recognize')await ocrImage(test,item,test.request.forceOcr);
    }catch(error){if(test.controller.signal.aborted)throw error;item.state='download-error';trace(test,{reason:'download-error'});}
   }
  }
  return {completedMessageIds:[]};
 };
 const execute=async test=>{
  let session;
  try{
   const {settings,snapshot,course,source,mode,sourceUrl,dateRange}=test.request;
   session=await openSourceSession({settings,source,sourceUrl,signal:test.controller.signal});live(test);
   const collectors=createCollectors({...session.io,
    onMessages:(msgs,context)=>acquire(test,msgs,context),
    onDiagnostic:async detail=>{live(test);trace(test,{reason:/LOGIN_REQUIRED|登录|账号/.test(detail.error||'')?'login-required':'source-error'});test.failed=true;},
    sourceEvent:async()=>{},persistCache:async()=>{},
    progress:async event=>{live(test);test.result.counts.pages+=event.increment?.pages||0;}});
   const result=await collectors[{gmail:'collectMail',moodle:'collectMoodle',ed:'collectEd'}[source]]({settings:{...settings,courses:[course],ignoreCompleted:true},snapshot,sourceUrl,dateRange,mode,collectTrace:true,verifiedLogin:session.verifiedLogin,
    cache:{seenMessages:{},seenThreads:{},moodleProgress:{},records:[],nextCourse:0},forceRead:true,signal:test.controller.signal,shouldContinue:()=>!test.controller.signal.aborted});
   live(test);test.result.truncated||=Boolean(result?.truncated);
   if(!test.result.counts.found)trace(test,{reason:'no-images'});
   test.result.phase=test.failed||test.result.truncated||test.result.images.some(i=>i.state.endsWith('error'))?'partial':'complete';
  }catch(error){if(!test.controller.signal.aborted){test.result.phase='error';trace(test,{reason:/LOGIN_REQUIRED|登录|账号/.test(error.message)?'login-required':'source-error'});}}
  finally{try{await session?.release();}catch{}if(current===test){busy=false;test.result.finishedAt=now();}}
 };
 return {
  get busy(){return busy;},
  async start(request){
   if(busy)throw new Error('rule-test-busy');
   if(request.dateRange)validateTestDateRange(request.dateRange);
   if(!['locate','recognize'].includes(request.stage)||!['builtin','community','combined'].includes(request.mode)||!['gmail','moodle','ed'].includes(request.source)||!request.settings.courses.includes(request.course))throw new Error('invalid-rule-test');
   const selection=request.snapshot.courses[request.course]?.[request.source];
   const community=[selection?.community].flat().filter(rule=>rule&&typeof rule.id==='string');
   if(request.mode==='community'&&!community.length)throw new Error('select-community-rule');
   if(current){stopTimer(current);current.controller.abort();current.payloads.clear();current.messages.clear();}
   const rules=[...(request.mode==='community'?[]:[selection?.builtin]),...(request.mode==='builtin'?[]:community)].filter(Boolean);
   const testId=crypto.randomUUID(),result={testId,course:request.course,source:request.source,mode:request.mode,stage:request.stage,phase:'source',images:[],trace:[],counts:{pages:0,found:0,downloaded:0,excluded:0,recognized:0},truncated:false,rules:rules.map(({id,key,origin,version,digest})=>({id,key:key||id,origin,version,digest}))};
   current={request:structuredClone(request),result,controller:new AbortController(),payloads:new Map(),messages:new Map(),bytes:0};busy=true;touch(current);void execute(current);return {testId};
  },
  status(testId){if(current?.result.testId!==testId)return {testId,phase:'interrupted',images:[],counts:{},trace:[]};touch(current);return structuredClone({...current.result,busy});},
  image({testId,imageId}){if(current?.result.testId!==testId)throw new Error('image-unavailable');const payload=current.payloads.get(imageId);if(!payload)throw new Error('image-unavailable');return {...payload};},
  async recognize({testId,imageId,forceOcr=false}){
   if(busy)throw new Error('rule-test-busy');
   const test=current,item=test?.result.images.find(i=>i.id===imageId);
   if(test?.result.testId!==testId||!item||test.controller.signal.aborted)throw new Error('image-unavailable');
   busy=true;touch(test);
   void (async()=>{try{await ocrImage(test,item,forceOcr);live(test);test.result.phase=item.state==='ocr-error'?'partial':'complete';}catch{}finally{if(current===test)busy=false;}})();
   return {testId};
  },
  async cancel(testId){if(current&&(!testId||current.result.testId===testId)){current.controller.abort();current.result.phase='cancelled';stopTimer(current);discard(current);}},
  async clear(testId){if(current&&(!testId||current.result.testId===testId)){await this.cancel(testId);current.payloads.clear();current.messages.clear();current.result.images=[];current.result.trace=[];}}
 };
}
