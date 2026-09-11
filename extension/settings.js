import {schoolEmail} from './school-email.js';
import {moodleCourseUrl} from './moodle-course-id.js';
export const DEFAULTS={enabled:false,email:'',name:'',intervalMinutes:1440,academicYear:new Date().getFullYear(),mailQuery:'attendance',courses:[],senders:{},subjectKeywords:{},moodleUrls:{},schedules:{},ignoreCompleted:false};
export function normalizeIdentityField(existing,field,value,hasRecords=false){
 if(!['email','name'].includes(field))throw new Error('无效的身份字段');
 const normalized=field==='email'?schoolEmail(value):String(value||'').trim();
 if(!normalized)throw new Error('学校系统姓名不能为空');
 if(hasRecords&&normalized!==existing[field])throw new Error('已有签到记录，请使用独立的 Chrome 配置文件切换账号');
 return {[field]:normalized};
}
export function normalizeIdentity(existing,update,hasRecords=false){
 const email=schoolEmail(update.email),name=String(update.name||'').trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name)throw new Error('请填写有效的学校邮箱和学校系统显示的姓名');
 if(hasRecords&&(email!==existing.email||name!==existing.name))throw new Error('已有签到记录，请使用独立的 Chrome 配置文件切换账号');
 return {email,name};
}
export function normalizeSettings(existing,update,hasRecords=false){
  const cfg={...existing,...update};
  cfg.email=schoolEmail(cfg.email);cfg.name=String(cfg.name||'').trim();
  if(!/^[^\s@]+@[^\s@]+$/.test(cfg.email)||!cfg.name)throw new Error('请填写邮箱和姓名');
  if(hasRecords&&(cfg.email!==existing.email||cfg.name!==existing.name))throw new Error('已有记录时请使用单独的 Chrome 配置文件切换账号');
  cfg.enabled=Boolean(cfg.enabled);cfg.intervalMinutes=Math.max(5,Math.min(10080,Number(cfg.intervalMinutes)||1440));cfg.ignoreCompleted=Boolean(cfg.ignoreCompleted);
  cfg.academicYear=Number(cfg.academicYear);if(!Number.isInteger(cfg.academicYear)||cfg.academicYear<2020||cfg.academicYear>2100)throw new Error('请填写有效课程年份');
  cfg.courses=[...new Set((cfg.courses||[]).map(c=>String(c).trim().toUpperCase()))];
  if(!cfg.courses.length||cfg.courses.length>20||cfg.courses.some(c=>!/^([A-Z]{2,10}\d{3,6})$/.test(c)))throw new Error('请填写 1–20 门课程，例如 FIT5120');
  cfg.senders={};cfg.subjectKeywords={};cfg.moodleUrls={};cfg.schedules={};
  for(const c of cfg.courses){
    const sender=String((update.senders||existing.senders)?.[c]||'').trim().toLowerCase();
    if(sender&&!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(sender))throw new Error(`${c} 发件人邮箱无效`);
    cfg.senders[c]=sender;cfg.subjectKeywords[c]=String((update.subjectKeywords||existing.subjectKeywords)?.[c]||c).trim();
    cfg.moodleUrls[c]=[...new Set(((update.moodleUrls||existing.moodleUrls)?.[c]||[]).map(value=>{
      if(/^\d+$/.test(String(value).trim()))return moodleCourseUrl(value);
      let u;try{u=new URL(value);}catch{throw new Error(`${c} Moodle 网址无效`);}
      if(u.origin!=='https://learning.monash.edu'||!['/course/view.php','/mod/forum/view.php','/mod/forum/discuss.php','/mod/page/view.php'].includes(u.pathname)||[...u.searchParams.keys()].some(k=>!['id','d','section'].includes(k)))throw new Error(`${c} 请填写 Monash Moodle 课程、公告或页面网址`);
      return u.href;
    }))];
    if(cfg.moodleUrls[c].length>3)throw new Error(`${c} 最多配置 3 个 Moodle 入口`);
    if(!sender&&!cfg.moodleUrls[c].length)throw new Error(`${c} 至少需要一个 Gmail 或 Moodle 来源`);
    const schedule=(update.schedules||existing.schedules)?.[c]||[];
    if(!Array.isArray(schedule)||schedule.length>14)throw new Error(`${c} 每周最多设置 14 节课`);
    cfg.schedules[c]=schedule.map(slot=>{
      const weekday=Number(slot?.weekday),time=String(slot?.time||'').trim(),group=String(slot?.group||'').trim().toUpperCase();
      let type=String(slot?.type||'').trim().replace(/\s+/g,' ');
      if(!Number.isInteger(weekday)||weekday<1||weekday>7||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error(`${c} 请填写每节课的星期和时间`);
      if(type&&!/^[A-Za-z][A-Za-z ]{0,39}$/.test(type))throw new Error(`${c} 活动类型请使用签到网站显示的英文名称`);
      type=type.toLowerCase().replace(/\b[a-z]/g,char=>char.toUpperCase());if(type==='Applied Workshop')type='Applied';
      if(group&&!/^\d{2}(?:-P\d+)?$/.test(group))throw new Error(`${c} 组别格式例如 01 或 01-P1`);
      return {weekday,time,type,group};
    });
    const slots=cfg.schedules[c];
    if(slots.some((a,i)=>slots.slice(i+1).some(b=>a.weekday===b.weekday&&a.time===b.time&&(!a.type||!b.type||a.type===b.type)&&(!a.group||!b.group||a.group===b.group))))throw new Error(`${c} 存在重复或无法区分的上课场次`);
  }
  cfg.mailQuery=String(cfg.mailQuery||'').trim().slice(0,200);
  return cfg;
}
export function gmailQuery(cfg){const senders=[...new Set(cfg.courses.map(c=>cfg.senders[c]).filter(Boolean))];return senders.length?`newer_than:7d {${senders.map(s=>'from:'+s).join(' ')}} ${cfg.mailQuery}`:null;}
