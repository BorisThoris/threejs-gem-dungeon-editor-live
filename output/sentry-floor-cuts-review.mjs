import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:5232/');await page.locator('[data-testid="menu-start"]').click();
await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
await page.evaluate(async()=>{
const {generateDungeon}=await import('/src/game/dungeon/generate.ts');const {sentryFor}=await import('/src/game/sentry/placement.ts');
const dungeon=generateDungeon({seed:4242,floor:3});
const index=dungeon.rooms.findIndex(r=>r.kind==='normal'&&sentryFor(r,dungeon.seed,3));
const room={...dungeon.rooms[index],biome:'mossy',shape:'octagon',size:20,links:{},secret:undefined,wings:{north:10,east:10,south:10,west:10}};
dungeon.rooms[index]=room;
window.__run.setState({dungeon,floor:3,currentRoomId:room.id,transitioning:false,wardenRoomId:null,wardenAwake:false,harrierSlain:true,reaperAwake:false,thiefPhase:'away',invulnerableUntil:1e9,glim:51});
window.__bus.emit('teleport',{position:[0,1.5,0]});window.__bus.emit('lookSet',{yaw:.7,pitch:-.3});
});
let maxY=0;
for(let i=0;i<60;i++) {
await page.waitForTimeout(250);
const sample=await page.evaluate(async()=>{
const {Vector3}=await import('/node_modules/.vite/deps/three.js');const {floorHeightAt}=await import('/src/game/worldbuilding/elevation.ts');
const state=window.__run.getState(),room=state.dungeon.rooms.find(r=>r.id===state.currentRoomId);
const mesh=window.__scene.getObjectByName('sentry-beam');mesh.updateWorldMatrix(true,false);
const positions=mesh.geometry.attributes.position;let maxY=0,error=0,target=null;
for(let i=0;i<mesh.geometry.drawRange.count;i+=3){
const center=new Vector3();for(let j=0;j<3;j++)center.add(new Vector3().fromBufferAttribute(positions,i+j).applyMatrix4(mesh.matrixWorld));center.divideScalar(3);
if(center.y>maxY){maxY=center.y;target=[center.x,center.y,center.z];}error=Math.max(error,Math.abs(center.y-floorHeightAt(room,center.x,center.z)-.06));
}
return {maxY,error,target,phase:state.phase,facing:window.__sentry?.facing,count:mesh.geometry.drawRange.count,origin:mesh.parent.position.toArray(),wings:room.wings,size:room.size};
});
assert.ok(sample.error<1e-5,JSON.stringify(sample));maxY=Math.max(maxY,sample.maxY);
if(sample.maxY>.6){await page.evaluate(target=>{window.__run.getState().pause();window.__bus.emit('lookSet',{yaw:Math.atan2(-target[0],-target[2]),pitch:Math.atan2(target[1]-1.6,Math.hypot(target[0],target[2]))});},sample.target);await page.waitForTimeout(200);await page.locator('[data-testid="pause-resume"]').evaluate(el=>{el.parentElement.parentElement.style.visibility='hidden';});const rendered=await page.evaluate(async target=>{const T=await import('/node_modules/.vite/deps/three.js');const renderer=new T.WebGLRenderer({preserveDrawingBuffer:true,antialias:true});renderer.setSize(1000,800);const camera=new T.PerspectiveCamera(60,1.25,.1,100);camera.position.set(target[0]+.4,target[1]+1.5,target[2]+.4);camera.lookAt(...target);renderer.render(window.__scene,camera);const image=renderer.domElement.toDataURL();renderer.dispose();return image;},sample.target);writeFileSync('output/world-review/sentry-raised-projection.png',Buffer.from(rendered.split(',')[1],'base64'));break;}
}
assert.ok(maxY>.6,'beam reaches raised gallery');
await page.evaluate(()=>window.__run.getState().pause());await page.waitForTimeout(150);
const vertices=()=>page.evaluate(()=>{const g=window.__scene.getObjectByName('sentry-beam').geometry;return Array.from(g.attributes.position.array.slice(0,g.drawRange.count*3));});
const frozen=await vertices();await page.waitForTimeout(350);assert.deepEqual(await vertices(),frozen);
await page.evaluate(()=>window.__run.getState().resume());await page.waitForTimeout(350);assert.notDeepEqual(await vertices(),frozen);
assert.deepEqual(errors,[]);console.log('PASS raised beam: native surface alignment, visible height, pause and resume',maxY);
}finally{await browser.close();}







