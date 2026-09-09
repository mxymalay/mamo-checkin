// Self-contained for chrome.scripting.executeScript; no private website APIs.
export function attendanceAdapter(command,args={},doc=document) {
  const text=el=>(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
  const origin='https://attendance.monash.edu.my';
  if(doc.location.origin!==origin) throw new Error('签到系统需要重新登录');
  if(command==='identity'){
    if(doc.location.pathname!=='/student/Default.aspx')throw new Error('请先登录 Attendance 系统，再读取姓名');
    const names=doc.querySelectorAll('#ctl00_ContentPlaceHolder1_userName');
    const name=names.length===1?text(names[0]):'';
    if(!name||name.length>150)throw new Error('未能读取姓名，请确认登录成功；也可手动填写');
    return {name};
  }
  if(command==='activities'||command==='discover') {
    const panels=Array.from(doc.querySelectorAll('[id^="dayPanel_"]'));
    if(!panels.length) throw new Error('签到页面结构改变或尚未登录，未提交任何签到');
    const hasName=Array.from(doc.querySelectorAll('span,div,p')).some(el=>text(el)===args.name);
    if(command!=='discover'&&!hasName) throw new Error('签到系统的学生姓名与配置不一致');
    const activities=[];
    for(const panel of panels) for(const li of panel.querySelectorAll('li')) {
      const rawText=text(li);
      if(!/\b[A-Z]{2,10}\d{3,6}\b/i.test(rawText)) continue;
      const link=li.querySelector('a[href]');
      const href=link?new URL(link.getAttribute('href'),doc.location.href).href:null;
      if(href && (new URL(href).origin!==origin||new URL(href).pathname!=='/student/Entry.aspx')) throw new Error('出现非预期的签到链接');
      const icon=li.querySelector('img')?.getAttribute('src')||'';
      const state=/\/tick\.png$/.test(icon)?'completed':/\/absent_code\.png$/.test(icon)?'expired':href?'available':'waiting';
      activities.push({rawText,dateToken:panel.id.slice('dayPanel_'.length),href,state});
    }
    return {activities};
  }
  if(command==='form' || command==='submit') {
    const inputs=doc.querySelectorAll('#ctl00_ContentPlaceHolder1_sessionCode');
    const submits=doc.querySelectorAll('input[type="submit"][value="Submit"]');
    const heading=text(doc.querySelector('h2'));
    const result={heading,url:doc.location.href,inputPresent:inputs.length===1,submitPresent:submits.length===1};
    if(command==='form') return result;
    if(result.url!==args.expectedUrl||heading!==args.expectedHeading||!result.inputPresent||!result.submitPresent) throw new Error('签到表单与已核对的场次不匹配');
    if(!/^[A-Z0-9]{5}$/.test(args.code||'')) throw new Error('签到码格式不正确');
    const input=inputs[0];
    Object.getOwnPropertyDescriptor(doc.defaultView.HTMLInputElement.prototype,'value').set.call(input,args.code);
    input.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));
    input.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));
    submits[0].click();
    return {clicked:true};
  }
  throw new Error('未知签到操作');
}
