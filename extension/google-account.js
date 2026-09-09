export function googleAccountChooser(email){
 const url=new URL('https://accounts.google.com/v3/signin/accountchooser');
 url.searchParams.set('service','mail');url.searchParams.set('continue',`https://mail.google.com/mail/?authuser=${encodeURIComponent(email)}`);
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
