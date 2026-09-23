import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';
import Ajv from 'ajv';

export async function runValidation(ruleFile,fixturesDir,moduleRoot=new URL('../extension/source-rules/',import.meta.url)){
 fixturesDir=fixturesDir instanceof URL?fileURLToPath(fixturesDir):fixturesDir;
 const {parseRule,validateSelector}=await import(new URL('format.js',moduleRoot));
 const {installSourceRuleRuntime}=await import(new URL('runtime.js',moduleRoot));
 const text=await readFile(ruleFile,'utf8'),rule=parseRule(text),schema=JSON.parse(await readFile(new URL('schema.json',moduleRoot),'utf8'));
 const ajv=new Ajv({allErrors:true});ajv.addFormat('mamo-selector',{type:'string',validate:value=>{try{validateSelector(value);return true;}catch{return false;}}});
 const validate=ajv.compile(schema);if(!validate(rule))throw new Error(`schema: ${rule.id}`);
 installSourceRuleRuntime();
 const files=(await readdir(fixturesDir)).filter(name=>name.endsWith('.fixture.json')).sort();
 if(!files.length)throw new Error('no-fixtures');
 let count=0;
 for(const filename of files){
  const fixture=JSON.parse(await readFile(join(fixturesDir,filename),'utf8'));
  if(fixture.source!==rule.source)throw new Error(`fixture-source: ${filename}`);
  const dom=new JSDOM(fixture.html,{url:fixture.url});
  try{
   const roots=[...dom.window.document.querySelectorAll(fixture.root||'main')];if(!roots.length)throw new Error(`fixture-root: ${filename}`);
   for(const img of dom.window.document.querySelectorAll('img'))for(const [key,value] of [['naturalWidth',Number(img.getAttribute('width')||0)],['naturalHeight',Number(img.getAttribute('height')||0)],['complete',true]])Object.defineProperty(img,key,{value});
   const results=roots.map(root=>globalThis.__mamoSourceRules.locate({root,source:fixture.source,course:fixture.course,rules:[rule],mode:'community',contextText:root.textContent,collectTrace:true,isThread:fixture.isThread}));
   const actual=results.flatMap(r=>r.images.map(i=>i.url)).sort(),expected=[...fixture.expected].sort();
   if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`fixture-mismatch: ${rule.id} ${filename} expected=${expected.length} actual=${actual.length}`);
   if(fixture.expectedReasons)for(const reason of fixture.expectedReasons)if(!results.some(r=>r.trace.some(t=>t.reason===reason)))throw new Error(`reason-mismatch: ${filename} ${reason}`);
   count++;
  }finally{dom.window.close();}
 }
 return {id:rule.id,fixtures:count};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const index=process.argv.indexOf('--fixtures');if(!process.argv[2]||index<0||!process.argv[index+1])throw new Error('Usage: validate-source-rules.mjs rule.json --fixtures directory');const result=await runValidation(process.argv[2],process.argv[index+1]);console.log(`PASS ${result.id}: ${result.fixtures} fixtures`);}
 catch(error){console.error(error.message);process.exitCode=1;}
}
