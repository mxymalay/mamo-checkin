import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {fixtureRule} from './helpers/source-rules.js';
import {WIZARD_STRINGS} from '../extension/source-rules/practice/wizard-strings.js';
import {installPracticeWizard,createPracticeWizardState} from '../extension/source-rules/practice/wizard-ui.js';

test('six prerequisites, backtracking and invalidation are deterministic',()=>{
 const s=createPracticeWizardState();assert.equal(s.snapshot().step,1);
 assert.throws(()=>s.dispatch({type:'SAVED'}));
 for(const type of ['SOURCE_READY','CONTEXT_SELECTED','IMAGE_SELECTED','PREVIEWED','OCR_FINISHED'])s.dispatch({type});
 assert.equal(s.snapshot().step,6);s.dispatch({type:'BACK',step:3});assert.equal(s.snapshot().step,3);
 s.dispatch({type:'IMAGE_SELECTED'});assert.equal(s.snapshot().step,4);assert.equal(s.snapshot().ocr,null);
 s.dispatch({type:'PREVIEWED'});s.dispatch({type:'OCR_FAILED'});assert.equal(s.snapshot().step,5);
 s.dispatch({type:'ACKNOWLEDGE_OCR_SKIP'});assert.equal(s.snapshot().ocr,'skipped');
 s.dispatch({type:'RULE_CHANGED'});assert.equal(s.snapshot().step,4);
 s.dispatch({type:'SOURCE_LOST'});assert.equal(s.snapshot().step,1);
});

