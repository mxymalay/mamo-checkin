const WEEKDAY=/\b(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/i;
const MONTH=/^(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?$/i;
const text=cell=>String(cell.verifiedText||cell.text||'').trim();

export function tableRows(observations){
 const lines=[];
 for(const cell of [...observations].filter(o=>text(o)).sort((a,b)=>(b.y+b.height/2)-(a.y+a.height/2))){
  const center=cell.y+cell.height/2;
  let line=lines.find(l=>Math.abs(l.center-center)<Math.max(.012,Math.min(l.height,cell.height)*.48));
  if(!line){line={center,height:cell.height,cells:[]};lines.push(line);}
  line.cells.push(cell);
 }
 const anchors=lines.filter(line=>line.cells.some(cell=>WEEKDAY.test(text(cell))));
 // Continuations must stay above the next dated row and within their column.
 for(const line of lines.filter(line=>!anchors.includes(line))){
  for(const cell of [...line.cells]){
   const anchor=anchors.find((row,index)=>row.center>line.center&&row.center-line.center<=Math.max(row.height,cell.height)*2.2&&(!anchors[index+1]||line.center>anchors[index+1].center));
   if(!anchor)continue;
   const dateCell=anchor.cells.find(c=>WEEKDAY.test(text(c)));
   const month=MONTH.test(text(cell))&&cell.x>=dateCell.x-.02&&cell.x<dateCell.x+dateCell.width+.02;
   const code=cell.x>=.78&&/^[A-Z0-9 ]{1,7}$/i.test(text(cell));
   if(!month&&!code)continue;
   anchor.cells.push(cell);line.cells.splice(line.cells.indexOf(cell),1);
  }
 }
 return lines.filter(line=>line.cells.length).map(line=>{
  const cells=line.cells.sort((a,b)=>a.x-b.x);
  const continuation=cells.find(c=>MONTH.test(text(c))&&line.center-(c.y+c.height/2)>line.height*.48);
  if(continuation){
   cells.splice(cells.indexOf(continuation),1);
   const dateIndex=cells.findIndex(c=>WEEKDAY.test(text(c)));
   const hasDay=/\d{1,2}\s*$/.test(text(cells[dateIndex]));
   const dayIndex=!hasDay&&/^\d{1,2}[,.]?$/.test(text(cells[dateIndex+1]||{}))?dateIndex+1:dateIndex;
   cells.splice(dayIndex+1,0,continuation);
  }
  return {...line,cells};
 });
}
