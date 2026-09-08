const WEEK_MS=7*86400000;
export function scanSinceDate(now=Date.now()){
  return new Date(now-WEEK_MS+8*3600000).toISOString().slice(0,10);
}
export function outsideAttendanceWindow(record,now=Date.now()){
  const start=Date.parse(`${record.date}T${record.time||'23:59'}:00+08:00`);
  return Number.isFinite(start)&&start<now-WEEK_MS;
}
export function messageOutsideWindow(message,now=Date.now()){
  // An undated course page uses a placeholder year, not a publication date.
  if(message.dateWindow)return message.dateWindow.to<scanSinceDate(now);
  if(message.dateReferenceOnly)return false;
  return Number.isFinite(Date.parse(message.sentAt))&&Date.parse(message.sentAt)<now-WEEK_MS;
}
