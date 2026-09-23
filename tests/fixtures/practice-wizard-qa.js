import {installPracticeWizard} from '/extension/source-rules/practice/wizard-ui.js';
import {ruleText} from '/extension/source-rules/strings.js';
const sharedStyles=document.createElement('link');sharedStyles.rel='stylesheet';sharedStyles.href='/extension/source-rules/style.css';document.head.insertBefore(sharedStyles,document.querySelector('link[href="/extension/modules.css"]'));
const rule={schemaVersion:1,id:'local.example.images',version:'1.0.0',name:{en:'Practice rule'},source:'moodle',courses:['DEMO1000'],images:{selectors:['.attendance img']}};
const images=['attendance','second','unrelated'].map((id,i)=>({id,url:`/extension/source-rules/practice/assets/${id}.png`,marked:i===0?true:undefined}));
const payloads={};for(const image of images){const bytes=new Uint8Array(await(await fetch(image.url)).arrayBuffer());payloads[image.id]={mimeType:'image/png',imageBase64:btoa(String.fromCharCode(...bytes))};}
let state,revision=0,saved={rules:[],bindings:{}};
export const request=async message=>{
 if(message.type==='practiceSummary')return {saved,matching:saved,settings:{courses:['DEMO1000','DEMO2000'],sourceModes:{DEMO1000:'all',DEMO2000:'all'}}};
 if(message.type==='practiceBind'){(saved.bindings[message.course]||={})[message.source]=message.ruleIds;return {ok:true};}
 if(message.type==='practiceReset'){saved={rules:[],bindings:{}};images.forEach((image,i)=>image.marked=i===0?true:undefined);return {ok:true};}
 if(message.type==='practiceCancel')return {ok:true};
 const envelope={sessionId:'qa',revision:++revision,expiresAt:Date.now()+600000,pages:[{id:1,label:'DEMO1000 · Moodle'}],saved};
 if(message.type==='practiceOpen'||message.type==='practicePages')return envelope;
 const command=message.command;
 if(command.type==='builderStart')state={phase:'selecting',revision:0};
 if(command.type==='builderStatus'&&state.phase==='selecting')state={phase:'editing',revision:1,rule,samples:[{images}],matches:[],canEnable:false};
 if(command.type==='builderMark'){images.find(image=>image.id===command.imageId).marked=command.include;state={...state,phase:'editing',revision:state.revision+1,matches:[],canEnable:false};}
 if(command.type==='builderPreview'&&new URL(location.href).searchParams.get('match')==='fail'&&images.some(image=>image.marked===false))throw new Error('builder-unmatched');
 if(command.type==='builderPreview'){const matches=images.filter(image=>image.marked!==false).map(image=>({id:image.id,marked:image.marked,confirmed:image.marked===true}));state={...state,phase:'previewed',matches,canEnable:matches.length>0&&matches.every(image=>image.confirmed)};}
 if(command.type==='builderConfirm'){state.matches.find(image=>image.id===command.imageId).confirmed=command.confirmed;state.canEnable=state.matches.every(image=>image.confirmed);}
 if(command.type==='builderRecognize'&&new URL(location.href).searchParams.get('ocr')==='fail')throw new Error('OCR unavailable');
 if(command.type==='builderSave'){const updated={...rule,id:command.id,name:{en:command.name}};saved={rules:[updated],bindings:{}};}
 return {...envelope,saved,state:command.type==='builderImage'?payloads[command.imageId]:command.type==='builderRecognize'?{text:['8YG3G']}:state};
};
if(document.querySelector('#practice')){const wizard=installPracticeWizard({root:document.querySelector('#practice'),request,translate:key=>ruleText(key,'zh-CN')});await wizard.open();}
