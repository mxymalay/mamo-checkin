import {modulesView} from '../../extension/modules-view.js';
import {installModulesPage} from '../../extension/modules-page.js';
import {ruleText} from '../../extension/source-rules/strings.js';
const root=document.querySelector('#modules');
const translate=key=>ruleText(key,document.documentElement.lang);
root.innerHTML=modulesView.replace(/rules\.[a-z-]+/g,key=>translate(key));
const rule={schemaVersion:1,id:'local.course.images',key:'local:local.course.images',digest:'fixture',version:'1.0.0',name:{en:'Attendance images',zh_CN:'签到图片',zh_TW:'簽到圖片'},source:'moodle',courses:['FIT5122'],images:{selectors:['.attendance img']}};
const settings={courses:['FIT5122'],sourceModes:{FIT5122:'moodle'},devMode:false},tests={};
const builtins=await Promise.all(['gmail','moodle','ed'].map(source=>fetch('/extension/source-rules/builtin/'+source+'.json').then(response=>response.json())));
let official={version:'1.0.0',source:'remote',sequence:1,lastChecked:Date.now(),error:null,canRollback:true};
const report={course:'FIT5122',source:'moodle',phase:'complete',counts:{pages:1,found:2,downloaded:2,recognized:2},rules:[rule],images:['1','2'].map((id,index)=>({id,course:'FIT5122',width:1200,height:160,state:'recognized',matches:[{key:rule.key}],ocr:{engine:'browser',observations:[{text:index?'Workshop 2GDTP':'Applied 8YG3G'}],records:[{course:'FIT5122',code:index?'2GDTP':'8YG3G'}]}}))};
const request=async message=>{
 if(message.type==='status')return {settings};
 if(message.type==='settings'){Object.assign(settings,message.settings);return {ok:true};}
 if(message.type==='health')return {fallback:true,binaryReady:true};
 if(message.type==='practiceSummary')return {saved:{rules:[]},matching:{rules:[]},settings:{courses:[]}};
 if(['ruleList','ruleTestList'].includes(message.type))return {settings,rules:[rule],builtins,official,bindings:{},tests};
 if(message.type==='officialRulesCheck'){official={...official,version:'1.0.1',lastChecked:Date.now()};return {ok:true,official};}
 if(message.type==='officialRulesRollback'){official={...official,version:'1.0.0',canRollback:false};return {ok:true,official};}
 if(message.type==='ruleTestStart')return {testId:'qa'};
 if(message.type==='ruleTestStatus')return report;
 if(message.type==='ruleTestImage'){const bytes=new Uint8Array(await (await fetch('/extension/source-rules/practice/assets/'+(message.imageId==='1'?'attendance':'second')+'.png')).arrayBuffer());return {mimeType:'image/png',imageBase64:btoa(String.fromCharCode(...bytes))};}
 if(message.type==='ruleTestApprove')tests[rule.key]={FIT5122:{digest:rule.digest,source:rule.source}};
 if(message.type==='ruleTestSkipPrepare')return {token:'qa-skip'};
 if(message.type==='ruleTestSkipConfirm')tests[rule.key]={FIT5122:{digest:rule.digest,source:rule.source,skipped:true}};
 return {ok:true};
};
window.qa=installModulesPage({doc:document,request,translate,embedded:true,isWindows:new URLSearchParams(location.search).has('windows')});
await window.qa.ready;window.qa.show('test');
