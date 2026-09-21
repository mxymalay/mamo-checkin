import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createSetupGuide} from '../extension/setup-guide.js';
import {normalizeIdentity} from '../extension/settings.js';
function make(){const dom=new JSDOM('<body><header></header></body>');let reloads=0,detects=0;const calls=[];const guide=createSetupGuide({doc:dom.window.document,request:async p=>{calls.push(p);},refresh:async()=>{},detect:()=>detects++,checkHealth:()=>{},reload:()=>reloads++});return {dom,guide,calls,get reloads(){return reloads;},get detects(){return detects;}};}
test('Windows starts with identity and has no Mac installer or helper download',()=>{
 const dom=new JSDOM('<body><header></header></body>'),doc=dom.window.document;
 const guide=createSetupGuide({windows:true,doc,request:async()=>({}),refresh(){},detect(){},checkHealth(){},reload(){}});
 guide.update({setupGuide:true,settings:{}});
 assert.equal(doc.body.dataset.setup,'identity');
 assert.equal(guide.needsHealth(),false);
 assert.doesNotMatch(doc.body.textContent,/Mac|macOS|\.command/);
 assert.equal(doc.querySelector('a[href*="mamo-ocr"]'),null);
 assert.equal(doc.querySelectorAll('.setup-steps li').length,2);
 dom.window.close();
});
test('setup import and reset share the row above the separator',()=>{
 const e=make(),doc=e.dom.window.document;e.guide.update({setupGuide:true,settings:{}});
 const toolbar=doc.querySelector('.setup-toolbar-row');
 assert.ok(toolbar);
 assert.equal(toolbar.firstElementChild.id,'setup-import');
 assert.equal(toolbar.lastElementChild.id,'setup-reset');
 assert.equal(doc.querySelector('#setup-import').parentElement,toolbar);
 assert.equal(doc.querySelector('#setup-reset').parentElement,toolbar);
 e.dom.window.close();
});
test('missing service gates the whole workflow and recovery advances automatically',()=>{
 const e=make(),doc=e.dom.window.document;e.guide.update({setupGuide:true,settings:{}});
 assert.equal(doc.body.dataset.setup,'install');e.guide.health(null,'not installed');assert.equal(e.guide.needsHealth(),true);
 e.guide.health({binaryReady:true});assert.equal(doc.body.dataset.setup,'identity');assert.equal(doc.getElementById('setup-reload')!==null,true);assert.equal(doc.getElementById('setup-reload').hidden,true);assert.equal(e.reloads,0);assert.equal(e.detects,0);e.dom.window.close();
});
test('fresh ready service advances through identity and automatically detects courses before full dashboard',async()=>{
 const e=make(),doc=e.dom.window.document;e.guide.update({setupGuide:true,settings:{}});e.guide.health({binaryReady:true});assert.equal(doc.body.dataset.setup,'identity');
 e.guide.update({setupGuide:true,settings:{name:'Example Student',courses:[]}});assert.equal(doc.body.dataset.setup,'courses');
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(e.detects,1);assert.equal(doc.querySelector('.setup-links'),null);assert.equal(doc.querySelector('#setup-edit-identity').open,false);assert.equal(doc.querySelector('#setup-edit-identity summary').textContent,'需要修改姓名？');
 assert.equal(doc.querySelectorAll('[data-setup="courses"]>p').length,1);assert.equal(doc.querySelector('.setup-course-header h2').textContent,'课程配置');assert.equal(doc.querySelector('.setup-course-header #setup-edit-identity')!==null,true);
 e.guide.update({setupGuide:true,settings:{name:'Example Student',courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'}}});assert.equal(doc.body.dataset.setup,'complete');assert.equal(doc.getElementById('setup-guide').hidden,true);e.dom.window.close();
});
test('identity can be validated before courses exist and cannot change an account with records',()=>{
 assert.deepEqual(normalizeIdentity({}, {email:' ABCD1234@Student.Monash.edu ',name:' Example Student '}),{email:'abcd1234@student.monash.edu',name:'Example Student'});
 assert.throws(()=>normalizeIdentity({}, {email:'bad',name:'Student'}),/4 个英文字母/);
 assert.throws(()=>normalizeIdentity({email:'oldx1234@student.monash.edu',name:'Old'},{email:'newx1234@student.monash.edu',name:'New'},true),/记录/);
});
test('the install step stays until health passes and offers the browser OCR skip',async()=>{
 const dom=new JSDOM('<body><header></header></body>'),doc=dom.window.document;let skips=0;
 const guide=createSetupGuide({doc,request:async()=>({ok:true}),skipOcr:async()=>{skips++;},refresh:async()=>{},detect:()=>{},checkHealth:()=>{},reload:()=>{}});
 guide.update({setupGuide:true,settings:{}});guide.health({binaryReady:false});
 assert.equal(doc.body.dataset.setup,'install');
 assert.equal(doc.getElementById('setup-skip-ocr').hidden,false);
 assert.equal(guide.needsHealth(),true);
 doc.getElementById('setup-skip-ocr').click();
 await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(skips,1);
 assert.equal(guide.needsHealth(),false);
 assert.equal(doc.body.dataset.setup,'identity');
 dom.window.close();
});
test('a saved browser-OCR preference skips the install step on later visits',()=>{
 const dom=new JSDOM('<body><header></header></body>'),doc=dom.window.document;
 const guide=createSetupGuide({doc,request:async()=>({ok:true}),refresh:async()=>{},detect:()=>{},checkHealth:()=>{},reload:()=>{}});
 guide.update({setupGuide:true,ocrPreference:'browser',settings:{}});
 assert.equal(doc.body.dataset.setup,'identity');
 assert.equal(guide.needsHealth(),false);
 dom.window.close();
});
test('failed native startup stops automatic retries until manual recovery',()=>{
 const e=make(),doc=e.dom.window.document;e.guide.update({setupGuide:true,settings:{}});
 e.guide.health({binaryReady:false,nativeBlocked:true,healthError:'请在隐私与安全性允许 attendance-ocr'});
 assert.equal(e.guide.needsHealth(),false);assert.equal(doc.body.dataset.setup,'install');
 assert.match(doc.getElementById('setup-check').textContent,/重新检测/);
 e.guide.health({binaryReady:true});assert.equal(doc.body.dataset.setup,'identity');assert.equal(doc.getElementById('setup-reload').hidden,true);e.dom.window.close();
});
test('Windows native setup errors do not mix raw English into Chinese status text',()=>{
 const e=make(),doc=e.dom.window.document;e.guide.update({setupGuide:true,settings:{}});
 e.guide.health({binaryReady:false,healthError:'Install Tesseract OCR with English language data, then click Check service again.'});
 assert.doesNotMatch(doc.getElementById('setup-health').textContent,/Install Tesseract OCR with English language data/);
 assert.match(doc.getElementById('setup-health').textContent,/Tesseract OCR/);
 e.dom.window.close();
});
test('install guide uses one waiting health indicator and separates the macOS help',()=>{
 const e=make(),doc=e.dom.window.document,section=doc.querySelector('[data-setup="install"]');
 assert.equal(doc.querySelector('.setup-toolbar').hidden,true);
 assert.doesNotMatch(section.textContent,/完成这一步后，才能识别签到图片/);
 assert.equal(section.querySelector('a[href$="mamo-ocr-mac.zip"]').textContent,'下载 Mac OCR 配套程序');
 assert.equal(section.querySelector('.setup-instructions').firstElementChild.querySelector('.authorization-title').textContent,'第一步：下载 Mac OCR 配套包');
 assert.equal(section.querySelector('.setup-instructions').children[1].querySelector('.authorization-title').textContent,'第二步：打开解压后的 OCR 包。');
 assert.match(section.querySelector('.setup-instructions').lastElementChild.querySelector('.authorization-title').textContent,/第三步：回到此页面/);
 assert.equal(section.querySelectorAll('.setup-step-panel').length,3);assert.equal(section.querySelectorAll('.setup-step-dot').length,3);assert.equal(section.querySelector('.companion-download-hint').textContent,'请下载后解压。随后进行以下步骤。');
 assert.equal(section.querySelector('.setup-install-divider').nextElementSibling.tagName,'DETAILS');
 assert.equal(section.querySelectorAll('#setup-health-message').length,1);assert.match(doc.getElementById('setup-health-message').textContent,/暂未检测到/);
 assert.equal(doc.getElementById('setup-health-message').className,'setup-health-message');
 e.guide.checking(true,5);assert.equal(doc.getElementById('setup-health-activity').hidden,false);assert.equal(doc.getElementById('setup-health-ring').style.getPropertyValue('--health-progress'),'100%');
 e.guide.checking(false);assert.equal(doc.getElementById('setup-health-activity').hidden,false);e.guide.health({binaryReady:true});assert.equal(doc.getElementById('setup-health-message').textContent,'检测成功');e.guide.checking(false);assert.equal(doc.getElementById('setup-health-success').hidden,false);assert.equal(doc.getElementById('setup-health-activity').hidden,true);e.dom.window.close();
});
test('identity setup asks only for the Attendance name, never the email',()=>{
 const e=make(),doc=e.dom.window.document;e.guide.update({setupGuide:true,settings:{}});e.guide.health({binaryReady:true});
 const form=doc.getElementById('setup-identity');
 assert.equal(form.querySelector('#setup-email'),null);
 assert.equal(form.querySelector('.setup-identity-divider'),null);
 assert.ok(doc.getElementById('setup-read-name-status').classList.contains('identity-check-status'));
 assert.equal(doc.getElementById('setup-name').placeholder,'登录 Attendance 后自动填写');
 assert.equal(doc.getElementById('setup-name').getAttribute('aria-label'),'学校姓名');
 assert.equal(doc.getElementById('setup-read-name').hidden,true);
 e.dom.window.close();
});
test('identity setup submits only the Attendance name',async()=>{
 const e=make(),doc=e.dom.window.document;e.guide.update({setupGuide:true,settings:{}});e.guide.health({binaryReady:true});
 doc.getElementById('setup-name').value='Example Student';
 doc.getElementById('setup-identity').dispatchEvent(new e.dom.window.Event('submit',{cancelable:true}));await new Promise(resolve=>setTimeout(resolve,0));
 assert.deepEqual(e.calls,[{type:'identity',name:'Example Student'}]);
 e.dom.window.close();
});
test('entering the identity step automatically tries Attendance name detection once',async()=>{
 const dom=new JSDOM('<body><header></header></body>'),doc=dom.window.document,calls=[];
 const guide=createSetupGuide({doc,request:async payload=>{calls.push(payload);return payload.type==='readIdentity'?{name:'Example Student'}:{};},refresh:async()=>{},detect:()=>{},checkHealth:()=>{},reload:()=>{}});
 guide.update({setupGuide:true,settings:{}});guide.health({binaryReady:true});
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(calls.filter(payload=>payload.type==='readIdentity').length,1);
 assert.equal(doc.getElementById('setup-name').value,'Example Student');
 guide.update({setupGuide:true,settings:{}});await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(calls.filter(payload=>payload.type==='readIdentity').length,1);
 dom.window.close();
});
test('automatic identity detection disables the other actions until it finishes',async()=>{
 const dom=new JSDOM('<body><header></header></body>'),doc=dom.window.document;let resolveName;
 const guide=createSetupGuide({doc,request:async payload=>{
  if(payload.type==='readIdentity')return new Promise(resolve=>{resolveName=resolve;});
  return {};
 },refresh:async()=>{},detect:()=>{},checkHealth:()=>{},reload:()=>{}});
 guide.update({setupGuide:true,settings:{}});guide.health({binaryReady:true});await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(doc.getElementById('setup-read-name').disabled,true);
 assert.equal(doc.querySelector('#setup-identity button[type=submit]').disabled,true);
 resolveName({name:'Example Student'});await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(doc.getElementById('setup-read-name').disabled,false);
 guide.update({setupGuide:true,settings:{name:'Example Student',courses:['ABC1234'],senders:{ABC1234:'teacher@example.edu'}}});dom.window.close();
});
test('entering identity never opens Gmail or asks for an email',async()=>{
 const dom=new JSDOM('<body><header></header></body>'),doc=dom.window.document,calls=[];
 const guide=createSetupGuide({doc,request:async payload=>{calls.push(payload);return payload.type==='readIdentity'?{name:'Example Student'}:{};},refresh:async()=>{},detect:()=>{},checkHealth:()=>{},reload:()=>{}});
 guide.update({setupGuide:true,settings:{email:'abcd1234@student.monash.edu'}});guide.health({binaryReady:true});
 await new Promise(resolve=>setTimeout(resolve,50));
 assert.equal(doc.body.dataset.setup,'identity');
 assert.equal(calls.filter(payload=>payload.type==='checkEmail').length,0);
 assert.equal(calls.filter(payload=>payload.type==='listGmailAccounts').length,0);
 assert.equal(doc.getElementById('setup-email'),null);
 dom.window.close();
});
test('identity save stays hidden until the Attendance check passes',async()=>{
 const dom=new JSDOM('<body><header></header></body>');const doc=dom.window.document;
 const guide=createSetupGuide({doc,request:async payload=>payload.type==='readIdentity'?{name:'Example Student'}:{},refresh:async()=>{},detect:()=>{},checkHealth:()=>{},reload:()=>{}});
 guide.update({setupGuide:true,settings:{}});const submit=doc.querySelector('#setup-identity button[type=submit]');assert.equal(submit.hidden,true);
 doc.getElementById('setup-read-name').click();await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));assert.equal(submit.hidden,false);dom.window.close();
});
test('identity form saves the name only and leaves any stored email untouched',async()=>{
 const e=make(),doc=e.dom.window.document;e.guide.update({setupGuide:true,settings:{}});e.guide.health({binaryReady:true});
 doc.getElementById('setup-name').value='Example Student';
 doc.getElementById('setup-identity').dispatchEvent(new e.dom.window.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,0));
 assert.equal(e.calls.length,1);assert.equal(e.calls[0].type,'identity');assert.equal(e.calls[0].name,'Example Student');assert.equal(Object.hasOwn(e.calls[0],'email'),false);e.dom.window.close();
});
