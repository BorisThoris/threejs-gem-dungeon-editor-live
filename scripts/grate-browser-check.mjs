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
    const { surfaceOf } = await import("/src/game/din/emissions.ts");
    const dungeon = generateRunFloor(404, 2);
    const room = dungeon.rooms.find(room => surfaceOf(room) !== "tile" && trapsFor(room, dungeon.seed, dungeon.endId).some(trap => trap.kind === "grate"));
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
  const channel = await page.evaluate(async ({ room, dir, neighbour }) => {
    const { gratePosition } = await import("/src/game/traps/geometry.ts");
    const { DIR_STEP } = await import("/src/game/dungeon/types.ts");
    const { barKey } = await import("/src/game/warden/bars.ts");
    const run = window.__run;
    const here = run.getState().dungeon.rooms.find(r => r.id === room);
    const [x, , z] = gratePosition(here, dir);
    const step = DIR_STEP[dir];
    const other = Object.values(here.links).find(id => id !== neighbour);
    run.setState({ enteredBy: null, placed: [], satchel: ["snare", "snare", "bomb", "bomb"],
      identified: ["snare", "bomb"], barredDoor: null, barUntil: 0, lastDamageAt: Infinity });
    window.bombBursts = 0;
    window.__bus.on("bombBurst", () => window.bombBursts++);
    return { position: [x - step.x * 0.6, 1.5, z - step.z * 0.6],
      view: [x - step.x * 3, 1.5, z - step.z * 3], yaw: Math.atan2(-step.x, -step.z),
      key: barKey(room, neighbour), other };
  }, fixture);
  const go = async position => {
    await page.evaluate(position => window.__bus.emit("teleport", { position }), position);
    await page.waitForFunction(([x, , z]) => Math.hypot(window.__playerDebug.x - x, window.__playerDebug.z - z) < 0.25, position);
  };
  await go([0, 1.5, 0]);
  await page.keyboard.press("Digit1");
  await page.waitForFunction(() => window.__run.getState().placed.length === 1);
  await page.evaluate(to => window.__run.getState().dropGrate(to), fixture.neighbour);
  assert.equal(await page.evaluate(() => window.__run.getState().barredDoor), channel.key, "wire across the room cannot stop this grate");
  assert.equal(await page.evaluate(() => window.__run.getState().placed[0].live), true, "distant wire remains available for a creature");
  await page.evaluate(() => window.__run.getState().breakBar());
  await go(channel.position);
  await page.keyboard.press("Digit1");
  await page.waitForFunction(() => window.__run.getState().placed.length === 2);
  const fallsBefore = await page.evaluate(() => window.grateSounds.falls);
  await page.evaluate(to => window.__run.getState().dropGrate(to), fixture.neighbour);
  const caught = await page.evaluate(() => {
    const s = window.__run.getState();
    return { bar: s.barredDoor, wire: s.placed.map(d => ({ live: d.live, holding: d.holdingDoor ?? null })), falls: window.grateSounds.falls };
  });
  assert.deepEqual(caught, { bar: null, wire: [{ live: true, holding: null }, { live: false, holding: channel.key }], falls: fallsBefore + 1 },
    "only the wire under the bars is committed, and the falling metal still makes noise");
  await page.waitForFunction(() => document.querySelector('[data-testid="caption"]')?.textContent.includes("Wire catches the falling grate"));
  await page.evaluate(id => window.__run.setState({ currentRoomId: id, enteredBy: null }), fixture.neighbour);
  await page.waitForFunction(id => window.__blockLighting?.roomId === id, fixture.neighbour);
  await page.evaluate(({ room, dir }) => window.__run.setState({ currentRoomId: room, enteredBy: dir }), fixture);
  await page.waitForFunction(id => window.__blockLighting?.roomId === id, fixture.room);
  await go([0, 1.5, 0]);
  await page.waitForTimeout(2300);
  assert.equal(await page.evaluate(() => window.__run.getState().barredDoor), null, "the committed wire holds on a revisit");
  await page.evaluate(to => window.__run.getState().dropGrate(to), channel.other);
  assert.ok(await page.evaluate(() => window.__run.getState().barredDoor), "holding one grate does not disable a different doorway");

  // The same door can instead be held by a bomb spent without lighting it.
  await page.evaluate(to => {
    const run = window.__run;
    run.setState({ placed: [], enteredBy: null, barredDoor: null, barUntil: 0 });
    run.getState().dropGrate(to);
  }, fixture.neighbour);
  assert.equal(await page.evaluate(to => window.__run.getState().propGrate(to), fixture.neighbour), false, "a bomb cannot prop a remote door");
  await go(channel.position);
  await page.waitForFunction(() => /Jam the grate open/.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
  assert.equal(await page.evaluate(to => {
    const run = window.__run;
    run.getState().pause();
    const answer = run.getState().propGrate(to);
    run.getState().resume();
    return answer;
  }, fixture.neighbour), false, "paused play cannot spend a bomb");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__run.getState().barredDoor === null);
  const wedged = await page.evaluate(to => {
    const run = window.__run;
    const again = run.getState().propGrate(to);
    const s = run.getState();
    return { again, satchel: s.satchel, spent: s.floorRecord.spentAnItem,
      props: s.placed.map(d => ({ id: d.id, live: d.live, holding: d.holdingDoor, fuse: d.fuseAt ?? null })) };
  }, fixture.neighbour);
  assert.deepEqual(wedged, { again: false, satchel: ["bomb"], spent: true,
    props: [{ id: "bomb", live: false, holding: channel.key, fuse: null }] }, "one unlit bomb holds the door without starting a fuse");
  await page.getByText("Black Powder Bomb. Left unlit to hold this grate open. It will not explode.", { exact: true }).waitFor();
  const fuse = await page.evaluate(async () => (await import("/src/game/world.ts")).BOMB_FUSE_S);
  await page.waitForTimeout((fuse + 0.4) * 1000);
  assert.equal(await page.evaluate(() => window.bombBursts), 0, "the unlit prop never follows the ordinary bomb countdown");
  await page.evaluate(to => window.__run.getState().dropGrate(to), fixture.neighbour);
  assert.equal(await page.evaluate(() => window.__run.getState().barredDoor), null, "the bomb continues holding this grate");
  await go(channel.view);
  await page.evaluate(yaw => {
    window.__bus.emit("lookSet", { yaw, pitch: 0.5 });
    window.__run.getState().toggleLantern();
  }, channel.yaw);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "output/verification/grate-unlit-prop.png" });
  await page.evaluate(() => {
    const run = window.__run;
    run.setState({ currentRoomId: run.getState().dungeon.endId, transitioning: true });
    run.getState().roomReady(run.getState().dungeon.endId);
  });
  assert.deepEqual(await page.evaluate(() => window.__run.getState().placed), [], "committed devices stay on the old floor");
  assert.deepEqual(errors, []);
  console.log("PASS grate: timing, physical wire contact, spent holds, revisit persistence and unlit bomb choice");
} finally { await browser.close(); }
