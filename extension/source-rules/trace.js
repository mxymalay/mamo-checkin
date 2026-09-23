export const TRACE_REASONS=new Set(['selector-miss','selector-invalid','excluded','quoted','decorative','dimensions','loading','host','hidden','duplicate','accepted','budget','source-error','login-required','download-error','ocr-error','no-images']);
const safeIdentity=(id,key,origin)=>{
 if(!/^[a-z0-9.-]{1,256}$/.test(id||''))return {};
 if(['local','community'].includes(origin)&&!id.startsWith('builtin.')&&key===`${origin}:${id}`)return {key,origin};
 return origin===undefined&&key===id?{key}:{};
};
export function safeTrace(value){
 const result={reason:TRACE_REASONS.has(value.reason)?value.reason:'source-error'};
 if(/^[a-z0-9.-]{1,256}$/.test(value.ruleId||''))result.ruleId=value.ruleId;
 const {key,origin}=safeIdentity(result.ruleId,value.ruleKey,value.origin);
 if(key)result.ruleKey=key;if(origin)result.origin=origin;
 for(const key of ['width','height'])if(Number.isFinite(value[key]))result[key]=Math.max(0,Math.min(100000,value[key]));
 return result;
}
export function exportRuleTestReport(result){
 const phases=['source','locating','recognizing','complete','partial','error','cancelled','interrupted'];
 return {format:'mamo-rule-test-v1',source:['gmail','moodle','ed'].includes(result.source)?result.source:null,
  phase:phases.includes(result.phase)?result.phase:'error',mode:['builtin','community','combined'].includes(result.mode)?result.mode:null,
  rules:(result.rules||[]).map(r=>({id:/^[a-z0-9.-]{1,256}$/.test(r.id)?r.id:null,...safeIdentity(r.id,r.key,r.origin),version:/^\d+\.\d+\.\d+$/.test(r.version)?r.version:null,digest:/^[a-f0-9]{64}$/.test(r.digest)?r.digest:null})),
  counts:Object.fromEntries(['pages','found','downloaded','excluded','recognized'].map(k=>[k,Math.max(0,Math.min(100000,Number(result.counts?.[k])||0))])),
  truncated:Boolean(result.truncated),trace:(result.trace||[]).slice(0,500).map(safeTrace)};
}
