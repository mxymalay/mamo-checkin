import {mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {zipSync,unzipSync} from 'fflate';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('..',import.meta.url));
const build=path.join(root,'build');
const target=path.join(build,'extension');
const files={};

const VENDOR=[
 ['vendor/tesseract.min.js','node_modules/tesseract.js/dist/tesseract.min.js'],
 ['vendor/worker.min.js','node_modules/tesseract.js/dist/worker.min.js'],
 ['vendor/tesseract-core-simd-lstm.wasm.js','node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js'],
 ['vendor/tesseract-core-simd-lstm.wasm','node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm'],
 ['vendor/eng.traineddata.gz','node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz']
];
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
const manifest=JSON.parse(new TextDecoder().decode(files['manifest.json']));
assert.ok(manifest.key,'The GitHub extension package must keep its stable development key.');
assert.equal(Object.hasOwn(manifest,'key'),true);
assert.ok(!Object.keys(files).some(name=>name.startsWith('extension/')||/\.(exe|py|command)$/.test(name)));

await collectVendor(files);
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
for(const [name,data] of Object.entries(files)){
 const destination=path.join(target,...name.split('/'));await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,data);
}

const output=path.join(build,'mamo-checkin-extension.zip');
const zip=zipSync(files,{level:6});const contents=unzipSync(zip);
assert.ok(contents['manifest.json']);assert.ok(contents['options.html']);
await mkdir(build,{recursive:true});await writeFile(output,zip);
console.log('Chrome 扩展包：'+output);
console.log('扩展目录：'+target);
