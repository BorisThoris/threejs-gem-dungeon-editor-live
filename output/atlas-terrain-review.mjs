import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page=await browser.newPage({viewport:{width:1600,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5215/?editor');await page.getByRole('button',{name:'WORLD',exact:true}).click();
 for(const floor of [1,2,3]) {
 await page.getByLabel('World depth').selectOption(String(floor));
 const expected=await page.evaluate(async floor=>{const {generateDungeon}=await import('/src/game/dungeon/generate.ts');const {terrainFor}=await import('/src/game/rooms/terrainPattern.ts');return generateDungeon({seed:72,floor}).rooms.map(room=>{const data=terrainFor(room);return {id:room.id,paving:data.paving.length,deposits:data.deposits.length};});},floor);
 for(const row of expected){await page.locator(`[data-room-id="${row.id}"] > path`).first().click();assert.equal(Number(await page.getByTestId('atlas-paving').getAttribute('data-count')),row.paving);assert.equal(Number(await page.getByTestId('atlas-deposits').getAttribute('data-count')),row.deposits);}
 }
 await page.getByLabel('Show terrain').uncheck();assert.equal(await page.getByTestId('atlas-paving').count(),0);
 await page.getByLabel('Show terrain').check();await page.getByRole('button',{name:'Next gallery',exact:true}).click();
 await page.getByLabel('Selected room blueprint').screenshot({path:'output/world-review/atlas-terrain.png'});
 assert.deepEqual(errors,[]);console.log('PASS atlas terrain matches every generated room across three depths and toggles independently');
} finally {await browser.close();}

