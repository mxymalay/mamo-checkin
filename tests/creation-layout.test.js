import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('both creators and testing share steps, forms, actions, toolbar and recognition layouts',async()=>{
 for(const path of ['builder/ui.js','practice/wizard-ui.js','test-ui.js']){
  const source=await readFile(new URL('../extension/source-rules/'+path,import.meta.url),'utf8');
  for(const token of ['creationLayout','creation-flow','layout.steps(','layout.toolbar(','layout.fields(','layout.actions(','layout.recognition('])assert.ok(source.includes(token),`${path}: ${token}`);
 }
});
