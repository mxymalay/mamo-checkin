import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fixtureRule} from './helpers/source-rules.js';
import {downloadCatalogRule,catalogURL,loadRuleCatalog} from '../extension/source-rules/catalog-client.js';
const text=JSON.stringify(fixtureRule());
const entry={...fixtureRule(),path:'examples/DEMO1000/moodle-images.json',sha256:createHash('sha256').update(text).digest('hex'),demo:true};
test('catalog download is explicit, credential-free, bounded and integrity checked',async()=>{
 const calls=[];const result=await downloadCatalogRule(entry,{fetchImpl:async(url,options)=>{calls.push({url,options});return new Response(text);}});
 assert.equal(result,text);assert.equal(calls[0].url,catalogURL(entry)+'?sha256='+entry.sha256);assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.redirect,'error');
 await assert.rejects(downloadCatalogRule(entry,{fetchImpl:async()=>new Response(text+' ')}),/catalog-integrity/);
 await assert.rejects(downloadCatalogRule(entry,{fetchImpl:async()=>new Response('x'.repeat(65537))}),/size/);
 assert.throws(()=>catalogURL({...entry,path:'../secret'}),/catalog-invalid/);
});
test('catalog validates origin metadata and rejects a mismatched package',async()=>{
 const catalog={schemaVersion:1,rules:[entry]};
 assert.equal((await loadRuleCatalog({fetchImpl:async()=>new Response(JSON.stringify(catalog))})).length,1);
 await assert.rejects(downloadCatalogRule({...entry,id:'community.other'},{fetchImpl:async()=>new Response(text)}),/catalog-integrity/);
 await assert.rejects(loadRuleCatalog({fetchImpl:async()=>new Response(JSON.stringify({...catalog,rules:[entry,entry]}))}),/catalog-invalid/);
});
test('catalog supports course folders and shared packages without allowing traversal or wrong courses',async()=>{
 for(const path of ['examples/DEMO1000/moodle-images.json','examples/shared/moodle-images.json'])assert.ok(catalogURL({...entry,path}).endsWith(path));
 for(const path of ['examples/DEMO2000/moodle-images.json','examples/../moodle-images.json','examples/DEMO1000/../moodle-images.json','examples/DEMO1000/deep/file.json'])assert.throws(()=>catalogURL({...entry,path}),/catalog-invalid/);
});
