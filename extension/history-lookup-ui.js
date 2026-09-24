import {historyReport} from './history-report.js';
import {validateHistoryRange} from './history-lookup.js';
import {installHistoryDates} from './history-date-picker.js';
export function installHistoryLookup({host,request,storage,translate,onFinished=()=>{}}){
 const doc=host.ownerDocument;
 host.innerHTML='<h3>学期历史回查</h3><p class="history-scope"></p><form id="history-export-form" novalidate><div class="history-presets"><button type="button" data-days="14">最近两周</button><button type="button" data-days="30">最近一个月</button></div><div class="history-range"><div><label id="history-from-label">开始日期</label><input id="history-from" type="hidden"><button type="button" data-date="from" aria-labelledby="history-from-label" aria-describedby="history-range-error"></button></div><div><label id="history-to-label">结束日期</label><input id="history-to" type="hidden"><button type="button" data-date="to" aria-labelledby="history-to-label" aria-describedby="history-range-error"></button></div></div><p id="history-range-error" role="alert" hidden></p><section class="history-result" hidden><div class="history-result-heading"><span class="history-state-icon" aria-hidden="true"></span><p class="history-job" role="status" aria-live="polite"></p></div><p class="history-result-meta"></p><details class="history-warning-details" hidden><summary>查看未完成原因</summary><ul class="history-warnings"></ul></details></section><div class="history-footer"><p class="hint">关闭弹窗后仍会继续回查</p><div class="history-actions"><button type="submit" class="history-start">开始回查</button><button type="button" class="history-download" hidden>下载结果</button></div></div></form>';
 host.querySelector('.history-scope').textContent=translate('全部已配置课程 · 仅回查，不提交签到');
 const form=host.querySelector('form'),start=form.querySelector('.history-start'),from=host.querySelector('#history-from'),to=host.querySelector('#history-to'),status=host.querySelector('.history-job'),warnings=host.querySelector('ul'),download=host.querySelector('.history-download'),result=host.querySelector('.history-result'),warningDetails=host.querySelector('.history-warning-details');
 const dates=installHistoryDates({host,translate});
 const coverage=doc.createElement('p');coverage.className='history-result-meta';coverage.hidden=true;host.querySelector('.history-result-meta').after(coverage);
 let job,starting=false;
 const canDownload=()=>Boolean(job&&!starting&&job.phase!=='running'&&(job.phase!=='failed'||job.rows?.length)&&from.value===job.range.from&&to.value===job.range.to);
 function syncDownload(){download.hidden=!canDownload();start.classList.toggle('is-primary',download.hidden);}
 form.addEventListener('input',syncDownload);
 const errorMessage=host.querySelector('#history-range-error');
 const clearError=()=>{errorMessage.hidden=true;errorMessage.textContent='';host.querySelectorAll('[data-date]').forEach(button=>button.removeAttribute('aria-invalid'));};
 form.addEventListener('input',clearError);
 const labels={running:'正在回查',complete:'回查完成',partial:'回查结束，结果不完整',failed:'回查未完成'};
 function render(value){
  const finished=job?.phase==='running'&&['complete','partial','failed'].includes(value?.phase);
  job=value;start.disabled=starting||job?.phase==='running';syncDownload();
  result.hidden=!job;result.dataset.phase=job?.phase||'';
  start.textContent=translate(job?.phase==='running'?'正在回查':job?'重新回查':'开始回查');
  start.classList.toggle('is-primary',download.hidden);download.classList.add('is-primary');
  status.textContent=job?translate(labels[job.phase]||'回查未完成'):'';
  host.querySelector('.history-result-meta').textContent=job?`${job.range.from} — ${job.range.to} · ${translate('记录数')} ${job.rows?.length||0}`:'';
  warningDetails.hidden=!job?.warnings?.length;
  coverage.hidden=!job?.attendanceRange;
  coverage.textContent=job?.attendanceRange?`${translate('Attendance 可查范围')}：${job.attendanceRange.from} — ${job.attendanceRange.to}`:'';
  warnings.replaceChildren(...(job?.warnings||[]).map(text=>{const item=doc.createElement('li');item.textContent=translate(text);return item;}));
  if(finished){onFinished(job);host.dispatchEvent(new doc.defaultView.Event('history-finished'));}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();clearError();let range;
  try{if(!from.value||!to.value)throw new Error('请填写开始日期和结束日期。');range=validateHistoryRange({from:from.value,to:to.value});}
  catch(error){errorMessage.textContent=translate(error.message);errorMessage.hidden=false;const field=host.querySelector('[data-date="'+(!from.value?'from':!to.value?'to':'from')+'"]');field.setAttribute('aria-invalid','true');field.focus();return;}
  starting=true;start.disabled=true;syncDownload();
  try{await request({type:'historyLookupStart',range});await refresh();}
  catch(error){errorMessage.textContent=translate(error.message);errorMessage.hidden=false;}
  finally{starting=false;start.disabled=job?.phase==='running';syncDownload();}
 });
 async function refresh(){const result=await request({type:'historyLookupStatus'});render(result.job);}
 const onChange=(changes,area)=>{if(area==='local'&&changes.historyLookup)render(changes.historyLookup.newValue);};
 storage.onChanged.addListener(onChange);
 doc.defaultView.addEventListener('pagehide',()=>storage.onChanged.removeListener(onChange),{once:true});
 download.onclick=()=>{
  if(!canDownload())return;
  const url=URL.createObjectURL(new Blob([historyReport(job.rows||[],{...job.range,lookup:job,language:doc.documentElement.lang})],{type:'text/html;charset=utf-8'}));
  const link=doc.createElement('a');link.href=url;link.download=`mamo-history-${job.range.from}-${job.range.to}.html`;doc.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 render();
 void refresh().then(()=>{if(job&&!from.value&&!to.value){from.value=job.range.from;to.value=job.range.to;dates.refresh();}syncDownload();}).catch(error=>{errorMessage.textContent=translate(error.message);errorMessage.hidden=false;});
}
