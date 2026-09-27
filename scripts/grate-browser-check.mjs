import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.addInitScript(() => localStorage.setItem("gem-dungeon.settings", JSON.stringify({ captions: true })));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5199"}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__playerDebug && window.__derived);
  const fixture = await page.evaluate(async () => {
    const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
    const { trapsFor } = await import("/src/game/traps/placement.ts");
    const dungeon = generateRunFloor(404, 2);
    const room = dungeon.rooms.find(room => trapsFor(room, dungeon.seed, dungeon.endId).some(trap => trap.kind === "grate"));
    const trap = trapsFor(room, dungeon.seed, dungeon.endId).find(trap => trap.kind === "grate");
    window.grateDrops = 0;
    window.grateBuilds = 0;
    window.grateSounds = { falls: 0, hammering: 0 };
    for (const [cue, count] of [["grateDrop", "falls"], ["barDoor", "hammering"]]) {
      const play = window.__sfx[cue];
      window.__sfx[cue] = (...args) => { window.grateSounds[count]++; return play(...args); };
    }
    window.grateNotices = [];
    window.__bus.on("notice", line => window.grateNotices.push(line));
    window.__bus.on("doorBarred", () => window.grateBuilds++);
    window.__bus.on("trapSprung", event => {
      if (event.kind === "grate") {
        window.grateDrops++;
        if (window.grateDrops === 1) window.__run.getState().pause();
      }
    });
    window.__run.setState({ dungeon, currentRoomId: room.id, floor: 2, enteredBy: trap.dir,
      phase: "playing", transitioning: false, paused: false, inputLocks: 0, visited: [room.id],
      wardenRoomId: null, reaperAwake: false, harrierSlain: true, thiefPhase: "away",
      invulnerableUntil: 1e9, barredDoor: null, barUntil: 0, barricades: [], placed: [] });
    return { room: room.id, dir: trap.dir, neighbour: room.links[trap.dir] };
  });
  await page.waitForFunction(id => window.__blockLighting?.roomId === id, fixture.room);
  await page.evaluate(() => window.__bus.emit("teleport", { position: [0, 1.5, 0] }));
  await page.waitForFunction(() => window.grateDrops === 1);
  const feedback = await page.evaluate(() => ({ built: window.grateBuilds, notices: window.grateNotices, sounds: window.grateSounds,
    signals: window.__din.snapshot(window.__run.getState().currentRoomId).map(signal => signal.source) }));
  assert.equal(feedback.built, 0, "a falling trap does not announce player construction");
  assert.deepEqual(feedback.sounds, { falls: 1, hammering: 0 }, "one falling-metal cue accompanies the trap");
  assert.ok(feedback.signals.includes("grateDrop") && !feedback.signals.includes("doorBarred"), "the trap emits its own fall, without phantom hammering");
  assert.ok(feedback.notices.some(line => /grate.*dropped/i.test(line)) && !feedback.notices.some(line => /barricade kits/i.test(line)), "the grate teaches temporary blockage instead of kit recovery");
  await page.waitForFunction(() => document.querySelector('[data-testid="caption"]')?.textContent.includes("A grate drops behind you"));
  await page.evaluate(() => {
    const state = window.__run.getState();
    window.__run.setState({ barUntil: window.__derived.clock() + 0.5 });
    state.pause();
  });
  await page.waitForTimeout(800);
  assert.ok(await page.evaluate(() => window.__run.getState().barredDoor), "paused grate does not expire");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(() => window.grateDrops), 1, "a lifted grate cannot drop again during the same visit");
  assert.equal(await page.evaluate(() => window.__run.getState().barredDoor), null);
  await page.evaluate(id => window.__run.setState({ currentRoomId: id, enteredBy: null }), fixture.neighbour);
  await page.waitForFunction(id => window.__blockLighting?.roomId === id, fixture.neighbour);
  await page.evaluate(({ room, dir }) => window.__run.setState({ currentRoomId: room, enteredBy: dir }), fixture);
  await page.waitForFunction(id => window.__blockLighting?.roomId === id, fixture.room);
  await page.evaluate(() => window.__bus.emit("teleport", { position: [0, 1.5, 0] }));
  await page.waitForFunction(() => window.grateDrops === 2);
  assert.deepEqual(errors, []);
  console.log("PASS grate: one drop per visit, pause preserves deadline, expiry stays open and re-entry rearms");
} finally { await browser.close(); }
