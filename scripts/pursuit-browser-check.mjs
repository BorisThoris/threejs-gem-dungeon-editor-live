import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5217}/`);
  const unit = await page.evaluate(async () => {
    const p = await import("/src/game/ladder/pursuit.ts");
    const { fresh, step } = await import("/src/game/ladder/awareness.ts");
    const { sightLineClear } = await import("/src/game/ladder/sight.ts");
    const { pursuitArrival } = await import("/src/game/dungeon/arrival.ts");
    const { doorReach, insideRoom } = await import("/src/game/dungeon/footprint.ts");
    const results = [];
    const check = (ok, label) => { if (!ok) throw Error(label); results.push(label); };
    for (const who of ["warden", "reaper", "harrier", "cutpurse"]) {
      p.resetPursuit(); p.perceive(who, "a", 10);
      p.leaveTrail(who, "a", "a", "b", 10, true);
      for (let i = 0; i < 24; i++) check(!p.advanceTrail(who, "a", "b", .1, true).to, `${who}: delayed ${i}`);
      check(p.advanceTrail(who, "a", "b", .1, true).to === "b", `${who}: arrival`);
      p.perceive(who, "a", 20); p.leaveTrail(who, "a", "a", "b", 20, true);
      check(p.leaveTrail(who, "a", "b", "c", 20.5, true), `${who}: second doorway loses trail`);
      check(!p.advanceTrail(who, "a", "c", 100, true).to, `${who}: cannot skip rooms`);
      p.perceive(who, "a", 30); p.leaveTrail(who, "a", "a", "b", 32, true);
      check(!p.advanceTrail(who, "a", "b", 100, true).waiting, `${who}: stale sight cannot chase`);
      p.perceive(who, "a", 40); p.leaveTrail(who, "a", "a", "b", 40, true);
      check(!p.advanceTrail(who, "a", "b", .1, false).waiting, `${who}: detection loss cancels`);
      p.perceive(who, "a", 50); p.leaveTrail(who, "a", "a", "b", 50, true);
      p.resetPursuit();
      check(!p.advanceTrail(who, "a", "b", 100, true).waiting, `${who}: new floor clears pursuit`);
    }
    const cap = { min: 0, max: 3, floorAfterPeak: true };
    let awareness = step(fresh(), cap, 3, 1, true, true, "a");
    awareness = step(awareness, cap, 3, 100, true, true, "b");
    check(awareness.rung === 3 && awareness.markRoomId === "b", "sustained sight holds detection");
    check(step(awareness, cap, 0, 200, false, false).rung === 2, "lost sight cools detection");
    check(!sightLineClear({ x: 0, z: 0 }, { x: 10, z: 0 }, [{ x: 5, z: 0, r: 1 }]), "cover blocks sight");
    check(sightLineClear({ x: 0, z: 0 }, { x: 10, z: 0 }, [{ x: 5, z: 3, r: 1 }]), "off-axis cover allows sight");
    for (const shape of ["square", "circle"]) for (const dir of ["north", "south", "east", "west"]) {
      const room = { id: "r", size: 20, shape, links: { [dir]: "a" }, wings: { [dir]: 8 } };
      const at = pursuitArrival(room, dir);
      check(insideRoom(room, at.x, at.z, .6), `${shape}/${dir}: arrival inside doorway`);
      check(Math.abs(Math.hypot(at.x, at.z) - (doorReach(room, dir) - .9)) < .001, `${shape}/${dir}: correct threshold`);
    }
    p.resetPursuit();
    return results.length;
  });
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning, { timeout: 90000 });
  async function depart() {
    return page.evaluate(async () => {
      const p = await import("/src/game/ladder/pursuit.ts");
      const ladder = await import("/src/game/ladder/state.ts");
      const din = await import("/src/game/din/din.ts");
      const { runClock } = await import("/src/game/state/run.ts");
      const store = window.__run, s = store.getState();
      const a = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      const [dir, b] = Object.entries(a.links).find(([, id]) => {
        const next = s.dungeon.rooms.find(r => r.id === id);
        return next?.kind !== "end" && Object.values(next.links).some(n => n !== a.id
          && s.dungeon.rooms.find(r => r.id === n)?.kind !== "end");
      });
      ladder.reset(); din.reset(); ladder.setCeiling("warden", 3);
      store.setState({ paused: false, transitioning: false, alarm: 0, noisyUntil: 0, mothOn: false,
        wardenLure: null, lureUntil: 0, wardRoomId: null, wardUntil: 0,
        wardenRoomId: a.id, wardenCameFrom: null, wardenStaggerUntil: 0,
        reaperAwake: true, reaperRoomId: a.id, reaperCameFrom: null, reaperStalledUntil: 0,
        harrierAwake: true, harrierSlain: false, harrierRoomId: a.id, harrierCameFrom: null,
        harrierDownedUntil: 0, harrierRetreatUntil: 0,
        thiefPhase: "stalking", thiefRoomId: a.id, thiefCameFrom: null });
      const now = runClock(store.getState());
      for (const who of ["warden", "reaper", "harrier", "cutpurse"]) {
        ladder.wake(who); ladder.report(who, 3, true, true, a.id); p.perceive(who, a.id, now);
      }
      ladder.advance(now);
      store.getState().travel(dir);
      const result = store.getState();
      return { a: a.id, b, current: result.currentRoomId,
        rooms: [result.wardenRoomId, result.reaperRoomId, result.harrierRoomId, result.thiefRoomId] };
    });
  }
  const first = await depart();
  assert.equal(first.current, first.b);
  assert.deepEqual(first.rooms, Array(4).fill(first.a), "no instant room teleport");
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.evaluate(() => window.__run.getState().pause());
  await page.waitForTimeout(2800);
  const paused = await page.evaluate(() => { const s = window.__run.getState(); return [s.wardenRoomId, s.reaperRoomId, s.harrierRoomId, s.thiefRoomId]; });
  assert.deepEqual(paused, Array(4).fill(first.a), "pause preserves the delay");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction(() => { const s = window.__run.getState(); return [s.wardenRoomId, s.reaperRoomId, s.harrierRoomId, s.thiefRoomId].every(r => r === s.currentRoomId); }, null, { timeout: 30000 })
    .catch(async error => {
      console.log(await page.evaluate(() => { const s = window.__run.getState(); return { current: s.currentRoomId,
        rooms: [s.wardenRoomId, s.reaperRoomId, s.harrierRoomId, s.thiefRoomId], phase: s.phase,
        paused: s.paused, transitioning: s.transitioning, ladder: window.__awareness.snapshot() }; }));
      throw error;
    });
  const entries = await page.evaluate(() => { const s = window.__run.getState(); s.pause(); return [s.wardenCameFrom, s.reaperCameFrom, s.harrierCameFrom, s.thiefCameFrom]; });
  assert.deepEqual(entries, Array(4).fill(first.a), "all pursuers enter through the source room doorway");
  const second = await depart();
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  const escaped = await page.evaluate(source => {
    const s = window.__run.getState(), b = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
    const [dir, c] = Object.entries(b.links).find(([, id]) => id !== source && s.dungeon.rooms.find(r => r.id === id)?.kind !== "end");
    s.travel(dir); return c;
  }, second.a);
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.waitForTimeout(2800);
  const after = await page.evaluate(() => { const s = window.__run.getState(); return { room: s.currentRoomId, warden: s.wardenRoomId, reaper: s.reaperRoomId, harrier: s.harrierRoomId, thief: s.thiefPhase }; });
  assert.equal(after.room, escaped);
  assert.equal(after.warden, second.a, "Warden stays behind when trail breaks");
  assert.equal(after.reaper, second.a, "Reaper stays behind when trail breaks");
  assert.equal(after.harrier, second.a, "Harrier stays behind when trail breaks");
  assert.equal(after.thief, "away", "Cutpurse abandons a broken trail");
  assert.deepEqual(errors, []);
  console.log(`PASS ${unit} pursuit/awareness/cover checks; live delayed arrivals, pause, doorway identity and room skipping`);
} finally { await browser.close(); }
