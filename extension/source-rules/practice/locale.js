export function practiceLocale(saved,browser){
 if(saved==='en')return 'en';
 if(saved==='zh'||saved==='zh_CN')return 'zh_CN';
 if(saved==='zh_TW')return 'zh_TW';
 return /^zh-(TW|HK|Hant)/i.test(browser)?'zh_TW':/^zh/i.test(browser)?'zh_CN':'en';
}
