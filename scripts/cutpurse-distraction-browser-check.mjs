import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.addInitScript(() => localStorage.setItem("gem-dungeon.settings", JSON.stringify({ captions: true })));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__din && window.__scene && !window.__run.getState().transitioning);

  // The fixture finds a clear triangle in an actual generated room. It moves
  // actors only to arrange the encounter; the measured response is live AI.
  async function stage() {
    await page.evaluate(() => { delete window.__thief; window.__run.getState().startRun(11); });
    await page.waitForFunction(() => !window.__run.getState().transitioning);
    await page.evaluate(async () => {
      const { obstaclesFor, bitesFor, BODIES } = await import("/src/game/mobs/body.ts");
      const { insideRoom, roomSegmentClear } = await import("/src/game/dungeon/footprint.ts");
      const { sightLineClear } = await import("/src/game/ladder/sight.ts");
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      const obstacles = obstaclesFor(BODIES.cutpurse, room, s.dungeon.seed, [], s.broken, null);
      const hazards = bitesFor(BODIES.cutpurse, room, s.dungeon.seed, [], s.sprung);
      const points = [];
      for (let x = -6; x <= 6; x += 1.5) for (let z = -6; z <= 6; z += 1.5) {
        if (insideRoom(room, x, z, 1) && [...obstacles, ...hazards].every(p => Math.hypot(x - p.x, z - p.z) > p.r + 1)) points.push({ x, z });
      }
      const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
      const clear = (a, b) => roomSegmentClear(room, a.x, a.z, b.x, b.z, .5)
        && sightLineClear(a, b, obstacles.map(p => ({ ...p, r: p.r + .6 })));
      let setup;
      for (const a of points) {
        for (const bait of points) {
          if (gap(a, bait) < 3 || gap(a, bait) > 5 || !clear(a, bait)) continue;
          const player = points.find(c => gap(a, c) > 6 && gap(bait, c) > 5 && clear(a, c));
          if (player) { setup = { a, bait, player }; break; }
        }
        if (setup) break;
      }
      if (!setup) throw Error("No clear generated encounter triangle");
      window.__cutpurseFixture = setup;
      window.__distractions = [];
      window.__offDistraction?.();
      window.__offDistraction = window.__bus.on("thiefDistracted", e => window.__distractions.push(e));
      window.__run.setState({ floor: 2, floorRooms: 0, gems: 3, keys: 1, thiefPhase: "stalking",
        thiefRoomId: room.id, thiefCameFrom: null, thiefNextAt: Infinity, wardenRoomId: null,
        lastDamageAt: Infinity, satchel: ["rattle"], charges: { ...s.charges, rattle: "plain", snare: "plain" } });
      window.__bus.emit("teleport", { position: [setup.player.x, 1.5, setup.player.z] });
      window.__din.reset();
      window.__bus.emit("keyTaken");
    });
    await page.waitForFunction(() => window.__scene.getObjectByName("creature-cutpurse") && window.__thief?.phase === "stalking");
    await page.evaluate(() => {
      window.__run.getState().pause();
      const { a } = window.__cutpurseFixture;
      window.__scene.getObjectByName("creature-cutpurse").position.set(a.x, 0, a.z);
    });
  }
  async function teleport(where) {
    await page.evaluate(where => {
      const p = window.__cutpurseFixture[where];
      window.__bus.emit("teleport", { position: [p.x, 1.5, p.z] });
      window.__run.getState().resume();
    }, where);
    await page.waitForFunction(where => {
      const p = window.__cutpurseFixture[where], now = window.__playerDebug;
      return now && Math.hypot(now.x - p.x, now.z - p.z) < .3;
    }, where);
  }

  for (const item of ["key", "rattle"]) {
    await stage();
    await teleport("bait");
    await page.keyboard.press(item === "key" ? "g" : "1");
    await teleport("player");
    await page.waitForFunction(() => window.__thief?.distracted === 1, null, { timeout: 6000 }).catch(async error => {
      console.log("MISSED", await page.evaluate(() => ({ phase: window.__run.getState().thiefPhase,
        thief: window.__thief, events: window.__distractions, setup: window.__cutpurseFixture })));
      throw error;
    });
    const before = await page.evaluate(() => ({ thief: { ...window.__thief }, setup: window.__cutpurseFixture,
      events: window.__distractions, keys: window.__run.getState().keys }));
    assert.ok(Math.hypot(before.thief.targetX - before.setup.bait.x, before.thief.targetZ - before.setup.bait.z) < .3,
      `${item} diverts the thief to the real landing, away from the visible player`);
    assert.equal(before.events.length, 1, "one change of attention produces one readable response");
    await page.waitForFunction(({ x, z, gap }) => Math.hypot(window.__thief.x - x, window.__thief.z - z) < gap - .7,
      { x: before.thief.targetX, z: before.thief.targetZ,
        gap: Math.hypot(before.thief.x - before.thief.targetX, before.thief.z - before.thief.targetZ) }, { timeout: 2500 });
    await page.evaluate(() => window.__run.getState().pause());
    const paused = await page.evaluate(() => ({ x: window.__thief.x, z: window.__thief.z, time: window.__din.dinClock() }));
    await page.waitForTimeout(350);
    assert.deepEqual(await page.evaluate(() => ({ x: window.__thief.x, z: window.__thief.z, time: window.__din.dinClock() })), paused,
      "pause freezes both investigation movement and its signal lifetime");
    if (item === "rattle") assert.equal(before.keys, 1, "carrying the stronger held key does not drown out an impulse");
    // Actual room travel must not resurrect the glimpse from before distraction.
    await page.evaluate(() => {
      const run = window.__run, s = run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      run.getState().resume();
      const dir = Object.keys(room.links).find(d => room.links[d] !== s.dungeon.endId && room.links[d] !== s.dungeon.vaultId);
      run.getState().travel(dir);
      if (run.getState().currentRoomId === s.currentRoomId) throw Error("Fixture failed to travel");
    });
    await page.waitForFunction(() => !window.__run.getState().transitioning && window.__run.getState().thiefPhase === "away");
    console.log(`PASS ${item}: real input, physical diversion, held-key priority, pause and escape`);
  }

  await stage();
  await page.evaluate(async () => {
    window.__susceptibility = (await import("/src/game/din/susceptibility.ts")).SUSCEPTIBILITY;
    const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
    window.__din.strike("propBroken", s.dungeon.rooms, room, 0, 0);
    s.resume();
  });
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => window.__thief.distracted), 0, "a loud non-metal sound does not distract it");
  await page.evaluate(() => {
    window.__run.getState().pause();
    window.__susceptibility.cutpurse.answers.metal = 2;
    const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
    window.__din.strike("ironDropped", s.dungeon.rooms, room, 0, 0);
    s.resume();
  });
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => window.__thief.distracted), 0, "the live creature reads its declared hearing threshold");
  await page.evaluate(() => { window.__susceptibility.cutpurse.answers.metal = .2; });
  await page.waitForFunction(() => window.__thief.distracted === 1);
  console.log("PASS receiver rules: metal threshold governs the body; generic noise does not");

  for (const blocked of [true, false]) {
    await stage();
    const doorway = await page.evaluate(async blocked => {
      const { doorPosition } = await import("/src/game/dungeon/layout.ts");
      const { barKey } = await import("/src/game/warden/bars.ts");
      const s = window.__run.getState(), here = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      const [dir, id] = Object.entries(here.links).find(([, id]) => id !== s.dungeon.endId && id !== s.dungeon.vaultId);
      const other = s.dungeon.rooms.find(r => r.id === id), edge = barKey(here.id, id);
      const bars = blocked ? [edge] : [];
      window.__run.setState({ barricades: bars });
      window.__din.strike("ironDropped", s.dungeon.rooms, other, 0, 0, new Set(bars));
      const at = doorPosition(here, dir);
      s.resume();
      return { x: at[0] * .9, z: at[2] * .9 };
    }, blocked);
    if (blocked) {
      await page.waitForTimeout(180);
      assert.equal(await page.evaluate(() => window.__thief.distracted), 0, "a barred door stops a fresh clatter reaching it");
    } else {
      await page.waitForFunction(() => window.__thief.distracted === 1);
      const target = await page.evaluate(() => ({ x: window.__thief.targetX, z: window.__thief.targetZ }));
      assert.deepEqual(target, doorway, "a neighbouring clatter points to the actual connecting doorway");
      await page.evaluate(at => window.__scene.getObjectByName("creature-cutpurse").position.set(at.x, 0, at.z), target);
      await page.waitForFunction(() => window.__run.getState().thiefPhase === "away", null, { timeout: 1500 });
    }
  }
  console.log("PASS room connections: open doorway carries the distraction; a bar blocks it");

  await stage();
  await page.evaluate(() => {
    const s = window.__run.getState();
    window.__run.setState({ gems: 0 });
    s.thiefSteals();
    const room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
    window.__din.strike("ironDropped", s.dungeon.rooms, room, 0, 0);
  });
  await page.waitForFunction(() => !!window.__scene.getObjectByName("creature-cutpurse")?.getObjectByName("iron-key-model"));
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction(() => window.__thief?.phase === "fleeing");
  assert.equal(await page.evaluate(() => window.__thief.distracted), 0, "a thief carrying stolen loot commits to its escape");
  assert.equal(await page.evaluate(() => window.__run.getState().thiefKey), true);
  await page.evaluate(() => {
    const t = window.__thief;
    window.__scene.getObjectByName("creature-cutpurse").position.set(t.targetX, 0, t.targetZ);
  });
  await page.waitForFunction(() => window.__run.getState().thiefPhase === "away" && window.__run.getState().nestKey,
    null, { timeout: 1500 });
  console.log("PASS stolen key is visibly carried; clatter cannot endlessly interrupt an escape");

  await stage();
  await teleport("bait");
  await page.evaluate(() => {
    const s = window.__run.getState();
    window.__run.setState({ satchel: ["snare", "rattle"], wardenRoomId: s.dungeon.endId });
    window.__snareWounds = 0;
    window.__snareActors = [];
    window.__bus.on("wardenWounded", () => window.__snareWounds++);
    window.__bus.on("snareSprung", e => window.__snareActors.push(e.by));
  });
  await page.keyboard.press("1");
  await page.waitForFunction(() => window.__run.getState().placed.some(d => d.id === "snare" && d.live));
  await page.keyboard.press("1");
  await teleport("player");
  await page.waitForFunction(() => window.__run.getState().thiefPhase === "away"
    && window.__run.getState().placed.some(d => d.id === "snare" && !d.live), null, { timeout: 8000 });
  assert.equal(await page.evaluate(() => window.__run.getState().gems), 3, "a baited snare protects the purse");
  assert.equal(await page.evaluate(() => window.__snareWounds), 0, "catching a Cutpurse cannot wound a Warden elsewhere");
  assert.deepEqual(await page.evaluate(() => window.__snareActors), ["cutpurse"], "the snare identifies the body that actually entered it");
  console.log("PASS connected encounter: a real placed rattle draws the thief into a real placed snare");
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
