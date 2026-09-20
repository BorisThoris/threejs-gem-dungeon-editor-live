import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page=await browser.newPage({viewport:{width:1300,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5224/');
 await page.getByTestId('menu-start').click();
 await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 const fixture=await page.evaluate(async()=>{
  const {generateDungeon}=await import('/src/game/dungeon/generate.ts');
  const {placementsFor}=await import('/src/game/rooms/placements.ts');
  const {authoredProps}=await import('/src/game/rooms/templates.ts');
  for(let seed=1;seed<200;seed++){
   const d=generateDungeon({seed,floor:2});
   const r=d.rooms.find(r=>r.template==='hall-round-workroom'&&r.id!==d.vaultId&&!r.waterway);
   if(!r)continue;
   const props=placementsFor(r,d.seed),authored=authoredProps(r);
   const kept=authored.filter(a=>props.some(p=>a.kind===p.kind&&a.x===p.x&&a.z===p.z)).length;
   window.__run.setState({dungeon:d,floor:2,currentRoomId:r.id,transitioning:false,wardenRoomId:null,wardenAwake:false,harrierSlain:true,reaperAwake:false,thiefPhase:'away',invulnerableUntil:1e9,glim:90});
   window.__bus.emit('teleport',{position:[0,1.5,0]});
   return {seed,room:r.id,kept,total:authored.length,shape:r.shape};
  }
  throw Error('No generated round workroom');
 });
 assert.equal(fixture.kept,fixture.total);assert.equal(fixture.shape,'circle');
 await page.waitForTimeout(1200);
 for(const [name,yaw] of [['north-west',Math.PI/4],['south-east',-3*Math.PI/4]]){
  await page.evaluate(yaw=>window.__bus.emit('lookSet',{yaw,pitch:-.18}),yaw);
  await page.waitForTimeout(300);
  await page.screenshot({path:`output/world-review/round-workroom-${name}.png`});
 }
 assert.deepEqual(errors,[]);console.log('PASS generated circular workroom, full authored furnishings, native render',fixture);
} finally {await browser.close();}
