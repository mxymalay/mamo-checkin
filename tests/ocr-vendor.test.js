import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {VENDOR} from '../scripts/ocr-vendor.mjs';
import {prepareExtension} from '../scripts/prepare-extension.mjs';

test('source extension preparation includes every packaged offline OCR dependency',async()=>{
 const root=new URL('../',import.meta.url);
 const directory=await mkdtemp(join(tmpdir(),'mamo-vendor-')),target=pathToFileURL(directory+'/');
 try{
 await prepareExtension(target);
 for(const [destination,source] of VENDOR){
  const actual=await readFile(new URL(destination,target));
  assert.ok(actual.length>0);assert.deepEqual(actual,await readFile(new URL(source,root)));
 }
 }finally{await rm(directory,{recursive:true,force:true});}
});
