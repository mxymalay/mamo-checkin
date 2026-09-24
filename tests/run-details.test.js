import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderRunDetails} from '../extension/run-details.js';
test('details isolate categories, safely show results and preserve technical expansion',()=>{
 const doc=new JSDOM('<main></main>').window.document,root=doc.querySelector('main');
 const status={counts:{images:1,cached:1},items:[{kind:'messages',id:'m',title:'OTHER'},{kind:'images',id:'i',title:'<script>bad</script>',state:'complete',cached:true,imageUrl:'javascript:bad',records:[{code:'ABCDE',date:'2026-09-24'}]}],events:[{metrics:['images'],message:'image detail'},{metrics:['pages'],message:'unrelated'}]};
 renderRunDetails(root,status,'cached');
 assert.match(root.textContent,/ABCDE/);assert.doesNotMatch(root.textContent,/OTHER|unrelated/);assert.equal(root.querySelector('script,img'),null);
 renderRunDetails(root,status,'images');root.querySelector('details').open=true;
 renderRunDetails(root,{...status,counts:{images:2}},'images');assert.ok(root.querySelector('details').open);
 assert.match(root.textContent,/image detail/);
});
test('legacy runs explain missing data and never substitute unrelated events',()=>{
 const doc=new JSDOM('<main></main>').window.document,root=doc.querySelector('main');
 renderRunDetails(root,{events:[{metrics:['pages'],message:'page'}]},'images');
 assert.match(root.textContent,/未保存/);assert.doesNotMatch(root.textContent,/page/);
});
test('unavailable previews retain a usable original link',()=>{
 const doc=new JSDOM('<main></main>').window.document,root=doc.querySelector('main');
 renderRunDetails(root,{items:[{kind:'images',id:'i',imageUrl:'https://example.com/image',state:'failed',reason:'Network error'}]},'images');
 root.querySelector('img').dispatchEvent(new doc.defaultView.Event('error'));
 assert.equal(root.querySelector('img'),null);assert.equal(root.querySelector('a').href,'https://example.com/image');assert.match(root.textContent,/预览不可用/);
});
