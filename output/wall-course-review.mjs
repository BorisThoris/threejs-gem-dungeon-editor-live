import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5215/');await page.locator('[data-testid="menu-start"]').click();
 await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 for(const district of ['gardens','works','tombs']){
 await page.evaluate(async district=>{
 const {generateDungeon}=await import('/src/game/dungeon/generate.ts');const {wallEdges}=await import('/src/game/dungeon/footprint.ts');const {DIR_STEP,DIR_YAW}=await import('/src/game/dungeon/types.ts');const {floorHeightAt}=await import('/src/game/worldbuilding/elevation.ts');
 for(let seed=1;seed<100;seed++){
 const dungeon=generateDungeon({seed,floor:3});const room=dungeon.rooms.find(r=>r.district===district&&!r.template&&r.kind==='normal');if(!room)continue;
 const edge=wallEdges(room).find(e=>e.length>6&&!room.links[e.dir]&&room.secret?.dir!==e.dir);if(!edge)continue;
 window.__run.setState({dungeon,floor:3,currentRoomId:room.id,visited:[room.id],transitioning:false,wardenRoomId:null,wardenAwake:false,harrierSlain:true,reaperAwake:false,thiefPhase:'away',invulnerableUntil:1e9,glim:51});
 const axis=DIR_STEP[edge.dir],x=edge.x-axis.x*4,z=edge.z-axis.z*4;
 window.__bus.emit('teleport',{position:[x,floorHeightAt(room,x,z)+1.5,z]});window.__bus.emit('lookSet',{yaw:DIR_YAW[edge.dir],pitch:-.12});return;
 }throw Error('No room for '+district);
 },district);
 await page.waitForTimeout(1600);await page.screenshot({path:'output/world-review/wall-courses-'+district+'.png'});
 }
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS three district wall-course renders without browser errors');
}finally{await browser.close();}
