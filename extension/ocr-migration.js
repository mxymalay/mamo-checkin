export const OCR_REPAIR_VERSION='wrapped-table-2';
export function repairOcrState(state){
 if(state.ocrRepairVersion===OCR_REPAIR_VERSION)return null;
 const failed=(state.records||[]).flatMap(r=>[r,...(r.ocrEvidence||[])]).filter(r=>r.status==='review'&&r.imageId&&r.imageId!=='text'&&r.messageId&&(!r.date||!r.code||!r.group||!r.time)&&!r.attemptedAt);
 const seenMessages={...state.seenMessages};
 for(const r of failed)delete seenMessages[r.messageId];
 return {ocrRepairVersion:OCR_REPAIR_VERSION,seenMessages,seenThreads:failed.length?{}:state.seenThreads||{}};
}
