export function googleAccountChooser(email=''){
 const url=new URL('https://accounts.google.com/v3/signin/accountchooser');
 url.searchParams.set('service','mail');url.searchParams.set('continue',email?`https://mail.google.com/mail/?authuser=${encodeURIComponent(email)}`:'https://mail.google.com/mail/');
 return url.href;
}
// Only activate the exact account row. Never inspect credential input values.
export function selectGoogleAccount(email,doc=document){
 if(doc.location.origin!=='https://accounts.google.com')return {selected:false};
 const expected=email.trim().toLowerCase();
 const rows=[...doc.querySelectorAll('[data-identifier][role="link"],[data-identifier][role="button"]')].filter(el=>{
  if(el.getAttribute('data-identifier')?.toLowerCase()!==expected)return false;
  for(let p=el;p;p=p.parentElement)if(p.hidden||p.getAttribute('aria-hidden')==='true'||doc.defaultView.getComputedStyle(p).display==='none')return false;
  return true;
 });
 if(rows.length!==1)return {selected:false};rows[0].click();return {selected:true};
}
export function listGoogleAccounts(doc=document){
 if(doc.location.origin!=='https://accounts.google.com')return {accounts:[]};
 const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 const accounts=[...new Set([...doc.querySelectorAll('[data-identifier]')].filter(el=>{
  for(let p=el;p;p=p.parentElement)if(p.hidden||p.getAttribute('aria-hidden')==='true'||doc.defaultView.getComputedStyle(p).display==='none'||doc.defaultView.getComputedStyle(p).visibility==='hidden')return false;
  return true;
 }).map(el=>el.getAttribute('data-identifier')?.trim().toLowerCase()).filter(value=>emailPattern.test(value||'')))];
 return {accounts};
}
