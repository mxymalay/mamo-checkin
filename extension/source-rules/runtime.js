// Chrome serializes this function. All helpers must stay inside its closure.
export function installSourceRuleRuntime(defaults={},practiceOrigin=null){
  function locate({root,source,rules,mode='combined',course,contextText='',collectTrace=false,isThread=false,includeNodes=false}){
    rules=rules||[defaults[source]].filter(Boolean);
    const doc=root.ownerDocument,images=new Map(),trace=[],examined=new Set(),acceptedNodes=new Set();let truncated=false,loading=false;
    const note=(rule,reason,extra={})=>{if(collectTrace&&trace.length<200)trace.push({ruleId:rule.id,ruleKey:rule.key||rule.id,origin:rule.origin,reason,...extra});};
    const selected=rules.filter(r=>r?.source===source&&typeof r.id==='string'&&(r.id.startsWith('builtin.')?mode!=='community':mode!=='builtin'&&Array.isArray(r.courses)&&r.courses.includes(course)));
    const visible=el=>{for(let p=el;p;p=p.parentElement){const style=doc.defaultView?.getComputedStyle(p);if(p.hidden||p.getAttribute('aria-hidden')==='true'||style?.display==='none'||style?.visibility==='hidden')return false;}return true;};
    const safeUrl=value=>{
      try{const url=new URL(value,doc.location.href),h=url.hostname;
        // The source installs this capability only after its owned port is registered.
        const origin=practiceOrigin?.extensionOrigin;
        const course=practiceOrigin&&typeof practiceOrigin==='object'&&typeof practiceOrigin.documentId==='string'&&/^[a-zA-Z0-9-]{1,128}$/.test(practiceOrigin.sessionId||'')&&doc.location.href===origin+'/source-rules/practice/course.html?session='+practiceOrigin.sessionId;
        if(origin&&/^chrome-extension:\/\/[a-z0-9]+$/.test(origin)&&course){
          const assets=['attendance','second','unrelated','quoted'].map(id=>origin+'/source-rules/practice/assets/'+id+'.png');
          return assets.includes(url.href)?url.href:null;
        }
        if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
        if(source==='moodle'&&h!=='learning.monash.edu')return null;
        if(source==='gmail'&&h!=='mail.google.com'&&!h.endsWith('.googleusercontent.com'))return null;
        if(source==='ed'&&!h.endsWith('.edusercontent.com'))return null;
        return url.href;
      }catch{return null;}
    };
    for(const rule of selected){
      try{
      const config=rule.images,context=(rule.keywords?.context||[]).some(s=>contextText.toLowerCase().includes(s.toLowerCase()));
      const entries=[],seen=new Set();
      const candidate=(el,attachment)=>{
        if(seen.has(el))return true;
        if(entries.length>=200){truncated=true;return false;}
        seen.add(el);entries.push({el,attachment});return true;
      };
      for(const selector of config.selectors){
        let nodes;try{nodes=root.querySelectorAll(selector);}catch{note(rule,'selector-invalid');continue;}
        if(!nodes.length)note(rule,'selector-miss',{selector});
        for(const el of nodes)if(el.tagName==='IMG'&&!candidate(el,false))break;
      }
      if(source==='ed'&&isThread)for(const selector of rule.attachments?.selectors||[]){
        let nodes;try{nodes=root.querySelectorAll(selector);}catch{note(rule,'selector-invalid');continue;}
        if(!nodes.length)note(rule,'selector-miss',{selector});
        for(const el of nodes)if(el.tagName==='A'&&!candidate(el,true))break;
      }
      for(const {el,attachment} of entries){
        // Overlapping rules reuse the same candidate budget while retaining every match.
        if(!examined.has(el)){if(examined.size>=400){truncated=true;continue;}examined.add(el);}
        if(el.closest('.gmail_signature,script,style')){note(rule,'quoted');continue;}
        if(!visible(el)){note(rule,'hidden');continue;}
        if(/avatar|profile|emoji|icon|logo|favicon|badge|ytimg|teaching[-_ ]award|reaction/i.test(`${el.className||''} ${el.getAttribute('alt')||''} ${el.getAttribute('aria-label')||''}`)||el.closest('.userpicture,.activityiconcontainer')){note(rule,'decorative');continue;}
        if((config.excludeSelectors||[]).some(s=>{try{return el.matches(s);}catch{return true;}})){note(rule,'excluded');continue;}
        const width=el.naturalWidth||0,height=el.naturalHeight||0;
        if(!attachment){
          if(source==='gmail'&&!el.complete&&!width){loading=true;note(rule,'loading');continue;}
          const builtin=rule.id.startsWith('builtin.');
          if((width||source==='gmail')&&(width<(config.minWidth||60)||height<(config.minHeight||20)||height>Math.min(config.maxHeight||4000,4000)||(builtin&&!context&&!(width/height>=3&&height<=350)))){note(rule,'dimensions',{width,height});continue;}
        }
        const raw=attachment?el.getAttribute('href'):(el.currentSrc||el.getAttribute('src')||el.getAttribute('data-src'));
        const url=raw&&safeUrl(raw);if(!url){note(rule,'host');continue;}
        if(includeNodes)acceptedNodes.add(el);
        const match={id:rule.id,key:rule.key||rule.id,origin:rule.origin,version:rule.version,digest:rule.digest};
        if(images.has(url)){const found=images.get(url);if(!found.matches.some(m=>(m.key||m.id)===match.key))found.matches.push(match);note(rule,'duplicate');continue;}
        if(images.size>=200){truncated=true;note(rule,'budget');continue;}
        images.set(url,{url,matches:[match],width,height});note(rule,'accepted',{width,height});
      }
      }catch{note(rule,'invalid-rule');}
    }
    return {images:[...images.values()],trace,truncated,loading,...(includeNodes?{acceptedNodes:[...acceptedNodes]}:{})};
  }
  globalThis.__mamoSourceRules=Object.freeze({locate});
}
