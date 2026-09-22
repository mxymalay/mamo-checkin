import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,normalizeSettings,normalizeIdentity,normalizeIdentityField,gmailQuery} from '../extension/settings.js';
test('recognition-only is opt-in and scoped to developer mode',()=>{
 assert.equal(DEFAULTS.recognitionOnly,false);
 assert.equal(normalizeSettings(DEFAULTS,{recognitionOnly:true},false,'automation').recognitionOnly,false);
 const saved=normalizeSettings(DEFAULTS,{devMode:true,recognitionOnly:true},false,'automation');
 assert.equal(saved.recognitionOnly,true);
 assert.equal(normalizeSettings(saved,{intervalMinutes:30},false,'automation').recognitionOnly,true);
 assert.equal(normalizeSettings(saved,{devMode:false},false,'automation').recognitionOnly,false);
});
test('card saves validate only their own fields and reject unrelated updates',()=>{
 const existing={...DEFAULTS,name:'Student',courses:['FIT5120'],senders:{FIT5120:'unfinished'}};
 const saved=normalizeSettings(existing,{academicYear:2027,mailQuery:' lecture ',name:'Other'},true,'search');
 assert.equal(saved.academicYear,2027);assert.equal(saved.mailQuery,'lecture');assert.equal(saved.name,'Student');
 assert.deepEqual(saved.senders,existing.senders);
 assert.equal(normalizeSettings(DEFAULTS,{academicYear:2027},false,'search').academicYear,2027);
 assert.throws(()=>normalizeSettings(existing,{academicYear:1900},false,'search'),/年份/);
 assert.equal(normalizeSettings(existing,{enabled:true},false,'automation').enabled,true);
 assert.throws(()=>normalizeSettings(existing,{}),/发件人|学校邮箱/);
});
test('verified identity saves one field without requiring or replacing the other',()=>{
 assert.deepEqual(normalizeIdentityField(DEFAULTS,'email','abcd1234@student.monash.edu'),{email:'abcd1234@student.monash.edu'});
 assert.deepEqual(normalizeIdentityField(DEFAULTS,'name',' Example Student '),{name:'Example Student'});
 assert.throws(()=>normalizeIdentityField(DEFAULTS,'enabled',true));
 assert.throws(()=>normalizeIdentityField(DEFAULTS,'name',''));
 assert.throws(()=>normalizeIdentityField({name:'Existing Student'},'name','Other Student',true),/已有签到记录/);
});
const configured={...DEFAULTS,email:'abcd1234@student.monash.edu',name:'Example Student',courses:['FIT5120'],senders:{FIT5120:'teacher@example.edu'},moodleUrls:{FIT5120:[]}};
test('fresh installation contains no personal or course source information',()=>{
 assert.equal(DEFAULTS.email,'');assert.equal(DEFAULTS.name,'');assert.equal(DEFAULTS.enabled,false);
 assert.deepEqual(DEFAULTS.courses,[]);assert.deepEqual(DEFAULTS.senders,{});assert.deepEqual(DEFAULTS.moodleUrls,{});
 assert.equal(gmailQuery(DEFAULTS),null);
});
test('additional courses and Moodle-only courses produce a bounded exact sender query',()=>{
 const cfg=normalizeSettings(configured,{courses:['ABC1234','FIT5120'],senders:{ABC1234:'',FIT5120:'teacher@monash.edu'},moodleUrls:{ABC1234:['https://learning.monash.edu/course/view.php?id=1'],FIT5120:[]},mailQuery:''});
 assert.deepEqual(cfg.courses,['ABC1234','FIT5120']);assert.equal(gmailQuery(cfg),'newer_than:7d {from:teacher@monash.edu}');
});
test('settings reject non-Moodle action URLs and account changes when records exist',()=>{
 assert.throws(()=>normalizeSettings(configured,{moodleUrls:{FIT5120:['https://learning.monash.edu/login/logout.php'],FIT5122:[]}}),/网址/);
 assert.throws(()=>normalizeSettings(configured,{moodleUrls:{FIT5120:['https://learning.monash.edu/course/view.php?id=1&delete=1'],FIT5122:[]}}),/网址/);
 assert.throws(()=>normalizeSettings(configured,{email:'else1234@student.monash.edu'},true),/切换账号/);
});
test('weekly schedules are normalized, preserve old configs and reject incomplete or overlapping slots',()=>{
 const slot={weekday:3,time:'18:00',type:'applied workshop',group:'01'};
 const cfg=normalizeSettings(configured,{schedules:{FIT5120:[slot]}});
 assert.equal(cfg.schedules.FIT5120[0].type,'Applied');
 assert.deepEqual(normalizeSettings(configured,{}).schedules.FIT5120,[]);
 assert.throws(()=>normalizeSettings(configured,{schedules:{FIT5120:[{...slot,time:''}]}}),/星期和时间/);
 assert.throws(()=>normalizeSettings(configured,{schedules:{FIT5120:[slot,{...slot,type:'',group:''}]}}),/重复/);
});

