export function bindIdentityReader({input,button,status,request,onChange=()=>{},doc=document}){
 let timer,tabId,deadline=0,reading=false;
 const stop=()=>{clearTimeout(timer);reading=false;button.disabled=false;};
 const read=async(open=false)=>{
  try{
   const result=await request({type:'readIdentity',open,...(tabId!=null?{tabId}:{})});
   tabId=result.tabId??tabId;
   if(result.name){input.value=result.name;onChange();status.textContent='已读取 Attendance 姓名，请确认后保存。';stop();return;}
   status.textContent=result.message||'请在新标签页登录 Attendance；登录后会自动读取姓名，返回此页确认即可。';
   if(Date.now()<deadline)timer=setTimeout(()=>read(false),3000);
   else{status.textContent='尚未读取到姓名，请登录后点击重试，也可手动填写。';stop();}
  }catch(error){status.textContent=error.message;stop();}
 };
 button.onclick=()=>{if(reading)return;reading=true;button.disabled=true;deadline=Date.now()+180000;status.textContent='正在读取 Attendance 姓名…';void read(true);};
 input.addEventListener('input',()=>{if(reading){stop();status.textContent='已切换为手动填写，请确认姓名与 Attendance 一致。';}});
 doc.defaultView?.addEventListener('pagehide',stop,{once:true});
 return {stop};
}
