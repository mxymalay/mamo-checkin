export function createDemoRecords(now=Date.now()){
 const date=new Date(now-86400000+8*3600000).toISOString().slice(0,10);
 const reasons={ready:'签到码与场次信息完整，等待核对学校场次后提交。',submitted:'学校网站已确认签到成功。',review:'识别结果需要核对，请确认场次信息及签到码。',uncertain:'已尝试提交，但尚未确认结果，请查看学校网站。',attempting:'正在向匹配的学校场次提交签到码。',expired:'网站已关闭该场次录入，无法补签',waiting_code:'已找到场次，尚未找到可用签到码。'};
 const common={course:'DEMO1000',type:'Applied',group:'01',time:'18:00',demo:true};
 const day=offset=>new Date(now+offset*86400000+8*3600000).toISOString().slice(0,10);
 return [
  {...common,id:'demo-session',date,code:'',status:'waiting_code',reason:reasons.waiting_code,sessionOnly:true},
  {...common,id:'demo-partial',date:null,code:'8YG3G',status:'review',reason:'已识别签到码，但缺少可靠日期，请关联对应场次。',imageId:'demo-image',rawText:'Applied 01 6:00PM 8YG3G'},
  ...['ready','submitted','review','uncertain','attempting','expired','waiting_code'].map((status,index)=>({...common,id:`demo-${status}`,course:`DEMO${2000+index}`,date:status==='expired'?day(-9):date,code:status==='waiting_code'?'':'AB123',status,reason:reasons[status],...(['uncertain','attempting'].includes(status)?{attemptedAt:new Date(now-60000).toISOString()}:{}),...(status==='submitted'?{submittedAt:new Date(now-60000).toISOString()}: {})})),
  {...common,id:'demo-all-rejected',course:'DEMO3000',date,code:'F59V7',codeCandidates:['8YG3G','AB123'],status:'review',attemptedAt:new Date(now-60000).toISOString(),candidatesExhausted:true,reason:'所有候选码均被网站拒绝，可能识别有误或来源码有误，请核对来源或手动补码。'},
  {...common,id:'demo-attempt-blocked',course:'DEMO3001',date,code:'AB123',codeCandidates:['8YG3G'],status:'review',attemptedAt:new Date(now-60000).toISOString(),attemptBlocked:true,reason:'网站暂不允许继续尝试，请查看签到系统。'},
  {...common,id:'demo-future',course:'DEMO9000',date:day(1),code:'XY234',status:'ready',reason:'已提前找到签到码，开课后自动提交'},
  {...common,id:'demo-incomplete',course:'DEMO9100',date:null,time:null,code:null,status:'review',reason:'日期、时间与签到码尚未完整识别，请核对来源。',rawText:'Unclear image'}
 ];
}
