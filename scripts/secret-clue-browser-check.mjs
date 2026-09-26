import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(`http://127.0.0.1:${process.env.PORT??'5222'}/`);await page.locator('[data-testid="menu-start"]').click();await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
const fixture=await page.evaluate(()=>{const s=window.__run.getState(),room=s.dungeon.rooms.find(r=>r.secret);if(!room)throw Error('Missing secret');window.__run.setState({currentRoomId:room.id,transitioning:false,wardenRoomId:null,harrierSlain:true,reaperAwake:false,invulnerableUntil:1e9});window.__bus.emit('teleport',{position:[0,1.5,0]});return {id:room.id,other:s.dungeon.rooms.find(r=>r.id!==room.id).id};});
await page.waitForFunction(()=>!!window.__scene.getObjectByName('secret-wall-crack'));
const sample=()=>page.evaluate(()=>({value:window.__scene.getObjectByName('secret-wall-crack').material.emissiveIntensity,time:window.__derived.clock()}));
const initial=await sample();
await page.waitForFunction(value=>Math.abs(window.__scene.getObjectByName('secret-wall-crack').material.emissiveIntensity-value)>.04,initial.value);
const moving=await sample();assert.ok(moving.time>initial.time,'pulse advances with run time');
assert.ok(moving.value>=.15&&moving.value<=.55,'pulse stays within its intended glow range');
await page.evaluate(()=>window.__run.getState().pause());await page.waitForTimeout(120);const frozen=await sample();await page.waitForTimeout(450);assert.equal((await sample()).value,frozen.value,'pause freezes the clue');
await page.evaluate(id=>window.__run.setState({currentRoomId:id}),fixture.other);await page.waitForTimeout(200);await page.evaluate(id=>window.__run.setState({currentRoomId:id}),fixture.id);await page.waitForFunction(()=>!!window.__scene.getObjectByName('secret-wall-crack'));assert.equal((await sample()).value,frozen.value,'paused remount retains phase');
await page.evaluate(()=>window.__run.getState().resume());await page.waitForFunction(value=>Math.abs(window.__scene.getObjectByName('secret-wall-crack').material.emissiveIntensity-value)>.04,frozen.value);assert.deepEqual(errors,[]);console.log('PASS secret clue: run-clock pulse, pause, remount and resume');
}finally{await browser.close();}
