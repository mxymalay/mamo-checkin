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
export async function recognizeTable(worker,image,width,height,crop,progress=()=>{}){
  progress('正在识别整张图片');
  await worker.setParameters({tessedit_pageseg_mode:'11',tessedit_char_whitelist:''});
  const {data}=await worker.recognize(image,{}, {blocks:true,text:true});
  const words=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).flatMap(l=>l.words||[])));
  const observations=words.map(word=>({text:word.text.trim(),confidence:Math.max(0,Math.min(1,word.confidence/100)),x:word.bbox.x0/width,y:1-word.bbox.y1/height,width:(word.bbox.x1-word.bbox.x0)/width,height:(word.bbox.y1-word.bbox.y0)/height,bbox:word.bbox,codeVerified:false,fieldVerified:false}));
  await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'});
  for(const o of observations.filter(o=>/^[A-Z0-9]{5}$/.test(o.text))){
    progress('正在复核签到码');
    const {x0,y0,x1,y1}=o.bbox;
    const picture=await crop({left:x0,top:y0,width:x1-x0,height:y1-y0});
    const second=await worker.recognize(picture);
    o.codeVerified=second.data.text.replace(/\s/g,'')===o.text;
    o.verificationConfidence=second.data.confidence/100;
  }
  await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:''});
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
  return observations.map(({bbox,...o})=>o);
}
