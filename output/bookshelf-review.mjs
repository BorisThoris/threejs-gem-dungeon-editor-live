import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
const page=await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:5215/'); await page.locator('[data-testid="menu-start"]').click();
await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
await page.evaluate(async()=>{const run=window.__run;run.getState().startRun(4242);await new Promise(r=>setTimeout(r,1200));for(let f=1;f<3;f++){run.setState({transitioning:true,currentRoomId:run.getState().dungeon.endId});run.getState().roomReady(run.getState().dungeon.endId);await new Promise(r=>setTimeout(r,900));}run.setState({transitioning:false,currentRoomId:'room_5'});window.__bus.emit('teleport',{position:[0,1.5,0]});});
await page.waitForTimeout(1800);
const result=await page.evaluate(()=>{const shelves=[];window.__scene.traverse(o=>{if(o.name==='shelf-books')shelves.push({count:o.count,colors:[...o.instanceColor.array],matrices:[...o.instanceMatrix.array],bounds:o.boundingSphere?.radius});});return {shelves,room:window.__run.getState().dungeon.rooms.find(r=>r.id==='room_5').kind};});
assert.equal(result.room,'library'); assert.ok(result.shelves.length>0); for(const s of result.shelves){assert.equal(s.count,12);assert.equal(s.colors.length,36);assert.ok(new Set(s.colors).size>=4);assert.ok(s.matrices.every(Number.isFinite));assert.ok(s.bounds>0);} assert.deepEqual(errors,[]);
await page.screenshot({path:'output/world-review/bookshelf-batch.png'});console.log('PASS library bookshelf instance colors, transforms, bounds, and browser errors',result.shelves.length);
}finally{await browser.close();}
