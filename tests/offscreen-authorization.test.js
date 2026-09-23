import test from 'node:test';
import assert from 'node:assert/strict';

const extensionId='test',origin='chrome-extension://test';
async function receiver(run){
 const previous={chrome:globalThis.chrome,Tesseract:globalThis.Tesseract};let listen,workers=0;
 globalThis.chrome={runtime:{id:extensionId,getURL:path=>`${origin}/${path}`,onMessage:{addListener:listener=>{listen=listener;}}}};
 globalThis.Tesseract={createWorker:async()=>{workers++;throw new Error('test-worker-reached');}};
 try{await import(`../extension/offscreen.js?test=${crypto.randomUUID()}`);await run({listen,workers:()=>workers});}
 finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
}

test('offscreen rejects practice, options and content callers before dispatching any OCR operation',async()=>receiver(async({listen,workers})=>{
 const background={id:extensionId,url:origin+'/background.js'};
 const senders=[
  {id:extensionId,url:origin+'/source-rules/practice/course.html?session=forged',tab:{id:5},documentId:'source'},
  {id:extensionId,url:origin+'/options.html',tab:{id:1},documentId:'owner'},
  {id:extensionId,url:origin+'/modules.html',documentId:'owner'},
  {id:extensionId,url:'https://learning.monash.edu/course/view.php?id=1',tab:{id:3},documentId:'content'},
  {...background,tab:{id:8}},{...background,documentId:'spoofed'},{...background,frameId:0},
  {...background,id:'another'},{...background,url:background.url+'?spoof=1'},
  {...background,url:background.url+'#spoof'},{id:extensionId},{},undefined
 ];
 let responses=0;
 for(const sender of senders)for(const op of ['ocr','ping','release'])assert.equal(listen({target:'ocr-offscreen',op,imageBase64:'YWJj',mimeType:'image/png'},sender,()=>responses++),false);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(responses,0);assert.equal(workers(),0);
}));

test('offscreen accepts the exact background worker for health and OCR dispatch',async()=>receiver(async({listen,workers})=>{
 const sender={id:extensionId,url:origin+'/background.js'};
 const request=op=>new Promise(resolve=>assert.equal(listen({target:'ocr-offscreen',op,imageBase64:'YWJj',mimeType:'image/png'},sender,resolve),true));
 assert.equal((await request('ping')).ok,true);assert.equal(workers(),0);
 assert.deepEqual(await request('release'),{ok:true});
 const result=await request('ocr');assert.equal(result.error,'test-worker-reached');assert.equal(workers(),1);
 assert.equal(listen({target:'other',op:'ocr'},sender,()=>assert.fail('wrong target')),false);
}));
