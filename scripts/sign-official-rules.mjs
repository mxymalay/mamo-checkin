import {readFile,readdir,writeFile,mkdir,stat} from 'node:fs/promises';
import {createPrivateKey,sign} from 'node:crypto';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {validateOfficialPayload,verifyOfficialRelease,OFFICIAL_MAX_BYTES} from '../extension/source-rules/official-release.js';
import {OFFICIAL_KEY_ID} from '../extension/source-rules/official-trust.js';

const {values}=parseArgs({options:{key:{type:'string'},rules:{type:'string'},output:{type:'string'},sequence:{type:'string'},version:{type:'string'}}});
if(!values.key||!values.rules||!values.output||!values.sequence||!values.version)throw new Error('Required: --key PRIVATE.pem --rules RULE_DIRECTORY --output latest.json --sequence INTEGER --version X.Y.Z');
const keyPath=path.resolve(values.key),output=path.resolve(values.output),info=await stat(keyPath);
if(process.platform!=='win32'&&(info.mode&0o077))throw new Error('Signing key permissions must be 0600 or stricter.');
const rules=[];
async function collect(dir){for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,entry.name);if(entry.isDirectory())await collect(file);else if(entry.isFile()&&entry.name.endsWith('.json'))rules.push(JSON.parse(await readFile(file,'utf8')));}}
await collect(path.resolve(values.rules));
const value=validateOfficialPayload({schemaVersion:1,engineVersion:1,sequence:Number(values.sequence),version:values.version,publishedAt:new Date().toISOString(),rules});
try{const prior=await verifyOfficialRelease(JSON.parse(await readFile(output,'utf8')));if(value.sequence<=prior.sequence)throw new Error('The sequence must increase for every publication, including rollback releases.');}catch(error){if(error.code!=='ENOENT')throw error;}
const payload=JSON.stringify(value),signature=sign('sha256',Buffer.from(payload),{key:createPrivateKey(await readFile(keyPath)),dsaEncoding:'ieee-p1363'}).toString('base64');
const envelope={keyId:OFFICIAL_KEY_ID,payload,signature};await verifyOfficialRelease(envelope);
const bytes=JSON.stringify(envelope,null,2)+'\n';if(Buffer.byteLength(bytes)>OFFICIAL_MAX_BYTES)throw new Error('Release exceeds the download size limit.');
await mkdir(path.dirname(output),{recursive:true});
const archive=path.join(path.dirname(output),'releases',String(value.sequence)+'.json');await mkdir(path.dirname(archive),{recursive:true});
await writeFile(archive,bytes,{flag:'wx'});await writeFile(output,bytes);
console.log(`Signed official rules ${value.version}, sequence ${value.sequence}, ${rules.length} rules.\n${output}\n${archive}`);
