import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:5215/');await page.locator('[data-testid="menu-start"]').click();await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
const result=await page.evaluate(async()=>{
const {geo}=await import('/src/game/props/shared.ts');
const run=window.__run;run.getState().startRun(555);await new Promise(r=>setTimeout(r,1000));run.getState().pause();
const dungeon=run.getState().dungeon,ids=dungeon.rooms.map(r=>r.id),cube=geo('box',1,1,1),plane=geo('plane',1,1);
let cubeDisposals=0,planeDisposals=0;cube.addEventListener('dispose',()=>cubeDisposals++);plane.addEventListener('dispose',()=>planeDisposals++);
const laps=[];for(let lap=0;lap<3;lap++){const row=[];for(const id of ids){run.setState({currentRoomId:id,transitioning:false});window.__bus.emit('teleport',{position:[0,1.5,0]});await new Promise(r=>setTimeout(r,400));
if(run.getState().dungeon!==dungeon)throw Error('Room sampling descended');
let unitCubes=0;window.__scene.traverse(o=>{if(o.name==='wall-course-faces'&&o.geometry!==plane)throw Error('Course plane was rebuilt');if(['building-blocks','terrain-deposits'].includes(o.name)){if(o.geometry!==cube)throw Error('Unit cube was rebuilt');unitCubes++;}});row.push({id,geometries:window.__perf.geometries,unitCubes});}laps.push(row);}
return {laps,cubeDisposals,planeDisposals};});
assert.equal(result.cubeDisposals,0);assert.equal(result.planeDisposals,0);for(let i=0;i<result.laps[2].length;i++){assert.ok(result.laps[2][i].geometries<=result.laps[1][i].geometries);assert.equal(result.laps[2][i].unitCubes,result.laps[1][i].unitCubes);}assert.deepEqual(errors,[]);console.log('PASS shared shapes: three room laps, no per-room resource growth, one cube identity and no shared-geometry disposal');
}finally{await browser.close();}


