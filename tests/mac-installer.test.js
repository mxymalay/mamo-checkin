import {existsSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
test('installer registers only the intended extension and launcher works with spaces in paths',{skip:process.platform!=='darwin'},async()=>{
  if(!existsSync(path.join(root,'build/attendance-ocr'))){const build=spawnSync('/bin/sh',[path.join(root,'scripts/build-native.sh')],{encoding:'utf8'});assert.equal(build.status,0,build.stderr);}
  const directory=await mkdtemp(path.join(tmpdir(),'attendance install 中文 '));
  try{
    const code="import importlib.util,pathlib,sys\nspec=importlib.util.spec_from_file_location('installer',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nlauncher,manifest,ext=m.install(pathlib.Path(sys.argv[2]),pathlib.Path(sys.argv[3]));print(manifest)";
    const run=spawnSync('/usr/bin/python3',['-c',code,path.join(root,'scripts/install-native.py'),root,directory],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const manifest=JSON.parse(await readFile(run.stdout.trim(),'utf8'));
    assert.deepEqual(manifest.allowed_origins,['chrome-extension://nccgbccaamgcdcikjhljinefjbfcinfp/','chrome-extension://mneachaobiledakoicnkinfdpcjkbnmm/']);
    assert.ok(manifest.path.startsWith(directory));
    const ping=Buffer.from('{"op":"ping"}'),header=Buffer.alloc(4);header.writeUInt32LE(ping.length);
    const response=spawnSync(manifest.path,[],{input:Buffer.concat([header,ping])});
    assert.equal(response.status,0,response.stderr.toString());
    assert.equal(JSON.parse(response.stdout.subarray(4)).binaryReady,true);
  }finally{await rm(directory,{recursive:true,force:true});}
});
test('Mac uninstaller removes only the native service from a temporary home',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'attendance uninstall 中文 '));
 try{
  const runtime=path.join(directory,'Library/Application Support/签到助手/native-runtime');
  const registry=path.join(directory,'Library/Application Support/Google/Chrome/NativeMessagingHosts');
  const settings=path.join(directory,'Library/Application Support/签到助手/settings.json');
  await mkdir(path.join(runtime,'native'),{recursive:true});await mkdir(registry,{recursive:true});
  await writeFile(path.join(runtime,'native','host.py'),'test');await writeFile(settings,'keep');await writeFile(path.join(registry,'com.attendanceassistant.vision.json'),'{}');
  const code="import importlib.util,pathlib,sys\nspec=importlib.util.spec_from_file_location('uninstaller',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nm.uninstall(pathlib.Path(sys.argv[2]))\nassert not pathlib.Path(sys.argv[3]).exists()\nassert not pathlib.Path(sys.argv[4]).exists()\nassert pathlib.Path(sys.argv[5]).exists()\n";
  const run=spawnSync('/usr/bin/python3',['-c',code,path.join(root,'scripts/uninstall-native.py'),directory,path.join(registry,'com.attendanceassistant.vision.json'),runtime,settings],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('native health does not report ready when the executable fails or returns malformed output',()=>{
 const code=`import importlib.util, pathlib, sys
from unittest.mock import patch
from subprocess import CompletedProcess
spec=importlib.util.spec_from_file_location('host',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
for result in [CompletedProcess([],1,b'',b'blocked'),CompletedProcess([],0,b'[]',b''),CompletedProcess([],0,b'not json',b'')]:
 with patch.object(m.subprocess,'run',return_value=result):
  response=m.handle_request({'op':'ping'})
  assert response['binaryReady'] is False
  assert '未通过' in response['stage']
  assert '隐私与安全性' in response['healthError']
`;
 const result=spawnSync('/usr/bin/python3',['-c',code,path.join(root,'native/host.py')],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});
