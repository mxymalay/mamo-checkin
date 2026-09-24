import test from 'node:test';
import assert from 'node:assert/strict';
import {scrollGuideTarget,preserveGuidePosition} from '../extension/guide-scroll.js';

function fixture(reduced=false){
 let callback;const positions=[],listeners=new Map();
 const win={scrollY:0,innerHeight:800,matchMedia:()=>({matches:reduced}),requestAnimationFrame:fn=>{callback=fn;return 1;},cancelAnimationFrame:()=>{callback=null;},scrollTo:({top})=>positions.push(top),addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 const node={ownerDocument:{defaultView:win,documentElement:{scrollHeight:3000}},getBoundingClientRect:()=>({top:1300,height:200}),scrollIntoView:options=>positions.push(options.behavior)};
 return {node,positions,listeners,tick:time=>callback(time)};
}
test('guide scroll eases over a full second instead of jumping',()=>{
 const e=fixture();scrollGuideTarget(e.node);
 e.tick(0);e.tick(250);e.tick(500);e.tick(1000);
 assert.deepEqual(e.positions,[0,62.5,500,1000]);assert.equal(e.listeners.size,0);
});
test('revealing identity cards preserves the course position before scrolling',()=>{
 const e=fixture();let top=200;
 e.node.getBoundingClientRect=()=>({top,height:40});
 preserveGuidePosition(e.node,()=>{top+=450;});
 assert.deepEqual(e.positions,[450]);
});
test('browser anchoring that already preserved the position is not applied twice',()=>{
 const e=fixture();preserveGuidePosition(e.node,()=>{});assert.deepEqual(e.positions,[]);
});
test('manual scrolling cancels the guide animation',()=>{
 const e=fixture();scrollGuideTarget(e.node);e.tick(0);e.listeners.get('wheel')();
 assert.equal(e.listeners.size,0);assert.deepEqual(e.positions,[0]);
});
test('reduced motion does not animate guide scrolling',()=>{
 const e=fixture(true);scrollGuideTarget(e.node);assert.deepEqual(e.positions,['instant']);
});
