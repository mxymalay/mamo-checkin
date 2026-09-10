import {cp,mkdir,readFile,readdir,rm,writeFile,chmod,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {zipSync} from 'fflate';
const root=fileURLToPath(new URL('..',import.meta.url));
const includeCompanion=process.env.MAMO_BUILD_COMPANION==='1';
execFileSync('/bin/sh',[path.join(root,'scripts/build-native.sh')],{stdio:'inherit'});
const bundle=path.join(root,'build','mac');
await rm(bundle,{recursive:true,force:true});await mkdir(bundle,{recursive:true});
await cp(path.join(root,'extension'),path.join(bundle,'extension'),{recursive:true});
for(const file of ['local-service.js','offscreen.html','offscreen.js','ocr-controller.js','ocr-engine.js'])await rm(path.join(bundle,'extension',file),{force:true});
// Preserve the original unpacked-extension location for existing local installs.
await rm(path.join(root,'build/extension'),{recursive:true,force:true});
await cp(path.join(bundle,'extension'),path.join(root,'build/extension'),{recursive:true});
await mkdir(path.join(bundle,'native'));await mkdir(path.join(bundle,'build'));
await cp(path.join(root,'native/host.py'),path.join(bundle,'native/host.py'));
await cp(path.join(root,'build/attendance-ocr'),path.join(bundle,'build/attendance-ocr'));
await cp(path.join(root,'scripts/install-native.py'),path.join(bundle,'install-native.py'));
const command=path.join(bundle,'安装Mac识别服务.command');
await writeFile(command,'#!/bin/sh\nset -eu\ncd -- "$(dirname -- "$0")"\n/usr/bin/python3 ./install-native.py\n');await chmod(command,0o755);
await cp(path.join(root,'INSTALL.md'),path.join(bundle,'安装说明.md'));
const files={};
async function add(folder,prefix=''){
  for(const entry of await readdir(folder,{withFileTypes:true})){
    if(entry.name==='.DS_Store')continue;
    const location=path.join(folder,entry.name),name=prefix+entry.name;
    if(entry.isDirectory())await add(location,name+'/');
    else {const mode=(await stat(location)).mode;files[name]=[new Uint8Array(await readFile(location)),{os:3,attrs:mode<<16}];}
  }
}
await add(bundle);
const output=path.join(root,'build','mamo-checkin-mac.zip');
await writeFile(output,zipSync(files,{level:6}));
console.log('Mac 安装包：'+output);
if(!includeCompanion)process.exit(0);
const companion={};
for(const [name,value] of Object.entries(files))if(!name.startsWith('extension/')&&name!=='安装说明.md')companion[name]=value;
companion['INSTALL.md']=new Uint8Array(await readFile(path.join(root,'OCR-INSTALL.md')));
await writeFile(path.join(root,'build/mamo-ocr-mac.zip'),zipSync(companion,{level:6}));
console.log('Mac OCR 配套包：'+path.join(root,'build/mamo-ocr-mac.zip'));
