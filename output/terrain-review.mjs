import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:5218/');await page.locator('[data-testid="menu-start"]').click();await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
for(const biome of ['fungal','flooded','hewn']){
await page.evaluate(async biome=>{const {generateDungeon}=await import('/src/game/dungeon/generate.ts'); const dungeon=generateDungeon({seed:4242,floor:3});const index=dungeon.rooms.findIndex(r=>r.kind==='normal'); const room={...dungeon.rooms[index],biome,shape:'octagon',size:24};dungeon.rooms[index]=room;window.__run.setState({dungeon,floor:3,currentRoomId:room.id,transitioning:false,wardenRoomId:null,wardenAwake:false,harrierSlain:true,reaperAwake:false,thiefPhase:'away',invulnerableUntil:1e9,glim:51});window.__bus.emit('teleport',{position:[0,1.5,0]});window.__bus.emit('lookSet',{yaw:.7,pitch:-.6});},biome);
await page.waitForTimeout(1600);await page.screenshot({path:`output/world-review/terrain-${process.argv[2]??'review'}-${biome}.png`});
const data=await page.evaluate(()=>{const rows=[];window.__scene.traverse(o=>{if(o.name.startsWith('terrain-'))rows.push({name:o.name,count:o.count,triangles:o.geometry.index.count/3*o.count,normalY:o.geometry.attributes.normal.getY(0),colors:o.material.color.getHexString()});});return rows;});console.log(biome,JSON.stringify(data));
if(process.argv[2]==='after'){assert.ok(data.length===2);for(const row of data){assert.equal(row.triangles,row.count*2);assert.equal(row.normalY,0);}}
}assert.deepEqual(errors,[]);console.log('PASS terrain rendering');
}finally{await browser.close();}



