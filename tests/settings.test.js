import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,normalizeSettings,gmailQuery} from '../extension/settings.js';
const configured={...DEFAULTS,email:'abcd1234@student.monash.edu',name:'Example Student',courses:['FIT5120'],senders:{FIT5120:'teacher@example.edu'},moodleUrls:{FIT5120:[]}};
test('fresh installation contains no personal or course source information',()=>{
 assert.equal(DEFAULTS.email,'');assert.equal(DEFAULTS.name,'');assert.equal(DEFAULTS.enabled,false);
 assert.deepEqual(DEFAULTS.courses,[]);assert.deepEqual(DEFAULTS.senders,{});assert.deepEqual(DEFAULTS.moodleUrls,{});
 assert.equal(gmailQuery(DEFAULTS),null);
});
test('additional courses and Moodle-only courses produce a bounded exact sender query',()=>{
 const cfg=normalizeSettings(configured,{courses:['ABC1234','FIT5120'],senders:{ABC1234:'',FIT5120:'teacher@monash.edu'},moodleUrls:{ABC1234:['https://learning.monash.edu/course/view.php?id=1'],FIT5120:[]},mailQuery:''});
 assert.deepEqual(cfg.courses,['ABC1234','FIT5120']);assert.equal(gmailQuery(cfg),'newer_than:7d {from:teacher@monash.edu} ');
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
