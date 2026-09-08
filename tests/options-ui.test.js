import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const html=await readFile(new URL('../extension/options.html',import.meta.url),'utf8');

function installDom(sendMessage){
  const dom=new JSDOM(html,{url:'https://extension.test/options.html'});
  globalThis.window=dom.window;
  globalThis.document=dom.window.document;
  globalThis.Blob=dom.window.Blob;
  globalThis.URL=dom.window.URL;
  const listeners=[];
  globalThis.chrome={runtime:{id:'test',sendMessage},storage:{onChanged:{addListener(fn){listeners.push(fn);}}}};
  const intervals=[];
  globalThis.setInterval=(fn,ms)=>{intervals.push({fn,ms});return intervals.length;};
  return {dom,listeners,intervals};
}

function cleanDom(originalSetInterval){
  globalThis.setInterval=originalSetInterval;
  delete globalThis.chrome;
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.Blob;
  delete globalThis.URL;
}

const baseState={settings:{enabled:true,courses:[]},records:[]};

test('importing a personal file saves settings and refreshes the visible fields',async()=>{
  const originalSetInterval=globalThis.setInterval,saved=[];
  const state={settings:{enabled:false,email:'',name:'',courses:[]},records:[]};
  const settings={enabled:true,email:'abcd1234@student.monash.edu',name:'Example Student',academicYear:2026,intervalMinutes:15,courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'},moodleUrls:{ABC1234:[]},schedules:{ABC1234:[{weekday:2,time:'18:00',type:'Workshop',group:'01'}]}};
  const env=installDom(async payload=>{
    if(payload.type==='health')return {ok:true,binaryReady:true};
    if(payload.type==='settings'){saved.push(payload.settings);state.settings=payload.settings;return {ok:true};}
    return state;
  });
  try{
    await import(`../extension/options.js?import=${Date.now()}`);
    await new Promise(resolve=>setTimeout(resolve,0));
    const input=document.getElementById('settings-file');
    Object.defineProperty(input,'files',{value:[{size:500,text:async()=>JSON.stringify({format:'attendance-settings-v1',settings})}]});
    input.dispatchEvent(new env.dom.window.Event('change'));
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(saved.length,1);assert.equal(saved[0].email,settings.email);
    assert.equal(document.getElementById('email').value,'abcd1234');
    assert.equal(document.querySelector('#courses [data-field="course"]').value,'ABC1234');
    assert.equal(document.querySelector('#courses [data-field="weekly-count"]').value,'1');
    assert.equal(document.querySelector('#courses [data-field="weekday"]').value,'2');
    assert.equal(document.querySelector('#courses [data-field="time"]').value,'18:00');
    assert.equal(document.getElementById('enabled').checked,true);
    assert.match(document.getElementById('notice').textContent,/已导入并保存/);
  }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('configuration import lives in the header and source help is keyboard accessible',()=>{
  const dom=new JSDOM(html),{document}=dom.window;
  const header=document.querySelector('header');
  assert.equal(header.contains(document.getElementById('import-settings')),true);
  assert.equal(header.contains(document.getElementById('settings-file')),true);
  assert.equal(document.getElementById('source-help'),null);
  assert.match(document.body.textContent,/可关闭本页面/);
  dom.window.close();
});

test('weekly schedule rows render from settings and save exactly the selected sessions',async()=>{
  const originalSetInterval=globalThis.setInterval,saved=[];
  const settings={enabled:true,email:'abcd1234@student.monash.edu',name:'Example Student',academicYear:2026,intervalMinutes:15,mailQuery:'attendance',courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'},subjectKeywords:{ABC1234:'ABC1234'},moodleUrls:{ABC1234:[]},schedules:{ABC1234:[{weekday:1,time:'09:00',type:'Lecture',group:''},{weekday:4,time:'14:30',type:'Workshop',group:'02'}]}};
  const state={settings,records:[],status:{}};
  const env=installDom(async payload=>{if(payload.type==='health')return {ok:true,binaryReady:false};if(payload.type==='settings'){saved.push(payload.settings);return {ok:true};}return state;});
  try{
    await import(`../extension/options.js?schedules=${Date.now()}`);await new Promise(resolve=>setTimeout(resolve,0));
    const rule=document.querySelector('.course-rule');
    assert.equal(rule.querySelector('[data-field="weekly-count"]').value,'2');
    assert.deepEqual([...rule.querySelectorAll('[data-field="weekday"]')].map(node=>node.value),['1','4']);
    rule.querySelector('[data-field="weekly-count"]').value='1';rule.querySelector('[data-field="weekly-count"]').dispatchEvent(new env.dom.window.Event('change',{bubbles:true}));
    document.getElementById('settings').dispatchEvent(new env.dom.window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,0));
    assert.deepEqual(saved[0].schedules,{ABC1234:[{weekday:1,time:'09:00',type:'Lecture',group:''}]});
  }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('a fresh empty configuration asks for setup without inserting identity data',async()=>{
  const originalSetInterval=globalThis.setInterval;
  const state={settings:{enabled:false,email:'',name:'',courses:[]},records:[],status:{}};
  const env=installDom(async payload=>payload.type==='health'?{ok:true,binaryReady:false,busy:false,stage:'idle'}:state);
  try{
    await import(`../extension/options.js?fresh=${Date.now()}`);
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(document.getElementById('status').textContent,'请先填写邮箱、姓名和至少一门课程');
    assert.equal(document.getElementById('email').value,'');
    assert.equal(document.getElementById('name').value,'');
    assert.equal(document.querySelectorAll('#courses .course-rule').length,0);
    document.getElementById('add-course').click();
    assert.equal(document.querySelectorAll('#courses .course-rule').length,1);
    assert.equal(document.querySelector('#courses [data-field="course"]').value,'');
    assert.match(document.querySelector('#courses [data-field="course"]').placeholder,/ABC1234/);
  }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('a pending health request cannot block status refresh setup or storage progress updates',async()=>{
  const originalSetInterval=globalThis.setInterval;
  let statusCalls=0;
  let resolveHealth;const healthPending=new Promise(resolve=>{resolveHealth=resolve;});
  const state={...baseState,status:{running:false,message:'等待首次检查'}};
  const env=installDom(async payload=>{
    if(payload.type==='health')return healthPending;
    if(payload.type==='status'){statusCalls++;return state;}
    throw new Error('unexpected request');
  });
  try{
    await Promise.race([
      import(`../extension/options.js?pending-health=${Date.now()}`),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('options initialization blocked on health')),100))
    ]);
    assert.equal(env.intervals.some(({ms})=>ms<=2000),true);
    assert.equal(env.listeners.length,1);
    state.status={running:true,message:'正在识别图片',updatedAt:Date.now()};
    env.listeners[0]({status:{newValue:state.status}},'local');
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.ok(statusCalls>=2);
    assert.equal(document.getElementById('status').textContent,'正在识别图片');
    resolveHealth({ok:true});await new Promise(resolve=>setTimeout(resolve,0));
  }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('running status renders context, counters, elapsed timing and recent event details',async()=>{
  const originalSetInterval=globalThis.setInterval;
  const now=Date.now(),iso=value=>new Date(value).toISOString();
  const state={...baseState,status:{
    running:true,startedAt:iso(now-65000),stepStartedAt:iso(now-5000),updatedAt:iso(now-2000),
    message:'正在识别图片',context:{course:'FIT5120',subject:'Week 3 attendance',sourceUrl:'https://learning.monash.edu/mod/forum/view.php?id=12',page:3},
    counts:{pages:4,messages:12,images:3,cached:2,records:1,skipped:5},
    events:[{at:iso(now-4000),message:'下载签到图片',level:'info',context:{sourceUrl:'https://learning.monash.edu/mod/forum/view.php?id=12'} }],
    service:{stage:'recognizing',updatedAt:iso(now-1000),busy:true}
  }};
  const env=installDom(async payload=>payload.type==='health'?{ok:true,binaryReady:true,busy:true,stage:'recognizing'}:state);
  try{
    await import(`../extension/options.js?details=${Date.now()}`);
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.match(document.getElementById('run-context').textContent,/FIT5120.*Week 3 attendance.*第 3 页/s);
    assert.match(document.getElementById('run-timing').textContent,/总用时 1:0[45].*当前步骤 0:0[45].*2 秒前更新/s);
    assert.deepEqual([...document.querySelectorAll('#run-counts dd')].map(node=>node.textContent),['4','12','3','2','1','5']);
    assert.match(document.getElementById('run-events').textContent,/下载签到图片/);
    const link=document.querySelector('#run-events a');
    assert.equal(link?.href,'https://learning.monash.edu/mod/forum/view.php?id=12');
    assert.equal(document.getElementById('health').textContent,'正在识别');
  }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('bursts of progress notifications never overlap status requests',async()=>{
  const originalSetInterval=globalThis.setInterval;
  let statusCalls=0,active=0,maxActive=0,release;
  const state={...baseState,status:{running:true,message:'正在检查',updatedAt:Date.now()}};
  const env=installDom(async payload=>{
    if(payload.type==='health')return {ok:true,binaryReady:false,busy:false,stage:'idle'};
    statusCalls++;if(statusCalls===1)return state;
    active++;maxActive=Math.max(maxActive,active);
    await new Promise(resolve=>{release=resolve;});active--;return state;
  });
  try{
    await import(`../extension/options.js?no-overlap=${Date.now()}`);
    await new Promise(resolve=>setTimeout(resolve,0));
    env.listeners[0]({status:{newValue:state.status}},'local');
    env.listeners[0]({status:{newValue:state.status}},'local');
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(statusCalls,2);
    assert.equal(maxActive,1);
    release();
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(statusCalls,3);
    assert.equal(maxActive,1);
    release();
    await new Promise(resolve=>setTimeout(resolve,0));
  }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('save and scan acknowledge clicks before the background replies',async()=>{
 const originalSetInterval=globalThis.setInterval;let resolveSave,resolveScan;
 const state={settings:{enabled:true,email:'abcd1234@student.monash.edu',name:'Example Student',courses:[]},records:[]};
 const env=installDom(async p=>p.type==='health'?{ok:true,binaryReady:true}:p.type==='settings'?new Promise(r=>{resolveSave=r;}):p.type==='scan'?new Promise(r=>{resolveScan=r;}):state);
 try{
  await import(`../extension/options.js?feedback=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  document.getElementById('settings').dispatchEvent(new env.dom.window.Event('submit',{cancelable:true}));
  assert.match(document.getElementById('notice').textContent,/正在保存/);assert.equal(document.getElementById('notice').dataset.tone,'info');
  assert.equal(document.querySelector('#settings button[type="submit"]').disabled,true);
  resolveSave({ok:true});await new Promise(r=>setTimeout(r,0));
  document.getElementById('scan').click();
  assert.match(document.getElementById('notice').textContent,/正在请求/);
  assert.equal(document.getElementById('scan').disabled,true);
  resolveScan({ok:true});await new Promise(r=>setTimeout(r,0));
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('records include weekdays and each course field has its own help',async()=>{
 const originalSetInterval=globalThis.setInterval;
 const state={settings:{enabled:true,courses:['ABC1234'],schedules:{ABC1234:[{weekday:2,time:'18:00'}]}},records:[{date:'2026-09-08',time:'18:00',course:'ABC1234'}]};
 const env=installDom(async p=>p.type==='health'?{ok:true}:state);
 try{
  await import(`../extension/options.js?weekday=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  assert.match(document.getElementById('records').textContent,/2026-09-08.*星期二/);
  for(const field of ['sender','urls','weekly-count'])assert.ok(document.querySelector(`[data-field="${field}"]`).closest('label').querySelector('.help-button'),field);
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('finished run replaces the pending scan notice',async()=>{
 const originalSetInterval=globalThis.setInterval;
 const state={settings:{enabled:true,email:'abcd1234@student.monash.edu',name:'Example Student',courses:[]},records:[],status:{finishedAt:'2026-09-07T00:00:00Z'}};
 const env=installDom(async p=>p.type==='health'?{ok:true}:p.type==='scan'?{ok:true}:state);
 try{
  await import(`../extension/options.js?finished-notice=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  document.getElementById('scan').click();await new Promise(r=>setTimeout(r,0));
  assert.match(document.getElementById('notice').textContent,/等待运行状态/);
  state.status={running:false,finishedAt:'2026-09-08T00:00:00Z',message:'本次检查完成'};
  env.listeners[0]({status:{newValue:state.status}},'local');await new Promise(r=>setTimeout(r,0));
  assert.match(document.getElementById('notice').textContent,/检查完成/);
  assert.doesNotMatch(document.getElementById('notice').textContent,/已开始|等待/);
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});
test('interval choices are exactly one, three, five and seven days',()=>{
 const dom=new JSDOM(html);
 assert.deepEqual([...dom.window.document.querySelectorAll('#interval option')].map(o=>o.value),['1440','4320','7200','10080']);
 assert.equal(dom.window.document.getElementById('interval').value,'1440');dom.window.close();
});

test('unanswered save reports timeout and restores its button',async()=>{
 const originalSetInterval=globalThis.setInterval,originalTimeout=globalThis.setTimeout;
 const state={settings:{enabled:true,email:'abcd1234@student.monash.edu',name:'Example Student',courses:[]},records:[]};
 const env=installDom(async p=>p.type==='health'?{ok:true}:p.type==='settings'?new Promise(()=>{}):state);
 try{
  await import(`../extension/options.js?timeout=${Date.now()}`);await new Promise(r=>originalTimeout(r,0));
  globalThis.setTimeout=(fn,ms,...args)=>originalTimeout(fn,ms===10000?5:ms,...args);
  document.getElementById('settings').dispatchEvent(new env.dom.window.Event('submit',{cancelable:true}));
  await new Promise(r=>originalTimeout(r,20));
  assert.match(document.getElementById('notice').textContent,/响应超时.*尚未确认/);
  assert.equal(document.querySelector('#settings button[type="submit"]').disabled,false);
 }finally{globalThis.setTimeout=originalTimeout;env.dom.window.close();cleanDom(originalSetInterval);}
});

test('native form validation gives visible feedback without sending a save',async()=>{
 const originalSetInterval=globalThis.setInterval;let saves=0;
 const env=installDom(async p=>{if(p.type==='settings')saves++;return p.type==='health'?{ok:true}:{settings:{},records:[]};});
 try{
  await import(`../extension/options.js?invalid=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  document.querySelector('#settings button[type="submit"]').click();
  assert.equal(saves,0);assert.match(document.getElementById('notice').textContent,/无法保存/);
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('copy button writes exactly the attendance code and reports success or failure',async()=>{
 const originalSetInterval=globalThis.setInterval;const copied=[];
 const state={settings:{},records:[{code:'ABC12',date:'2026-09-08'},{code:null}]};
 const env=installDom(async p=>p.type==='health'?{ok:true}:state);
 Object.defineProperty(env.dom.window.navigator,'clipboard',{value:{writeText:async text=>{copied.push(text);}}});
 try{
  await import(`../extension/options.js?copy=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  const buttons=document.querySelectorAll('.copy-code');assert.equal(buttons.length,1);
  buttons[0].click();await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(copied,['ABC12']);assert.equal(buttons[0].textContent,'已复制');assert.equal(document.getElementById('notice').dataset.tone,'success');
  env.dom.window.navigator.clipboard.writeText=async()=>{throw new Error('denied');};
  buttons[0].click();await new Promise(r=>setTimeout(r,0));
  assert.match(document.getElementById('notice').textContent,/复制失败/);assert.equal(document.getElementById('notice').dataset.tone,'error');assert.equal(buttons[0].disabled,false);
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('source selection reveals matching fields and saves only enabled sources',async()=>{
 const originalSetInterval=globalThis.setInterval,saved=[];
 const state={settings:{enabled:true,email:'abcd1234@student.monash.edu',name:'Example Student',courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'},moodleUrls:{ABC1234:['https://learning.monash.edu/course/view.php?id=1']}},records:[]};
 const env=installDom(async p=>{if(p.type==='settings'){saved.push(p.settings);state.settings=p.settings;return {ok:true};}return p.type==='health'?{ok:true}:state;});
 try{
  await import(`../extension/options.js?source-choice=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  const rule=document.querySelector('.course-rule'),mode=rule.querySelector('[data-field="source-mode"]');
  assert.equal(mode.value,'both');assert.equal(rule.querySelector('.mail-fields').hidden,false);assert.equal(rule.querySelector('.moodle-fields').hidden,false);
  mode.value='email';mode.dispatchEvent(new env.dom.window.Event('change'));
  assert.equal(rule.querySelector('.moodle-fields').hidden,true);assert.equal(rule.querySelector('[data-field="urls"]').disabled,true);
  mode.value='moodle';mode.dispatchEvent(new env.dom.window.Event('change'));
  assert.equal(rule.querySelector('.mail-fields').hidden,true);assert.equal(rule.querySelector('[data-field="sender"]').disabled,true);
  document.getElementById('settings').dispatchEvent(new env.dom.window.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,0));
  assert.equal(saved[0].senders.ABC1234,'');assert.equal(saved[0].moodleUrls.ABC1234.length,1);
  assert.equal(document.querySelector('[data-field="source-mode"]').value,'moodle');
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('completion dialog requests confirmation for no data and does not repeat on refresh',async()=>{
 const originalSetInterval=globalThis.setInterval;
 const state={settings:{enabled:true,courses:['ABC1234']},records:[],status:{running:true}};
 const env=installDom(async p=>p.type==='health'?{ok:true}:state);
 try{
  await import(`../extension/options.js?dialog=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  const help=document.querySelector('[data-field="weekly-count"]').closest('label').querySelector('.tooltip');assert.match(help.textContent,/自动检测或手动填写/);
  state.status={running:false,finishedAt:'2026-09-08T01:00:00Z',summary:{submitted:0,detected:0,needsConfirmation:true,records:[]}};
  env.listeners[0]({status:{newValue:state.status}},'local');await new Promise(r=>setTimeout(r,0));
  assert.equal(document.getElementById('result-success-icon').hidden,true);assert.equal(document.getElementById('result-title').textContent,'签到待确认');assert.match(document.getElementById('result-message').textContent,/请确认/);
  document.getElementById('result-close').click();
  env.listeners[0]({status:{newValue:state.status}},'local');await new Promise(r=>setTimeout(r,0));
  assert.equal(document.getElementById('result-dialog').hasAttribute('open'),false);
  state.status={running:true};env.listeners[0]({status:{newValue:state.status}},'local');await new Promise(r=>setTimeout(r,0));
  state.status={running:false,finishedAt:'2026-09-08T02:00:00Z',error:true,message:'网络请求失败'};
  env.listeners[0]({status:{newValue:state.status}},'local');await new Promise(r=>setTimeout(r,0));
  assert.equal(document.getElementById('result-title').textContent,'签到未全部完成');
  assert.equal(document.getElementById('result-success-icon').hidden,true);
  state.status={running:true};env.listeners[0]({status:{newValue:state.status}},'local');await new Promise(r=>setTimeout(r,0));
  state.status={running:false,finishedAt:'2026-09-08T03:00:00Z',summary:{submitted:1,detected:1,records:[]}};
  env.listeners[0]({status:{newValue:state.status}},'local');await new Promise(r=>setTimeout(r,0));
  assert.equal(document.getElementById('result-success-icon').hidden,false);assert.ok(document.querySelector('#result-success-icon svg path'));
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('first visit discovers course drafts before source selection without saving',async()=>{
 const originalSetInterval=globalThis.setInterval;let discoveries=0,saves=0;
 const env=installDom(async p=>{if(p.type==='redetect'){discoveries++;return {ok:true,courses:['ABC1234'],schedules:{ABC1234:[{weekday:2,time:'18:00',type:'Studio',group:'01'}]},issues:[]};}if(p.type==='settings')saves++;return p.type==='health'?{ok:true}:{settings:{courses:[]},records:[],discoveryAvailable:true};});
 try{
  env.dom.window.confirm=()=>true;
  await import(`../extension/options.js?onboard=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  assert.equal(discoveries,1);assert.equal(saves,0);assert.equal(document.querySelector('[data-field="course"]').value,'ABC1234');
  assert.equal(document.querySelector('[data-field="source-mode"]').value,'');assert.equal(document.querySelector('.mail-fields').hidden,true);assert.equal(document.querySelector('.moodle-fields').hidden,true);
  assert.equal(document.querySelector('[data-field="time"]').value,'18:00');assert.equal(document.querySelector('[data-field="time"]').disabled,false);
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('records switch by course and group into labeled weeks',async()=>{
 const originalSetInterval=globalThis.setInterval;
 const env=installDom(async p=>p.type==='health'?{ok:true}:{settings:{},records:[{course:'ABC1234',date:'2026-09-08',subject:'Week 7',code:'ABC12'},{course:'DEF1234',date:'2026-09-07',code:'DEF34'}]});
 try{
  await import(`../extension/options.js?tabs=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  assert.match(document.querySelector('.week-heading').textContent,/Week 7/);assert.doesNotMatch(document.getElementById('records').textContent,/DEF34/);
  document.querySelectorAll('#record-course-tabs button')[1].click();assert.match(document.getElementById('records').textContent,/DEF34/);assert.match(document.querySelector('.week-heading').textContent,/自然周/);
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('schedules start collapsed, help is selective, and destructive actions require confirmation',async()=>{
 const originalSetInterval=globalThis.setInterval;const calls=[];
 const state={settings:{courses:['ABC1234'],schedules:{ABC1234:[{weekday:2,time:'18:00'}]}},records:[]};
 const env=installDom(async p=>{calls.push(p.type);return p.type==='health'?{ok:true}:p.type==='clearCourses'?{ok:true}:state;});
 try{
  await import(`../extension/options.js?collapse-confirm=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  assert.equal(document.querySelector('.schedule-details').open,false);assert.match(document.querySelector('.schedule-details summary').textContent,/1 场/);
  for(const field of ['course','weekday','time','type','group'])assert.equal(document.querySelector(`[data-field="${field}"]`).closest('label').querySelector('.help-button'),null);
  env.dom.window.confirm=()=>false;document.getElementById('redetect').click();document.getElementById('clear-courses').click();await new Promise(r=>setTimeout(r,0));
  assert.equal(calls.includes('redetect'),false);assert.equal(calls.includes('clearCourses'),false);
  env.dom.window.confirm=()=>true;document.getElementById('clear-courses').click();await new Promise(r=>setTimeout(r,0));assert.equal(calls.filter(c=>c==='clearCourses').length,1);
  assert.ok(document.querySelector('.course-actions').contains(document.getElementById('redetect')));
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('finished feedback disappears after five seconds',async()=>{
 const originalSetInterval=globalThis.setInterval,originalTimeout=globalThis.setTimeout;
 const env=installDom(async p=>p.type==='health'?{ok:true}:{settings:{},records:[{date:'2026-09-08',course:'ABC1234',code:'ABC12'}]});
 Object.defineProperty(env.dom.window.navigator,'clipboard',{value:{writeText:async()=>{}}});let expire;
 try{
  await import(`../extension/options.js?toast-expiry=${Date.now()}`);await new Promise(r=>originalTimeout(r,0));
  globalThis.setTimeout=(fn,ms,...args)=>{if(ms===5000){expire=fn;return {unref(){}};}return originalTimeout(fn,ms,...args);};
  document.querySelector('.copy-code').click();await new Promise(r=>originalTimeout(r,0));
  assert.equal(document.getElementById('notice').hidden,false);assert.equal(typeof expire,'function');
  expire();assert.equal(document.getElementById('notice').hidden,true);assert.equal(document.getElementById('notice').textContent,'');
 }finally{globalThis.setTimeout=originalTimeout;env.dom.window.close();cleanDom(originalSetInterval);}
});

test('first visit cancelled discovery does not read course pages or prompt again on refresh',async()=>{
 const originalSetInterval=globalThis.setInterval;let prompts=0,discoveries=0;
 const env=installDom(async p=>{if(p.type==='redetect')discoveries++;return p.type==='health'?{ok:true}:{settings:{courses:[]},records:[],discoveryAvailable:true};});
 env.dom.window.confirm=()=>{prompts++;return false;};
 try{
  await import('../extension/options.js?cancel-onboarding='+Date.now());await new Promise(r=>setTimeout(r,0));
  env.listeners[0]({status:{newValue:{}}},'local');await new Promise(r=>setTimeout(r,0));
  assert.equal(prompts,1);assert.equal(discoveries,0);assert.equal(document.querySelectorAll('.course-rule').length,0);
  assert.deepEqual([...document.querySelector('.header-actions').children].filter(e=>!e.hidden).map(e=>e.id),['import-settings','export-settings','mode']);
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('save is hidden without courses and follows adding or removing the last course',async()=>{
 const originalSetInterval=globalThis.setInterval;
 const env=installDom(async p=>p.type==='health'?{ok:true}:{settings:{courses:[]},records:[]});
 try{
  await import('../extension/options.js?empty-save='+Date.now());await new Promise(r=>setTimeout(r,0));
  const save=document.querySelector('#settings button[type=submit]');assert.equal(save.hidden,true);
  document.getElementById('add-course').click();assert.equal(save.hidden,false);
  document.querySelector('.rule-head>button').click();assert.equal(save.hidden,true);
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});

test('setup gates course discovery until service installation and offers reload on recovery',async()=>{
 const originalSetInterval=globalThis.setInterval;let ready=false,discoveries=0;
 const env=installDom(async p=>{if(p.type==='redetect')discoveries++;return p.type==='health'?{ok:true,binaryReady:ready}:{settings:{courses:[]},records:[],setupGuide:true,discoveryAvailable:true};});
 try{
  await import('../extension/options.js?install-gate='+Date.now());await new Promise(r=>setTimeout(r,0));
  assert.equal(document.body.dataset.setup,'install');assert.equal(discoveries,0);
  assert.ok(env.intervals.some(i=>i.ms===5000));
  ready=true;document.getElementById('setup-check').click();await new Promise(r=>setTimeout(r,0));
  assert.equal(document.getElementById('setup-reload').hidden,false);assert.equal(document.body.dataset.setup,'install');assert.equal(discoveries,0);
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});
test('unchanged form input does not block check but a real edit does',async()=>{
 const originalSetInterval=globalThis.setInterval;let scans=0;
 const state={settings:{enabled:true,email:'abcd1234@student.monash.edu',name:'Example Student',courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'}},records:[]};
 const env=installDom(async p=>{if(p.type==='scan'){scans++;return {ok:true};}return p.type==='health'?{ok:true,binaryReady:true}:state;});
 try{
  await import(`../extension/options.js?dirty-regression=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  const input=document.getElementById('email');input.dispatchEvent(new env.dom.window.Event('input',{bubbles:true}));
  document.getElementById('scan').click();await new Promise(r=>setTimeout(r,0));assert.equal(scans,1);
  input.value='changed@example.edu';input.dispatchEvent(new env.dom.window.Event('input',{bubbles:true}));
  document.getElementById('scan').click();await new Promise(r=>setTimeout(r,0));assert.equal(scans,1);
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});
test('manual check needs no automatic switch and saves changed settings before scanning',async()=>{
 const originalSetInterval=globalThis.setInterval,calls=[];
 const state={settings:{enabled:false,email:'abcd1234@student.monash.edu',name:'Example Student',courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'}},records:[]};
 const env=installDom(async p=>{if(p.type==='settings'){calls.push('save');state.settings=p.settings;return {ok:true};}if(p.type==='scan'){calls.push('scan');return {ok:true};}return p.type==='health'?{ok:true,binaryReady:true}:state;});
 try{
  await import(`../extension/options.js?manual-saved=${Date.now()}`);await new Promise(r=>setTimeout(r,0));
  document.getElementById('scan').click();await new Promise(r=>setTimeout(r,0));assert.deepEqual(calls,['scan']);assert.equal(state.settings.enabled,false);
  const input=document.getElementById('name');input.value='Updated Student';input.dispatchEvent(new env.dom.window.Event('input',{bubbles:true}));
  assert.equal(document.getElementById('scan').textContent,'保存并立即签到');document.getElementById('scan').click();await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(calls,['scan','save','scan']);assert.equal(state.settings.name,'Updated Student');assert.equal(state.settings.enabled,false);
  assert.ok(document.getElementById('save-general').closest('.columns'));
 }finally{env.dom.window.close();cleanDom(originalSetInterval);}
});
