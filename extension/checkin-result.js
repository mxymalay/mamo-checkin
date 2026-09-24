export function checkinResult(summary={},error=false){
 const courses=summary.courses||[],records=summary.records||[];
 const expired=courses.some(c=>c.expired>0)||records.some(r=>r.status==='expired');
 const unresolved=courses.some(c=>c.pending>0||c.unresolved>0)||records.some(r=>['waiting_code','ready','review','uncertain','attempting'].includes(r.status));
 if(summary.quiet&&!error&&!expired&&!unresolved&&!summary.needsConfirmation)return {success:false,title:'本轮签到流程已完成。',tone:'success'};
 const incomplete=error||expired||unresolved||summary.needsConfirmation;
 const success=!incomplete&&Boolean(summary.submitted||summary.allCompleted);
 const title=error?(summary.submitted?'部分签到成功':'签到未全部完成'):unresolved||summary.needsConfirmation?(summary.submitted?'部分签到成功':'签到待确认'):expired?(summary.submitted?'签到成功，有过期场次提醒':'检查完成，有过期场次提醒'):summary.submitted?'签到成功':summary.allCompleted?'课程已全部签到':'没有可确认的签到结果';
 return {success,title,tone:error?'error':success?'success':'warning'};
}

export function checkinDetail(summary={}){
 const courses=summary.courses||[],records=summary.records||[],parts=[];
 if(summary.submitted)parts.push(`本轮已确认 ${summary.submitted} 场签到成功。`);
 if(courses.some(c=>c.pending||c.unresolved)||records.some(r=>['waiting_code','ready','review','uncertain','attempting'].includes(r.status)))parts.push('仍有场次待处理，请查看签到记录。');
 if(courses.some(c=>c.expired)||records.some(r=>r.status==='expired'))parts.push('已过期场次仅作提醒，无法补签。');
 return parts.join(' ')||(summary.allCompleted?'课程已全部签到':summary.quiet?'本轮签到流程已完成。':'没有可确认的签到结果');
}
