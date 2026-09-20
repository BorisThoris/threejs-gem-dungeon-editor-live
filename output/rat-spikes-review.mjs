import {chromium} from 'playwright-core';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:5217/');await page.locator('[data-testid="menu-start"]').click();await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 const f=await page.evaluate(async()=>{
  const {generateDungeon}=await import('/src/game/dungeon/generate.ts');const {ratsFor}=await import('/src/game/mobs/ambient.ts');const {bitesFor,obstaclesFor}=await import('/src/game/mobs/body.ts');const {sentryFor}=await import('/src/game/sentry/placement.ts');const {keyFor}=await import('/src/game/rooms/kinds.ts');const {insideRoom,roomStep}=await import('/src/game/dungeon/footprint.ts');const {groundHeading}=await import('/src/game/mobs/groundHeading.ts');
  for(let seed=1;seed<=200;seed++){const dungeon=generateDungeon({seed,floor:2});for(const room of dungeon.rooms.filter(r=>r.kind==='trap')){
   const homes=ratsFor(room,dungeon.seed),hazards=bitesFor('ground',room,dungeon.seed,[]);const key=dungeon.keyRoomId===room.id?keyFor(room,dungeon.seed):null,watcher=sentryFor(room,dungeon.seed,2,key?[key]:[])?.at??null;const obstacles=obstaclesFor('ground',room,dungeon.seed,[],[],watcher);
   for(const [index,home] of homes.entries())for(const hazard of hazards){const distance=Math.hypot(hazard.x-home.x,hazard.z-home.z);if(distance<hazard.r+.5||distance>6)continue;
    const px=home.x-(hazard.x-home.x)/distance*.35,pz=home.z-(hazard.z-home.z)/distance*.35;if(!insideRoom(room,px,pz,.6)||obstacles.some(p=>Math.hypot(px-p.x,pz-p.z)<p.r))continue;
    let x=home.x,z=home.z,hit=false;for(let frame=0;frame<120;frame++){const dx=x-px,dz=z-pz,len=Math.hypot(dx,dz)||1;if(len>7)break;const h=groundHeading(room,x,z,x+dx/len*3,z+dz/len*3,obstacles);[x,z]=roomStep(room,x,z,h.dx*4/60,h.dz*4/60,.5);if(hazards.some(p=>Math.hypot(x-p.x,z-p.z)<=p.r)){hit=true;break;}}
    if(hit){window.__run.setState({dungeon,floor:2,currentRoomId:room.id,transitioning:false,ratLosses:{},wardenRoomId:null,harrierSlain:true,reaperAwake:false,thiefPhase:'away',invulnerableUntil:1e9});return {id:room.id,other:dungeon.startId,index,px,pz,hazards,home};}
   }
  }}throw Error('No reachable spike path');
 });
 await page.waitForFunction(id=>window.__rats?.[0]?.room===id,f.id);await page.evaluate(f=>window.__bus.emit('teleport',{position:[f.px,1.5,f.pz]}),f);
 await page.waitForFunction(f=>window.__run.getState().ratLosses[`${f.id}:${f.index}`],f,{timeout:7000});
 const lost=await page.evaluate(i=>window.__rats[i],f.index);assert.ok(lost.dead);assert.ok(f.hazards.some(p=>Math.hypot(lost.x-p.x,lost.z-p.z)<=p.r+.01));assert.ok(Math.hypot(lost.x-f.home.x,lost.z-f.home.z)>.5);
 await page.evaluate(id=>{window.__run.getState().pause();window.__run.setState({currentRoomId:id});},f.other);await page.waitForTimeout(250);await page.evaluate(id=>window.__run.setState({currentRoomId:id}),f.id);await page.waitForTimeout(250);
 assert.equal(await page.evaluate(i=>window.__scene.getObjectByName(`rat-${i}`).visible,f.index),false);assert.deepEqual(errors,[]);console.log('PASS rat physically flees into generated spikes, records loss, and remains absent on paused revisit',f.id,f.index);
}finally{await browser.close();}