function setup({failOcr=false,emptyOcr=false,extraMatch=false,faults={},ocrWait,cancelWait,saved={rules:[],bindings:{}}}={}){
 const dom=new JSDOM('<section></section>',{url:'https://extension.test/modules.html'}),root=dom.window.document.querySelector('section'),calls=[];
 let revision=0,count=0,connected=0,disconnected=0,state;
 const request=async m=>{
  calls.push(m);
  if(m.type==='practiceSummary')return {saved};
  if(m.type==='practiceCancel'){if(cancelWait)await cancelWait;return {ok:true};}
  if(m.type==='practiceReset'){assert.equal(m.sessionId,undefined,'reset must recover even if the previous session expired');assert.equal(m.revision,undefined);saved={rules:[],bindings:{}};return {ok:true};}
  if(m.type==='practiceOpen'){revision=0;count++;return {sessionId:'p'+count,revision,expiresAt:Date.now()+600000,settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},pages:[{id:7,label:'Sample course'}],saved};}
  assert.equal(m.revision,revision);
  if(m.type==='practicePages')return {sessionId:'p'+count,revision,pages:[{id:7,label:'Sample course'}],saved};
  assert.equal(m.type,'practiceBuilder');const c=m.command;
  if(faults[c.type])throw new Error(faults[c.type]);
  if(c.type==='builderStart')state={phase:'selecting',revision:0,samples:[]};
  if(c.type==='builderStatus'&&state.phase==='selecting')state={phase:'editing',revision:1,rule:fixtureRule({id:'local.practice',name:{en:'Practice'}}),samples:[{sampleId:'s0',course:'DEMO1000',images:[{id:'s0:i1',marked:true}]}],matches:[],canEnable:false};
  if(c.type==='builderStatus'&&extraMatch&&state.samples[0].images.length===1)state.samples[0].images.push({id:'s0:i2'});
  if(c.type==='builderPreview'){const matches=state.samples.flatMap(s=>s.images).filter(i=>i.marked!==false).map(i=>({id:i.id,marked:i.marked,confirmed:false}));state={...state,phase:'previewed',canEnable:matches.every(i=>i.marked===true),matches};}
  if(c.type==='builderConfirm')state={...state,canEnable:c.confirmed,matches:state.matches.map(m=>m.id===c.imageId?{...m,confirmed:c.confirmed}:m)};
  if(c.type==='builderMark')state={...state,revision:state.revision+1,phase:'editing',canEnable:false,matches:[],samples:state.samples.map(s=>({...s,images:s.images.map(i=>i.id===c.imageId?{...i,marked:c.include}:i)}))};
  if(c.type==='builderDraft')state={...state,rule:{...state.rule,id:c.id,name:{en:c.name}},phase:'editing',matches:[],canEnable:false};
  if(c.type==='builderRecognize'&&failOcr)throw new Error('builder-ocr-failed');
  if(c.type==='builderRecognize'&&ocrWait)await ocrWait;
  if(c.type==='builderSave'){const rule={...state.rule,id:c.id||state.rule.id,name:{en:c.name||state.rule.name.en}};saved={rules:[rule],bindings:{DEMO1000:{moodle:[rule.id]}}};}
  const result=c.type==='builderImage'?{mimeType:'image/png',imageBase64:'YWJj'}:c.type==='builderRecognize'?{text:emptyOcr?[]:['123456']}:c.type==='builderSave'?{ok:true,phase:'saved'}:c.type==='builderExport'?{text:JSON.stringify(state.rule)}:state;
  return {sessionId:'p'+count,revision:++revision,state:structuredClone(result),saved};
 };
 const ui=installPracticeWizard({root,request,translate:k=>k,chrome:{runtime:{connect:()=>{connected++;return {disconnect(){disconnected++;}};}}},onBack(){}});
 const click=async action=>{const b=root.querySelector(`[data-practice-action="${action}"]`);assert.ok(b,action);assert.equal(b.disabled,false,action);b.click();await new Promise(r=>setTimeout(r,10));};
 return {dom,root,calls,ui,click,get connected(){return connected;},get disconnected(){return disconnected;}};
}
async function throughPreview(h){await h.ui.open();assert.equal(h.calls.some(m=>m.type==='practiceOpen'),false);await h.click('open-source');await h.click('context');await h.click('pick');await h.click('check-selection');assert.equal(h.root.querySelector('[data-practice-action="preview"]'),null);await h.click('matches-next');}
test('practice uses shared context fields, top-right refresh and metadata row',async()=>{
 const h=setup();try{
  await h.ui.open();await h.click('open-source');
  assert.ok(h.root.querySelector('.creation-toolbar [data-practice-action=refresh]'));
  assert.equal(h.root.querySelectorAll('.creation-context-fields select').length,3);
  for(const action of ['context','pick','check-selection','matches-next','recognize','ocr-next'])await h.click(action);
  assert.equal(h.root.querySelectorAll('.creation-metadata-fields input').length,2);
  assert.ok(h.root.querySelector('.creation-actions [data-practice-action=enable]'));
 }finally{await h.ui.dispose();h.dom.window.close();}
});
test('real command results drive six steps and isolated enable with monotonic wrapper revisions',async()=>{
 const h=setup();try{await throughPreview(h);await h.click('recognize');assert.match(h.root.textContent,/123456/);await h.click('ocr-next');await h.click('enable');assert.ok(h.calls.some(m=>m.command?.type==='builderSave'&&m.command.enable));assert.ok(h.calls.every(m=>m.type.startsWith('practice')));}finally{await h.ui.dispose();h.dom.window.close();}
});
test('only a failed test unlocks skip, and acknowledgement permits isolated simulation',async()=>{
 const h=setup({failOcr:true});try{await throughPreview(h);assert.equal(h.root.querySelector('[data-practice-action="skip"]').disabled,true);assert.equal(h.root.querySelector('[data-practice-action="ocr-next"]').disabled,true);await h.click('recognize');assert.equal(h.root.querySelector('[data-practice-action="ocr-next"]').disabled,true);await h.click('skip');await h.click('enable');assert.ok(h.calls.some(m=>m.command?.acknowledgeOcrSkip===true));assert.equal(h.root.querySelector('[data-practice-action="draft"]'),null);}finally{await h.ui.dispose();h.dom.window.close();}
});
test('OCR errors show their reason in an error notification and can be retried',async()=>{
 const faults={builderRecognize:'engine disconnected'},h=setup({faults});try{
  await throughPreview(h);await h.click('recognize');
  const notice=h.root.querySelector('[role="alert"]');assert.ok(notice);assert.equal(notice.dataset.tone,'error');assert.match(notice.textContent,/engine disconnected/);
  assert.equal(h.root.querySelector('.practice-content > p'),null);
  assert.equal(h.root.querySelector('.practice-content > h3'),null);
  assert.doesNotMatch(notice.textContent,/Operation failed/);
  delete faults.builderRecognize;await h.click('recognize');assert.equal(h.root.querySelector('[role="alert"]'),null);assert.equal(h.root.querySelector('[data-practice-action="ocr-next"]').disabled,false);
 }finally{await h.ui.dispose();h.dom.window.close();}
});
test('changing the OCR image revokes the previous result and final-step access',async()=>{
 const h=setup({extraMatch:true});try{
  await h.ui.open();for(const action of ['open-source','context','pick','check-selection'])await h.click(action);
  const confirm=h.root.querySelector('input[type="checkbox"]');confirm.checked=true;confirm.dispatchEvent(new h.dom.window.Event('change'));await new Promise(r=>setTimeout(r,10));
  assert.equal(h.root.querySelector('.practice-image:nth-child(2) select').value,'include');
  assert.equal(h.root.querySelector('.creation-confirmation'),null);
  await h.click('matches-next');await h.click('recognize');await h.click('ocr-next');await h.click('step-5');
  const image=h.root.querySelector('[name="ocrImage"]');image.value='s0:i2';image.dispatchEvent(new h.dom.window.Event('change'));
  for(const action of ['ocr-next','skip','step-6'])assert.equal(h.root.querySelector(`[data-practice-action="${action}"]`).disabled,true);
 }finally{await h.ui.dispose();h.dom.window.close();}
});
test('name and ID are saved directly; completion survives navigation until reset',async()=>{
 const h=setup();try{await throughPreview(h);await h.click('recognize');assert.equal(h.root.querySelector('[data-practice-action="skip"]').disabled,true);await h.click('ocr-next');const input=h.root.querySelector('[name="ruleId"]');input.value='alice.practice';input.dispatchEvent(new h.dom.window.Event('input'));assert.equal(h.root.querySelector('[data-practice-action="edit-rule"]'),null);await h.click('enable');assert.ok(h.calls.some(m=>m.command?.type==='builderSave'&&m.command.id==='alice.practice'));await h.ui.cancel({preserveCompleted:true});await h.ui.open();assert.equal(h.root.dataset.practiceStep,'6');assert.equal(h.root.querySelector('[name="ruleId"]').value,'alice.practice');await h.click('reset');assert.equal(h.root.dataset.practiceStep,'1');assert.equal(h.root.querySelector('img'),null);assert.ok(h.calls.some(m=>m.type==='practiceReset'));}finally{await h.ui.dispose();h.dom.window.close();}
});
test('marking images refreshes matches automatically and keeps forward actions primary',async()=>{
 const h=setup();try{
  await throughPreview(h);await h.click('step-4');
  const mark=h.root.querySelector('.practice-image select');mark.value='include';mark.dispatchEvent(new h.dom.window.Event('change'));await new Promise(r=>setTimeout(r,15));
  const commands=h.calls.filter(m=>m.command).map(m=>m.command.type),lastMark=commands.lastIndexOf('builderMark');assert.ok(commands.indexOf('builderPreview',lastMark)>lastMark);
  assert.equal(h.root.querySelector('[data-practice-action="matches-next"]').disabled,false);
  assert.ok(h.root.querySelector('[data-practice-action="matches-next"]').classList.contains('primary'));
  const reset=h.root.querySelector('[data-practice-action="reset"]');assert.equal(reset.textContent,'');assert.equal(reset.getAttribute('aria-label'),'Reset practice');
  assert.equal(h.root.querySelectorAll('.practice-step-number').length,6);
 }finally{await h.ui.dispose();h.dom.window.close();}
});
test('an unmatched inclusion/exclusion combination preserves sample thumbnails',async()=>{
 const faults={},h=setup({faults});try{
  await throughPreview(h);await h.click('step-4');
  const sources=[...h.root.querySelectorAll('.practice-image img')].map(img=>img.src);
  assert.ok(sources.every(src=>src.startsWith('data:image/png;base64,')));
  faults.builderPreview='builder-unmatched';
  const mark=h.root.querySelector('.practice-image select');mark.value='exclude';mark.dispatchEvent(new h.dom.window.Event('change'));await new Promise(r=>setTimeout(r,15));
  assert.deepEqual([...h.root.querySelectorAll('.practice-image img')].map(img=>img.src),sources);
  assert.equal(h.root.querySelector('[data-practice-action="matches-next"]').disabled,true);
 }finally{await h.ui.dispose();h.dom.window.close();}
});
test('dispose ignores late open response and cleans up its session',async()=>{
 const dom=new JSDOM('<section/>'),root=dom.window.document.querySelector('section'),calls=[];let resolve;
 const ui=installPracticeWizard({root,translate:k=>k,onBack(){},request:m=>{calls.push(m);return m.type==='practiceOpen'?new Promise(r=>resolve=r):Promise.resolve({ok:true});}});
 await ui.open();root.querySelector('[data-practice-action="open-source"]').click();await ui.dispose();resolve({sessionId:'late',revision:0,pages:[{id:7}],saved:{rules:[]}});await new Promise(r=>setTimeout(r,10));assert.equal(root.children.length,0);assert.ok(calls.some(m=>m.type==='practiceCancel'));dom.window.close();
});
test('empty OCR cannot enable and reset works without opening a source tab',async()=>{
 const h=setup({emptyOcr:true});try{await h.ui.open();await h.click('reset');assert.equal(h.calls.some(m=>m.type==='practiceOpen'),false);await throughPreview(h);await h.click('recognize');assert.match(h.root.textContent,/No text recognized/);assert.equal(h.root.querySelector('[data-practice-action="ocr-next"]').disabled,true);}finally{await h.ui.dispose();h.dom.window.close();}
});
test('polling preserves unsaved text, input focus and selection; export uses wrapped command',async()=>{
 const h=setup();let poll;const timeout=h.dom.window.setTimeout.bind(h.dom.window);
 h.dom.window.setTimeout=(fn,ms)=>ms===3000?(poll=fn,999):timeout(fn,ms);
 try{await throughPreview(h);await h.click('recognize');await h.click('ocr-next');const input=h.root.querySelector('[name="ruleId"]');input.value='alice.unsaved';input.dispatchEvent(new h.dom.window.Event('input'));input.focus();input.setSelectionRange(3,3);poll();await new Promise(r=>setTimeout(r,10));assert.equal(h.root.querySelector('[name="ruleId"]'),input);assert.equal(input.value,'alice.unsaved');assert.equal(h.dom.window.document.activeElement,input);assert.equal(input.selectionStart,3);
 input.value='local.practice';input.dispatchEvent(new h.dom.window.Event('input'));let revoked;h.dom.window.URL.createObjectURL=()=> 'blob:test';h.dom.window.URL.revokeObjectURL=url=>{revoked=url;};h.dom.window.HTMLAnchorElement.prototype.click=()=>{};await h.click('export');assert.equal(revoked,'blob:test');assert.ok(h.calls.some(m=>m.command?.type==='builderExport'));
 }finally{await h.ui.dispose();h.dom.window.close();}
});
test('all locales render six translated steps and supply global string mapping',async()=>{
 const h=setup();try{await h.ui.open();assert.equal(h.root.querySelector('[data-practice-action="back"]'),null);for(const [lang,title] of [['en','Simulated creation'],['zh-CN','模拟创建'],['zh-TW','模擬建立']]){h.dom.window.document.documentElement.lang=lang;h.ui.refreshLanguage();assert.equal(h.root.querySelector('h2'),null);assert.equal(h.root.querySelector('.practice-steps').getAttribute('aria-label'),title);assert.equal(h.root.querySelectorAll('.practice-steps button').length,6);assert.equal(h.root.querySelector('[data-practice-action="step-6"]').disabled,true);}assert.equal(WIZARD_STRINGS['rules.practice-step-6'].en,'Save rule');}finally{await h.ui.dispose();h.dom.window.close();}
});
test('extra matches require explicit confirmation; exclusions invalidate preview',async()=>{
 const h=setup({extraMatch:true});try{await h.ui.open();for(const action of ['open-source','context','pick','check-selection'])await h.click(action);assert.equal(h.root.querySelector('[data-practice-action="matches-next"]').disabled,true);
 const confirm=h.root.querySelector('input[type="checkbox"]');confirm.checked=true;confirm.dispatchEvent(new h.dom.window.Event('change'));await new Promise(r=>setTimeout(r,10));assert.equal(h.root.querySelector('[data-practice-action="matches-next"]').disabled,false);
 const mark=h.root.querySelectorAll('.practice-image select')[1];mark.value='exclude';mark.dispatchEvent(new h.dom.window.Event('change'));await new Promise(r=>setTimeout(r,10));assert.ok(h.calls.some(m=>m.command?.type==='builderMark'&&m.command.include===false));assert.equal(h.root.querySelector('[data-practice-action="matches-next"]').disabled,false);
 }finally{await h.ui.dispose();h.dom.window.close();}
});
test('source loss returns to step one, purges previews and can start a fresh session',async()=>{
 const faults={},h=setup({faults});try{await throughPreview(h);await h.click('step-3');faults.builderStatus='builder-cancelled';await h.click('check-selection');assert.equal(h.root.dataset.practiceStep,'1');assert.equal(h.root.querySelector('img'),null);delete faults.builderStatus;await h.click('open-source');assert.equal(h.root.dataset.practiceStep,'2');assert.equal(h.calls.filter(m=>m.type==='practiceOpen').length,2);}finally{await h.ui.dispose();h.dom.window.close();}
});
test('backtracking cannot retain later prerequisites after a new picker starts',async()=>{
 const h=setup();try{await throughPreview(h);await h.click('recognize');await h.click('ocr-next');await h.click('step-3');await h.click('pick');assert.equal(h.root.querySelector('[data-practice-action="step-6"]').disabled,true);assert.ok(h.calls.some(m=>m.command?.type==='builderCancel'));}finally{await h.ui.dispose();h.dom.window.close();}
});
test('late OCR cannot overwrite a cancelled and reopened wizard',async()=>{
 let release;const ocrWait=new Promise(resolve=>{release=resolve;}),h=setup({ocrWait});
 try{await throughPreview(h);await h.click('recognize');await h.ui.cancel();await h.ui.open();await h.click('open-source');release();await new Promise(r=>setTimeout(r,10));assert.equal(h.root.dataset.practiceStep,'2');assert.doesNotMatch(h.root.textContent,/123456/);assert.equal(h.root.querySelector('[data-practice-action="step-6"]').disabled,true);}finally{release();await h.ui.dispose();h.dom.window.close();}
});
test('expiry cleanup cannot reactivate an owner after a later parent cancellation',async()=>{
 let release,expire;const cancelWait=new Promise(resolve=>{release=resolve;}),h=setup({cancelWait});
 const timeout=h.dom.window.setTimeout.bind(h.dom.window);
 h.dom.window.setTimeout=(fn,ms)=>ms>100000?(expire=fn,999):timeout(fn,ms);
 try{
  await h.ui.open();await h.click('open-source');assert.equal(h.connected,1);
  expire();const cancelled=h.ui.cancel();release();await cancelled;
  assert.equal(h.connected,1);assert.equal(h.disconnected,1);
  h.root.querySelector('[data-practice-action="open-source"]').click();
  assert.equal(h.calls.filter(m=>m.type==='practiceOpen').length,1);
  await h.ui.open();assert.equal(h.connected,2);
 }finally{release();await h.ui.dispose();h.dom.window.close();}
});
test('open waiting for cleanup is invalidated by a subsequent cancel',async()=>{
 let release;const cancelWait=new Promise(resolve=>{release=resolve;}),h=setup({cancelWait});
 try{
  await h.ui.open();const firstCancel=h.ui.cancel(),opening=h.ui.open(),secondCancel=h.ui.cancel();
  release();await Promise.all([firstCancel,opening,secondCancel]);
  assert.equal(h.connected,1);assert.equal(h.disconnected,1);
  await h.ui.open();assert.equal(h.connected,2);
 }finally{release();await h.ui.dispose();h.dom.window.close();}
});
test('dispose invalidates an open waiting for cleanup',async()=>{
 let release;const cancelWait=new Promise(resolve=>{release=resolve;}),h=setup({cancelWait});
 try{
  await h.ui.open();const cancelled=h.ui.cancel(),opening=h.ui.open(),disposed=h.ui.dispose();
  release();await Promise.all([cancelled,opening,disposed]);
  assert.equal(h.connected,1);assert.equal(h.disconnected,1);assert.equal(h.root.children.length,0);
 }finally{release();await h.ui.dispose();h.dom.window.close();}
});
test('uninterrupted expiry reconnects once and ignores its obsolete timer',async()=>{
 let expire;const h=setup(),timeout=h.dom.window.setTimeout.bind(h.dom.window);
 h.dom.window.setTimeout=(fn,ms)=>ms>100000?(expire=fn,999):timeout(fn,ms);
 try{
  await h.ui.open();await h.click('open-source');expire();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.connected,2);assert.equal(h.disconnected,1);assert.equal(h.root.dataset.practiceStep,'1');
  assert.match(h.root.textContent,/Practice session ended/);
  expire();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.connected,2);assert.equal(h.disconnected,1);
  await h.click('open-source');assert.equal(h.root.dataset.practiceStep,'2');
 }finally{await h.ui.dispose();h.dom.window.close();}
});
test('saved practice restores the final step without the removed library section',async()=>{
 const h=setup({saved:{rules:[fixtureRule({id:'local.practice',name:{en:'Import'}})],bindings:{DEMO1000:{moodle:['local.practice']}}}});
 try{
  await h.ui.open();assert.equal(h.root.dataset.practiceStep,'6');
  assert.equal(h.root.querySelector('.practice-library'),null);
  assert.equal(h.root.querySelector('[name="ruleName"]').value,'Import');
  h.dom.window.document.documentElement.lang='zh-TW';h.ui.refreshLanguage();
  assert.equal(h.root.querySelector('[name="ruleName"]').value,'Import');
  assert.equal(h.root.querySelector('[data-practice-action="enable"]').disabled,true);
 }finally{await h.ui.dispose();h.dom.window.close();}
});
