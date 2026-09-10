import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {configureEmailInput} from '../extension/school-email.js';
import {translate} from '../extension/i18n.js';

test('school email input uses a translatable validation title',()=>{
 const dom=new JSDOM('<input id="email">');
 const input=dom.window.document.querySelector('#email');
 configureEmailInput(input);
 assert.equal(input.title,'学校邮箱前缀必须是 4 个英文字母加 4 个数字，例如 abcd1234');
 assert.equal(translate(input.title,'en'),'Student email prefix must be 4 letters followed by 4 digits, e.g. abcd1234.');
});
