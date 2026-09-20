import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5217/');await page.locator('[data-testid="menu-start"]').click();await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 const fixture=await page.evaluate(async()=>{const {generateDungeon}=await import('/src/game/dungeon/generate.ts');const {ratsFor}=await import('/src/game/mobs/ambient.ts');
 for(let seed=1;seed<80;seed++){const dungeon=generateDungeon({seed,floor:2});const room=dungeon.rooms.find(r=>r.kind==='normal'&&ratsFor(r,dungeon.seed).length>=2);if(!room)continue;
 window.__run.setState({dungeon,floor:2,currentRoomId:room.id,transitioning:false,ratLosses:{},wardenRoomId:null,harrierSlain:true,reaperAwake:false,thiefPhase:'away'});return {id:room.id,other:dungeon.startId,count:ratsFor(room,dungeon.seed).length};}throw Error('No rat fixture');});
 await page.waitForFunction(()=>!!window.__scene.getObjectByName('rat-1'));await page.evaluate(id=>window.__run.getState().loseRat(id,0),fixture.id);
 await page.waitForFunction(()=>window.__scene.getObjectByName('rat-0').visible===false);
 await page.evaluate(id=>{window.__run.getState().pause();window.__run.setState({currentRoomId:id});},fixture.other);await page.waitForTimeout(250);
 await page.evaluate(id=>window.__run.setState({currentRoomId:id}),fixture.id);await page.waitForTimeout(250);
 const state=await page.evaluate(()=>({lost:window.__scene.getObjectByName('rat-0').visible,survivor:window.__scene.getObjectByName('rat-1').visible,shelters:window.__scene.getObjectByName('rat-shelters').count}));
 assert.equal(state.lost,false);assert.equal(state.survivor,true);assert.equal(state.shelters,fixture.count*4);
 await page.evaluate(()=>{window.__run.getState().resume();const run=window.__run,d=run.getState().dungeon;run.setState({transitioning:true,currentRoomId:d.endId});run.getState().roomReady(d.endId);});
 await page.waitForFunction(()=>window.__run.getState().floor===3);assert.deepEqual(await page.evaluate(()=>window.__run.getState().ratLosses),{});
 await page.evaluate(()=>{window.__run.setState({ratLosses:{'old:0':true}});window.__run.getState().startRun(72);});await page.waitForFunction(()=>window.__run.getState().floor===1);
 assert.deepEqual(await page.evaluate(()=>window.__run.getState().ratLosses),{});console.log('PASS rat loss: live hide, paused revisit, survivor, empty shelter, floor reset and new run');
}finally{await browser.close();}
