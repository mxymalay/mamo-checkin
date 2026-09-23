// Preserve older bookmarks while using the main page's shared header and drafts.
const hash=location.hash.slice(1),key=({'rule-test':'test','rule-manager':'library'})[hash]||hash;
location.replace('options.html#modules/'+(['recognition','library','matching','test'].includes(key)?key:'recognition'));
