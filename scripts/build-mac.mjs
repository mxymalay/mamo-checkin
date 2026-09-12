import {mkdir,readFile,readdir,rm,writeFile,chmod,stat,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {zipSync} from 'fflate';
import {packageDocs} from './package-docs.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
execFileSync('/bin/sh',[path.join(root,'scripts/build-native.sh')],{stdio:'inherit'});
const bundle=path.join(root,'build','mac-ocr');
await rm(bundle,{recursive:true,force:true});await mkdir(bundle,{recursive:true});
await mkdir(path.join(bundle,'native'));await mkdir(path.join(bundle,'build'));await mkdir(path.join(bundle,'installer'));
await copyFile(path.join(root,'native/host.py'),path.join(bundle,'native/host.py'));
await copyFile(path.join(root,'build/attendance-ocr'),path.join(bundle,'build/attendance-ocr'));
await copyFile(path.join(root,'scripts/install-native.py'),path.join(bundle,'installer/install-native.py'));
const command=path.join(bundle,'Install Mac Recognition.command');
 await writeFile(command,'#!/bin/sh\nset -eu\nSCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"\nexec /usr/bin/python3 "$SCRIPT_DIR/installer/install-native.py" --language en\n');await chmod(command,0o755);
const localizedCommand=path.join(bundle,'安装 Mac 识别服务.command');
await writeFile(localizedCommand,'#!/bin/sh\nset -eu\nSCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"\nexec /usr/bin/python3 "$SCRIPT_DIR/installer/install-native.py" --language zh\n');await chmod(localizedCommand,0o755);
const docs=await packageDocs({platform:'mac',kind:'ocr'});
await writeFile(path.join(bundle,'README.md'),docs.readme);await writeFile(path.join(bundle,'说明.md'),docs.chinese);

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
const output=path.join(root,'build','mamo-ocr-mac.zip');await writeFile(output,zipSync(files,{level:6}));
console.log('Mac OCR 配套包：'+output);
