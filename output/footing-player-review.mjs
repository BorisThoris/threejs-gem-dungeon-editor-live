import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:5215/');await page.locator('[data-testid="menu-start"]').click();await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
await page.evaluate(async()=>{const sfx=window.__sfx;const {footingAt}=await import('/src/game/rooms/underfoot.ts');const {runClock}=await import('/src/game/state/run.ts');window.__steps=[];const original=sfx.step;sfx.step=(strong,running,surface)=>{const s=window.__run.getState(),room=s.dungeon.rooms.find(r=>r.id===s.currentRoomId);window.__steps.push({surface,expected:footingAt(room,window.__playerDebug.x,window.__playerDebug.z,s.waterOpenedAt,runClock(s))});original(strong,running,surface);};});
await page.waitForTimeout(1500);await page.locator('canvas').click();await page.keyboard.down('KeyW');await page.waitForTimeout(4000);await page.keyboard.up('KeyW');const steps=await page.evaluate(()=>window.__steps);console.log(steps,await page.evaluate(()=>({phase:window.__run.getState().phase,paused:window.__run.getState().paused,locks:window.__run.getState().inputLocks,player:window.__playerDebug})));assert.ok(steps.length>=2);for(const step of steps)assert.equal(step.surface,step.expected);assert.deepEqual(errors,[]);console.log('PASS real player strides select the material beneath the player',steps);
}finally{await browser.close();}


