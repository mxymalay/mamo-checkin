import test from 'node:test';
import assert from 'node:assert/strict';
import {processCollectedMessages} from '../extension/workflow.js';

const row=[{text:'ABC12 Workshop Monday 14 Sep 01 10:00 am',x:0,y:.5,width:1,height:.1,confidence:.99}];
const message={messageId:'m1',course:'FIT1234',subject:'attendance',sourceUrl:'https://learning.monash.edu/x',sentAt:'2026-09-15T03:00:00Z',sourceType:'moodle',textRows:[],images:['https://learning.monash.edu/table.png']};
const baseAdapter={getImage:async()=>({imageBase64:'x',mimeType:'image/png'}),save:async()=>{},saveDiagnostics:async()=>{},progress:async()=>{},shouldContinue:()=>true};

test('browser OCR records with reliable evidence submit automatically',async()=>{
 const state={records:[],seenMessages:{},diagnostics:[]};
 await processCollectedMessages(state,[message],{...baseAdapter,ocr:async()=>({observations:row,imageId:'h1',imagePath:'/p'})});
 assert.equal(state.records.length,1);
 assert.equal(state.records[0].status,'ready');
 assert.equal(state.records[0].code,'ABC12');
});

test('browser and companion records obey the same evidence gates',async()=>{
 // The old engineFallback downgrade is gone: a zone-rescued low-confidence
 // code stays in review because of its confidence, not because of its engine.
 const weak=[{text:'ABC12 Workshop Monday 14 Sep 01 10:00 am',x:0,y:.5,width:1,height:.1,confidence:.6}];
 const state={records:[],seenMessages:{},diagnostics:[]};
 await processCollectedMessages(state,[message],{...baseAdapter,ocr:async()=>({observations:weak,imageId:'h1',imagePath:'/p'})});
 assert.equal(state.records[0].status,'review');
 assert.doesNotMatch(state.records[0].reason,/浏览器内置识别结果仅供参考/);
});
