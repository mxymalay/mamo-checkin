import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {packageDocs,writeLanguagePackageDocs} from '../scripts/package-docs.mjs';

for(const platform of ['mac','windows'])test(`${platform} OCR package docs are split by language`,async()=>{
 const kind='ocr';
 const docs=await packageDocs({platform,kind});
 assert.doesNotMatch(docs.readme,/[\u3400-\u9fff]/);
 assert.match(docs.chinese,/[\u3400-\u9fff]/);
 assert.doesNotMatch(docs.readme,/^说明\.md$/m);
 assert.doesNotMatch(docs.chinese,/^## English$/m);
 assert.match(docs.readme,/required for both the GitHub extension and the Chrome Web Store edition/);
 assert.match(docs.chinese,/GitHub 扩展和商店版都需要/);
 assert.match(docs.readme,/Uninstall (?:Mac Recognition|Windows OCR)/);
 assert.match(docs.chinese,/卸载 (?:Mac 识别服务|Windows OCR)/);
});

for(const platform of ['mac','windows'])test(`${platform} package docs write only language folders`,async()=>{
 const output=await mkdtemp(path.join(tmpdir(),'mamo-docs-'));await writeLanguagePackageDocs(output,{platform,kind:'ocr'});
 assert.deepEqual((await readdir(output)).sort(),['English','中文']);
 assert.doesNotMatch(await readFile(path.join(output,'English','README.md'),'utf8'),/[\u3400-\u9fff]/);
 assert.match(await readFile(path.join(output,'中文','说明.md'),'utf8'),/[\u3400-\u9fff]/);
});
