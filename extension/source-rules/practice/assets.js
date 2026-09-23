export const practiceSettings=Object.freeze({courses:Object.freeze(['DEMO1000']),sourceModes:Object.freeze({DEMO1000:'moodle'})});
export const practiceMatchingSettings=Object.freeze({courses:Object.freeze(['DEMO1000','DEMO2000']),sourceModes:Object.freeze({DEMO1000:'all',DEMO2000:'all'})});
export const practiceCoursePath='/source-rules/practice/course.html';
export function practiceSourceUrl(extensionOrigin,sessionId){
 if(!/^chrome-extension:\/\/[a-z0-9]+$/.test(extensionOrigin)||typeof sessionId!=='string'||!sessionId||sessionId.length>128||!/^[a-zA-Z0-9-]+$/.test(sessionId))throw new Error('builder-source');
 return `${extensionOrigin}${practiceCoursePath}?session=${sessionId}`;
}
export const practiceAssetPaths=Object.freeze(Object.fromEntries(['attendance','second','unrelated','quoted'].map(id=>[id,`/source-rules/practice/assets/${id}.png`])));
export function practiceAssetId(url,origin){
 const entry=Object.entries(practiceAssetPaths).find(([,path])=>url===origin+path);
 if(!entry)throw new Error('practice-asset');return entry[0];
}
export function validatePracticeSourceUrl(value,{extensionOrigin,sessionId}){
 const expected=practiceSourceUrl(extensionOrigin,sessionId);
 if(!/^chrome-extension:\/\/[a-z0-9]+$/.test(extensionOrigin)||value!==expected)throw new Error('builder-source');
 return value;
}
