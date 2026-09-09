import {eligible,matchActivity} from './core.js';
import {userError} from './user-error.js';
import {outsideAttendanceWindow} from './recent-window.js';
export async function submitPending(state,adapter,now=Date.now()) {
  let activities=await adapter.list();
  for(const r of state.records) {
    if(['submitted','expired','review'].includes(r.status)) continue;
    await adapter.progress?.({message:`核对 ${r.course} ${r.date} ${r.time} ${r.type}`,context:{course:r.course,subject:`${r.date} ${r.time} ${r.type}`}});
    const matches=activities.filter(a=>matchActivity(r,a));
    if(matches.length!==1) continue;
    const activity=matches[0];
    if(activity.state==='completed') {
      r.status='submitted';r.reason='网站原已签到，本次未重复提交';r.confirmedAt=new Date().toISOString();await adapter.save();continue;
    }
    if(activity.state==='expired') {r.status='expired';r.reason='网站已关闭该场次录入';await adapter.save();continue;}
    if(outsideAttendanceWindow(r,now)){if(r.status==='ready'){r.status='expired';r.reason='课程已超过 7 天，不再补签';await adapter.save();}continue;}
    if(!eligible(r,now)||activity.state!=='available') continue;
    if(adapter.beforeAttempt && !await adapter.beforeAttempt(r,activity)) continue;
    r.status='attempting';r.attemptedAt=new Date().toISOString();r.reason='提交前已保存检查点';
    try {
      await adapter.save();
    } catch(error) {
      // No page entry has been attempted. Only call submit after a successful
      // checkpoint; a recovered record may be retried by the next run.
      r.status='ready';r.reason=`提交前保存失败，未填写签到码：${error.message}`;
      try {
        await adapter.save();
      } catch(recoveryError) {
        r.status='attempting';
        r.reason=`未填写签到码，但检查点恢复保存失败：${recoveryError.message}`;
        throw new Error(r.reason);
      }
      continue;
    }
    try {
      const outcome=await adapter.submit(r,activity);
      if(outcome?.entered===false) {
        r.status='ready';r.reason=outcome.reason||'提交前已停止';await adapter.save();continue;
      }
      activities=await adapter.list();
      const confirmed=activities.filter(a=>matchActivity(r,a));
      if(confirmed.length===1 && confirmed[0].state==='completed') {
        r.status='submitted';r.reason='网站已确认签到';r.confirmedAt=new Date().toISOString();
        (state.runSubmittedIds??=new Set()).add(r.id);
      } else {r.status='uncertain';r.reason='尚未取得网站成功确认，已停止自动重试';}
    } catch(e) {r.status='uncertain';r.reason=`提交结果待核对：${userError(e,'Attendance 签到系统')}`;}
    await adapter.save();
  }
}
