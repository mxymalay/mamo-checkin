import {outsideAttendanceWindow} from './recent-window.js';
// Snapshot only fields that represent actual collection/submission work. Website
// confirmation of an already-completed session is not a new check-in.
export const summaryFingerprint=r=>JSON.stringify([r.status,r.code,r.attemptedAt,r.submittedAt,r.reason]);
export function runSummaryRecords(records,before,submittedIds,now=Date.now()){
 return records.filter(r=>{
  if(r.status==='submitted')return submittedIds.has(r.id);
  if(r.status==='waiting_code')return !outsideAttendanceWindow(r,now);
  return before.get(r.id)!==summaryFingerprint(r);
 });
}
