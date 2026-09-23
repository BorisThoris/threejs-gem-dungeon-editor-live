import {chromium} from 'playwright-core';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5217"}/`);await page.locator('[data-testid="menu-start"]').click();
 await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning&&window.__din&&window.__blockLighting?.roomId===window.__run.getState().currentRoomId);
 const rows=await page.evaluate(async()=>{
  const din=window.__din;const {footingCarry,footingAt}=await import('/src/game/rooms/underfoot.ts');
  const {NOISE_HOLD_S}=await import('/src/game/world.ts');const rows=[];
  const s=window.__run.getState(), room=s.dungeon.rooms.find(r=>r.id===s.currentRoomId);
  for(const surface of ['soft','stone','water','wood','metal']){
   din.reset();window.__run.setState({noisyUntil:0,effects:{...s.effects,mire:0}});window.__run.getState().makeNoise(surface,1.25,-2.5);
   const signal=din.snapshot(room.id).find(v=>v.source==='sprint');
   rows.push({surface,here:signal?.here,expected:.35*footingCarry(room,surface),hold:window.__run.getState().noisyUntil-window.__derived.clock(),expectedHold:NOISE_HOLD_S*footingCarry(room,surface)});
  }
  window.__sprintSamples=[];window.__bus.on('sprinted',e=>{const run=window.__run.getState(),room=run.dungeon.rooms.find(r=>r.id===run.currentRoomId);window.__sprintSamples.push({...e,expected:footingAt(room,e.x,e.z,run.waterOpenedAt,window.__derived.clock())});});
  window.__run.setState({noisyUntil:0});return rows;
 });
 assert.deepEqual(errors, [], 'noise emission has no listener errors');
 for(const row of rows){assert.ok(Math.abs(row.here-row.expected)<.001,JSON.stringify(row));assert.ok(Math.abs(row.hold-row.expectedHold)<.02,JSON.stringify(row));}
 await page.locator('canvas').click();await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyW');await page.waitForTimeout(1800);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
 const samples=await page.evaluate(()=>window.__sprintSamples);assert.ok(samples.length>0,'native player emits surface-aware sprint samples');for(const sample of samples)assert.equal(sample.surface,sample.expected);
 assert.deepEqual(errors,[]);console.log('PASS live terrain stealth: five material magnitudes and deadlines, native sprint sampling',JSON.stringify(rows),samples.length);
}finally{await browser.close();}
