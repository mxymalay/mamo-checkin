import test from 'node:test';
import assert from 'node:assert/strict';
import {localizeNotification} from '../extension/notification-i18n.js';
test('notifications follow the saved UI locale and fall back to the browser language',async()=>{
 const options={title:'自动签到已开始',message:'页面将在后台打开并检查最近 7 天的课程，完成后会再通知结果。'};
 for(const [saved,browser,expected] of [['zh_TW','en','自動簽到已開始'],['en','zh-TW','Automatic check-in started'],['auto','zh-TW','自動簽到已開始'],['zh','en','自动签到已开始']]){
  const chrome={storage:{local:{get:async()=>({uiLanguage:saved})}},i18n:{getUILanguage:()=>browser}};
  const result=await localizeNotification(options,chrome);assert.equal(result.title,expected);
  if(saved==='en')assert.doesNotMatch(result.message,/[\u3400-\u9fff]/);
 }
 const result=await localizeNotification(options,{storage:{local:{get:async()=>{throw new Error('unavailable');}}},i18n:{getUILanguage:()=> 'zh-TW'}});
 assert.equal(result.title,'自動簽到已開始');
});
