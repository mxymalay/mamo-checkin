import {plausibleCode} from './core.js';
// Platform-independent OCR. Crop agreement is recorded separately from the
// engine's confidence; it is never represented as a fabricated confidence score.
const WEEKDAY=/^(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/i;
const MONTH=/^(?:\d{1,2})?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i;
const GROUP=/^\d{2}(?:-P\d+)?$/i;
const TIME=/^\d{1,2}\s*[:.]\s*\d{2}\s*(?:am|pm)$/i;
const CODE=/^[A-Z0-9]{5}$/;
const normalizeField=text=>String(text).normalize('NFKC').toLowerCase().replace(/\s+/g,'').replace(/[,.，。]/g,'');
function rows(observations){
  const result=[];
  for(const observation of [...observations].sort((a,b)=>(b.y+b.height/2)-(a.y+a.height/2))){
    const center=observation.y+observation.height/2;
    let row=result.find(candidate=>Math.abs(candidate.center-center)<Math.max(.012,Math.min(candidate.height,observation.height)*.48));
    if(!row){row={center,height:observation.height,cells:[]};result.push(row);}
    row.cells.push(observation);
  }
  return result.map(row=>row.cells.sort((a,b)=>a.x-b.x));
}
function structuralSpans(cells){
  const spans=[];
  const weekday=cells.findIndex(cell=>WEEKDAY.test(cell.text));
  if(weekday>=0){
    const type=cells.slice(0,weekday).filter(cell=>!CODE.test(cell.text));
    if(type.length)spans.push(type);
    let month=weekday;
    for(let i=weekday+1;i<Math.min(cells.length,weekday+4);i++){
      month=i;
      if(MONTH.test(cells[i].text))break;
    }
    spans.push(cells.slice(weekday,month+1));
  }
  for(const cell of cells){
    if(GROUP.test(cell.text)||TIME.test(cell.text))spans.push([cell]);
  }
  return spans;
}
const unionBox=cells=>({
  left:Math.min(...cells.map(cell=>cell.bbox.x0)),
  top:Math.min(...cells.map(cell=>cell.bbox.y0)),
  width:Math.max(...cells.map(cell=>cell.bbox.x1))-Math.min(...cells.map(cell=>cell.bbox.x0)),
  height:Math.max(...cells.map(cell=>cell.bbox.y1))-Math.min(...cells.map(cell=>cell.bbox.y0))
});
export async function recognizeTable(worker,image,width,height,crop,progress=()=>{},extras={}){
  const started=Date.now(),passes=[];
  const originalWorker=worker;
  let mode='';
  worker={setParameters:async params=>{mode=params.tessedit_pageseg_mode;return originalWorker.setParameters(params);},recognize:async(...args)=>{
    const at=Date.now();
    try{const result=await originalWorker.recognize(...args);passes.push({mode,ms:Date.now()-at,confidence:result.data.confidence,codes:[...String(result.data.text||'').matchAll(/\b[A-Z0-9]{5}\b/g)].map(m=>m[0]).filter(plausibleCode)});return result;}
    catch(error){passes.push({mode,ms:Date.now()-at,error:String(error.message).slice(0,300)});throw error;}
  }};
  progress('正在识别整张图片');
  await worker.setParameters({tessedit_pageseg_mode:'11',tessedit_char_whitelist:'',user_defined_dpi:'300'});
  const {data}=await worker.recognize(image,{}, {blocks:true,text:true});
  const getWords=data=>(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).flatMap(l=>l.words||[])));
  const words=getWords(data);
  // A second layout pass also recovers rows omitted entirely by sparse mode.
  if(extras.layoutRescue){
    await worker.setParameters({tessedit_pageseg_mode:height<width/4?'6':'3',tessedit_char_whitelist:''});
    const extra=await worker.recognize(image,{}, {blocks:true,text:true});
    const primaryWords=[...words];
    for(const word of getWords(extra.data)){
      const cy=(word.bbox.y0+word.bbox.y1)/2;
      if(!primaryWords.some(old=>Math.abs((old.bbox.y0+old.bbox.y1)/2-cy)<Math.max(3,(word.bbox.y1-word.bbox.y0)/2)))words.push(word);
    }
  }
  const observations=words.map(word=>({text:word.text.trim(),confidence:Math.max(0,Math.min(1,word.confidence/100)),x:word.bbox.x0/width,y:1-word.bbox.y1/height,width:(word.bbox.x1-word.bbox.x0)/width,height:(word.bbox.y1-word.bbox.y0)/height,bbox:word.bbox,codeVerified:false,fieldVerified:false}));
  await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',user_defined_dpi:'300'});
  for(const o of observations.filter(o=>plausibleCode(o.text))){
    progress('正在复核签到码');
    const {x0,y0,x1,y1}=o.bbox;
    const box={left:x0,top:y0,width:x1-x0,height:y1-y0};
    const picture=await crop(box);
    // Cross-input verification: the raw crop and the binarized crop are two
    // different inputs. A deterministic engine reading the same pixels twice
    // proves nothing. Agreement is evidence, not an automatic-submission gate.
    const second=await worker.recognize(picture);
    const secondReading=String(second.data.text||'').replace(/\s/g,'');
    let binReading='';
    if(typeof extras.cropThreshold==='function'){
      const binPicture=await extras.cropThreshold(box);
      const third=await worker.recognize(binPicture);
      binReading=String(third.data.text||'').replace(/\s/g,'');
    }
    o.codeVerified=secondReading===o.text&&(!binReading||binReading===o.text);
    o.codeSecondText=secondReading!==o.text?secondReading:binReading!==o.text?binReading:'';
    o.codeAlternatives=[...new Set([secondReading,binReading].filter(plausibleCode))];
    o.verificationConfidence=second.data.confidence/100;
  }
  await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'',user_defined_dpi:'300'});
  for(const cells of rows(observations)){
    for(const span of structuralSpans(cells)){
      const uncertain=span.filter(cell=>cell.confidence<.96);
      if(!uncertain.length)continue;
      progress('正在复核课程日期、组别和时间');
      const picture=await crop(unionBox(span));
      const second=await worker.recognize(picture);
      const agrees=normalizeField(second.data.text)===normalizeField(span.map(cell=>cell.text).join(' '));
      for(const cell of uncertain){
        cell.fieldVerified=agrees;
        cell.fieldVerificationConfidence=second.data.confidence/100;
      }
    }
  }
  // Sweep even after partial success. Map crop coordinates back to the image;
  // never attach a code to dates/groups from a different row.
  if(Array.isArray(extras.codeZone)&&extras.codeZone.length){
    progress('正在用码列区域补扫签到码');
    const found=[];
    for(const zone of extras.codeZone){
      await worker.setParameters({tessedit_pageseg_mode:'11',tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',user_defined_dpi:'300'});
      const {data}=await worker.recognize(zone.image||zone,{}, {blocks:true,text:true});
      const zoneWords=getWords(data);
      for(const word of zoneWords){
        const text=String(word.text||'').trim().toUpperCase();if(!plausibleCode(text)||!zone.image)continue;
        const box=word.bbox,pad=zone.padding||0;
        found.push({text,confidence:Math.max(0,Math.min(1,(word.confidence||0)/100)),x:(zone.left+box.x0-pad)/width,y:1-(box.y1-pad)/height,width:(box.x1-box.x0)/width,height:(box.y1-box.y0)/height,codeVerified:false,fieldVerified:false});
      }
      // Without word boxes there is no trustworthy row association.
    }
    for(const candidate of found){
      for(const o of observations){
        const sameRow=Math.abs((o.y+o.height/2)-(candidate.y+candidate.height/2))<Math.max(.012,candidate.height*.5);
        const inside=candidate.x>=.65&&o.x>=candidate.x-.005&&o.x+o.width<=candidate.x+candidate.width+.005;
        if(sameRow&&inside&&/^[A-Z0-9]{1,5}$/i.test(o.text)&&!GROUP.test(o.text))o.codeFragment=true;
      }
      const same=observations.find(o=>o.text===candidate.text&&Math.abs((o.y+o.height/2)-(candidate.y+candidate.height/2))<Math.max(.012,candidate.height*.5));
      if(!same)observations.push(candidate);
    }
  }
  extras.diagnostics?.({width,height,ms:Date.now()-started,passes});
  return observations.map(({bbox,...o})=>o);
}
