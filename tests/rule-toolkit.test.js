import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixtureRule} from './helpers/source-rules.js';
test('contributor CLI rejects missing and unwanted images, not just invalid JSON',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rule-fixture-'));
 try{
  await writeFile(join(dir,'rule.json'),JSON.stringify(fixtureRule()));
  const sample={source:'moodle',course:'DEMO1000',url:'https://learning.monash.edu/course/view.php?id=1',html:'<main><div class="attendance"><img src="/wanted.png" width="800" height="200"></div><img class="avatar" src="/avatar.png"></main>',expected:['https://learning.monash.edu/wanted.png']};
  await writeFile(join(dir,'sample.fixture.json'),JSON.stringify(sample));
  const run=()=>spawnSync(process.execPath,['scripts/validate-source-rules.mjs',join(dir,'rule.json'),'--fixtures',dir],{encoding:'utf8'});
  let result=run();assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/PASS/);
  sample.expected=[];await writeFile(join(dir,'sample.fixture.json'),JSON.stringify(sample));
  result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/mismatch/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
