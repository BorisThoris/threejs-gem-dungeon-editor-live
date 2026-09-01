/**
 * End-to-end smoke test: can a stranger start the game, explore, collect,
 * die, and start again?
 *
 * Every serious bug fixed on this branch - a render loop that never ran, rooms
 * that never mounted, room detection that fired once per session - was
 * invisible to the type checker and to the build, and only showed up by
 * driving the real game. This is the cheapest guard against them coming back.
 *
 *   yarn dev --port 5199        # in one terminal
 *   node scripts/smoke-test.mjs # in another
 *
 * Requires playwright-core and a Chromium binary. Set CHROMIUM_PATH if yours
 * is not at the Playwright default.
 */
import { chromium } from 'playwright-core';

const PORT = process.argv[2] || process.env.PORT || '5199';
const CHROMIUM = process.env.CHROMIUM_PATH ||
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let failures = 0;
const b = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling']
});
const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e).slice(0, 120)));

const ok = (label, cond, detail = '') => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  - ' + detail : ''}`);
};

await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
await p.waitForTimeout(2500);

ok('main menu appears before gameplay', await p.evaluate(() => /start/i.test(document.body.innerText)));
const startBtn = await p.$('button:has-text("Start")');
if (startBtn) await startBtn.click();
await p.waitForTimeout(13000);

const st = () => p.evaluate(() => {
  const s = window.__gameStore.getState();
  const d = window.__playerDebug;
  return {
    room: s.currentRoomId, gems: s.playerStats.gems, lives: s.playerStats.lives,
    visited: s.visitedRooms.size, move: s.isMovementEnabled,
    y: d ? +d.y.toFixed(2) : null, vy: d ? +d.linvel.y.toFixed(2) : null,
  };
});

let s0 = await st();
ok('a room is active', !!s0.room, s0.room);
ok('player is resting on a floor', s0.vy === 0, `y=${s0.y} vy=${s0.vy}`);
ok('HUD shows lives and gems', await p.evaluate(() =>
  /LIVES/i.test(document.body.innerText) && /GEMS/i.test(document.body.innerText)));

// explore: walk through doorways for a while, collecting whatever we touch
let minY = s0.y, fell = false;
for (let i = 0; i < 10; i++) {
  const half = await p.evaluate(() => {
    const s = window.__gameStore.getState();
    const r = s.roomInstances.get(s.currentRoomId)?.room;
    return ((r?.actualSize || r?.size || 16) / 2) * 0.9;
  });
  // step on this room's gem first, the way a player sweeping a room would
  const gem = await p.evaluate(() => {
    const s = window.__gameStore.getState();
    const room = s.roomInstances.get(s.currentRoomId)?.room;
    if (!room || room.type === 'end') return null;
    let h = 0;
    for (let i = 0; i < room.id.length; i++) h = (h * 31 + room.id.charCodeAt(i)) | 0;
    const size = room.actualSize || room.size || 10;
    const r = Math.max(1.5, size / 2 - 2);
    const a = ((h >>> 0) % 360) * (Math.PI / 180);
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  if (gem) {
    await p.evaluate((g) => window.dispatchEvent(new CustomEvent('playerTeleport',
      { detail: { position: [g[0], 2.5, g[1]], rotation: [0, 0, 0] } })), gem);
    await p.waitForTimeout(1400);
  }

  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    await p.evaluate(([x, z]) => window.dispatchEvent(new CustomEvent('playerTeleport',
      { detail: { position: [x, 2.5, z], rotation: [0, 0, 0] } })), [dx * half, dz * half]);
    await p.waitForTimeout(1500);
    const s = await st();
    if (s.y !== null) { minY = Math.min(minY, s.y); if (s.y < -30) fell = true; }
    if (s.room !== s0.room) { s0 = s; break; }
  }
}
const explored = await st();
ok('walked into another room', explored.visited >= 2, `${explored.visited} rooms visited`);
ok('never fell out of the world', !fell, `lowest y seen ${minY.toFixed(2)}`);
ok('movement still enabled after exploring', explored.move === true);
ok('collected gems while exploring', explored.gems > 0, `${explored.gems} gems`);

// lose a run and restart
for (let i = 0; i < 4; i++) {
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('playerHazard')));
  await p.waitForTimeout(1800);
}
await p.waitForTimeout(700);
ok('run ends at zero lives', (await st()).lives === 0);
ok('summary screen appears', await p.evaluate(() => /died down here|made it out/i.test(document.body.innerText)));
const again = await p.$('button:has-text("Run again")');
ok('restart button offered', !!again);
if (again) {
  await again.click();
  await p.waitForTimeout(4000);
  const fresh = await st();
  ok('restart gives a fresh run', fresh.lives === 3 && fresh.gems === 0 && fresh.move === true, JSON.stringify(fresh));
}

ok('no uncaught page errors from game code', errors.filter(e => !/Failed to fetch/.test(e)).length === 0,
   errors.slice(0, 2).join(' | '));
await b.close();
console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
