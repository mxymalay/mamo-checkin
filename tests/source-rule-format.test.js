import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRule,validateRule,validateSelector,ruleDigest} from '../extension/source-rules/format.js';
import {fixtureRule} from './helpers/source-rules.js';
import * as format from '../extension/source-rules/format.js';
import {readFile} from 'node:fs/promises';
import Ajv from 'ajv';
test('download template includes all schema fields and is valid with empty optional lists',async()=>{
 const raw=JSON.parse(await readFile(new URL('../extension/source-rules/template.json',import.meta.url),'utf8'));
 const schema=JSON.parse(await readFile(new URL('../extension/source-rules/schema.json',import.meta.url),'utf8'));
 assert.deepEqual(Object.keys(raw).sort(),Object.keys(schema.properties).sort());
 for(const key of ['name','keywords','images','attachments'])assert.deepEqual(Object.keys(raw[key]).sort(),Object.keys(schema.properties[key].properties).sort());
 assert.deepEqual(Object.keys(raw.author).sort(),['name','url']);
 const ajv=new Ajv();ajv.addFormat('mamo-selector',value=>{try{validateSelector(value);return true;}catch{return false;}});const valid=ajv.compile(schema);
 for(const source of ['gmail','moodle','ed']){const rule={...raw,source};assert.doesNotThrow(()=>validateRule(rule));assert.ok(valid(rule),JSON.stringify(valid.errors));}
 assert.deepEqual(raw.attachments.selectors,[]);
});

test('shared ID policy reports specific failures without normalizing input',()=>{
 const check=format.validateRuleId;
 assert.equal(typeof check,'function');
 for(const [id,code] of [[null,'id-type'],[42,'id-type'],['','id-empty'],['   ','id-empty'],['a.'.padEnd(257,'a'),'id-length'],['Alice.Rule','id-format'],['alice..rule','id-format'],['alice-rule-','id-format'],['alice','id-format'],['alice.rule\n','id-format'],['demo.alice','id-reserved'],['alice.mydemo.rule','id-reserved'],['alice.builtin-rule','id-reserved'],['Alice.BUILTIN','id-reserved'],['DeMo.alice','id-reserved']]){
  assert.throws(()=>check(id),e=>e.code===code&&e.path==='$.id',String(id));
  assert.throws(()=>validateRule(fixtureRule({id})),e=>e.code===code&&e.path==='$.id');
 }
 assert.equal(check('alice.fit5122.moodle'),'alice.fit5122.moodle');
 assert.equal(check('a.'.padEnd(256,'a')),'a.'.padEnd(256,'a'));
 assert.equal(check('builtin.moodle',{builtin:true}),'builtin.moodle');
 assert.throws(()=>parseRule(JSON.stringify(fixtureRule({id:'builtin.moodle',builtin:true}))),e=>e.code==='unknown-field');
});
test('published schema agrees on ID grammar, bounds and reserved substrings',async()=>{
 const schema=JSON.parse(await readFile(new URL('../extension/source-rules/schema.json',import.meta.url)));
 const validate=new Ajv().compile(schema.properties.id);
 for(const id of ['demo.alice','alice.mydemo.rule','alice.builtin-rule','Alice.Rule','alice..rule','alice-rule-','alice','alice.rule\n','a.'.padEnd(257,'a'),null,''])assert.equal(validate(id),false,String(id));
 for(const id of ['alice.fit5122.moodle','community.example.gmail-images','a.'.padEnd(256,'a')])assert.equal(validate(id),true,id);
});

test('JSON rule import validates nested fields, budgets and built-in ownership',()=>{
  assert.equal(parseRule(JSON.stringify(fixtureRule())).source,'moodle');
  for(const patch of [{execute:'fetch(secret)'},{schemaVersion:2},{id:'builtin.moodle'},{source:'other'},{courses:[]},{courses:['__proto__']},{version:'latest'},{images:{selectors:['img'],maxHeight:Infinity}},{images:{selectors:['img'],script:'x'}},{name:{en:'ok',html:'<img>'}}])assert.throws(()=>validateRule(fixtureRule(patch)));
  assert.throws(()=>validateRule(fixtureRule({execute:'x'})),e=>e.code==='unknown-field'&&e.path==='$.execute');
  assert.throws(()=>validateRule(fixtureRule({source:'gmail',attachments:{selectors:['a[href]']}})),e=>e.code==='attachments-source');
  assert.throws(()=>parseRule(' '.repeat(65537)),e=>e.code==='size');
  assert.throws(()=>validateRule(fixtureRule({name:{en:'中'.repeat(257)}})));
  assert.throws(()=>validateRule(fixtureRule({images:{selectors:Array(9).fill('img')}})));
  assert.equal(validateRule(fixtureRule({id:'builtin.moodle',courses:[]}),{builtin:true}).courses.length,0);
});
test('selector grammar accepts bounded literal selectors and rejects executable or broad syntax',()=>{
  for(const s of ['img','.body > img','div#post img[data-src]','a[href*="files/"]','img.foo, .body img',"img[alt='hello world']"])assert.equal(validateSelector(s),s);
  for(const s of ['',':has(img)','img:not(.logo)','*','img + img','img~img','body;fetch(x)','img[onclick="x"]','img,',',img','img >','img[alt="a\\"]','iframe img','script img'])assert.throws(()=>validateSelector(s),s);
});
test('digest ignores property order but changes with rule content',async()=>{
  const rule=fixtureRule();
  assert.equal(await ruleDigest(rule),await ruleDigest(Object.fromEntries(Object.entries(rule).reverse())));
  assert.notEqual(await ruleDigest(rule),await ruleDigest(fixtureRule({version:'1.0.1'})));
  assert.equal(validateRule(fixtureRule({name:{en:'<script>alert(1)</script>'}})).name.en,'<script>alert(1)</script>');
});
