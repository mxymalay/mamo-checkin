import {mkdir,readFile,readdir,rm,writeFile,chmod,stat,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {zipSync} from 'fflate';
import {writeLanguagePackageDocs} from './package-docs.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
execFileSync('/bin/sh',[path.join(root,'scripts/build-native.sh')],{stdio:'inherit'});
const bundle=path.join(root,'build','mac-ocr');
await rm(bundle,{recursive:true,force:true});await mkdir(bundle,{recursive:true});
const languageBundles=[
 {directory:'English',language:'en',install:'Install Mac Recognition.command',uninstall:'Uninstall Mac Recognition.command'},
 {directory:'中文',language:'zh',install:'安装 Mac 识别服务.command',uninstall:'卸载 Mac 识别服务.command'}
];
for(const item of languageBundles){
 const folder=path.join(bundle,item.directory);
 await mkdir(path.join(folder,'native'),{recursive:true});await mkdir(path.join(folder,'build'),{recursive:true});await mkdir(path.join(folder,'installer'),{recursive:true});
 await copyFile(path.join(root,'native/host.py'),path.join(folder,'native/host.py'));
 await copyFile(path.join(root,'build/attendance-ocr'),path.join(folder,'build/attendance-ocr'));
 await copyFile(path.join(root,'scripts/install-native.py'),path.join(folder,'installer/install-native.py'));
 await copyFile(path.join(root,'scripts/uninstall-native.py'),path.join(folder,'installer/uninstall-native.py'));
 const command=path.join(folder,item.install),uninstallCommand=path.join(folder,item.uninstall);
 await writeFile(command,`#!/bin/sh\nset -eu\nSCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"\nexec /usr/bin/python3 "$SCRIPT_DIR/installer/install-native.py" --language ${item.language}\n`);await chmod(command,0o755);
 await writeFile(uninstallCommand,`#!/bin/sh\nset -eu\nSCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"\nexec /usr/bin/python3 "$SCRIPT_DIR/installer/uninstall-native.py" --language ${item.language}\n`);await chmod(uninstallCommand,0o755);
}
await writeLanguagePackageDocs(bundle,{platform:'mac',kind:'ocr'});

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
