import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1200}});await page.goto('http://127.0.0.1:5217/?editor');await page.getByRole('button',{name:'WORLD',exact:true}).click();
 const rooms=await page.evaluate(async()=>{
  const {generateDungeon}=await import('/src/game/dungeon/generate.ts');const {ratsFor,croakersFor}=await import('/src/game/mobs/ambient.ts');const {croakerHabitats}=await import('/src/game/mobs/croakerHabitat.ts');
  const {placementsFor}=await import('/src/game/rooms/placements.ts');const {keyFor}=await import('/src/game/rooms/kinds.ts');const {sentryFor}=await import('/src/game/sentry/placement.ts');const {DIRS}=await import('/src/game/dungeon/types.ts');const {doorReach}=await import('/src/game/dungeon/footprint.ts');const {PROP_SPECS}=await import('/src/game/props/specs.ts');
  const d=generateDungeon({seed:72,floor:2});return d.rooms.map(room=>{
   const scale=360/(2*Math.max(...DIRS.map(dir=>doorReach(room,dir)))),key=d.keyRoomId===room.id?keyFor(room,d.seed):null,sentry=sentryFor(room,d.seed,2,key?[key]:[])?.at??null;
   return {id:room.id,homes:ratsFor(room,d.seed).length,toads:croakerHabitats(room,croakersFor(room,d.seed)).map(h=>[h.wet.x*scale,h.wet.z*scale]),props:placementsFor(room,d.seed,{asVault:room.id===d.vaultId,key,sentry}).map(p=>[p.x*scale,p.z*scale,Math.max(2,PROP_SPECS[p.kind].radius*(p.scale??1)*scale)])};
  });
 });
 for(const r of rooms){await page.locator(`[data-testid="atlas-room"][data-room-id="${r.id}"] > path`).first().click();await page.waitForTimeout(70);
  assert.equal(await page.getByTestId('atlas-rat-home').count(),r.homes);
  for(const [testId,expected,attrs] of [['atlas-toad',r.toads,['cx','cy']],['atlas-prop',r.props,['cx','cy','r']]]){
   const actual=await page.getByTestId(testId).evaluateAll((nodes,attrs)=>nodes.map(n=>attrs.map(a=>Number(n.getAttribute(a)))),attrs);assert.equal(actual.length,expected.length,r.id+testId);actual.forEach((row,i)=>row.forEach((v,j)=>assert.ok(Math.abs(v-expected[i][j])<1e-6,r.id+testId)));
  }
 }
 const home=rooms.find(r=>r.homes);await page.locator(`[data-testid="atlas-room"][data-room-id="${home.id}"] > path`).first().click();await page.screenshot({path:'output/world-review/atlas-rat-homes.png'});
 await page.getByLabel('Show habitats').uncheck();assert.equal(await page.getByTestId('atlas-rat-home').count(),0);assert.equal(await page.getByTestId('atlas-toad').count(),0);
 console.log('PASS Atlas habitat parity and scaled furniture across',rooms.length,'rooms');
}finally{await browser.close();}
