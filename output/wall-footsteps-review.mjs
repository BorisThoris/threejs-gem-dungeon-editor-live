import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5217/');await page.locator('[data-testid="menu-start"]').click();
 await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 await page.evaluate(()=>{const s=window.__run.getState(),room=s.dungeon.rooms.find(r=>r.id===s.currentRoomId);const fixture={...room,size:20,shape:'square',links:{},wings:{},biome:'hewn'};
 window.__run.setState({dungeon:{...s.dungeon,rooms:s.dungeon.rooms.map(r=>r.id===room.id?fixture:r)},noisyUntil:0});
 window.__wallSteps=0;window.__wallSprints=0;const step=window.__sfx.step;window.__sfx.step=(...args)=>{window.__wallSteps++;step(...args);};window.__bus.on('sprinted',()=>window.__wallSprints++);
 window.__bus.emit('teleport',{position:[5,1.5,3]});window.__bus.emit('lookSet',{yaw:-Math.PI/2,pitch:0});});
 await page.waitForTimeout(500);await page.locator('canvas').click();await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyW');await page.waitForTimeout(1800);
 const before=await page.evaluate(()=>({steps:window.__wallSteps,sprints:window.__wallSprints,x:window.__playerDebug.x,z:window.__playerDebug.z}));
 await page.waitForTimeout(1600);const after=await page.evaluate(()=>({steps:window.__wallSteps,sprints:window.__wallSprints,x:window.__playerDebug.x,z:window.__playerDebug.z}));
 await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');console.log({before,after});
 assert.ok(before.steps>0&&before.sprints>0,'actual approach produces footsteps and sprint noise');assert.ok(Math.hypot(after.x-before.x,after.z-before.z)<.02,'wall actually stops player');
 assert.equal(after.steps,before.steps,'blocked movement adds no footsteps');assert.equal(after.sprints,before.sprints,'blocked movement adds no fresh sprint noise');
 await page.evaluate(()=>window.__bus.emit('teleport',{position:[7,1.5,3]}));await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>window.__wallSteps),after.steps,'a short teleport is not a footstep');
 await page.keyboard.down('KeyS');await page.waitForTimeout(1200);await page.keyboard.up('KeyS');
 assert.ok(await page.evaluate(n=>window.__wallSteps>n,after.steps),'walking away resumes footsteps');
 console.log('PASS actual wall collision silences footsteps and fresh sprint signals');
}finally{await browser.close();}
