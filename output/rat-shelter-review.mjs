import {chromium} from 'playwright-core';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5217/');await page.locator('[data-testid="menu-start"]').click();await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 const fixture=await page.evaluate(async()=>{
  const {generateDungeon}=await import('/src/game/dungeon/generate.ts');const {ratsFor}=await import('/src/game/mobs/ambient.ts');const {floorHeightAt}=await import('/src/game/worldbuilding/elevation.ts');const {insideRoom}=await import('/src/game/dungeon/footprint.ts');
  for(let seed=1;seed<80;seed++){const dungeon=generateDungeon({seed,floor:2});for(const room of dungeon.rooms.filter(r=>r.kind==='normal')){
   const homes=ratsFor(room,dungeon.seed);const home=homes.find(h=>insideRoom(room,h.shelter.x+Math.sin(h.shelter.yaw)*3.5,h.shelter.z+Math.cos(h.shelter.yaw)*3.5,.6));if(!home)continue;
   window.__run.setState({dungeon,floor:2,currentRoomId:room.id,transitioning:false,wardenRoomId:null,harrierSlain:true,reaperAwake:false,thiefPhase:'away'});
   const s=home.shelter;return {homes,at:[s.x+Math.sin(s.yaw)*3.5,floorHeightAt(room,home.x,home.z)+1.1,s.z+Math.cos(s.yaw)*3.5],yaw:s.yaw};
  }}throw Error('No shelter');
 });
 await page.waitForTimeout(700);await page.evaluate(f=>{window.__bus.emit('teleport',{position:f.at});window.__bus.emit('lookSet',{yaw:f.yaw,pitch:-.38});},fixture);await page.waitForTimeout(500);
 const count=await page.evaluate(()=>window.__scene.getObjectByName('rat-shelters')?.count);assert.equal(count,fixture.homes.length*4);
 await page.screenshot({path:'output/world-review/rat-shelters.png'});assert.deepEqual(errors,[]);console.log('PASS rendered rat shelters:',fixture.homes.length,'homes,',count*2,'triangles in one batch');
}finally{await browser.close();}

