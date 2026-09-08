export const SCHOOL_EMAIL_SUFFIX='@student.monash.edu';
export function schoolEmail(value){
 const text=String(value||'').trim().toLowerCase();
 const prefix=text.endsWith(SCHOOL_EMAIL_SUFFIX)?text.slice(0,-SCHOOL_EMAIL_SUFFIX.length):text;
 if(!/^[a-z]{4}[0-9]{4}$/.test(prefix))throw new Error('学校邮箱前缀必须是 4 个英文字母加 4 个数字，例如 abcd1234');
 return prefix+SCHOOL_EMAIL_SUFFIX;
}
export function emailPrefix(value){return String(value||'').replace(/@student\.monash\.edu$/i,'');}
export function configureEmailInput(input){
 input.type='text';input.placeholder='abcd1234';input.pattern='[A-Za-z]{4}[0-9]{4}';input.title='4 个英文字母加 4 个数字，例如 abcd1234';input.autocomplete='username';input.spellcheck=false;
 const group=input.ownerDocument.createElement('span');group.className='school-email-field';input.replaceWith(group);group.append(input);
 const suffix=input.ownerDocument.createElement('span');suffix.className='school-email-suffix';suffix.textContent=SCHOOL_EMAIL_SUFFIX;group.append(suffix);
 input.addEventListener('input',()=>{input.setCustomValidity('');if(input.value&&!input.validity.patternMismatch)return;if(input.value)input.setCustomValidity(input.title);});
 input.addEventListener('blur',()=>{input.value=input.value.trim().toLowerCase();});
}