test('developer mode allows a 30-second interval and persists the flag',()=>{
 const base={...DEFAULTS,name:'Example Student',email:'abcd1234@student.monash.edu'};
 const cfg=normalizeSettings(base,{courses:['FIT5120'],senders:{FIT5120:'teacher@monash.edu'},intervalMinutes:0.5,devMode:true,fastInterval:true});
 assert.equal(cfg.intervalMinutes,0.5);assert.equal(cfg.devMode,true);
 assert.equal(normalizeSettings(base,{courses:['FIT5120'],senders:{FIT5120:'teacher@monash.edu'},intervalMinutes:0.2}).intervalMinutes,1440,'fast interval requires explicit opt-in');
 assert.equal(normalizeSettings(cfg,{fastInterval:false},false,'automation').intervalMinutes,1440);
 assert.equal(normalizeSettings(cfg,{devMode:false},false,'automation').fastInterval,false);
 assert.equal(normalizeSettings(configured,{intervalMinutes:15}).devMode,false);
});
test('daily is the default and is preserved when saved',()=>{
 assert.equal(DEFAULTS.intervalMinutes,1440);
 assert.equal(normalizeSettings(configured,{intervalMinutes:1440}).intervalMinutes,1440);
 assert.equal(normalizeSettings(configured,{intervalMinutes:15}).intervalMinutes,15);
});
test('all day interval choices survive normalization',()=>{
 for(const days of [1,3,5,7])assert.equal(normalizeSettings(configured,{intervalMinutes:days*1440}).intervalMinutes,days*1440);
});
test('school email requires four letters and four digits at the fixed school domain',()=>{
 for(const email of ['abc1234@student.monash.edu','abcde1234@student.monash.edu','abcd123@student.monash.edu','abcd12345@student.monash.edu','1234abcd@student.monash.edu','abcd1234@example.edu'])assert.throws(()=>normalizeSettings(configured,{email}),/4 个英文字母/);
 assert.equal(normalizeSettings(configured,{email:' ABCD1234@STUDENT.MONASH.EDU '}).email,'abcd1234@student.monash.edu');
});
test('moodle-only and ed-only setups save without a school email',()=>{
 const base={...DEFAULTS,name:'Example Student'};
 const moodleOnly=normalizeSettings(base,{courses:['FIT5120'],moodleUrls:{FIT5120:['https://learning.monash.edu/course/view.php?id=1']}});
 assert.equal(moodleOnly.email,'');
 const edOnly=normalizeSettings(base,{courses:['FIT5120'],edUrls:{FIT5120:['https://edstem.org/au/courses/9']}});
 assert.equal(edOnly.email,'');
 assert.throws(()=>normalizeSettings(base,{courses:['FIT5120'],senders:{FIT5120:'teacher@monash.edu'}}),/请在学校身份中填写学校邮箱/);
});
test('identity keeps a stored email when the setup form no longer collects it',()=>{
 assert.deepEqual(normalizeIdentity({email:'abcd1234@student.monash.edu',name:'Old Name'},{email:'',name:'Example Student'}),{email:'abcd1234@student.monash.edu',name:'Example Student'});
 assert.deepEqual(normalizeIdentity({},{email:'',name:'Example Student'}),{email:'',name:'Example Student'});
 assert.deepEqual(normalizeIdentity({email:'abcd1234',name:'Old Name'},{name:'Example Student'}),{email:'abcd1234@student.monash.edu',name:'Example Student'});
 assert.deepEqual(normalizeIdentity({email:'stale-value',name:'Old Name'},{name:'Example Student'}),{email:'',name:'Example Student'});
 assert.throws(()=>normalizeIdentity({},{email:'',name:''}),/姓名/);
 assert.throws(()=>normalizeIdentity({email:'abcd1234@student.monash.edu',name:'Old Name'},{email:'',name:'Other Name'},true),/记录/);
});
