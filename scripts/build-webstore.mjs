import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {zipSync,unzipSync} from 'fflate';
import assert from 'node:assert/strict';
import {VENDOR} from './ocr-vendor.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const files={};

async function collectVendor(files){
 for(const [name,rel] of VENDOR)files[name]=new Uint8Array(await readFile(path.join(root,rel)));
}

async function collect(dir,prefix=''){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(entry.name==='.DS_Store')continue;
  const name=prefix+entry.name;
  if(entry.isDirectory())await collect(path.join(dir,entry.name),name+'/');
  else files[name]=new Uint8Array(await readFile(path.join(dir,entry.name)));
 }
}
await collect(path.join(root,'extension'));
// The Web Store assigns its own ID; retain the development key only in source.
const manifest=JSON.parse(new TextDecoder().decode(files['manifest.json']));
delete manifest.key;
files['manifest.json']=new TextEncoder().encode(JSON.stringify(manifest,null,2)+'\n');
// Store metadata must describe both supported platforms, independently of GitHub packages.
const descriptions={en:'Collect Gmail, Moodle, and Ed attendance codes locally and check in to matching Monash Malaysia sessions on Mac or Windows.',zh_CN:'从本人 Gmail、Moodle 和 Ed 课程来源整理签到码，在 Mac 或 Windows 本机识别并提交匹配的 Monash Malaysia 学校签到场次。',zh_TW:'從本人 Gmail、Moodle 和 Ed 課程來源整理簽到碼，在 Mac 或 Windows 本機識別並提交匹配的 Monash Malaysia 學校簽到場次。'};
for(const [locale,description] of Object.entries(descriptions)){
 const name=`_locales/${locale}/messages.json`,data=JSON.parse(new TextDecoder().decode(files[name]));
 assert.ok(description.length<=132);data.appDescription.message=description;
 files[name]=new TextEncoder().encode(JSON.stringify(data,null,2)+'\n');
}
await collectVendor(files);
const zip=zipSync(files,{level:6}),contents=unzipSync(zip);
assert.ok(contents['manifest.json']);assert.ok(contents['user-error.js']);
assert.equal(Object.hasOwn(JSON.parse(new TextDecoder().decode(contents['manifest.json'])),'key'),false);
assert.ok(!Object.keys(contents).some(name=>name.startsWith('extension/')||/\.(exe|py|command)$/.test(name)));
await mkdir(path.join(root,'build'),{recursive:true});
const output=path.join(root,'build/mamo-checkin-webstore.zip');await writeFile(output,zip);
console.log(`Store draft ZIP: ${output} (${Object.keys(contents).length} files)`);
console.log('Before review: confirm store extension ID/native host compatibility, privacy URL, listing images and authorized reviewer access.');
