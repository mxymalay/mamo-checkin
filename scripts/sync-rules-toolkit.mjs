import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const index=process.argv.indexOf('--target'),target=process.argv[index+1];
if(index<0||!target)throw new Error('Usage: sync-rules-toolkit.mjs --target directory [--check]');
const files={'extension/source-rules/format.js':'toolkit/format.js','extension/source-rules/runtime.js':'toolkit/runtime.js','extension/source-rules/schema.json':'toolkit/schema.json','scripts/validate-source-rules.mjs':'toolkit/validate.mjs'};
const manifest={format:1,files:{}};
for(const [source,destination] of Object.entries(files)){
 const data=await readFile(new URL('../'+source,import.meta.url)),path=join(resolve(target),destination);
 manifest.files[destination]=createHash('sha256').update(data).digest('hex');
 if(process.argv.includes('--check')){if(!data.equals(await readFile(path)))throw new Error('Toolkit differs: '+destination);}
 else{await mkdir(dirname(path),{recursive:true});await writeFile(path,data);}
}
const data=Buffer.from(JSON.stringify(manifest,null,2)+'\n'),path=join(resolve(target),'toolkit/manifest.json');
if(process.argv.includes('--check')){if(!data.equals(await readFile(path)))throw new Error('Toolkit manifest differs');}
else await writeFile(path,data);
const schema=await readFile(new URL('../extension/source-rules/schema.json',import.meta.url)),schemaPath=join(resolve(target),'schema/source-rule.v1.schema.json');
if(process.argv.includes('--check')){if(!schema.equals(await readFile(schemaPath)))throw new Error('Published schema differs');}
else{await mkdir(dirname(schemaPath),{recursive:true});await writeFile(schemaPath,schema);}
console.log(process.argv.includes('--check')?'Toolkit matches extension source':'Toolkit synchronized (explicit file whitelist only)');
