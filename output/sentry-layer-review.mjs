import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:5217/');
await page.locator('[data-testid="menu-start"]').click();
await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
for(const biome of ['fungal','flooded','hewn']) {
await page.evaluate(async biome=>{
const {generateDungeon}=await import('/src/game/dungeon/generate.ts');
const {sentryFor}=await import('/src/game/sentry/placement.ts');
const dungeon=generateDungeon({seed:4242,floor:3});
const index=dungeon.rooms.findIndex(r=>r.kind==='normal'&&sentryFor(r,dungeon.seed,3));
if(index<0)throw Error('Missing watched fixture');
const room={...dungeon.rooms[index],biome,shape:'octagon',size:24};dungeon.rooms[index]=room;
window.__run.setState({dungeon,floor:3,currentRoomId:room.id,transitioning:false,wardenRoomId:null,wardenAwake:false,harrierSlain:true,reaperAwake:false,thiefPhase:'away',invulnerableUntil:1e9,glim:51});
window.__bus.emit('teleport',{position:[0,1.5,0]});window.__bus.emit('lookSet',{yaw:.7,pitch:-.6});
},biome);
await page.waitForTimeout(1400);
const data=await page.evaluate(async()=>{
const {Vector3}=await import('/node_modules/.vite/deps/three.js');
const beam=window.__scene.getObjectByName('sentry-beam');if(!beam)throw Error('Missing beam');
beam.updateWorldMatrix(true,false);
const vertices=beam.geometry.attributes.position;
const heights=Array.from({length:beam.geometry.drawRange.count},(_,i)=>new Vector3().fromBufferAttribute(vertices,i).applyMatrix4(beam.matrixWorld).y);
return {low:Math.min(...heights),high:Math.max(...heights),depthTest:beam.material.depthTest,depthWrite:beam.material.depthWrite};
});
assert.ok(data.low>.041&&data.high<.061,JSON.stringify(data));
assert.equal(data.depthTest,true);assert.equal(data.depthWrite,false);
await page.screenshot({path:`output/world-review/sentry-layer-${biome}.png`});
console.log(biome,data);
}
assert.deepEqual(errors,[]);console.log('PASS native beam clears flat terrain with depth testing');
} finally {await browser.close();}

