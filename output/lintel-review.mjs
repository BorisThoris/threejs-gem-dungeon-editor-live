import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5213/');await page.locator('[data-testid="menu-start"]').click();
 await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 const edge=await page.evaluate(async()=>{
 const {generateDungeon}=await import('/src/game/dungeon/generate.ts');
 const {districtThresholds}=await import('/src/game/worldbuilding/districtThresholds.ts');
 const {doorReach}=await import('/src/game/dungeon/footprint.ts');
 const {DIR_STEP,DIR_YAW,OPPOSITE}=await import('/src/game/dungeon/types.ts');
 for(let seed=1;seed<100;seed++){
 const dungeon=generateDungeon({seed,floor:2});
 const allowed=r=>r.id!==dungeon.vaultId&&['normal','treasure','start','shrine','shop','library'].includes(r.kind);
 for(const a of dungeon.rooms.filter(allowed))for(const t of districtThresholds(a,dungeon.rooms)){
 const b=dungeon.rooms.find(r=>r.id===t.destination);if(!allowed(b))continue;
 window.__run.setState({dungeon,floor:2,currentRoomId:a.id,visited:[a.id],transitioning:false,wardenRoomId:null,wardenAwake:false,harrierSlain:true,reaperAwake:false,thiefPhase:'away',invulnerableUntil:1e9,glim:26});
 const axis=DIR_STEP[t.dir],reach=doorReach(a,t.dir);
 window.__bus.emit('teleport',{position:[axis.x*(reach-3.5),1.5,axis.z*(reach-3.5)]});window.__bus.emit('lookSet',{yaw:DIR_YAW[t.dir],pitch:0.2});
 return {a:a.id,b:b.id,dir:t.dir,back:OPPOSITE[t.dir],axis,reach,district:b.district,home:a.district};
 }}throw Error('No boundary');});
 await page.waitForTimeout(1300);
 assert.equal(await page.evaluate(dir=>window.__scene.getObjectByName('district-lintel-'+dir).userData.district,edge.dir),edge.district);
 await page.screenshot({path:'output/world-review/district-lintel.png'});
 await page.evaluate(({axis,reach})=>window.__bus.emit('teleport',{position:[axis.x*(reach-.9),1.5,axis.z*(reach-.9)]}),edge);
 await page.waitForTimeout(400);await page.keyboard.press('KeyE');
 await page.waitForFunction(id=>window.__run.getState().currentRoomId===id&&!window.__run.getState().transitioning,edge.b);
 await page.waitForTimeout(400);
 assert.equal(await page.evaluate(dir=>window.__scene.getObjectByName('district-lintel-'+dir).userData.district,edge.back),edge.home);
 assert.deepEqual(errors,[]);console.log('PASS district lintels: correct destinations on both faces, real doorway travel and clean render');
}finally{await browser.close();}
