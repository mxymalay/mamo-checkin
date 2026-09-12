import test from 'node:test';
import assert from 'node:assert/strict';
import {packageDocs} from '../scripts/package-docs.mjs';

for(const platform of ['mac','windows'])test(`${platform} OCR package docs are split by language`,async()=>{
 const kind='ocr';
 const docs=await packageDocs({platform,kind});
 assert.doesNotMatch(docs.readme,/[\u3400-\u9fff]/);
 assert.match(docs.chinese,/[\u3400-\u9fff]/);
 assert.doesNotMatch(docs.readme,/^说明\.md$/m);
 assert.doesNotMatch(docs.chinese,/^## English$/m);
 assert.match(docs.readme,/required for both the GitHub extension and the Chrome Web Store edition/);
 assert.match(docs.chinese,/GitHub 扩展和商店版都需要/);
});
