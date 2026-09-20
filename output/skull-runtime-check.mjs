import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page=await browser.newPage({viewport:{width:1250,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5229/');await page.getByTestId('menu-start').click();
 await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 await page.evaluate(async()=>{
  const {generateDungeon}=await import('/src/game/dungeon/generate.ts');
  const {placementsFor}=await import('/src/game/rooms/placements.ts');
  for(let seed=1;seed<100;seed++){
   const d=generateDungeon({seed,floor:2});
   const r=d.rooms.find(r=>r.id!==d.vaultId&&r.kind==='normal'&&placementsFor(r,d.seed).filter(p=>p.kind==='skull').length>=2);
   if(!r)continue;
   window.__run.setState({dungeon:d,floor:2,currentRoomId:r.id,transitioning:false,wardenRoomId:null,wardenAwake:false,harrierSlain:true,reaperAwake:false,thiefPhase:'away',invulnerableUntil:1e9,glim:90});
   const p=placementsFor(r,d.seed).find(p=>p.kind==='skull');
   window.__bus.emit('teleport',{position:[p.x*.72,1.5,p.z*.72]});
   window.__bus.emit('lookSet',{yaw:Math.atan2(-p.x,-p.z),pitch:Math.atan2(-1.4,Math.hypot(p.x,p.z)*.28)});return;
  }
  throw Error('No skull fixture');
 });
 await page.waitForTimeout(1400);
 const measured=await page.evaluate(()=>{
  const skulls=window.__scene.getObjectsByProperty('name','handmade-skull');
  let grounded=true,contained=true,finite=true;
  for(const mesh of skulls[0].children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
   for(let i=0;i<p.count;i++){grounded&&=p.getY(i)>=-1e-6;contained&&=Math.hypot(p.getX(i),p.getZ(i))<=.201;finite&&=Number.isFinite(n.getX(i)+n.getY(i)+n.getZ(i));}}
  return {count:skulls.length,meshes:skulls[0].children.length,triangles:skulls[0].children.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0),
   shared:skulls[0].children.every((m,i)=>m.geometry===skulls[1].children[i].geometry),grounded,contained,finite};
 });
 assert.ok(measured.count>=2&&measured.shared&&measured.grounded&&measured.contained&&measured.finite);
 assert.equal(measured.meshes,2);assert.equal(measured.triangles,93);assert.deepEqual(errors,[]);
 await page.screenshot({path:'output/world-review/handmade-skull-room.png'});console.log('PASS native handmade skulls',measured);
}finally{await browser.close();}
