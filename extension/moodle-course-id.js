export function moodleCourseId(value){
 const text=String(value||'').trim();
 if(/^[1-9]\d{0,11}$/.test(text))return text;
 let url;try{url=new URL(text);}catch{throw new Error('请输入 Moodle course_id，或粘贴完整课程网址');}
 if(url.origin!=='https://learning.monash.edu'||url.username||url.password||url.pathname!=='/course/view.php'||url.searchParams.getAll('id').length!==1||[...url.searchParams.keys()].some(k=>!['id','section'].includes(k)))throw new Error('请打开 Moodle 课程主页，复制 course/view.php?id= 后的数字或完整课程网址');
 const id=url.searchParams.get('id');if(!/^[1-9]\d{0,11}$/.test(id||''))throw new Error('Moodle course_id 必须是正整数');return id;
}
export const moodleCourseUrl=value=>'https://learning.monash.edu/course/view.php?id='+moodleCourseId(value);
export function displayMoodleEntries(values){return (values||[]).map(value=>{try{return moodleCourseId(value);}catch{return value;}}).join('\n');}
export function bindMoodleCourseInput(input,link){
 const update=()=>{
  const values=input.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  try{
   const ids=values.map(moodleCourseId);input.setCustomValidity('');
   if(ids.length){input.value=ids.join('\n');link.href=moodleCourseUrl(ids[0]);link.textContent='打开 Moodle 课程';}
   else{link.href='https://learning.monash.edu/my/courses.php';link.textContent='打开 Moodle 查看课程网址';}
  }catch{
   // Keep legacy forum/page roots intact rather than treating their IDs as course IDs.
   link.href='https://learning.monash.edu/my/courses.php';link.textContent='打开 Moodle 查看课程网址';
  }
 };
 input.addEventListener('input',update);input.addEventListener('blur',update);update();
}
