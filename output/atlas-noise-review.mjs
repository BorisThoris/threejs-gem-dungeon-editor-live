import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1200}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5217/?editor');await page.getByRole('button',{name:'WORLD',exact:true}).click();
 const fixture=await page.evaluate(async()=>{
  const {generateDungeon}=await import('/src/game/dungeon/generate.ts');const {footingAt,footingCarry}=await import('/src/game/rooms/underfoot.ts');
  const {carriesTo}=await import('/src/game/din/carry.ts');const {loudnessIn}=await import('/src/game/din/emissions.ts');
  const d=generateDungeon({seed:72,floor:2}), room=d.rooms.find(r=>r.waterway&&r.biome!=='flooded');
  return {id:room.id,states:[null,0].map(opened=>{const ground=footingAt(room,0,0,opened,10);return {carry:footingCarry(room,ground),reach:[...carriesTo(d.rooms,room.id,loudnessIn('sprint',room,ground))]};})};
 });
 await page.locator(`[data-testid="atlas-room"][data-room-id="${fixture.id}"] > path`).first().click();
 assert.equal(await page.getByTestId('atlas-noise-room').count(),0);
 await page.getByLabel('Show sprint noise').check();
 for(const [i,state] of fixture.states.entries()){
  await page.getByLabel('Water preview').selectOption(i?'drained':'flowing');
  const actual=await page.getByTestId('atlas-noise-room').evaluateAll(nodes=>nodes.map(n=>[n.dataset.roomId,Number(n.dataset.strength)]));
  assert.deepEqual(actual.sort(),state.reach.sort());assert.match(await page.getByTestId('atlas-ground-noise').innerText(),new RegExp(state.carry.toFixed(2).replace('.','\\.')));
 }
 assert.ok(fixture.states[0].carry>fixture.states[1].carry,'drainage reduces the noise of this crossing');
 await page.getByLabel('Water preview').selectOption('flowing');
 await page.screenshot({path:'output/world-review/atlas-noise.png'});
 await page.getByLabel('Show sprint noise').uncheck();assert.equal(await page.getByTestId('atlas-noise-room').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS Atlas noise: exact propagation, drainage carry, overlay toggling');
}finally{await browser.close();}
