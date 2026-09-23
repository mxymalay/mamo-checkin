export function createRuleTestDemos(){
 const base={source:'moodle',mode:'combined',stage:'locate',phase:'complete',demo:true,rules:[],trace:[],counts:{pages:1,found:0,downloaded:0,excluded:0,recognized:0},images:[]};
 return ['none','builtin','community','both','filtered','download','empty','success'].map(id=>{
  const result=structuredClone(base);result.id=id;result.testId='demo-'+id;
  if(['none','filtered'].includes(id)){result.trace=[{reason:id==='none'?'selector-miss':'dimensions'}];result.counts.excluded=id==='filtered'?1:0;return result;}
  const matches=(id==='both'?['builtin.moodle','community.demo1000.images']:[id==='builtin'?'builtin.moodle':'community.demo1000.images']).map(id=>({id,version:'1.0.0'}));
  const image={id:'1',messageId:'synthetic-1',course:'DEMO1000',matches,width:800,height:200,state:id==='download'?'download-error':id==='empty'?'ocr-empty':id==='success'?'recognized':'downloaded',previewUrl:new URL('./demo-table.png',import.meta.url).href};
  if(['empty','success'].includes(id))image.ocr={engine:'browser-wasm',cached:false,observations:id==='empty'?[]:[{text:'Workshop · Monday · 01 · 18:00 · DEMO1'}],records:id==='empty'?[]:[{course:'DEMO1000',date:'2026-09-21',type:'Workshop',group:'01',time:'18:00',code:'DEMO1',status:'preview'}]};
  result.images=[image];result.trace=[{reason:id==='download'?'download-error':'accepted'}];result.counts.found=1;result.counts.downloaded=id==='download'?0:1;result.counts.recognized=image.ocr?1:0;result.phase=id==='download'?'partial':'complete';return result;
 });
}
