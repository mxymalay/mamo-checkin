import {installRuleBuilderUI} from '/extension/source-rules/builder/ui.js';
import {ruleText} from '/extension/source-rules/strings.js';
document.querySelector('main').classList.add('modules-shell');
const stepStyles=document.createElement('link');stepStyles.rel='stylesheet';stepStyles.href='/extension/source-rules/practice/wizard.css';document.head.append(stepStyles);
const rule={schemaVersion:1,id:'local.generated.example',version:'1.0.0',name:{en:'DEMO1000 attendance images'},source:'moodle',courses:['DEMO1000'],images:{selectors:['.attendance img']}};
const canvas=document.createElement('canvas');canvas.width=840;canvas.height=150;const ctx=canvas.getContext('2d');ctx.fillStyle='#f0f2f4';ctx.fillRect(0,0,840,150);ctx.fillStyle='#273f4b';ctx.font='24px sans-serif';ctx.fillText('Applied     Wednesday, 23 Sep     01     6:00PM     8YG3G',20,80);
const payload={imageBase64:canvas.toDataURL('image/png').split(',')[1],mimeType:'image/png'};
let state,ui;
function reset(){state={sessionId:'fixture',revision:1,phase:'editing',rule,canEnable:false,reasons:[],samples:[{sampleId:'s0',course:'DEMO1000',phase:'selected',images:[{id:'s0:i1',imageId:'i1',width:840,height:150,marked:true},{id:'s0:i2',imageId:'i2',width:840,height:150,marked:null}]}],matches:[]};}
const request=async message=>{
 if(message.type==='ruleList')return {settings:{courses:['DEMO1000','DEMO2000'],sourceModes:{DEMO1000:'all',DEMO2000:'moodle'}}};
 if(message.type==='builderTabs')return {tabs:[{id:7,label:message.source+' · 7'}]};
 if(message.type==='builderStart'){reset();return structuredClone(state);}
 if(message.type==='builderImage')return payload;
 if(message.type==='builderDraft'){state.rule.name.en=message.name;state.canEnable=false;}
 if(message.type==='builderMark'){state.samples[0].images.find(i=>i.id===message.imageId).marked=message.include;state.matches=[];state.canEnable=false;}
 if(message.type==='builderPreview'){state.phase='previewed';state.matches=state.samples[0].images.filter(i=>i.marked!==false).map(i=>({id:i.id,marked:i.marked,confirmed:false}));state.canEnable=state.matches.every(i=>i.marked===true);}
 if(message.type==='builderConfirm'){state.matches.find(i=>i.id===message.imageId).confirmed=message.confirmed;state.canEnable=state.matches.every(i=>i.marked===true||i.confirmed);}
 if(message.type==='builderRecognize')return {text:['Applied Wednesday, 23 Sep 01 6:00PM 8YG3G']};
 if(message.type==='builderSave')return {ok:true,phase:'saved'};
 if(message.type==='builderExport')return {text:JSON.stringify(rule,null,2)};
 return structuredClone(state||{});
};
async function mount(){await ui?.dispose();document.documentElement.lang=document.querySelector('#locale').value;ui=installRuleBuilderUI({root:document.querySelector('#builder'),request,translate:key=>ruleText(key,document.documentElement.lang)||key,onBack(){}});await ui.open();document.body.dataset.ready='true';}
document.querySelector('#locale').onchange=mount;await mount();
