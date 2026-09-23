import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {unzipSync} from 'fflate';
const root=new URL('../',import.meta.url);
test('fresh extension and store builds contain every source-rule resource without extra permissions',async()=>{
 const sourceManifest=JSON.parse(await readFile(new URL('extension/manifest.json',root),'utf8'));
 const expected=new Map();
 async function collect(dir,prefix=''){
  for(const entry of await readdir(dir,{withFileTypes:true})){
   if(entry.name==='.DS_Store')continue;
   const name=prefix+entry.name,url=new URL(entry.name+(entry.isDirectory()?'/':''),dir);
   if(entry.isDirectory())await collect(url,name+'/');else expected.set(name,await readFile(url));
  }
 }
 await collect(new URL('extension/',root));
 for(const [script,zip] of [['build-extension.mjs','mamo-checkin-extension.zip'],['build-webstore.mjs','mamo-checkin-webstore.zip']]){
  execFileSync(process.execPath,[fileURLToPath(new URL('scripts/'+script,root))],{cwd:fileURLToPath(root),stdio:'pipe'});
  const files=unzipSync(await readFile(new URL('build/'+zip,root)));
  for(const [name,data] of expected){
   assert.ok(files[name],`${zip}: ${name}`);
   if(name==='manifest.json'||name.startsWith('_locales/'))continue;
   assert.deepEqual(Buffer.from(files[name]),data,`${zip}: stale ${name}`);
  }
  for(const name of ['source-rules/runtime.js','source-rules/demo-table.png','source-rules/schema.json','source-rules/builtin/gmail.json','source-rules/builtin/moodle.json','source-rules/builtin/ed.json'])assert.ok(files[name],name);
  for(const name of ['source-rules/practice/wizard-ui.js','source-rules/practice/wizard.css','source-rules/practice/course.html','source-rules/practice/course.js',...['attendance','second','unrelated','quoted'].map(id=>'source-rules/practice/assets/'+id+'.png')])assert.ok(files[name],name);
  for(const name of ['practice.html','practice.js','practice.css','source-rules/practice/frame.html','source-rules/practice/controller.js'])assert.equal(files[name],undefined,name);
  const manifest=JSON.parse(new TextDecoder().decode(files['manifest.json']));
  assert.deepEqual(manifest.permissions,sourceManifest.permissions);assert.deepEqual(manifest.host_permissions,sourceManifest.host_permissions);
  assert.ok(!manifest.permissions.some(p=>['debugger','userScripts'].includes(p)));
 }
});
