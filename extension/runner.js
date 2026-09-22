import {matchActivity} from './core.js';
import {userError} from './user-error.js';
import {outsideAttendanceWindow} from './recent-window.js';
export async function submitPending(state,adapter,now=Date.now()) {
  if(state.settings?.recognitionOnly){
    await adapter.progress?.({message:'仅识别模式：签到码已保留，本轮不填写或提交签到'});
    return;
  }
  let activities=await adapter.list();
  for(const r of state.records) {
    if(['submitted','expired','ignored','linked'].includes(r.status)) continue;
    // Every plausible reading of the code becomes a candidate: the portal
    // validates each submission, so candidates are tried in order and only an
    // exhausted candidate list defers to manual review.
    const candidates=[...new Set([r.code,...(r.codeCandidates||[]),...(r.conflicts||[])].filter(c=>/^[A-Z0-9]{5}$/.test(c||'')))];
    if(!candidates.length) continue;
    await adapter.progress?.({message:`核对 ${r.course} ${r.date} ${r.time} ${r.type}`,context:{course:r.course,subject:`${r.date} ${r.time} ${r.type}`}});
    const matches=activities.filter(a=>matchActivity(r,a));
    if(matches.length!==1) continue;
    const activity=matches[0];
    if(activity.state==='completed') {
      r.status='submitted';r.reason='网站原已签到，本次未重复提交';r.confirmedAt=new Date().toISOString();await adapter.save();continue;
    }
    if(activity.state==='expired') {r.status='expired';r.reason='网站已关闭该场次录入';await adapter.save();continue;}
    if(r.status==='review'&&r.attemptedAt)continue;
    if(outsideAttendanceWindow(r,now)){if(r.status==='ready'){r.status='expired';r.reason='课程已超过 7 天，不再补签';await adapter.save();}continue;}
    if(activity.state!=='available') continue;
    let submitted=false,pausedStop=false;const tried=[];
    for(const [candidateIndex,code] of candidates.entries()) {
      r.code=code;
      if(adapter.beforeAttempt && !await adapter.beforeAttempt(r,activity)) {pausedStop=true;break;}
      r.status='attempting';r.attemptedAt=new Date().toISOString();r.reason=candidates.length>1?`提交前已保存检查点（候选 ${candidateIndex+1}/${candidates.length}）`:'提交前已保存检查点';
      try {
        await adapter.save();
      } catch(error) {
        // No page entry has been attempted. Only call submit after a successful
        // checkpoint; a recovered record may be retried by the next run.
        r.status='ready';r.reason=`提交前保存失败，未填写签到码：${error.message}`;
        try {
          await adapter.save();
        } catch(recoveryError) {
          r.status='attempting';r.reason=`未填写签到码，但检查点恢复保存失败：${recoveryError.message}`;throw new Error(r.reason);
        }
        break;
      }
      try {
        const outcome=await adapter.submit({...r,code},activity);
        if(outcome?.entered===false) {r.status='ready';r.reason=outcome.reason||'提交前已停止';break;}
        activities=await adapter.list();
        const confirmed=activities.filter(a=>matchActivity(r,a));
        if(confirmed.length===1 && confirmed[0].state==='completed') {
          r.status='submitted';r.reason='网站已确认签到';r.confirmedAt=new Date().toISOString();(state.runSubmittedIds??=new Set()).add(r.id);submitted=true;break;
        }
        if(confirmed.length===1&&confirmed[0].state==='expired'){r.status='expired';r.reason='网站已关闭该场次录入';break;}
        if(outcome?.blocked||confirmed.length!==1||confirmed[0].state!=='available'){
          r.status='review';r.reason='网站暂不允许继续尝试，请查看签到系统。';break;
        }
        if(!outcome?.rejected){r.status='uncertain';r.reason='提交结果尚未确认，下次运行先检查学校签到状态。';break;}
        tried.push(code);
        if(candidateIndex<candidates.length-1) {r.status='ready';r.reason=`签到码被门户拒绝，尝试下一候选（${tried.length}/${candidates.length}）`;}
      } catch(e) {
        // Form-level errors are candidate-independent; stop trying.
        r.status='uncertain';r.reason=`提交结果待核对：${userError(e,'Attendance 签到系统')}`;break;
      }
      await adapter.save();
    }
    if(!submitted&&tried.length===candidates.length){r.status='review';r.candidatesExhausted=true;r.reason='所有候选码均被网站拒绝，可能识别有误或来源码有误，请核对来源或手动补码。';}
    if(!pausedStop)await adapter.save();
  }
}
