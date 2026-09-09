import test from 'node:test';
import assert from 'node:assert/strict';
import {userError} from '../extension/user-error.js';
import {translate} from '../extension/i18n.js';
import {checkEmailLogin} from '../extension/email-check.js';

test('browser and storage failures have actionable bilingual messages',()=>{
 const cases=[['No tab with id: 123',/页面已被关闭/],['Extension context invalidated',/重新打开/],['Could not establish connection. Receiving end does not exist.',/重新打开/],['Cannot access contents of url',/权限/],['No frame with id: 0',/跳转/],['Failed to fetch',/网络/],['QUOTA_BYTES quota exceeded',/存储空间/],['Request timed out',/结果尚未确认/],['Unexpected exception',/诊断信息/]];
 for(const [raw,expected] of cases){const text=userError(Error(raw),'Gmail');assert.match(text,expected);assert.doesNotMatch(translate(text,'en'),/[\u3400-\u9fff]/);}
 assert.match(userError(null),/未返回错误详情/);
 assert.equal(userError(Error('学校邮箱无效')),'学校邮箱无效');
});
test('permission failures are not swallowed as a pending Gmail login',async()=>{
 await assert.rejects(checkEmailLogin({email:'abcd1234@student.monash.edu',tabId:1},{tabs:{get:async()=>({id:1,status:'complete',url:'https://mail.google.com/mail/u/0/'})},readIdentity:async()=>{throw Error('Cannot access contents of url');}}),/Cannot access/);
});
