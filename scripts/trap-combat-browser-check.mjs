/** Focused live diagnostics for the three trap interactions that need bodies. */
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const port = process.argv[2] || process.env.PORT || "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => !!window.__run && !!window.__traps);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run.getState().phase === "playing");
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
    const offWound = window.__bus.on("wardenWounded", () => wounds++);
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
    out.dart = { wounds, room: dartRoom.id, size: dartRoom.size, entry: dartEntry, plate: [dart.x, dart.z], bait,
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
    run.setState({ wardenRoomId: pitRoom.id, wardenCameFrom: entry.id, alarm: 4 });
    const t1 = performance.now();
    while (D.sprung()[pit.key] === undefined && performance.now() - t1 < 30000) {
      run.getState().makeNoise(undefined, px, pz);
      await wait(250);
    }
    out.pit = { opened: D.sprung()[pit.key] !== undefined, room: pitRoom.id, size: pitRoom.size,
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
  if (!process.argv.includes("--dart-only")) {
    assert.equal(result.pit?.opened, true, "visible pit route opens under the Warden");
    assert.equal(result.harrier?.over, true, "Harrier flies over the spike patch");
    assert.equal(result.harrier?.slain, true, "Harrier downed over spikes is slain");
  }
  console.log("PASS live dart, pit and Harrier spike contact");
} finally { await browser.close(); }
