export function checkinResult(summary={},error=false){
 const courses=summary.courses||[],records=summary.records||[];
 const expired=courses.some(c=>c.expired>0)||records.some(r=>r.status==='expired');
 const unresolved=courses.some(c=>c.pending>0||c.unresolved>0)||records.some(r=>['ready','review','uncertain','attempting'].includes(r.status));
 const incomplete=error||expired||unresolved||summary.needsConfirmation;
 const success=!incomplete&&Boolean(summary.submitted||summary.allCompleted);
 const title=incomplete?(summary.submitted?'部分签到成功':expired?'签到未完成：存在已过期场次':error?'签到未全部完成':'签到待确认'):summary.submitted?'签到成功':summary.allCompleted?'课程已全部签到':'没有可确认的签到结果';
 return {success,title,tone:error||expired?'error':success?'success':'warning'};
}
