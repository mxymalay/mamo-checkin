import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
test('Windows guide shows its own installation flow and English translation',async()=>{
 Object.defineProperty(globalThis,'navigator',{value:{platform:'Win32'},configurable:true});
 const {createSetupGuide}=await import('../extension/setup-guide.js');
 const {translate}=await import('../extension/i18n.js');
 const doc=new JSDOM('<body><header></header></body>').window.document;
 createSetupGuide({doc,request(){},refresh(){},detect(){},checkHealth(){},reload(){}});
 const section=doc.querySelector('[data-setup="install"]');
 assert.match(translate(section.textContent,'en'),/Install Windows OCR\.exe/);
 assert.doesNotMatch(section.textContent,/macOS|Install Windows OCR\.exe/);
 assert.equal(translate(section.querySelector('h2').textContent,'en'),'Install the Windows recognition service first');
});
test('the Chinese Windows launcher selects Chinese installer output',()=>{
 const root=fileURLToPath(new URL('..',import.meta.url));
 const installer=readFileSync(`${root}/native/windows_install.py`,'utf8');
 const build=readFileSync(`${root}/scripts/build-windows.ps1`,'utf8');
 assert.match(installer,/bundled_language/);
 assert.match(installer,/安装成功。请返回马莫签到助手/);
 assert.match(build,/--name '安装 Windows OCR'/);
 assert.match(build,/--name '卸载 Windows OCR'/);
 assert.match(build,/package-docs\.mjs windows ocr \$bundle split/);
 assert.match(build,/Join-Path \$bundle 'English'/);
 assert.match(build,/Join-Path \$bundle '中文'/);
});
