/** Focused live diagnostics for the three trap interactions that need bodies. */
import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const port = process.argv[2] || process.env.PORT || "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.addInitScript(() => localStorage.setItem("gem-dungeon.settings", JSON.stringify({ captions: true })));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => !!window.__run && !!window.__traps);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run.getState().phase === "playing");
  await page.evaluate(() => {
    window.__trapCaptions = [];
    new MutationObserver(() => {
      const line = document.querySelector('[data-testid="caption"]')?.textContent;
      if (line && window.__trapCaptions.at(-1) !== line) window.__trapCaptions.push(line);
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  });
  const result = await page.evaluate(async (dartOnly) => {
    const run = window.__run, T = window.__traps, D = window.__derived;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    run.getState().startRun(1);
    await wait(900);
    const dungeon = run.getState().dungeon;
    const withTrap = (kind) => dungeon.rooms.flatMap((room) => T.trapsFor(room, dungeon.seed, dungeon.endId)
      .filter((trap) => trap.kind === kind).map((trap) => ({ room, trap })));
    const dartPair = withTrap("darts").find(({ room }) => room.id === "room_6");
    if (!dartPair) return { error: "seed lacks a dart room", seed: dungeon.seed,
      kinds: dungeon.rooms.map((r) => ({ room: r.id, kind: r.kind,
        traps: T.trapsFor(r, dungeon.seed, dungeon.endId).map((t) => t.kind) })) };

    const { room: dartRoom, trap: dart } = dartPair;
    run.setState({ transitioning: true, currentRoomId: dartRoom.id, wardenRoomId: null, lives: 99 });
    run.getState().roomReady(dartRoom.id);
    await wait(1400);
    const entries = Object.entries(dartRoom.links).map(([dir, id]) => {
      const [x, , z] = window.__layout.doorPosition(dartRoom, dir);
      return { dir, id, gap: Math.hypot(x * .86 - dart.x, z * .86 - dart.z) };
    }).sort((a, b) => a.gap - b.gap);
    const [doorX, , doorZ] = window.__layout.doorPosition(dartRoom, "west");
    const spanX = dart.x - doorX * .86, spanZ = dart.z - doorZ * .86;
    const spanLen = Math.hypot(spanX, spanZ);
    const bait = { x: dart.x + spanX / spanLen * 1.2, z: dart.z + spanZ / spanLen * 1.2 };
    window.__bus.emit("teleport", { position: [bait.x, 1.5, bait.z] });
    await wait(400);
    let wounds = 0;
    const woundSources = [];
    const offWound = window.__bus.on("wardenWounded", e => { wounds++; woundSources.push(e.source); });
    const sprungBy = [];
    const offSpring = window.__bus.on("trapSprung", (e) => { if (e.kind === "darts") sprungBy.push(e.by); });
    const volleySamples = [];
    const dartEntry = entries.find((entry) => entry.dir === "west");
    // Keep the test player alive on the bait spot so the Warden does not
    // banish itself on touch during the plate's warning interval.
    run.setState({ wardenRoomId: dartRoom.id, wardenCameFrom: dartEntry.id, alarm: 4, lastDamageAt: Infinity });
    const t0 = performance.now();
    while (!wounds && performance.now() - t0 < 30000) {
      run.getState().makeNoise(undefined, bait.x, bait.z);
      await wait(250);
      if (window.__dartProbe?.phase || window.__dartProbe?.wardenOn)
        volleySamples.push({ age: +window.__dartProbe.age.toFixed(2), phase: window.__dartProbe.phase,
          on: window.__dartProbe.wardenOn, room: window.__dartProbe.wardenRoom });
    }
    offWound();
    offSpring();
    out.dart = { wounds, woundSources, room: dartRoom.id, size: dartRoom.size, entry: dartEntry, plate: [dart.x, dart.z], bait,
      sprungBy, volleySamples: volleySamples.slice(-15), probe: window.__dartProbe,
      sprungAt: run.getState().sprung[dart.key], clock: D.clock(),
      player: window.__playerDebug && [window.__playerDebug.x, window.__playerDebug.z],
      warden: window.__warden && { x: window.__warden.x, z: window.__warden.z,
        sees: window.__warden.canSee, target: [window.__warden.targetX, window.__warden.targetZ] } };
    if (dartOnly) return out;

    run.getState().startRun(8);
    await wait(700);
    const pitDungeon = run.getState().dungeon;
    const pitRoom = pitDungeon.rooms.find((r) => r.id === "room_4");
    const pit = T.trapsFor(pitRoom, pitDungeon.seed, pitDungeon.endId).find((t) => t.kind === "pit");
    run.setState({ transitioning: true, currentRoomId: pitRoom.id, wardenRoomId: null, lives: 99 });
    run.getState().roomReady(pitRoom.id);
    await wait(1400);
    const doors = Object.entries(pitRoom.links).map(([dir, id]) => {
      const [x, , z] = window.__layout.doorPosition(pitRoom, dir);
      return { dir, id, x: x * .86, z: z * .86 };
    });
    const entry = doors.find((door) => door.dir === "east");
    const span = Math.hypot(pit.x - entry.x, pit.z - entry.z) || 1;
    const px = pit.x + (pit.x - entry.x) / span * 1.8;
    const pz = pit.z + (pit.z - entry.z) / span * 1.8;
    window.__bus.emit("teleport", { position: [px, 1.5, pz] });
    await wait(400);
    const pitWounds = [];
    const offPitWound = window.__bus.on("wardenWounded", e => pitWounds.push(e.source));
    run.setState({ wardenRoomId: pitRoom.id, wardenCameFrom: entry.id, alarm: 4 });
    const t1 = performance.now();
    while (D.sprung()[pit.key] === undefined && performance.now() - t1 < 30000) {
      run.getState().makeNoise(undefined, px, pz);
      await wait(250);
    }
    offPitWound();
    out.pit = { opened: D.sprung()[pit.key] !== undefined, woundSources: pitWounds, room: pitRoom.id, size: pitRoom.size,
      entry, patch: [pit.x, pit.z], intendedPlayer: [px, pz],
      player: window.__playerDebug && [window.__playerDebug.x, window.__playerDebug.z],
      warden: window.__warden && { x: window.__warden.x, z: window.__warden.z,
        sees: window.__warden.canSee, target: [window.__warden.targetX, window.__warden.targetZ] } };

    run.getState().startRun(2);
    await wait(700);
    const harrierDungeon = run.getState().dungeon;
    const trapRoom = harrierDungeon.rooms.find((r) => r.id === "room_8");
    if (!trapRoom) return { ...out, error: "no trap room for Harrier" };
    const gem = window.__gemFor(trapRoom, harrierDungeon.seed);
    run.setState({ floor: window.__world.HARRIER_FROM_FLOOR, floorRooms: 2, transitioning: true,
      currentRoomId: trapRoom.id, lives: 99, harrierAwake: true, harrierSlain: false,
      harrierRoomId: trapRoom.id, harrierCameFrom: trapRoom.links.south,
      harrierRetreatUntil: 0, harrierDownedUntil: 0 });
    run.getState().roomReady(trapRoom.id);
    await wait(1400);
    const patches = window.__body.bitesFor("ground", trapRoom, harrierDungeon.seed, run.getState().placed, D.sprung());
    if (gem) window.__bus.emit("teleport", { position: [gem[0], 1.5, gem[2]] });
    let over = false;
    const t2 = performance.now();
    while (!over && performance.now() - t2 < 30000) {
      await wait(120);
      const h = window.__harrier;
      if (!h || h.room !== trapRoom.id || h.away || h.down) continue;
      if (patches.some((p) => Math.hypot(h.x - p.x, h.z - p.z) < p.r * .9)) {
        over = true;
        run.getState().downHarrier();
      }
    }
    await wait(500);
    out.harrier = { over, slain: run.getState().harrierSlain, room: run.getState().harrierRoomId,
      gem, patches: patches.slice(0, 6), harrier: window.__harrier,
      player: window.__playerDebug && [window.__playerDebug.x, window.__playerDebug.z] };
    return out;
  }, process.argv.includes("--dart-only"));
  console.log(JSON.stringify(result, null, 2));
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.ok(result.dart?.wounds > 0, "visible dart plate lures and wounds the Warden");
  assert.ok(result.dart.woundSources.includes("darts"), "a live dart volley identifies what wounded the Warden");
  if (!process.argv.includes("--dart-only")) {
    assert.equal(result.pit?.opened, true, "visible pit route opens under the Warden");
    assert.ok(result.pit.woundSources.includes("pit"), "the opening pit identifies its wound");
    assert.equal(result.harrier?.over, true, "Harrier flies over the spike patch");
    assert.equal(result.harrier?.slain, true, "Harrier downed over spikes is slain");
  }
  console.log("PASS live dart, pit and Harrier spike contact");
  if (!process.argv.includes("--dart-only")) {
    const fixture = await page.evaluate(async () => {
      const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
      for (let seed = 1; seed <= 60; seed++) {
        const dungeon = generateRunFloor(seed, 1);
        for (const room of dungeon.rooms.filter(r => r.secret)) {
          const pit = window.__traps.trapsFor(room, dungeon.seed, dungeon.endId).find(t => t.kind === "pit");
          if (!pit) continue;
          window.__run.getState().startRun(seed);
          window.__run.setState({ currentRoomId: room.id, transitioning: true, wardenRoomId: null });
          return { seed, roomId: room.id, pit };
        }
      }
      throw Error("No generated secret host with a pit");
    });
    await page.waitForFunction(() => !window.__run.getState().transitioning);
    await page.evaluate(pit => window.__bus.emit("teleport", { position: [pit.x, 1.5, pit.z] }), fixture.pit);
    await page.waitForFunction(key => window.__run.getState().sprung[key] !== undefined, fixture.pit.key);
    const before = await page.evaluate(key => ({ lives: window.__run.getState().lives, sprung: window.__run.getState().sprung[key] }), fixture.pit.key);
    assert.equal(before.lives, 2, "the visible pit opens through player contact and takes one life");
    await page.evaluate(roomId => window.__run.getState().revealSecret(roomId), fixture.roomId);
    const frame = await page.evaluate(() => window.__perf.frames);
    await page.waitForFunction(frame => window.__perf.frames >= frame + 3, frame);
    const after = await page.evaluate(({ roomId, pit }) => {
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === roomId);
      const traps = window.__traps.trapsFor(room, s.dungeon.seed, s.dungeon.endId);
      const bites = window.__body.bitesFor("ground", room, s.dungeon.seed, s.placed, s.sprung);
      let visible = false;
      window.__scene.traverse(o => { if (o.name === "trap-pit" && Math.hypot(o.position.x - pit.x, o.position.z - pit.z) < .001) visible = true; });
      return { pit: traps.find(t => t.key === pit.key), sprung: s.sprung[pit.key], visible,
        damagesBodies: bites.some(p => p.x === pit.x && p.z === pit.z), revealed: room.links[room.secret.dir] === room.secret.to };
    }, fixture);
    assert.deepEqual(after.pit, fixture.pit, "breaking a secret wall cannot reroll an existing pit");
    assert.equal(after.sprung, before.sprung, "the open pit retains its original sprung state");
    assert.ok(after.revealed && after.visible && after.damagesBodies, "the opened wall, drawn pit and creature hazard agree");
    console.log(`PASS a player-opened pit persists through secret revelation (seed ${fixture.seed})`);

    // Contact the already opened pit through the Warden's ordinary body
    // loop. Its cause must survive becoming a permanent floor hazard.
    await page.evaluate(() => {
      const run = window.__run, s = run.getState();
      window.__contactWounds = [];
      window.__bus.on("wardenWounded", e => window.__contactWounds.push(e));
      window.__bus.emit("teleport", { position: [0, 1.5, 0] });
      run.setState({ wardenRoomId: s.currentRoomId, wardenWounds: 0, wardenStaggerUntil: 0, lastDamageAt: Infinity });
    });
    await page.waitForFunction(() => !!window.__scene.getObjectByName("creature-warden"));
    await page.evaluate(pit => window.__scene.getObjectByName("creature-warden").position.set(pit.x, 0, pit.z), fixture.pit);
    await page.waitForFunction(() => window.__contactWounds.some(e => e.source === "pit"));
    await page.waitForFunction(() => window.__trapCaptions.some(line => line.includes("stumbles into the pit")));

    // Place the snare through its real slot input, then bring the actual
    // Warden body into it. No wound or snare event is injected by the test.
    await page.evaluate(() => window.__run.getState().startRun(11));
    await page.waitForFunction(() => !window.__run.getState().transitioning);
    await page.evaluate(() => {
      const run = window.__run, s = run.getState();
      window.__contactWounds = [];
      run.setState({ satchel: ["snare"], wardenRoomId: s.currentRoomId, lastDamageAt: Infinity });
      window.__bus.emit("teleport", { position: [0, 1.5, 0] });
    });
    await page.waitForFunction(() => !!window.__scene.getObjectByName("creature-warden") && Math.hypot(window.__playerDebug.x, window.__playerDebug.z) < .1);
    await page.keyboard.press("1");
    await page.waitForFunction(() => window.__run.getState().placed.some(d => d.id === "snare" && d.live));
    await page.evaluate(() => {
      const snare = window.__run.getState().placed.find(d => d.id === "snare");
      window.__bus.emit("teleport", { position: [4, 1.5, 4] });
      window.__scene.getObjectByName("creature-warden").position.set(snare.x, 0, snare.z);
    });
    await page.waitForFunction(() => window.__contactWounds.some(e => e.source === "snare"));
    await page.waitForFunction(() => window.__trapCaptions.some(line => line.includes("Your snare catches it")));
    assert.equal(await page.evaluate(() => window.__run.getState().placed.find(d => d.id === "snare").live), false);
    const captions = await page.evaluate(() => window.__trapCaptions);
    assert.ok(captions.some(line => line.includes("The darts strike it")), "the live volley rendered its own caption");
    console.log("PASS wound causes and rendered captions: darts, opening pit, open pit and a real placed snare");
  }
  assert.deepEqual(errors, [], "no browser exceptions after trap lifetime checks");
} finally { await browser.close(); }
