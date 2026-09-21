// A usable document may keep loading analytics or images indefinitely.
export async function readTargetPage({navigate,read,pause,now=Date.now,timeout=45000}){
  await navigate();
  const end=now()+timeout;let last,previous='';
  while(now()<end){
    try{
      const data=await read();
      if(data&&!data.loading){
        const signature=JSON.stringify(data);
        if(signature===previous)return data;
        previous=signature;
      }else previous='';
    }catch(error){
      if(/LOGIN_REQUIRED|No tab with id|Invalid tab ID|页面已被关闭/.test(error.message||''))throw error;
      last=error;previous='';
    }
    await pause(600);
  }
  throw last||new Error('页面内容没有及时加载，请确认登录状态后重试');
}
