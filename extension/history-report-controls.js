export const historyReportScript=`<script>
(()=>{
 const body=document.querySelector('tbody'),rows=[...body.rows],filters=document.getElementById('course-filters'),sort=document.getElementById('time-sort');
 let course='',descending=false;
 const all=filters.querySelector('button');all.dataset.course='';
 for(const value of [...new Set(rows.map(row=>row.dataset.course))].sort()){
  const button=document.createElement('button');button.type='button';button.textContent=value;button.dataset.course=value;button.setAttribute('aria-pressed','false');filters.append(button);
 }
 function render(){
  for(const row of rows)row.hidden=Boolean(course&&row.dataset.course!==course);
  for(const button of filters.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.course===course));
  body.append(...rows.slice().sort((a,b)=>(a.dataset.date.localeCompare(b.dataset.date))*(descending?-1:1)));
  sort.textContent=descending?'↓':'↑';sort.title=descending?sort.dataset.desc:sort.dataset.asc;sort.setAttribute('aria-label',sort.title);
 }
 filters.onclick=event=>{const button=event.target.closest('button');if(button){course=button.dataset.course;render();}};
 sort.onclick=()=>{descending=!descending;render();};render();
})();
</script>`;
export const historyReportControlsCss='.report-tools{display:flex;align-items:center;gap:16px;margin:24px 0}.course-filters{display:flex;gap:8px;flex-wrap:wrap;flex:1}.report-tools button{font:inherit;padding:8px 12px;border:1px solid #cbdbe2;border-radius:6px;background:white;color:#246580;cursor:pointer}.report-tools button[aria-pressed="true"]{background:#087bab;color:white;border-color:#087bab}#time-sort{width:40px;height:40px;font-size:22px;padding:0}tr[hidden]{display:none}@media print{.report-tools{display:none}}';
