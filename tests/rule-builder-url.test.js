import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBuilderSourceUrl} from '../extension/source-rules/builder/source-url.js';
test('current Gmail search messages are allowed without allowing search result lists or unrelated hosts',()=>{
 const context={source:'gmail',course:'DEMO1000',settings:{}};
 assert.equal(validateBuilderSourceUrl('https://mail.google.com/mail/u/1/#search/DEMO1000/FMfc123',context),'https://mail.google.com/mail/u/1/#search/DEMO1000/FMfc123');
 for(const url of ['https://mail.google.com/mail/u/0/#search/DEMO1000','https://mail.google.com.evil.test/mail/u/0/#inbox/a','https://person@mail.google.com/mail/u/0/#inbox/a','https://mail.google.com/mail/u/0/?authuser=1#inbox/a'])assert.throws(()=>validateBuilderSourceUrl(url,context));
});
