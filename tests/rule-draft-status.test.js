import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installRuleManager} from '../extension/source-rules/manager-ui.js';
import {ruleText} from '../extension/source-rules/strings.js';
import {fixtureRule} from './helpers/source-rules.js';
import {draftRuleCounts,renderDraftNotices} from '../extension/source-rules/draft-status.js';
import {ruleUI} from '../extension/source-rules/ui.js';

test('draft notices split tested and untested counts and their destinations',()=>{
 const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main'),rules=['waiting','tested','applied'].map(id=>({...fixtureRule({id:'local.'+id}),digest:id}));
 const state={rules,settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},bindings:{DEMO1000:{moodle:['local.applied']}},tests:{'local.tested':{DEMO1000:{source:'moodle',digest:'tested'}}}};
 let destination='';assert.deepEqual(draftRuleCounts(state),{untested:1,tested:1});
 renderDraftNotices(root,state,ruleUI(root,s=>ruleText(s,'zh_CN')),{onImports:()=>destination='imports',onMatching:()=>destination='matching'});
 assert.match(root.textContent,/你有 1 个已导入草稿尚未测试/);assert.match(root.textContent,/你有 1 个已导入草稿尚未匹配/);
 assert.match(root.querySelector('[data-draft-state=untested] a').textContent,/规则历史导入/);
 root.querySelector('[data-draft-state=untested] a').click();assert.equal(destination,'imports');root.querySelector('[data-draft-state=tested] a').click();assert.equal(destination,'matching');
 dom.window.close();
});

test('draft notices count only unused rules, link to matching, and refresh with bindings',async()=>{
 const dom=new JSDOM('<div id="manager"></div><section id="matching"></section>'),doc=dom.window.document;
 const raw=fixtureRule(),local={...raw,key:'local:'+raw.id,origin:'local'},community={...raw,key:'community:'+raw.id,origin:'community'};
 const state={rules:[local,community],builtins:[fixtureRule({id:'builtin.moodle'})],settings:{courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}},bindings:{DEMO1000:{moodle:[community.key]}}};let navigated=0;
 const manager=installRuleManager({root:doc.querySelector('#manager'),bindingsRoot:doc.querySelector('#matching'),request:async()=>state,translate:s=>ruleText(s,'en'),onLibrary:()=>navigated++,onCreate:()=>{}});
 try{
  await manager.refresh();
  assert.match(doc.querySelector('#matching .rule-draft-notice').textContent,/1/);
  assert.equal(doc.querySelectorAll('.rule-state-draft').length,1);
  const create=doc.querySelector('[data-rule-action=create]');assert.equal(create.querySelector('.help-icon'),null);assert.ok(create.parentElement.querySelector('.help-button[aria-describedby]'));assert.equal(create.querySelector('button'),null);
  doc.querySelector('#manager .rule-draft-notice a').click();assert.equal(navigated,1);
  assert.equal(doc.querySelector('#manager h2,#matching h2'),null);
  state.bindings.DEMO1000.moodle.push(local.key);await manager.refresh();
  assert.equal(doc.querySelector('#manager .rule-draft-notices').hidden,true);
  assert.equal(doc.querySelector('#matching .rule-draft-notices').hidden,true);
  assert.equal(doc.querySelector('.rule-state-draft'),null);
  state.settings.sourceModes.DEMO1000='email';await manager.refresh();
  assert.match(doc.querySelector('#matching .rule-draft-notice').textContent,/2/);
 }finally{manager.dispose();dom.window.close();}
});
