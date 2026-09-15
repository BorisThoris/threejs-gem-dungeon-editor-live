import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:5219/');await page.locator('[data-testid="menu-start"]').click();await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
const fixture=await page.evaluate(async()=>{const {generateDungeon}=await import('/src/game/dungeon/generate.ts');const {serviceTrailGuide}=await import('/src/game/worldbuilding/serviceTrail.ts');const {roomPlaceName}=await import('/src/game/rooms/placeName.ts');for(let seed=1;seed<100;seed++){const d=generateDungeon({seed,floor:2});if(!d.serviceTrail)continue;const known=d.rooms.map(r=>r.id);for(const room of d.rooms){if(room.kind==='end'||room.id===d.vaultId)continue;const guide=serviceTrailGuide(d,room.id,known);if(guide.status!=='return'||guide.doors<2)continue;const next=d.rooms.find(r=>r.id===guide.destinationId);window.__run.setState({dungeon:d,floor:2,currentRoomId:room.id,visited:known,waterCacheTaken:false,transitioning:false,wardenRoomId:null,wardenAwake:false,harrierSlain:true,reaperAwake:false,thiefPhase:'away',invulnerableUntil:1e9});window.__bus.emit('teleport',{position:[0,1.5,0]});return {roomId:room.id,destinationId:guide.destinationId,known,dir:guide.dir,place:roomPlaceName(next),doors:guide.doors};}}throw Error('No recovery fixture');});
await page.waitForTimeout(600);assert.equal(await page.locator('[data-testid="service-rubbing"]').count(),0);
await page.evaluate(()=>window.__run.setState({waterCacheTaken:true}));
await page.waitForFunction(()=>document.querySelector('[data-testid="service-rubbing"]')?.textContent?.includes('rejoin'));
const text=await page.locator('[data-testid="service-rubbing"]').innerText();assert.ok(text.includes(fixture.dir)&&text.includes(fixture.place)&&text.includes(String(fixture.doors)),text);
await page.screenshot({path:'output/world-review/named-trail-recovery.png'});
await page.evaluate(id=>window.__run.setState({visited:[id]}),fixture.roomId);await page.waitForFunction(()=>document.querySelector('[data-testid="service-rubbing"]')?.textContent?.includes('return to the reliquary'));
assert.ok(!(await page.locator('[data-testid="service-rubbing"]').innerText()).includes(fixture.place));
await page.evaluate(f=>{window.__run.setState({currentRoomId:f.destinationId,visited:f.known});window.__bus.emit('teleport',{position:[0,1.5,0]});},fixture);
await page.waitForFunction(place=>document.querySelector('[data-testid="hud"]')?.textContent?.includes(place),fixture.place);
assert.deepEqual(errors,[]);console.log('PASS native rubbing: hidden before learning, named recovery through visited rooms, no unknown shortcut',fixture,text);
}finally{await browser.close();}
