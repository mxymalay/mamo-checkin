import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {zipSync,unzipSync} from 'fflate';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('..',import.meta.url));
const excluded=new Set(['local-service.js','offscreen.html','offscreen.js','ocr-controller.js','ocr-engine.js']);
const files={};
async function collect(dir,prefix=''){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(entry.name==='.DS_Store')continue;
  const name=prefix+entry.name;
  if(entry.isDirectory())await collect(path.join(dir,entry.name),name+'/');
  else if(!excluded.has(name))files[name]=new Uint8Array(await readFile(path.join(dir,entry.name)));
 }
}
await collect(path.join(root,'extension'));
// The Web Store assigns its own ID; retain the development key only in source.
const manifest=JSON.parse(new TextDecoder().decode(files['manifest.json']));
delete manifest.key;
files['manifest.json']=new TextEncoder().encode(JSON.stringify(manifest,null,2)+'\n');
// Store metadata must describe both supported platforms, independently of GitHub packages.
const descriptions={en:'Collect Gmail and Moodle attendance codes locally and check in to matching Monash Malaysia sessions on Mac or Windows.',zh_CN:'在 Mac 或 Windows 本机识别 Gmail 和 Moodle 签到码，并提交到匹配的 Monash Malaysia 签到场次。',zh_TW:'在 Mac 或 Windows 本機識別 Gmail 和 Moodle 簽到碼，並提交至匹配的 Monash Malaysia 簽到場次。'};
for(const [locale,description] of Object.entries(descriptions)){
 const name=`_locales/${locale}/messages.json`,data=JSON.parse(new TextDecoder().decode(files[name]));
 assert.ok(description.length<=132);data.appDescription.message=description;
 files[name]=new TextEncoder().encode(JSON.stringify(data,null,2)+'\n');
}
const zip=zipSync(files,{level:6}),contents=unzipSync(zip);
assert.ok(contents['manifest.json']);assert.ok(contents['user-error.js']);
assert.equal(Object.hasOwn(JSON.parse(new TextDecoder().decode(contents['manifest.json'])),'key'),false);
assert.ok(!Object.keys(contents).some(name=>name.startsWith('extension/')||/\.(exe|py|command)$/.test(name)));
await mkdir(path.join(root,'build'),{recursive:true});
const output=path.join(root,'build/mamo-checkin-webstore.zip');await writeFile(output,zip);
console.log(`Store draft ZIP: ${output} (${Object.keys(contents).length} files)`);
console.log('Before review: confirm store extension ID/native host compatibility, privacy URL, listing images and authorized reviewer access.');
