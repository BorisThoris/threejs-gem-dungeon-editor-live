import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__din && window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  for (const stall of [0, 1400]) {
    const result = await page.evaluate(async stall => {
      const { EMISSIONS } = await import("/src/game/din/emissions.ts");
      const run = window.__run, din = window.__din;
      const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      run.getState().resume();
      await frames();
      const roomId = run.getState().currentRoomId;
      const began = performance.now();
      // The event happens AFTER a long task, not before it. Its lifetime
      // must not include the time spent waiting for the previous frame.
      while (performance.now() - began < stall) { /* Delayed frame. */ }
      window.__bus.emit("propBroken", { roomId, kind: "barrel", key: "clock-check", x: 0, z: 0 });
      run.getState().pause();
      await frames();
      const strength = () => din.snapshot(roomId).filter(s => s.source === "propBroken").at(-1)?.here;
      const fresh = strength();
      const heard = din.answering(din.emptyArrival(), "rat", roomId);
      await wait(800);
      await frames();
      const paused = strength();
      run.getState().resume();
      await wait(350);
      await frames();
      return { stall, expected: EMISSIONS.propBroken.magnitude, fresh, heard, paused, resumed: strength() };
    }, stall);
    console.log(result);
    assert.ok(Math.abs(result.fresh - result.expected) < 0.01, "a new event retains its declared strength after a delayed frame");
    assert.equal(result.heard, true, "the fresh sound reaches the rat's declared threshold");
    assert.equal(result.paused, result.fresh, "pausing preserves the event's remaining strength");
    assert.ok(result.resumed < result.paused && result.resumed > 0, "resuming lets the same event decay");
  }
  const debris = await page.evaluate(async () => {
    const { placementsFor } = await import("/src/game/rooms/placements.ts");
    const { roomDressingOptions } = await import("/src/game/rooms/dressingContext.ts");
    const { BREAKABLE, breakKey } = await import("/src/game/props/breakable.ts");
    const { sideOf, sideOfNeighbour } = await import("/src/game/systems/bearing.ts");
    const { playerAt } = await import("/src/game/player/where.ts");
    const run = window.__run, din = window.__din;
    run.getState().startRun(11);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const s = run.getState(), d = s.dungeon;
    const options = d.rooms.filter(r => r.id !== s.currentRoomId).flatMap(room =>
      placementsFor(room, d.seed, roomDressingOptions(s, room, d.seed))
        .filter(p => BREAKABLE.has(p.kind) && Math.hypot(p.x, p.z) > 2)
        .map(prop => ({ room, prop })));
    const target = options.find(({ room }) => Object.values(d.rooms.find(r => r.id === s.currentRoomId).links).includes(room.id)) ?? options[0];
    if (!target) throw new Error("No generated breakable fixture");
    const { room, prop } = target;
    const expected = Object.fromEntries(placementsFor(room, d.seed, roomDressingOptions(s, room, d.seed))
      .filter(p => BREAKABLE.has(p.kind)).map(p => [breakKey(room, p), { x: p.x, z: p.z }]));
    const events = [], pans = [];
    const originalClatter = window.__sfx.clatter;
    window.__sfx.clatter = (...args) => { pans.push(args[0]); originalClatter(...args); };
    const off = window.__bus.on("propBroken", e => events.push(e));
    try {
      din.reset();
      run.setState({ placed: [{ key: "debris-origin", id: "bomb", roomId: room.id, x: prop.x, z: prop.z, live: true }] });
      run.getState().detonate("debris-origin");
      const heard = din.emptyArrival();
      const audible = din.strongest(heard, "broken", room.id);
      const remotePan = sideOfNeighbour(d.rooms.find(r => r.id === s.currentRoomId), room.id);
      const repeated = events.length;
      run.getState().detonate("debris-origin");
      const remotePans = pans.slice();
      // A local sound uses the object's bearing, not the neighbouring door.
      pans.length = 0;
      const local = { roomId: s.currentRoomId, kind: "barrel", key: "debris-local", x: playerAt.x + 3, z: playerAt.z - 2 };
      window.__bus.emit("propBroken", local);
      return { events: events.slice(0, repeated), expected, audible, heard, repeated: events.length === repeated + 1,
        localPan: pans[0], expectedLocalPan: sideOf(local.x - playerAt.x, local.z - playerAt.z), remotePan, remotePans };
    } finally { off(); window.__sfx.clatter = originalClatter; }
  });
  assert.ok(debris.events.length > 0, "a real detonation broke generated furniture");
  for (const event of debris.events) assert.deepEqual({ x: event.x, z: event.z }, debris.expected[event.key],
    "each broken prop carries its own authoritative placement");
  assert.equal(debris.audible, true);
  assert.deepEqual({ x: debris.heard.x, z: debris.heard.z }, debris.expected[debris.events[0].key],
    "creature hearing receives the debris position rather than room centre");
  assert.equal(debris.repeated, true, "a spent bomb cannot announce the same debris twice");
  assert.equal(debris.localPan, debris.expectedLocalPan, "the clatter uses the same local origin as creature hearing");
  assert.deepEqual(debris.remotePans, debris.events.map(() => debris.remotePan), "remote debris sounds toward its doorway");
  console.log("PASS broken furniture: real blast, per-object signal origin, positional clatter and no repeated event");
  const traps = await page.evaluate(async () => {
    const { trapsFor } = await import("/src/game/traps/placement.ts");
    const { sideOf, sideOfNeighbour } = await import("/src/game/systems/bearing.ts");
    const { playerAt } = await import("/src/game/player/where.ts");
    const run = window.__run, din = window.__din, results = [];
    for (const kind of ["darts", "pit", "grate", "snare"]) {
      let dungeon, placed;
      for (let seed = 1; seed <= 24; seed++) {
        run.getState().startRun(seed);
        run.getState().roomReady(run.getState().dungeon.startId);
        dungeon = run.getState().dungeon;
        placed = dungeon.rooms.flatMap(room => trapsFor(room, dungeon.seed, dungeon.endId)
          .filter(trap => trap.kind === kind).map(trap => ({ room, trap })))[0];
        if (placed || kind === "snare") break;
      }
      const room = kind === "snare" ? dungeon.rooms.find(r => r.id === run.getState().currentRoomId) : placed?.room;
      if (!room) throw Error(`No generated ${kind} fixture in 24 seeds`);
      const trap = kind === "snare" ? { key: "origin-wire", kind, x: 3, z: -4 } : placed.trap;
      run.setState({ currentRoomId: room.id, paused: false, transitioning: false, inputLocks: 0 });
      if (kind === "snare") run.setState({ placed: [{ ...trap, id: "snare", roomId: room.id, live: true }] });
      din.reset();
      const events = [], pans = [], cue = kind === "pit" ? "grind" : kind === "grate" ? "grateDrop" : "clatter";
      const original = window.__sfx[cue];
      window.__sfx[cue] = (...args) => { pans.push(args[0] ?? 0); original(...args); };
      const off = window.__bus.on(kind === "snare" ? "snareSprung" : "trapSprung", event => events.push(event));
      const trigger = () => kind === "snare" ? run.getState().springSnare(trap.key, "rat")
        : kind === "grate" ? run.getState().dropGrate(room.links[trap.dir])
        : run.getState().springTrap(room.id, trap, "player");
      try {
        trigger();
        const heard = din.emptyArrival();
        const audible = din.strongest(heard, "loud", room.id);
        const expectedPan = sideOf(trap.x - playerAt.x, trap.z - playerAt.z);
        trigger();
        results.push({ kind, expected: { roomId: room.id, x: trap.x, z: trap.z },
          event: events[0], count: events.length, heard, audible, pan: pans[0], expectedPan });
      } finally { off(); window.__sfx[cue] = original; }
    }
    // A device keeps its origin even after the delver has left its room.
    run.getState().startRun(11);
    run.getState().roomReady(run.getState().dungeon.startId);
    const s = run.getState();
    const { here, to } = s.dungeon.rooms.flatMap(here => Object.values(here.links)
      .map(to => ({ here, to, pan: sideOfNeighbour(here, to) })))
      .sort((a, b) => Math.abs(b.pan) - Math.abs(a.pan))[0];
    run.setState({ currentRoomId: here.id,
      placed: [{ key: "remote-wire", id: "snare", roomId: to, x: -3, z: 4, live: true }] });
    din.reset();
    const original = window.__sfx.clatter;
    let pan;
    window.__sfx.clatter = (...args) => { pan = args[0] ?? 0; original(...args); };
    try {
      run.getState().springSnare("remote-wire", "rat");
      const heard = din.emptyArrival();
      const audible = din.strongest(heard, "snared", to);
      results.push({ kind: "remote snare", expected: { roomId: to, x: -3, z: 4 },
        heard, audible, pan, expectedPan: sideOfNeighbour(here, to) });
    } finally { window.__sfx.clatter = original; }
    return results;
  });
  console.log(JSON.stringify(traps));
  for (const trap of traps) {
    assert.equal(trap.audible, true, `${trap.kind} reaches listeners in its actual room`);
    assert.deepEqual({ roomId: trap.heard.fromRoomId, x: trap.heard.x, z: trap.heard.z }, trap.expected,
      `${trap.kind} directs investigation to its mechanism rather than the room center or the player`);
    assert.equal(trap.pan, trap.expectedPan, `${trap.kind} uses the same origin for player audio`);
    if (trap.event) {
      assert.deepEqual({ roomId: trap.event.roomId, x: trap.event.x, z: trap.event.z }, trap.expected);
      assert.equal(trap.count, 1, `${trap.kind} cannot announce another trigger before rearming`);
    }
  }
  console.log("PASS generated traps and placed snares share their actual origins with investigation and positional audio");
  assert.deepEqual(errors, []);
  console.log("PASS sound event time: fresh after a delayed frame, frozen on pause, decaying on resume");
} finally { await browser.close(); }
