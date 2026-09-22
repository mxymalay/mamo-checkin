import {schoolEmail} from './school-email.js';
import {moodleCourseUrl} from './moodle-course-id.js';
export const DEFAULTS={enabled:false,email:'',name:'',intervalMinutes:1440,academicYear:new Date().getFullYear(),mailQuery:'attendance',courses:[],senders:{},subjectKeywords:{},moodleUrls:{},edUrls:{},schedules:{},ignoreCompleted:false,devMode:false,recognitionOnly:false,fastInterval:false};
function normalizeFastInterval(cfg){cfg.fastInterval=Boolean(cfg.devMode&&cfg.fastInterval);if(!cfg.fastInterval&&cfg.intervalMinutes===.5)cfg.intervalMinutes=1440;}
export function normalizeIdentityField(existing,field,value,hasRecords=false){
 if(!['email','name'].includes(field))throw new Error('无效的身份字段');
 const normalized=field==='email'?schoolEmail(value):String(value||'').trim();
 if(!normalized)throw new Error('学校系统姓名不能为空');
 if(hasRecords&&normalized!==existing[field])throw new Error('已有签到记录，请使用独立的 Chrome 配置文件切换账号');
 return {[field]:normalized};
}
export function normalizeIdentity(existing,update,hasRecords=false){
 const name=String(update.name||'').trim();
 if(!name)throw new Error('请填写学校系统显示的姓名');
 // Email is optional at setup: it is only needed once a course uses a Gmail
 // sender. An empty update never clears a previously saved address.
 let email='';
 if(update.email)email=schoolEmail(update.email);
 else if(existing.email){
  // Older builds stored only the school-email prefix. Migrate that value
  // during identity setup; an invalid stale value must not block name setup.
  try{email=schoolEmail(existing.email);}catch{email='';}
 }
 if(email&&!/^[^\s@]+@[^\s@]+$/.test(email))throw new Error('请填写有效的学校邮箱');
 if(hasRecords&&(name!==existing.name||(email&&existing.email&&email!==existing.email)))throw new Error('已有签到记录，请使用独立的 Chrome 配置文件切换账号');
 return {email,name};
}
export function normalizeSettings(existing,update,hasRecords=false,scope='all'){
  if(scope==='search'){
    const academicYear=Number(update.academicYear??existing.academicYear);
    if(!Number.isInteger(academicYear)||academicYear<2020||academicYear>2100)throw new Error('请填写有效课程年份');
    return {...existing,academicYear,mailQuery:String(update.mailQuery??existing.mailQuery??'').trim().slice(0,200)};
  }
  if(scope==='automation'){
    const cfg={...existing};
    for(const key of ['enabled','ignoreCompleted','devMode','recognitionOnly','fastInterval'])if(Object.hasOwn(update,key))cfg[key]=Boolean(update[key]);
    cfg.recognitionOnly=Boolean(cfg.devMode&&cfg.recognitionOnly);
    if(Object.hasOwn(update,'intervalMinutes'))cfg.intervalMinutes=Math.max(0.5,Math.min(10080,Number(update.intervalMinutes)||1440));
    normalizeFastInterval(cfg);
    return cfg;
  }
  if(scope!=='all')throw new Error('Invalid settings scope');
  const cfg={...existing,...update};
  cfg.recognitionOnly=Boolean(cfg.devMode&&cfg.recognitionOnly);
  const rawEmail=String(cfg.email||'').trim()||String(existing.email||'').trim();
  cfg.email=rawEmail?schoolEmail(rawEmail):'';
  cfg.name=String(cfg.name||'').trim();
  if(!cfg.name)throw new Error('请填写学校系统显示的姓名');
  if(cfg.courses.some(c=>cfg.senders?.[c])&&!cfg.email)throw new Error('课程使用邮件来源时，请在学校身份中填写学校邮箱');
  if(hasRecords&&(cfg.name!==existing.name||(cfg.email&&existing.email&&cfg.email!==existing.email)))throw new Error('已有记录时请使用单独的 Chrome 配置文件切换账号');
  cfg.enabled=Boolean(cfg.enabled);cfg.intervalMinutes=Math.max(0.5,Math.min(10080,Number(cfg.intervalMinutes)||1440));cfg.ignoreCompleted=Boolean(cfg.ignoreCompleted);cfg.devMode=Boolean(cfg.devMode);
  normalizeFastInterval(cfg);
  cfg.academicYear=Number(cfg.academicYear);if(!Number.isInteger(cfg.academicYear)||cfg.academicYear<2020||cfg.academicYear>2100)throw new Error('请填写有效课程年份');
  cfg.courses=[...new Set((cfg.courses||[]).map(c=>String(c).trim().toUpperCase()))];
  if(!cfg.courses.length||cfg.courses.length>20||cfg.courses.some(c=>!/^([A-Z]{2,10}\d{3,6})$/.test(c)))throw new Error('请填写 1–20 门课程，例如 FIT5120');
  cfg.senders={};cfg.subjectKeywords={};cfg.moodleUrls={};cfg.edUrls={};cfg.schedules={};
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
    cfg.edUrls[c]=[...new Set(((update.edUrls||existing.edUrls)?.[c]||[]).map(value=>{
      if(/^\d{2,9}$/.test(String(value).trim()))return `https://edstem.org/au/courses/${String(value).trim()}`;
      let u;try{u=new URL(value);}catch{throw new Error(`${c} Ed 课程网址无效`);}
      const m=u.pathname.match(/^\/au\/courses\/(\d+)/);
      if(u.origin!=='https://edstem.org'||!m)throw new Error(`${c} 请填写 Ed course_id 或课程网址，例如 37233 或 https://edstem.org/au/courses/37233`);
      return `https://edstem.org/au/courses/${m[1]}`;
    }))];
    if(cfg.edUrls[c].length>1)throw new Error(`${c} 最多配置 1 个 Ed 课程入口`);
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
export function gmailQuery(cfg){
  if(!cfg.courses.length)return null;
  // A course with the email source but no sender still scans Gmail by keyword;
  // the adapter matches threads to courses by subject keyword.
  const senders=[...new Set(cfg.courses.map(c=>cfg.senders[c]).filter(Boolean))];
  const from=senders.length?`{${senders.map(s=>'from:'+s).join(' ')}} `:'';
  return `newer_than:7d ${from}${cfg.mailQuery}`.trim();
}
