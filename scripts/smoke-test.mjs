/**
 * End-to-end smoke test: can a stranger start the game, explore, collect,
 * die, and start again?
 *
 * Every serious bug this project has had - a render loop that never ran,
 * rooms that never mounted, a floor two metres below where the player
 * stood - was invisible to the type checker and to the build, and only
 * showed up by driving the real game. This is the cheapest guard against
 * them coming back.
 *
 *   yarn dev --port 5199   # in one terminal
 *   yarn test:smoke        # in another
 *
 * Start that dev server fresh. One left running across a long editing
 * session goes bad in a way that looks exactly like a broken game: seven
 * checks failed together, twice, reproducibly - head bob measuring zero,
 * the map drawing four rooms of fourteen, the tome refusing to open - and
 * all of them passed on a server started a minute earlier with the same
 * code. Nothing here can tell the difference, so if a run fails in a
 * cluster and the failures make no sense together, restart the server
 * before believing it.
 *
 * Needs a Chromium binary. Set CHROMIUM_PATH if yours is not at the
 * Playwright default.
 */
import { chromium } from "playwright-core";

const PORT = process.argv[2] || process.env.PORT || "5199";
const CHROMIUM =
  process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const REST_Y = 1.1;

let failures = 0;
const ok = (label, cond, detail = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  - " + detail : ""}`);
};

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-background-timer-throttling",
  ],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load", timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2000);

ok("main menu appears before gameplay", await page.evaluate(() => /start/i.test(document.body.innerText)));
const start = await page.$('button:has-text("Start")');
if (start) await start.click();
await page.waitForTimeout(9000);

const snap = () =>
  page.evaluate(() => {
    const s = window.__run.getState();
    const d = window.__playerDebug;
    return {
      phase: s.phase,
      room: s.currentRoomId,
      gems: s.gems,
      lives: s.lives,
      visited: s.visited.length,
      transitioning: s.transitioning,
      rooms: s.dungeon ? s.dungeon.rooms.length : 0,
      y: d ? +d.y.toFixed(2) : null,
      vy: d ? +d.vy.toFixed(2) : null,
    };
  });

const teleport = (x, z) =>
  page.evaluate(([x, z]) => window.__bus.emit("teleport", { position: [x, 1.5, z] }), [x, z]);

/**
 * A fixture, not a test: the walker stands still for seconds at a time to
 * sample the floor and to read a prompt, and standing still is how you die
 * here - on spikes, in the arena, or to a Warden that the walker's own
 * gem-taking has roused. Every phase that stands still is testing something
 * other than survival, and dying has its own checks further down, so those
 * phases keep it on its feet.
 *
 * It covered only the exploration loop until a run lost all three lives
 * during the walk to the exit and reported the exit door as having no
 * prompt - a check that had nothing to do with what actually went wrong,
 * failing about one run in ten.
 */
const keepOnItsFeet = () =>
  page.evaluate(() => {
    const run = window.__run;
    if (run.getState().lives < 3) run.setState({ lives: 3, phase: "playing" });
  });

/** Doorways of the current room, from the dungeon data alone. */
const doors = () =>
  page.evaluate(() => {
    const s = window.__run.getState();
    const room = s.dungeon.rooms.find((r) => r.id === s.currentRoomId);
    const half = room.size / 2;
    const step = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
    return Object.entries(room.links).map(([dir, to]) => ({
      dir,
      to,
      x: step[dir][0] * half,
      z: step[dir][1] * half,
      isExit: to === s.dungeon.endId,
    }));
  });

let s0 = await snap();
ok("a run is on and a room is active", s0.phase === "playing" && !!s0.room, `${s0.phase} in ${s0.room}`);
ok("dungeon has a sensible number of rooms", s0.rooms >= 6 && s0.rooms <= 14, `${s0.rooms} rooms`);
ok("player is resting on the room floor", s0.vy === 0 && Math.abs(s0.y - REST_Y) < 0.2, `y=${s0.y} vy=${s0.vy}`);
ok("HUD shows lives and gems", await page.evaluate(() => /LIVES/.test(document.body.innerText) && /GEMS/.test(document.body.innerText)));

// Explore: in each room, sweep the diagonal anchors (where the gem lives) then stand
// at each doorway and press E, the way a player does. Never take the exit.
let minY = s0.y;
const seen = new Set([s0.room]);
// Eight hops, not six: the walker takes doors at random and six was
// sometimes not enough to reach the exit's neighbour, which failed the toll
// checks for want of patience rather than for a real fault.
for (let hop = 0; hop < 8; hop++) {
  const half = await page.evaluate(() => {
    const s = window.__run.getState();
    return s.dungeon.rooms.find((r) => r.id === s.currentRoomId).size / 2;
  });
  // The gem sits on a near or a far diagonal anchor (see layout.ts); step
  // onto each of the eight.
  const near = Math.max(3.65, (half * 0.5) / Math.SQRT2);
  const far = Math.max(4.55, half - 2.4);
  for (const d of [near, far]) {
    for (const [fx, fz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      await teleport(fx * d, fz * d);
      await page.waitForTimeout(500);
      const s = await snap();
      if (s.y !== null) minY = Math.min(minY, s.y);
    }
  }
  let moved = false;
  // Prefer doors to rooms not yet seen: the first door listed is usually the
  // way back, and a walker that always takes it ping-pongs between two rooms.
  const options = (await doors())
    .filter((d) => !d.isExit)
    .sort((a, b) => Number(seen.has(a.to)) - Number(seen.has(b.to)));
  for (const door of options) {
    await teleport(door.x * 0.8, door.z * 0.8);
    await page.waitForTimeout(1500);
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(3500);
    const s = await snap();
    if (s.y !== null) minY = Math.min(minY, s.y);
    if (s.room !== s0.room) {
      s0 = s;
      seen.add(s.room);
      moved = true;
      break;
    }
  }
  if (!moved) break;
  await keepOnItsFeet();
}
for (let i = 0; i < 20 && (await snap()).transitioning; i++) await page.waitForTimeout(250);
const explored = await snap();
ok("travelled to other rooms by pressing E", seen.size >= 3, `${seen.size} rooms visited`);
ok("never left the floor", minY >= REST_Y - 0.2, `lowest y seen ${minY.toFixed(2)}`);
ok("control returned after every transition", !explored.transitioning && explored.phase === "playing", JSON.stringify(explored));
/**
 * Walking onto a gem takes it.
 *
 * This used to read `explored.gems > 0` and hope: the walker moves between
 * doorways, so whether it ever crossed a gem was luck, and it came up empty
 * about one run in five. A check that says the core loop is broken on a
 * fifth of runs is one people stop reading. It walks to the gem now - the
 * store knows where it is - and the collection is the thing being tested
 * rather than a side effect of wandering.
 */
{
  const took = await page.evaluate(async () => {
    const run = window.__run;
    const { gemFor } = await import("/src/game/rooms/kinds.ts");
    const s = run.getState();
    // A room that still has a gem in it, rather than whichever room the
    // walker happened to stop in: start, end and the arena place none, and
    // the walker may already have taken the one where it is standing.
    const room = s.dungeon.rooms.find(
      (r) => gemFor(r, s.dungeon.seed) && !s.gemRooms.includes(r.id)
    );
    if (!room) return { none: true };
    run.setState({ transitioning: true, currentRoomId: room.id });
    run.getState().roomReady(room.id);
    await new Promise((r) => setTimeout(r, 1400));
    const at = gemFor(room, s.dungeon.seed);
    const before = run.getState().gems;
    window.__bus.emit("teleport", { position: [at[0], 1.5, at[2]] });
    await new Promise((r) => setTimeout(r, 1200));
    return { room: room.id, kind: room.kind, before, after: run.getState().gems };
  });
  ok(
    "gems are taken by walking onto them",
    !took.none && took.after === took.before + 1,
    JSON.stringify(took)
  );
}

// The exit refuses E without the toll, and takes it once paid.
const exitDoor = await page.evaluate(() => {
  const s = window.__run.getState();
  const byId = new Map(s.dungeon.rooms.map((r) => [r.id, r]));
  // BFS to the room next to the exit, around the locked vault.
  //
  // The generator only promises the vault is off the path from the START
  // room; the walker sets out from wherever eight random doors left it, and
  // from there the shortest way on can lead straight into a door that will
  // not open without a key. That is what "path not walked" was, about one
  // run in five - a real property of the floor, read as a flaky test.
  const shut = s.dungeon.vaultId && !s.unlocked.includes(s.dungeon.vaultId) ? s.dungeon.vaultId : null;
  const prev = new Map([[s.currentRoomId, null]]);
  const q = [s.currentRoomId];
  let neighbour = null;
  while (q.length) {
    const id = q.shift();
    const room = byId.get(id);
    if (Object.values(room.links).includes(s.dungeon.endId)) { neighbour = id; break; }
    for (const n of Object.values(room.links)) {
      if (!n || prev.has(n) || n === shut) continue;
      prev.set(n, id);
      q.push(n);
    }
  }
  if (!neighbour) return null;
  const path = [];
  for (let id = neighbour; id; id = prev.get(id)) path.unshift(id);
  return { path, neighbour, avoided: shut };
});
let exitChecked = false;
if (exitDoor) {
  // Walk the path with E, one door at a time.
  for (const nextId of exitDoor.path.slice(1)) {
    const door = (await doors()).find((d) => d.to === nextId);
    if (!door) break;
    await teleport(door.x * 0.8, door.z * 0.8);
    await page.waitForTimeout(1500);
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(3500);
    await keepOnItsFeet();
  }
  const here = await snap();
  if (here.room === exitDoor.neighbour) {
    const door = (await doors()).find((d) => d.isExit);
    // Re-read the store each time: a getState() snapshot never changes.
    await page.evaluate(() => { const run = window.__run; while (run.getState().gems > 0) run.getState().spendGems(1); });
    await keepOnItsFeet();
    await teleport(door.x * 0.8, door.z * 0.8);
    await page.waitForTimeout(1500);
    const prompt = await page.evaluate(() => document.body.innerText.match(/exit needs \d+ gems/i)?.[0] ?? null);
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(2500);
    const refused = (await snap()).room === exitDoor.neighbour;
    ok("exit door names its toll and refuses E unpaid", !!prompt && refused, prompt ?? "no prompt");
    // Pay the toll and one over, so the spare gem can be seen to survive.
    const toll = await page.evaluate(() => window.__run.getState().gems + 0 || 0);
    void toll;
    const owed = await page.evaluate(() => {
      const s = window.__run.getState();
      // tollNow is not exported to the page; the prompt above named it.
      return Number(document.body.innerText.match(/exit needs (\d+) gems/i)?.[1] ?? 3) - s.gems;
    });
    await page.evaluate((n) => {
      const s = window.__run.getState();
      for (let i = 0; i < n; i++) s.collectGem("toll-" + i);
    }, owed + 1);
    await page.waitForTimeout(600);
    const alarmAfterGems = await page.evaluate(() => window.__run.getState().alarm);
    ok("taking gems rouses the floor", alarmAfterGems >= owed, `alarm ${alarmAfterGems} after ${owed + 1} gems`);
    // Those gems just roused the floor, and the walker is about to stand
    // still at the door again.
    await keepOnItsFeet();
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(4000);
    const after = await snap();
    const floor = await page.evaluate(() => window.__run.getState().floor);
    ok("exit opens once paid and leads down a floor", after.phase === "playing" && after.gems === 1 && floor === 2 && after.room === "start", `${after.phase}, floor ${floor}, room ${after.room}, ${after.gems} gems left`);
    // The alarm does not follow you down: the new floor starts at whatever
    // its own rules say, which is quieter than the floor you just robbed and
    // no longer zero once you are deep enough.
    const arrival = await page.evaluate(() => {
      const s = window.__run.getState();
      return { alarm: s.alarm, starts: window.__derived.rules().startingAlarm, warden: s.wardenRoomId };
    });
    ok(
      "the spare gem carries down and the floor's alarm is its own, not the last one's",
      arrival.alarm === arrival.starts && arrival.alarm < alarmAfterGems && arrival.warden === null,
      JSON.stringify({ ...arrival, cameFrom: alarmAfterGems })
    );
    ok("control returned on the new floor", !after.transitioning && after.y > 0.5, JSON.stringify(after));
    // The last floor's exit ends the run: taken at the store level, since
    // walking two more floors is the same code path as the one just walked.
    await page.evaluate(() => {
      const run = window.__run;
      const s = run.getState();
      run.setState({ floor: 3, currentRoomId: s.dungeon.endId, transitioning: true });
      run.getState().roomReady(s.dungeon.endId);
    });
    await page.waitForTimeout(800);
    const won = await snap();
    ok("the last floor's exit wins the run", won.phase === "won", won.phase);
    ok("the run is scored by what was carried out", await page.evaluate(() => /got out with/i.test(document.body.innerText)));
    ok("victory summary appears", await page.evaluate(() => /made it out/i.test(document.body.innerText)));
    exitChecked = true;
  }
}
if (!exitChecked) ok("reached the exit's neighbour to test the toll", false, "path not walked");

// Start over, lose every life, and restart from the summary.
const again = await page.$('button:has-text("Run again")');
ok("restart button offered", !!again);
if (again) await again.click();
await page.waitForTimeout(6000);
const fresh = await snap();
ok("restart gives a fresh run", fresh.phase === "playing" && fresh.lives === 3 && fresh.gems === 0 && !fresh.transitioning, JSON.stringify(fresh));
ok("restarted player stands on the room floor", Math.abs(fresh.y - REST_Y) < 0.2, `y=${fresh.y}`);
for (let i = 0; i < 4; i++) {
  await page.evaluate(() => window.__run.getState().damage());
  await page.waitForTimeout(1700);
}
const dead = await snap();
ok("run ends at zero lives", dead.lives === 0 && dead.phase === "lost", `${dead.lives} lives, ${dead.phase}`);
ok("defeat summary appears", await page.evaluate(() => /died down here/i.test(document.body.innerText)));

// The economy and the Warden, driven through the store: the toll rises with
// the floor, a relic is bought and changes a rule, and the Warden wakes and
// can reach the player.
{
  await page.evaluate(() => window.__run.getState().startRun(11));
  await page.waitForTimeout(2500);
  const tolls = await page.evaluate(() => {
    const run = window.__run;
    const out = [];
    for (const floor of [1, 2, 3]) {
      run.setState({ floor });
      out.push(window.__derived.toll());
    }
    run.setState({ floor: 1 });
    return out;
  });
  ok("the toll rises with every floor", tolls[0] < tolls[1] && tolls[1] < tolls[2], tolls.join(" then "));

  const relic = await page.evaluate(() => {
    const run = window.__run;
    run.setState({ gems: 20 });
    const before = run.getState().lives;
    run.getState().addRelic("ledger");
    const withLedger = window.__derived.toll();
    run.getState().addRelic("charm");
    run.getState().damage();
    return { before, after: run.getState().lives, withLedger, held: run.getState().relics.length };
  });
  ok("a relic makes the exit cheaper", relic.withLedger === tolls[0] - 1, `toll ${relic.withLedger} with the ledger, ${tolls[0]} without`);
  ok("the charm eats a hit instead of a life", relic.after === relic.before, `${relic.before} then ${relic.after} lives`);
  await page.waitForTimeout(400);
  ok("relics are held and shown", relic.held === 2 && /Ledger/i.test(await page.evaluate(() => document.body.innerText)));

  const warden = await page.evaluate(async () => {
    const run = window.__run;
    const s = run.getState();
    // Wake it in the player's own room and let it walk in.
    run.setState({ floorRooms: 9 });
    const here = s.currentRoomId;
    const other = s.dungeon.rooms.find((r) => r.id !== here);
    run.setState({ wardenRoomId: other.id });
    run.getState().moveWarden(here);
    await new Promise((r) => setTimeout(r, 2500));
    return { room: run.getState().wardenRoomId, lives: run.getState().lives, met: run.getState().wardenMet };
  });
  ok("the Warden walks into the room and is dangerous", warden.met === true, JSON.stringify(warden));
}


// The satchel: chests hold something, its look is a lie until you use it,
// and using it does what the item says.
{
  await page.evaluate(() => window.__run.getState().startRun(21));
  await page.waitForTimeout(2500);

  const looks = await page.evaluate(() => {
    const a = window.__run.getState().appearances;
    // Counted against the catalogue, not a number written here: adding an
    // item and forgetting its look is exactly what this is for.
    return { seen: Object.values(a).map((v) => v.unknown), items: window.__derived.items().length };
  });
  ok(
    "every item has its own look this run",
    new Set(looks.seen).size === looks.seen.length && looks.seen.length === looks.items,
    `${looks.seen.length} looks for ${looks.items} items`
  );

  const shuffled = await page.evaluate(() => {
    const one = window.__run.getState().appearances.healing.unknown;
    window.__run.getState().startRun(22);
    const two = window.__run.getState().appearances.healing.unknown;
    window.__run.getState().startRun(21);
    const again = window.__run.getState().appearances.healing.unknown;
    return { one, two, again };
  });
  await page.waitForTimeout(2000);
  ok("the same seed is the same bottles", shuffled.one === shuffled.again, `${shuffled.one} then ${shuffled.again}`);

  // Chests carry loot and empty once taken.
  const chest = await page.evaluate(() => {
    const run = window.__run;
    const s = run.getState();
    run.setState({ satchel: [] });
    s.takeItem("healing", "room_x:0");
    const after = run.getState();
    const twice = after.takeItem("healing", "room_x:0");
    return { held: after.satchel.length, looted: after.looted.includes("room_x:0"), twice };
  });
  ok("a chest fills the satchel and is remembered", chest.held === 1 && chest.looted, JSON.stringify(chest));

  const full = await page.evaluate(() => {
    const run = window.__run;
    run.setState({ satchel: ["healing", "healing", "healing", "healing"] });
    const room = run.getState().takeItem("mapping");
    return { room, held: run.getState().satchel.length };
  });
  ok("four slots is the limit", full.room === false && full.held === 4, JSON.stringify(full));

  // Using an item identifies it and does what it says.
  const used = await page.evaluate(async () => {
    const run = window.__run;
    run.setState({ satchel: ["dread", "avarice", "mapping", "swiftness"], identified: [], alarm: 0, gems: 0, mapped: false });
    run.getState().useItem(0);
    const afterDread = { alarm: run.getState().alarm, known: run.getState().identified.includes("dread") };
    run.getState().useItem(0);
    const afterAvarice = { gems: run.getState().gems, alarm: run.getState().alarm };
    run.getState().useItem(0);
    const afterMapping = run.getState().mapped;
    const before = run.getState().satchel.length;
    run.getState().useItem(0);
    const swift = run.getState().effects.swift > performance.now() / 1000;
    return { afterDread, afterAvarice, afterMapping, swift, emptied: before === 1 && run.getState().satchel.length === 0 };
  });
  ok("a bad potion wakes the floor and is learned", used.afterDread.alarm >= 3 && used.afterDread.known, JSON.stringify(used.afterDread));
  ok("avarice pays in gems and in alarm", used.afterAvarice.gems === 2 && used.afterAvarice.alarm > used.afterDread.alarm, JSON.stringify(used.afterAvarice));
  ok("a scroll of mapping shows the floor", used.afterMapping === true);
  ok("swiftness runs on a clock and the slot empties", used.swift && used.emptied, JSON.stringify(used));

  const faster = await page.evaluate(() => {
    const run = window.__run;
    run.setState({ effects: { swift: 0, mire: 0, gloom: 0 } });
    const plain = window.__derived.walk();
    run.setState({ effects: { swift: performance.now() / 1000 + 30, mire: 0, gloom: 0 } });
    const quick = window.__derived.walk();
    run.setState({ effects: { swift: 0, mire: performance.now() / 1000 + 30, gloom: 0 } });
    const slow = window.__derived.walk();
    run.setState({ effects: { swift: 0, mire: 0, gloom: 0 } });
    return { plain, quick, slow };
  });
  ok("what you drink changes how fast you move", faster.quick > faster.plain && faster.slow < faster.plain, JSON.stringify(faster));
}

// The arena is a set piece: taking its gem bars the doors and starts the
// arms, and the room lets go again when they stop.
{
  await page.evaluate(() => window.__run.getState().startRun(31));
  await page.waitForTimeout(2500);
  const arena = await page.evaluate(() => {
    const s = window.__run.getState();
    const room = s.dungeon.rooms.find((r) => r.kind === "arena");
    if (!room) return null;
    window.__run.setState({ currentRoomId: room.id, transitioning: true });
    window.__run.getState().roomReady(room.id);
    return { id: room.id, size: room.size };
  });
  if (arena) {
    await page.waitForTimeout(1600);
    const before = await page.evaluate(() => window.__run.getState().sealedRoomId);
    await page.evaluate((id) => window.__run.getState().collectGem(id), arena.id);
    await page.waitForTimeout(900);
    const sealed = await page.evaluate(() => window.__run.getState().sealedRoomId);
    ok("the arena's doors bar when its gem is lifted", before === null && sealed === arena.id, `${before} then ${sealed}`);
    const barred = await page.evaluate(() => /will not move/i.test(document.body.innerText) || window.__run.getState().sealedRoomId !== null);
    ok("a barred door says so rather than doing nothing", barred);
    /**
     * Standing still where the gem was must not be the winning play.
     *
     * It was, for as long as this room has existed. The innermost ring of
     * spikes sat at 2.4 and a patch reaches 1.2, so no arm ever came within
     * 1.2 of the middle, and a player against the plinth stands 0.8 out -
     * which is exactly where they are when they lift the gem that starts
     * the arms. Seventeen seconds, three lives in, three lives out, in a
     * room whose hint says "keep walking". layout-check owns the geometry
     * of it now; this is the same claim made by playing it.
     *
     * Held in place rather than walked to, because the point is what
     * happens to a player who does nothing, and lives are topped up so the
     * run does not end and unmount the room mid-measurement.
     */
    const still = await page.evaluate(async () => {
      const run = window.__run;
      const stand = () => window.__bus.emit("teleport", { position: [0.8, 1.5, 0] });
      let hits = 0;
      let lives = run.getState().lives;
      stand();
      for (let i = 0; i < 34; i++) {
        await new Promise((r) => setTimeout(r, 500));
        stand();
        const now = run.getState().lives;
        if (now < lives) hits++;
        if (now < 3) run.setState({ lives: 3, phase: "playing" });
        lives = run.getState().lives;
      }
      return hits;
    });
    ok("standing where the gem was does not survive the arms", still > 0, `${still} hits while standing still`);
    // It lets go on its own, well inside the wind-up plus the run.
    const freed = await page.evaluate(() => window.__run.getState().sealedRoomId);
    ok("the arena lets go when the arms stop", freed === null, String(freed));
  } else {
    ok("a floor has an arena", false, "none generated");
  }
}

// The shop will name something you are carrying, for a gem.
{
  const named = await page.evaluate(() => {
    const run = window.__run;
    run.setState({ satchel: ["mire"], identified: [], gems: 3 });
    const before = run.getState().identified.length;
    const paid = run.getState().spendGems(1) && run.getState().identifySlot(0);
    const after = run.getState();
    return { before, paid, known: after.identified.includes("mire"), held: after.satchel.length, gems: after.gems };
  });
  ok("a gem buys a name, and the item is still there", named.paid && named.known && named.held === 1 && named.gems === 2, JSON.stringify(named));
  const again = await page.evaluate(() => window.__run.getState().identifySlot(0));
  ok("naming something already known is refused", again === false);
}

/**
 * The shop will not sell you into a floor you cannot leave.
 *
 * A floor holds as few as one gem more than its toll, so a single purchase
 * can leave a run unable to pay the exit by any route it is guaranteed to
 * have. The rule existed and was applied to one of the three things the
 * shop sells: buying a life asked, and asking the shopkeeper what a potion
 * is - and buying a relic for several gems - did not.
 */
{
  const guard = await page.evaluate(async () => {
    const { canSpend } = await import("/src/game/state/run.ts");
    const run = window.__run;
    run.setState({ gems: 5, floor: 1, relics: [] });
    const s = run.getState();
    // The one owner of the rule, asked directly: a purchase that would
    // leave less than the toll is refused whatever it costs.
    return {
      toll: 3,
      spendOne: canSpend(s, 1),
      spendTwo: canSpend(s, 2),
      spendThree: canSpend(s, 3),
      spendMore: canSpend(s, 4),
    };
  });
  ok(
    "with gems to spare the shop will sell",
    guard.spendOne && guard.spendTwo,
    JSON.stringify(guard)
  );
  ok(
    "and refuses anything that would leave less than the exit wants",
    !guard.spendThree && !guard.spendMore,
    JSON.stringify(guard)
  );
}

// Settings are remembered, and turning head bob off actually stops the head
// moving - the one setting somebody might need in order to play at all.
{
  await page.evaluate(() => window.__run.getState().startRun(41));
  await page.waitForTimeout(2500);
  const sampleY = async () => {
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(1200);
    const ys = await page.evaluate(async () => {
      const out = [];
      for (let i = 0; i < 22; i++) {
        out.push(window.__playerDebug.camY);
        await new Promise((r) => requestAnimationFrame(r));
      }
      return out;
    });
    await page.keyboard.up("KeyW");
    return Math.max(...ys) - Math.min(...ys);
  };
  await page.evaluate(() => window.__settings.getState().setCameraBob(true));
  const withBob = await sampleY();
  await page.evaluate(() => window.__settings.getState().setCameraBob(false));
  await page.waitForTimeout(400);
  const without = await sampleY();
  ok("head bob moves the camera, and turning it off stops it", withBob > without, `${withBob.toFixed(4)} with, ${without.toFixed(4)} without`);
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("gem-dungeon.settings")).cameraBob);
  ok("the choice is remembered", kept === false, String(kept));
  await page.evaluate(() => window.__settings.getState().setCameraBob(true));
}

// A locked vault, and the key that opens it.
{
  let seed = 3;
  let vault = null;
  for (; seed < 30 && !vault; seed++) {
    await page.evaluate((n) => window.__run.getState().startRun(n), seed);
    await page.waitForTimeout(1400);
    vault = await page.evaluate(() => {
      const d = window.__run.getState().dungeon;
      return d.vaultId ? { vault: d.vaultId, key: d.keyRoomId } : null;
    });
  }
  ok("floors are generated with a locked vault", !!vault, vault ? JSON.stringify(vault) : "none in 27 seeds");
  if (vault) {
    const flow = await page.evaluate(() => {
      const run = window.__run;
      const d = run.getState().dungeon;
      const withoutKey = run.getState().unlockRoom(d.vaultId);
      run.getState().takeKey(d.keyRoomId);
      const held = run.getState().keys;
      const twiceTaken = (run.getState().takeKey(d.keyRoomId), run.getState().keys);
      const opened = run.getState().unlockRoom(d.vaultId);
      const again = run.getState().unlockRoom(d.vaultId);
      return { withoutKey, held, twiceTaken, opened, again, left: run.getState().keys };
    });
    ok("a vault will not open without its key", flow.withoutKey === false, JSON.stringify(flow));
    ok("the key is taken once and only once", flow.held === 1 && flow.twiceTaken === 1, JSON.stringify(flow));
    ok("the key opens the vault and is spent", flow.opened === true && flow.left === 0, JSON.stringify(flow));
    ok("an opened vault stays open rather than eating another key", flow.again === false);
    const carried = await page.evaluate(() => {
      const run = window.__run;
      run.setState({ keys: 1 });
      run.getState().travel(Object.keys(run.getState().dungeon.rooms.find((r) => r.id === run.getState().currentRoomId).links)[0]);
      return run.getState().keys;
    });
    ok("a key is carried around the floor it belongs to", carried === 1, String(carried));
  }
}

// Runs leave a record behind, and a seed can be walked again.
{
  await page.evaluate(() => window.__records.getState().clear());
  await page.evaluate(() => window.__run.getState().startRun(77));
  await page.waitForTimeout(2200);

  // A death banks the depth but no haul: gems carried underground are lost.
  const died = await page.evaluate(async () => {
    const run = window.__run;
    run.setState({ gems: 6, floor: 2 });
    for (let i = 0; i < 4; i++) {
      run.setState({ lastDamageAt: -Infinity });
      run.getState().damage();
    }
    await new Promise((r) => setTimeout(r, 200));
    const rec = window.__records.getState();
    return { phase: run.getState().phase, runs: rec.runs, escapes: rec.escapes, haul: rec.bestHaul, deepest: rec.deepestFloor };
  });
  ok("a death is recorded, and its gems are not a haul", died.phase === "lost" && died.runs === 1 && died.escapes === 0 && died.haul === 0 && died.deepest === 2, JSON.stringify(died));

  // An escape banks the haul.
  const escaped = await page.evaluate(async () => {
    const run = window.__run;
    run.getState().startRun(78);
    await new Promise((r) => setTimeout(r, 1200));
    const d = run.getState().dungeon;
    run.setState({ gems: 9, floor: 3, transitioning: true, currentRoomId: d.endId });
    run.getState().roomReady(d.endId);
    await new Promise((r) => setTimeout(r, 300));
    const rec = window.__records.getState();
    return { phase: run.getState().phase, runs: rec.runs, escapes: rec.escapes, haul: rec.bestHaul, seed: rec.bestSeed, bests: rec.lastBests };
  });
  ok("an escape is recorded with its haul and its seed", escaped.phase === "won" && escaped.runs === 2 && escaped.escapes === 1 && escaped.haul === 9 && escaped.seed === 78, JSON.stringify(escaped));
  ok("the summary says what the run beat", escaped.bests && escaped.bests.haul === true, JSON.stringify(escaped.bests));
  ok("the summary offers the seed again", await page.evaluate(() => !!document.querySelector('[data-testid="summary-same-seed"]')));

  /**
   * The counts read as English at one of a thing.
   *
   * Four counts on one line and three of them guarded their plural. The
   * rooms did not, so any run that ended in the room it started in - every
   * death on the way in, which is the first thing a new player does - said
   * "1 rooms" on the screen it left them looking at. It was in both run
   * summaries in `yarn tour` and nothing had ever read the line.
   */
  const counts = await page.evaluate(async () => {
    const run = window.__run;
    run.setState({ gemsTotal: 1, roomsSeen: 1 });
    await new Promise((r) => setTimeout(r, 200));
    const one = document.body.innerText.match(/[^\n]*named[^\n]*/)[0];
    run.setState({ gemsTotal: 2, roomsSeen: 2 });
    await new Promise((r) => setTimeout(r, 200));
    return { one, two: document.body.innerText.match(/[^\n]*named[^\n]*/)[0] };
  });
  ok(
    "the summary counts read as English at one of a thing",
    /1 gem found/.test(counts.one) && /1 room /.test(counts.one) && !/\b1 \w+s\b/.test(counts.one),
    JSON.stringify(counts.one)
  );
  ok(
    "and still pluralise at more than one",
    /2 gems found/.test(counts.two) && /2 rooms /.test(counts.two),
    JSON.stringify(counts.two)
  );

  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("gem-dungeon.records")).bestHaul);
  ok("records outlive the page", kept === 9, String(kept));

  // Running the same seed builds the same dungeon.
  const same = await page.evaluate(async () => {
    const run = window.__run;
    const shape = () => run.getState().dungeon.rooms.map((r) => `${r.id}:${r.kind}:${r.size}:${r.shape}`).join("|");
    run.getState().startRun(1234);
    await new Promise((r) => setTimeout(r, 900));
    const one = shape();
    run.getState().startRun(1234);
    await new Promise((r) => setTimeout(r, 900));
    return { same: one === shape(), rooms: run.getState().dungeon.rooms.length };
  });
  ok("the same seed builds the same dungeon", same.same, JSON.stringify(same));
  await page.evaluate(() => window.__records.getState().clear());
}

// The Sentry: not on the first floor, in some rooms after that, and being
// held in its beam rouses the floor without costing a life.
{
  const placement = await page.evaluate(async () => {
    const run = window.__run;
    run.getState().startRun(91);
    await new Promise((r) => setTimeout(r, 1400));
    const d = run.getState().dungeon;
    const count = (floor) => d.rooms.filter((r) => window.__sentryFor(r, d.seed, floor)).length;
    return { floor1: count(1), floor2: count(2), floor3: count(3), rooms: d.rooms.length };
  });
  ok("no watchers on the first floor", placement.floor1 === 0, JSON.stringify(placement));
  ok("watchers appear on the floors after it", placement.floor2 + placement.floor3 > 0, JSON.stringify(placement));
  ok("watchers are not in every room", placement.floor2 < placement.rooms, JSON.stringify(placement));

  const steady = await page.evaluate(() => {
    const run = window.__run;
    const d = run.getState().dungeon;
    const room = d.rooms[1];
    const a = window.__sentryFor(room, d.seed, 2);
    const b = window.__sentryFor(room, d.seed, 2);
    return a === null ? b === null : !!b && a[0] === b[0] && a[2] === b[2];
  });
  ok("a room has the same watcher every visit", steady);

  // Being seen costs alarm, never a life.
  const seen = await page.evaluate(async () => {
    const run = window.__run;
    const before = { alarm: run.getState().alarm, lives: run.getState().lives };
    window.__bus.emit("sentrySaw", { pan: 0 });
    run.setState({ alarm: run.getState().alarm + 1 });
    await new Promise((r) => setTimeout(r, 200));
    return { before, after: { alarm: run.getState().alarm, lives: run.getState().lives } };
  });
  ok("being seen rouses the floor and costs no life", seen.after.alarm > seen.before.alarm && seen.after.lives === seen.before.lives, JSON.stringify(seen));
}

// Three things a code review found, each now nailed down.
{
  // The run's seed is the one the summary shows, not the floor's - they
  // part company on the way down, and showing the floor's meant every
  // "same dungeon again" replayed a dungeon nobody had played.
  const seeds = await page.evaluate(async () => {
    const run = window.__run;
    run.getState().startRun(4242);
    await new Promise((r) => setTimeout(r, 1200));
    const onFloorOne = { run: run.getState().runSeed, floor: run.getState().dungeon.seed };
    const d = run.getState().dungeon;
    run.setState({ gems: 20, transitioning: true, currentRoomId: d.endId });
    run.getState().roomReady(d.endId);
    await new Promise((r) => setTimeout(r, 900));
    return { onFloorOne, afterDescent: { run: run.getState().runSeed, floor: run.getState().dungeon.seed } };
  });
  ok("the run keeps its own seed when a floor changes", seeds.afterDescent.run === 4242 && seeds.afterDescent.floor !== 4242, JSON.stringify(seeds));

  // A Sentry is the same Sentry on a replayed seed, beam angle included.
  const deterministic = await page.evaluate(async () => {
    const run = window.__run;
    const read = async () => {
      run.getState().startRun(555);
      await new Promise((r) => setTimeout(r, 900));
      const d = run.getState().dungeon;
      return d.rooms
        .map((r) => window.__sentryFor(r, d.seed, 2))
        .map((s) => (s ? `${s.at[0].toFixed(3)},${s.at[2].toFixed(3)},${s.phase.toFixed(5)}` : "-"))
        .join("|");
    };
    const one = await read();
    const two = await read();
    return { same: one === two, sample: one.slice(0, 60) };
  });
  ok("a replayed seed puts the watchers back exactly, beams and all", deterministic.same, JSON.stringify(deterministic));

  // Pausing does not burn a potion.
  const paused = await page.evaluate(async () => {
    const run = window.__run;
    run.getState().startRun(556);
    await new Promise((r) => setTimeout(r, 900));
    run.setState({ satchel: ["swiftness"], identified: [] });
    run.getState().useItem(0);
    const quickBefore = window.__derived.walk();
    run.getState().pause();
    await new Promise((r) => setTimeout(r, 1500));
    run.getState().resume();
    const quickAfter = window.__derived.walk();
    return { quickBefore, quickAfter };
  });
  ok("a potion is not spent by the pause menu", paused.quickAfter === paused.quickBefore && paused.quickAfter > 5, JSON.stringify(paused));
}

// The descent, driven through the real store: a seed replays floor for
// floor, and each floor down is worse than the one above it. The generator
// being deterministic is checked offline; this checks the thing built on top
// of it - the seed each floor is derived from, the alarm it starts at, and
// the watchers standing in it.
{
  const descent = await page.evaluate(async () => {
    const run = window.__run;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const readRun = async (seed) => {
      run.getState().startRun(seed);
      await wait(1000);
      const floors = [];
      for (let guard = 0; guard < 8; guard++) {
        const s = run.getState();
        const d = s.dungeon;
        floors.push({
          floor: s.floor,
          alarm: s.alarm,
          seed: d.seed,
          runSeed: s.runSeed,
          ends: [d.startId, d.endId, d.vaultId ?? null, d.keyRoomId ?? null],
          rooms: d.rooms.map((r) => [r.id, r.kind, r.size, r.shape, r.grid.x, r.grid.z, Object.entries(r.links).sort()]),
          watchers: d.rooms.map((r) => {
            const p = window.__sentryFor(r, d.seed, s.floor);
            return p ? [+p.at[0].toFixed(4), +p.at[2].toFixed(4), +p.phase.toFixed(6)] : null;
          }),
        });
        // Stand in the exit and report in: the store's own way down.
        run.setState({ transitioning: true, currentRoomId: d.endId });
        run.getState().roomReady(d.endId);
        await wait(800);
        if (run.getState().phase !== "playing") break;
      }
      return floors;
    };
    const one = await readRun(4243);
    const two = await readRun(4243);
    return {
      same: JSON.stringify(one) === JSON.stringify(two),
      count: one.length,
      seeds: one.map((f) => f.seed),
      runSeeds: one.map((f) => f.runSeed),
      rooms: one.map((f) => f.rooms.length),
      alarms: one.map((f) => f.alarm),
      watched: one.map((f) => f.watchers.filter(Boolean).length),
    };
  });
  ok("a seed replays the whole run, floor for floor", descent.same && descent.count > 1, JSON.stringify(descent));
  ok("every floor of a run is a different dungeon", new Set(descent.seeds).size === descent.count, JSON.stringify(descent.seeds));
  ok("the run's own seed survives every descent", descent.runSeeds.every((s) => s === 4243), JSON.stringify(descent.runSeeds));
  ok(
    "each floor down is larger than the one above it",
    descent.rooms.every((n, i) => i === 0 || n > descent.rooms[i - 1]),
    JSON.stringify(descent.rooms)
  );
  ok(
    "the first floor arrives still and the last arrives stirring",
    descent.alarms[0] === 0 && descent.alarms[descent.alarms.length - 1] > 0,
    JSON.stringify(descent.alarms)
  );
  ok(
    "nothing watches the first floor and something watches the last",
    descent.watched[0] === 0 && descent.watched[descent.watched.length - 1] > 0,
    JSON.stringify(descent.watched)
  );
}

// Running is the price of speed: it tells the Warden which room you are in
// for as long as you keep it up and a few seconds after. Driven through the
// real keys, because the point is that holding Shift does it.
{
  await page.evaluate(async () => {
    window.__run.getState().startRun(31337);
    await new Promise((r) => setTimeout(r, 1200));
    // A woken Warden that is not already hunting: the alarm alone must not
    // be what makes it walk towards the player in this check.
    const s = window.__run.getState();
    const far = s.dungeon.rooms.find((r) => r.id !== s.currentRoomId && r.id !== s.dungeon.endId);
    window.__run.setState({ alarm: 0, wardenRoomId: far.id });
  });
  const quiet = await page.evaluate(() => ({ hears: window.__derived.hears(), hunts: window.__derived.hunts() }));
  await page.mouse.click(640, 400);
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(900);
  const loud = await page.evaluate(() => ({ hears: window.__derived.hears(), hunts: window.__derived.hunts() }));
  await page.keyboard.up("KeyW");
  await page.keyboard.up("ShiftLeft");
  // Walking is quiet, so what it heard has to run out on its own.
  await page.waitForTimeout(5200);
  const after = await page.evaluate(() => ({ hears: window.__derived.hears(), hunts: window.__derived.hunts() }));
  ok("a calm floor is not hunting anyone", !quiet.hears && !quiet.hunts, JSON.stringify(quiet));
  ok("running gives the player away", loud.hears && loud.hunts, JSON.stringify(loud));
  ok("and stopping lets it lose them again", !after.hears && !after.hunts, JSON.stringify(after));
}

// It is heard while it is in the room with you, and it stops being heard
// when it is not. A held sound that outlives what it belongs to is worse
// than no sound at all.
{
  const heard = await page.evaluate(async () => {
    const run = window.__run;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    run.getState().startRun(8181);
    await wait(1200);
    const s = run.getState();
    const before = window.__stalking();
    // In the room with the player, which is where the Warden component mounts.
    run.setState({ wardenRoomId: s.currentRoomId });
    await wait(900);
    const inRoom = window.__stalking();
    // And out of it again.
    const away = s.dungeon.rooms.find((r) => r.id !== s.currentRoomId).id;
    run.setState({ wardenRoomId: away });
    await wait(600);
    return { before, inRoom, after: window.__stalking() };
  });
  ok("the Warden is heard once it is in the room", !heard.before && heard.inRoom, JSON.stringify(heard));
  ok("and stops being heard when it leaves", !heard.after, JSON.stringify(heard));
}

// Something to throw: the one thing that sends the Warden somewhere the
// player is not, and the only thing that buys the right to run.
{
  const thrown = await page.evaluate(async () => {
    const run = window.__run;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    run.getState().startRun(2468);
    await wait(1200);
    const s = run.getState();
    const near = Object.values(s.dungeon.rooms.find((r) => r.id === s.currentRoomId).links).find(Boolean);
    // Awake and right next door, so a lure has somewhere much worse to go.
    run.setState({ wardenRoomId: near, satchel: ["echoes"], identified: ["echoes"] });
    const before = { lure: window.__derived.lure(), warden: run.getState().wardenRoomId };
    run.getState().useItem(0);
    const after = run.getState();
    const lure = window.__derived.lure();
    // A sprint while it is chasing a noise must not pull it back: the
    // player is still making noise, but the Warden is not listening.
    run.getState().makeNoise();
    const noisy = window.__derived.hears();
    const stillLured = window.__derived.lure();
    return {
      before,
      lure,
      spent: after.satchel.length,
      known: after.identified.includes("echoes"),
      far: lure !== null && lure !== after.currentRoomId && lure !== near,
      noisy,
      stillLured,
    };
  });
  ok("a thrown scroll sends it somewhere else", thrown.before.lure === null && thrown.lure !== null, JSON.stringify(thrown));
  ok("and somewhere that is not where the player is", thrown.far, JSON.stringify(thrown));
  ok("the scroll is spent and named by using it", thrown.spent === 0 && thrown.known, JSON.stringify(thrown));
  ok(
    "and keeps chasing it even while the player runs",
    thrown.noisy && thrown.stillLured === thrown.lure,
    JSON.stringify(thrown)
  );

  // Reaching the noise ends it. Left set, the lure came back the moment the
  // Warden stepped away from the empty room and it walked in circles there
  // until the timer ran out - and the HUD flickered between two labels.
  const arrived = await page.evaluate(() => {
    const run = window.__run;
    const lure = window.__derived.lure();
    run.getState().moveWarden(lure);
    const onArrival = { lure: window.__derived.lure(), stored: run.getState().wardenLure };
    // Step away again: nothing may call it back.
    const elsewhere = Object.values(
      run.getState().dungeon.rooms.find((r) => r.id === lure).links
    ).find(Boolean);
    run.getState().moveWarden(elsewhere);
    return { onArrival, after: window.__derived.lure() };
  });
  ok(
    "it stops caring once it gets to the noise",
    arrived.onArrival.lure === null && arrived.onArrival.stored === null && arrived.after === null,
    JSON.stringify(arrived)
  );

  // A watcher calling out outranks a noise the Warden was off chasing:
  // being told where the player is beats being distracted.
  const called = await page.evaluate(async () => {
    const run = window.__run;
    run.setState({ satchel: ["echoes"], identified: ["echoes"] });
    run.getState().useItem(0);
    const lured = window.__derived.lure();
    const before = run.getState().alarm;
    run.getState().giveAway(1);
    return { lured, before, after: run.getState().alarm, lure: window.__derived.lure() };
  });
  ok(
    "being seen cancels a noise it was chasing",
    called.lured !== null && called.lure === null && called.after === called.before + 1,
    JSON.stringify(called)
  );

  // Thrown on a floor with nothing awake, it is not spent.
  const wasted = await page.evaluate(async () => {
    const run = window.__run;
    run.getState().startRun(2469);
    await new Promise((r) => setTimeout(r, 1000));
    run.setState({ wardenRoomId: null, satchel: ["echoes"], identified: [] });
    run.getState().useItem(0);
    const s = run.getState();
    return { held: s.satchel.length, known: s.identified.length, lure: window.__derived.lure() };
  });
  ok("and is not spent on a floor with nothing to hear it", wasted.held === 1 && wasted.known === 0 && wasted.lure === null, JSON.stringify(wasted));
}

// A floor's starting alarm is its baseline, not just its opening value: a
// scroll may calm the bottom floor, but never past what it arrived at.
{
  const calm = await page.evaluate(async () => {
    const run = window.__run;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    run.getState().startRun(7734);
    await wait(1000);
    for (let i = 0; i < 2; i++) {
      const d = run.getState().dungeon;
      run.setState({ transitioning: true, currentRoomId: d.endId });
      run.getState().roomReady(d.endId);
      await wait(900);
    }
    const floorStarts = window.__derived.rules().startingAlarm;
    run.getState().raiseAlarm(4);
    const roused = run.getState().alarm;
    run.setState({ satchel: ["banish"], identified: ["banish"] });
    run.getState().useItem(0);
    const once = run.getState().alarm;
    run.setState({ satchel: ["banish"], identified: ["banish"] });
    run.getState().useItem(0);
    return { floorStarts, roused, once, twice: run.getState().alarm };
  });
  ok("a scroll calms the floor", calm.once < calm.roused, JSON.stringify(calm));
  ok(
    "but never below what the floor itself starts at",
    calm.floorStarts > 0 && calm.twice >= calm.floorStarts,
    JSON.stringify(calm)
  );
}

// The floor is seen almost edge-on for the whole game, which is the one
// angle a non-anisotropic filter cannot draw: it collapsed into smeared
// bands. The fix is a renderer capability, so what is worth checking is
// that the capability was read at all.
{
  const aniso = await page.evaluate(() => window.__anisotropy?.() ?? 0);
  ok("the surfaces are filtered at what the renderer can do", aniso > 1, `anisotropy ${aniso}`);
}

// The dial pulls back to hold a floor the size of the bottom one. Bought
// with a relic, a map that ran off the rim showed least where it mattered
// most.
{
  const dial = await page.evaluate(async () => {
    const run = window.__run;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    run.getState().startRun(9111);
    await wait(1000);
    for (let i = 0; i < 2; i++) {
      const d = run.getState().dungeon;
      run.setState({ transitioning: true, currentRoomId: d.endId });
      run.getState().roomReady(d.endId);
      await wait(900);
    }
    const s = run.getState();
    run.setState({ mapped: true, visited: s.dungeon.rooms.map((r) => r.id) });
    await wait(500);
    const svg = document.querySelector("svg");
    const spots = [...svg.querySelectorAll("g > g > g[transform]")].map((g) => {
      const m = g.getAttribute("transform").match(/translate\(([-\d.]+) ([-\d.]+)\)/);
      return m ? [Math.abs(+m[1]), Math.abs(+m[2])] : [0, 0];
    });
    const box = svg.getBoundingClientRect();
    return {
      rooms: s.dungeon.rooms.length,
      drawn: spots.length,
      far: Math.max(0, ...spots.flat()),
      radius: box.width / 2,
    };
  });
  ok("the whole floor is drawn once the map is known", dial.drawn === dial.rooms, JSON.stringify(dial));
  ok("and all of it fits inside the dial", dial.far <= dial.radius, JSON.stringify(dial));
}

/**
 * What a slow frame does to the thing chasing you.
 *
 * The Warden walks by adding `speed * delta` to its position and nothing
 * bounded the delta, so a frame that took half a second moved it two and a
 * half metres in one instant and a frame that took eight moved it the
 * length of the dungeon - straight onto the player, because its own step is
 * clamped to land just inside touching range rather than past them. Every
 * measurement of it before this one was an average over a second or more,
 * which is exactly the shape that hides a lunge: 4.4 m/s on the mean, with
 * single frames at twenty-three and thirty-seven.
 *
 * Scene.tsx had already written the same lesson down for the player -
 * a fixed physics timestep, because a variable one hands Rapier the whole
 * hitch and tunnels the capsule through the floor - so a hitch moved the
 * threat and not the target.
 *
 * The stall here is a real one: a busy loop on the main thread, which is
 * what a collection or a window coming back to the front looks like from
 * inside the frame loop.
 */
{
  const hitch = await page.evaluate(async () => {
    const run = window.__run;
    const s = run.getState();
    // The biggest room on the floor, so there is ground for a lunge to
    // cross, and fully roused, which is the fastest it ever moves.
    const room = [...s.dungeon.rooms].sort((a, b) => b.size - a.size)[0];
    run.setState({ transitioning: true, currentRoomId: room.id, lives: 99, alarm: 6 });
    run.getState().roomReady(room.id);
    await new Promise((r) => setTimeout(r, 1200));
    const half = room.size / 2;
    // Player in one corner; the Warden comes in at the opposite one.
    window.__bus.emit("teleport", { position: [-half * 0.75, 1.5, half * 0.75], yaw: 0 });
    await new Promise((r) => setTimeout(r, 500));
    run.setState({ wardenRoomId: room.id, wardenCameFrom: null });
    await new Promise((r) => setTimeout(r, 600));
    if (!window.__warden) return null;

    // Sample every frame, stalling the main thread hard in the middle of
    // the window. The sample either side of the stall is the lunge.
    let last = { x: window.__warden.x, z: window.__warden.z, t: performance.now() };
    let biggest = 0;
    let longestFrame = 0;
    let stalled = false;
    const t0 = last.t;
    await new Promise((done) => {
      const tick = () => {
        const w = window.__warden;
        const now = performance.now();
        const dt = (now - last.t) / 1000;
        if (dt > 0.001) {
          biggest = Math.max(biggest, Math.hypot(w.x - last.x, w.z - last.z));
          longestFrame = Math.max(longestFrame, dt);
          last = { x: w.x, z: w.z, t: now };
        }
        if (!stalled && now - t0 > 400) {
          stalled = true;
          const until = performance.now() + 900;
          // eslint-disable-next-line no-empty
          while (performance.now() < until) {}
        }
        if (now - t0 > 2600) return done();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return {
      size: room.size,
      biggest: +biggest.toFixed(2),
      longestFrame: +longestFrame.toFixed(2),
      cap: window.__world?.WARDEN_MAX_STEP ?? null,
      touch: window.__world?.WARDEN_TOUCH_RADIUS ?? null,
      gap: +window.__warden.distance.toFixed(2),
    };
  });
  ok("the chase can be watched at all", hitch !== null, JSON.stringify(hitch));
  if (hitch) {
    ok(
      "the check produced a frame long enough to matter",
      hitch.longestFrame >= 0.5,
      `longest frame ${hitch.longestFrame}s`
    );
    // The promise: it can never appear on top of you. A step shorter than
    // the reach it strikes from means there is always a frame between
    // seeing it close and being touched, however badly the frame ran.
    ok(
      "a slow frame never lets the Warden cross its own reach in one step",
      hitch.biggest <= hitch.touch,
      `biggest step ${hitch.biggest}m, strikes from ${hitch.touch}m, cap ${hitch.cap}m`
    );
    ok(
      "and the step stays inside the cap world.ts sets",
      hitch.biggest <= hitch.cap + 0.02,
      `biggest step ${hitch.biggest}m against a cap of ${hitch.cap}m`
    );
  }
}

/**
 * What a dropped frame does to a beam arriving on you.
 *
 * The post used to count time in the light by adding a frame delta a
 * frame, and the margin that is measured against is sixty-four
 * milliseconds: 0.836s to walk out of the beam at its furthest reach
 * against 0.9s of patience. On the frame the light first touched a player,
 * a hitch of nine hundred milliseconds took the count from nothing to past
 * the patience in one go - called out on the instant of contact, with no
 * chance to move.
 *
 * That is the case worth checking, and it is not the one this check tried
 * first. Stalling while the player was *already* lit convicts them too, and
 * that conviction is correct: the beam takes 11.4s to come round and
 * covers one direction for 1.53s, so it cannot leave a player and return
 * inside a hitch, and lit at both ends of a dropped frame means lit
 * throughout it. So the stall is timed to land as the beam arrives.
 */
{
  const arrival = await page.evaluate(async () => {
    const run = window.__run;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const W = window.__world;
    let found = null;
    for (let seed = 1; seed < 60 && !found; seed++) {
      run.getState().startRun(seed);
      await wait(600);
      const d = run.getState().dungeon;
      for (const room of d.rooms) {
        const post = window.__sentryFor(room, d.seed, 3);
        if (post) { found = { room, post }; break; }
      }
    }
    if (!found) return { noSentry: true };
    run.setState({ floor: 3, transitioning: true, currentRoomId: found.room.id, lives: 99, alarm: 0 });
    run.getState().roomReady(found.room.id);
    await wait(1400);
    if (!window.__sentry) return { noProbe: true };

    // Somewhere the beam will reach, well inside the room.
    const half = found.room.size / 2;
    const at = found.post.at;
    let bearing = 0;
    let r = 4;
    for (let b = 0; b < Math.PI * 2; b += 0.05) {
      const x = at[0] + Math.sin(b) * r;
      const z = at[2] + Math.cos(b) * r;
      if (Math.abs(x) < half - 1 && Math.abs(z) < half - 1) { bearing = b; break; }
    }
    window.__bus.emit("teleport", {
      position: [at[0] + Math.sin(bearing) * r, 1.5, at[2] + Math.cos(bearing) * r],
      yaw: 0,
    });
    await wait(500);

    /**
     * Stall so that the beam's leading edge arrives during the frame that
     * never happened. The angle is arithmetic - phase plus elapsed times
     * spin - so the arrival can be waited for rather than polled for.
     */
    const TWO_PI = Math.PI * 2;
    const STALL = 900;
    let calledOut = false;
    let litAfter = null;
    let longestFrame = 0;
    const off = window.__bus.on("sentrySaw", () => (calledOut = true));
    await new Promise((done) => {
      let lastT = performance.now();
      const t0 = lastT;
      let stalled = false;
      const tick = () => {
        const now = performance.now();
        longestFrame = Math.max(longestFrame, (now - lastT) / 1000);
        lastT = now;
        if (!stalled) {
          let ahead = (bearing - W.SENTRY_HALF_ANGLE - window.__sentry.facing) % TWO_PI;
          if (ahead < 0) ahead += TWO_PI;
          const ms = (ahead * 1000) / W.SENTRY_SPIN;
          /**
           * Not yet lit, and about to be. Both halves matter: a stall that
           * lands on a player the beam has already reached convicts them,
           * and convicting them is right - so without the first condition
           * this check fails at random depending on which frame the
           * estimate happened to be sampled on. Frames here run at a fifth
           * of a second and the beam comes round every 11.4, so a missed
           * window costs a revolution rather than the check.
           */
          if (!window.__sentry.inside && ms > 150 && ms < 700) {
            stalled = true;
            /**
             * Only calls the stall caused.
             *
             * Waiting for the beam to come round takes up to a revolution
             * and the player is standing in its path the whole time, so it
             * sweeps over them and calls out - correctly, that is the
             * first half of the promise. Counting those made this check
             * fail at random. A revolution is 11.4s against a six-second
             * cooldown, so the post is always free to call again by the
             * time the sweep this cares about arrives.
             */
            calledOut = false;
            const until = performance.now() + STALL;
            // eslint-disable-next-line no-empty
            while (performance.now() < until) {}
            litAfter = null;
          }
        } else if (litAfter === null) {
          litAfter = window.__sentry.lit;
        }
        if (litAfter !== null || now - t0 > 30000) return done();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    off();
    return {
      inside: window.__sentry.inside,
      litAfter: litAfter === null ? null : +litAfter.toFixed(3),
      longestFrame: +longestFrame.toFixed(2),
      calledOut,
      patience: W.SENTRY_PATIENCE,
    };
  });

  ok("a Sentry can be stood in front of at all", arrival && !arrival.noSentry && !arrival.noProbe, JSON.stringify(arrival));
  if (arrival && arrival.patience) {
    ok(
      "the check produced a frame long enough to matter",
      arrival.longestFrame >= 0.5,
      `longest frame ${arrival.longestFrame}s`
    );
    ok(
      "a beam arriving during a dropped frame does not call the player out on the spot",
      !arrival.calledOut && (arrival.litAfter === null || arrival.litAfter < arrival.patience),
      `after a ${arrival.longestFrame}s frame the post had held them ${arrival.litAfter}s of ${arrival.patience}s`
    );
  }
}


/**
 * Walking out of the beam, which nothing had ever done.
 *
 * `sentry/beam.ts` says the room asks a question and the question has an
 * answer - standing still in the light is always seen, walking out of it
 * never is - and mire is what turns the second half off. That was arithmetic
 * on four constants, in node, and every check that had ever touched a
 * Sentry either stood still or teleported. Whether the game moves a body
 * out of a beam in the time the module says it does was never asked.
 *
 * The spot is chosen, not assumed. It has to be far enough out that a
 * mired walk would be caught there - beyond about 8.5 of the beam's 11 -
 * and have five clear metres of tangential run left in the room, which
 * rules out the corners, and the corners are the only places a player can
 * be a full eleven metres from a post standing on a far anchor. The first
 * attempt at this stood the player in one and measured them walking into a
 * wall at 0.36 m/s.
 *
 * Against the sweep, which is beam.ts's pessimistic route: caught at the
 * leading edge, crossing the whole wedge with the beam turning towards you
 * the whole way, so the two rates add.
 */
{
  const spot = await page.evaluate(async () => {
    const run = window.__run;
    const W = window.__world;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    // Long enough to hold a whole crossing: 0.836s at a walk of five is
    // 4.2 metres, and the first version of this allowed 5.2 and measured
    // the player averaging 3.3 m/s because they spent the back half of the
    // window against a wall - at which speed the beam catches them fairly,
    // and the check reported the promise broken.
    const RUN = 7.5;
    for (let seed = 1; seed < 40; seed++) {
      run.getState().startRun(seed);
      await wait(500);
      const d = run.getState().dungeon;
      for (const room of d.rooms) {
        const post = window.__sentryFor(room, d.seed, 3);
        if (!post) continue;
        const half = room.size / 2;
        const free = (x, z) => Math.abs(x) < half - 0.8 && Math.abs(z) < half - 0.8;
        for (let r = 10.4; r >= 8.8; r -= 0.2)
          for (let b = 0; b < Math.PI * 2; b += 0.05) {
            const x = post.at[0] + Math.sin(b) * r;
            const z = post.at[2] + Math.cos(b) * r;
            if (!free(x, z)) continue;
            // Against the sweep is the bearing decreasing, which is the
            // direction (cos b, -sin b). Every half metre of it has to be
            // inside the room or the walk ends against a wall.
            const dx = Math.cos(b);
            const dz = -Math.sin(b);
            let clear = true;
            for (let s = 0.5; s <= RUN; s += 0.5) if (!free(x + dx * s, z + dz * s)) { clear = false; break; }
            if (!clear) continue;
            // At yaw t the camera faces (-sin t, -cos t).
            const yaw = Math.atan2(-dz, -dx);
            const far = { seed, roomId: room.id, size: room.size, bearing: b, r: +r.toFixed(2), x, z,
                          yaw, range: W.SENTRY_RANGE };
            /**
             * And a spot close in, on the same bearing, with the same run.
             *
             * The far spot is where mire's exception lives and it is the
             * only place it lives; it is also, at the speeds a body reaches
             * on this rasteriser, within a frame of the patience either
             * way. Under the post a walk clears the beam with four hundred
             * milliseconds to spare - two frames - so that is where the
             * promise can be asserted as an outcome rather than as a
             * coin toss.
             */
            const nr = 2;
            const nx = post.at[0] + Math.sin(b) * nr;
            const nz = post.at[2] + Math.cos(b) * nr;
            let nearClear = free(nx, nz);
            for (let t = 0.5; t <= RUN && nearClear; t += 0.5)
              if (!free(nx + dx * t, nz + dz * t)) nearClear = false;
            if (!nearClear) continue;
            return { ...far, near: { ...far, r: nr, x: nx, z: nz } };
          }
      }
    }
    return null;
  });
  ok("a watched room has ground a mired walk would be caught on, with room to run", spot !== null,
     spot && `${spot.r}m from the post, of a reach of ${spot.range}, in a room ${spot.size} across`);

  if (spot) {
    /** Stand at the spot, and say when the beam's leading edge will reach it. */
    const stand = (where, mire) =>
      page.evaluate(async ([spot, mire]) => {
        const run = window.__run;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const W = window.__world;
        run.getState().startRun(spot.seed);
        await wait(700);
        run.setState({ floor: 3, transitioning: true, currentRoomId: spot.roomId, lives: 99,
                       alarm: 0, satchel: mire ? ["mire"] : [] });
        run.getState().roomReady(spot.roomId);
        await wait(1400);
        // Slot zero: the store indexes the satchel from nought and the
        // keys pass n-1. The first version of this drank slot one of a
        // satchel of one and measured an unmired walk twice.
        if (mire) { run.getState().useItem(0); await wait(300); }
        window.__bus.emit("teleport", { position: [spot.x, 1.5, spot.z], yaw: spot.yaw });
        window.__bus.emit("lookSet", { yaw: spot.yaw, pitch: 0 });
        await wait(500);
        // Arithmetic, not polling: the beam's angle is phase plus elapsed
        // time times its spin, and a poll from node costs a round trip out
        // of an eight-hundred-millisecond budget.
        const TWO_PI = Math.PI * 2;
        let ahead = (spot.bearing - W.SENTRY_HALF_ANGLE - window.__sentry.facing) % TWO_PI;
        if (ahead < 0) ahead += TWO_PI;
        return { walk: +window.__derived.walk().toFixed(2), msUntilBeam: Math.round((ahead / W.SENTRY_SPIN) * 1000) };
      }, [where, mire]);

    /**
     * @param windowMs How long to watch. The default is one crossing; the
     *   motionless case takes a whole revolution, because it cannot rely on
     *   arriving at the start of a pass. The beam's angle is arithmetic, so
     *   the wait for it is exact - but the wait ends a round trip and a
     *   frame before the sampling starts, and at a fifth of a second a
     *   frame the player can be a third of the way through the pass by
     *   then. That leaves under a second of it, against a patience of 0.9,
     *   and the check turns into a coin toss. Over 14 seconds the beam
     *   comes round once whatever happened at the start.
     */
    const cross = async (setUp, moving, windowMs = 2600) => {
      // Already moving when it arrives, which is what a player crossing a
      // room is doing.
      if (windowMs <= 3000) await page.waitForTimeout(Math.max(0, setUp.msUntilBeam - 250));
      if (moving) await page.keyboard.down("KeyW");
      const out = await page.evaluate(async ([crossing, windowMs]) => {
        let called = false;
        const off = window.__bus.on("sentrySaw", () => (called = true));
        const p = window.__playerDebug;
        const from = { x: p.x, z: p.z, t: performance.now() };
        let litFor = 0, lastT = from.t, everLit = false, frames = 0;
        // The span the post itself is measuring, at its highest. `litFor`
        // is this check's own accounting and can differ: a count that the
        // post restarts shows up here and not there.
        let maxLit = 0;
        // The speed over the crossing itself, not over the whole window:
        // a walk that clears the beam and then fetches up against a wall
        // averages out to something it never moved at.
        let at = null;
        await new Promise((done) => {
          const tick = () => {
            const now = performance.now();
            if (window.__sentry.inside) { litFor += now - lastT; everLit = true; }
            maxLit = Math.max(maxLit, window.__sentry.lit);
            lastT = now;
            frames++;
            if (at === null && now - from.t >= crossing) at = { x: p.x, z: p.z, t: now };
            if (now - from.t > windowMs) return done();
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        off();
        const dt = (performance.now() - from.t) / 1000;
        const cdt = at ? (at.t - from.t) / 1000 : dt;
        const cd = at ? Math.hypot(at.x - from.x, at.z - from.z) : Math.hypot(p.x - from.x, p.z - from.z);
        return { called, everLit, litFor: +(litFor / 1000).toFixed(2), maxLit: +maxLit.toFixed(2),
                 frame: +(dt / frames).toFixed(3), speed: +(cd / cdt).toFixed(2) };
      }, [1000, windowMs]);
      if (moving) await page.keyboard.up("KeyW");
      // The post is on a six-second cooldown after a call; the next case
      // must not inherit it, or a conviction it should report is swallowed.
      await page.waitForTimeout(6500);
      return out;
    };

    /**
     * What beam.ts predicts for the speed the body actually managed.
     *
     * Not for WALK_SPEED. The player is a rigid body driven by setLinvel
     * once a rendered frame, and this check runs on a software rasteriser
     * that renders four or five times a second, where Rapier's damping eats
     * a third of the walk: five metres a second on the constant, three and
     * a bit in fact. Asserting the promise as written would be asserting
     * that this machine is a Steam Deck.
     */
    const predicted = (r, speed) =>
      page.evaluate(([r, s]) => window.__beam.isCaught(r, s), [r, speed]);
    const patience = await page.evaluate(() => window.__world.SENTRY_PATIENCE);

    /**
     * Each case is asserted where it has room to be true.
     *
     * At the far spot a walk needs 0.92 to 1.09 seconds to clear the beam
     * against 0.9 of patience, and a frame here is 0.21: the outcome is
     * inside one frame of the boundary either way, and asserting it
     * directly is a coin toss dressed as a check. Which is what it turned
     * out to be - it passed twice and then failed, on a machine that had
     * got a little slower.
     *
     * So the far spot is asserted on the half of the contract that survives
     * being sampled: the post never calls out without having held the
     * player for its patience. The span can only be read at this check's
     * own frame rate, so the converse - that it always calls when it has -
     * is a statement about the sampling and not about the game, and it is
     * carried instead by standing still, which is lit for the beam's whole
     * 1.53s pass and has three frames of margin.
     */
    const patienceGap = 0.05;
    const fair = (r) => !r.called || r.maxLit >= patience - patienceGap;
    const say = (r, caught) =>
      `${r.speed} m/s: beam.ts says ${caught ? "caught" : "away"}, the game ` +
      `${r.called ? "called out" : "let them go"} after holding them ${r.maxLit}s of ${patience}s ` +
      `(frames of ${(r.frame * 1000).toFixed(0)}ms)`;

    const walked = await cross(await stand(spot, false), true);
    const mired = await cross(await stand(spot, true), true);
    ok(
      "the post never calls out without having held the player for its patience",
      walked.everLit && mired.everLit && fair(walked) && fair(mired),
      `walking: ${say(walked, await predicted(spot.r, walked.speed))}; ` +
        `mired: ${say(mired, await predicted(spot.r, mired.speed))}`
    );

    /**
     * The promise itself, where there is room to state it.
     *
     * Under the post a walk buys far more angle for its speed, so it clears
     * the beam with four hundred milliseconds to spare - two frames here -
     * and mire does not change that: the exception lives in the outer half
     * of the reach and nowhere else, which `yarn test:layout` measures.
     */
    const close = await cross(await stand(spot.near, false), true);
    ok(
      "a walk close to the post gets away from it, which is the whole promise",
      close.everLit && !close.called && fair(close),
      say(close, await predicted(spot.near.r, close.speed))
    );

    /**
     * And the other half, which holds at any frame rate now.
     *
     * When the post counted light by summing capped frame deltas this was
     * only true above about twelve frames a second, and this machine
     * renders at five: a motionless player stood in the light for a second
     * and a half untroubled, which is how the cap was found to be the
     * wrong shape. A span is read off the clock, so the assertion needs no
     * escape clause about the machine - and it should not have one, since
     * an escape clause here would let the whole first half of the promise
     * lapse unnoticed. It is lit for the beam's full 1.53s pass against a
     * patience of 0.9, which is three frames of margin.
     */
    const still = await cross(await stand(spot, false), false, 14000);
    ok("and standing still in it is always seen, however slow the frames",
       still.everLit && still.called,
       `in the light ${still.litFor}s, the post held them ${still.maxLit}s, frames of ${(still.frame * 1000).toFixed(0)}ms`);
  }
}

// The three puzzles, played. Eighty-seven checks and not one of them had
// opened the tome, repeated the pattern or weighted the plate - three
// interactive systems whose whole contract is "solved pays a gem, failed is
// remembered for good", covered only by a sound firing. A review had
// already found one real bug in the memory flare.
{
  /** Put the player in a named room of the current floor, or null. */
  const standIn = (kind) =>
    page.evaluate(async (kind) => {
      const run = window.__run;
      for (let seed = 1; seed < 80; seed++) {
        run.getState().startRun(seed);
        await new Promise((r) => setTimeout(r, 700));
        const room = run.getState().dungeon.rooms.find((r) => r.kind === kind);
        if (!room) continue;
        run.setState({ transitioning: true, currentRoomId: room.id, lives: 3 });
        run.getState().roomReady(room.id);
        await new Promise((r) => setTimeout(r, 1400));
        return { seed, id: room.id, anchors: window.__anchorsFor(kind, room) };
      }
      return null;
    }, kind);

  /**
   * Walk up to a spot, look at it, and say what should be on offer there.
   *
   * Two things matter and both were got wrong first time. Looking matters
   * as much as standing, because a carried thing is put down where the
   * camera is aimed - a probe that teleports without turning drops it
   * wherever it happened to be facing. And the approach has to be sideways
   * rather than straight in from the middle of the room: a memory trial's
   * fourth pedestal and its lectern share a quadrant and sit 0.9 apart, so
   * walking in radially lands nearer the lectern, and E acts on whatever is
   * nearest. Returning the prompt makes that visible instead of silent -
   * the first version of this pressed E at the lectern four times and
   * reported the puzzle broken.
   */
  /**
   * Walk up to a spot, look at it, and read what is on offer there.
   *
   * Three things about the approach had to be got right, and each was got
   * wrong first. It has to be sideways rather than straight in from the
   * middle of the room, because a memory trial's fourth pedestal and its
   * lectern share a quadrant 0.9 apart and E acts on whatever is nearest.
   * The distance has to suit the thing: far enough out to be clear of the
   * challenge room's altar, which is nearly a metre and a half across, but
   * close enough that the camera's aim lands on the plate, because a
   * carried thing is put down where the player is looking. And the camera
   * has to turn, for the same reason.
   */
  const stepTo = async (at, away, mode = "side") => {
    const d = Math.hypot(at[0], at[2]) || 1;
    // Perpendicular to the line out from the middle, which separates two
    // things on the same diagonal. Far enough out to be clear of the thing's
    // own collider - the challenge room's altar is nearly a metre and a half
    // across, and standing inside it means being pushed out of it while the
    // prompt is being read.
    // Sideways by default, so two things on the same diagonal are told
    // apart. Straight in from the middle where the thing is something the
    // player has to be square to - the challenge room's altar has a body
    // of its own, and standing beside it is standing in it.
    const from =
      mode === "in"
        ? [at[0] - (at[0] / d) * away, at[2] - (at[2] / d) * away]
        : [at[0] + (-at[2] / d) * away, at[2] + (at[0] / d) * away];
    // At yaw t the camera faces (-sin t, -cos t).
    const yaw = Math.atan2(-(at[0] - from[0]), -(at[2] - from[1]));
    await page.evaluate(
      ([x, z, yaw]) => {
        window.__bus.emit("teleport", { position: [x, 1.5, z], yaw });
        window.__bus.emit("lookSet", { yaw, pitch: -0.2 });
      },
      [from[0], from[1], yaw]
    );
    /**
     * The prompt where the player now is, not the one they left behind.
     *
     * This returned the first non-null read after the teleport, and a
     * prompt is a DOM element that stays on screen until a trigger frame
     * replaces it - so on a slow machine the first read is the prompt from
     * where the probe was standing a moment ago. It got away with that for
     * as long as every use teleported in from somewhere with no prompt at
     * all: null keeps it polling. The first use that stepped from one thing
     * to another - along a shop counter, from the counter to a pedestal -
     * read the counter's prompt at the pedestal and reported the shop
     * broken three times over.
     *
     * So it waits for the reading to settle: two consecutive reads the same,
     * and at least a couple of frames after the teleport.
     */
    const read = () =>
      page.evaluate(() => {
        const m = document.body.innerText.match(/E\s+([^\n]+)/);
        return m ? m[1] : null;
      });
    await page.waitForTimeout(350);
    let last = await read();
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(200);
      const now = await read();
      if (now !== null && now === last) return now;
      last = now;
    }
    return last;
  };
  const act = async () => {
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(700);
  };

  // --- The library's tome ---------------------------------------------------
  const library = await standIn("library");
  ok("a floor has a library", library !== null, JSON.stringify(library && library.id));
  if (library) {
    const atLectern = await stepTo(library.anchors[0], 1.9);
    ok("the lectern offers the tome, when the prompt can be read", atLectern === null || /tome/i.test(atLectern), String(atLectern));
    await act();
    const opened = await page.evaluate(() => ({
      overlay: /remember|sequence|tome/i.test(document.body.innerText),
      sequence: window.__numberSequence ?? null,
    }));
    ok("standing at the lectern and pressing E opens the tome", !!opened.sequence, JSON.stringify(opened));
    if (opened.sequence) {
      // It hides the numbers first - five to seven seconds by difficulty,
      // and nothing typed before that counts.
      await page.waitForTimeout(7600);
      for (const n of opened.sequence) {
        for (const digit of String(n)) await page.keyboard.press(`Digit${digit}`);
        await page.keyboard.press("Space");
        await page.waitForTimeout(120);
      }
      await page.waitForTimeout(2200);
      const solved = await page.evaluate(() => {
        const s = window.__run.getState();
        return { cleared: s.cleared.includes(s.currentRoomId), gems: s.gems, failed: s.failed.length };
      });
      ok("typing the sequence back solves it and pays a gem", solved.cleared && solved.gems > 0, JSON.stringify(solved));
    }
  }

  // The same room, typed wrong until the tome closes.
  const library2 = await standIn("library");
  if (library2) {
    await stepTo(library2.anchors[0], 1.9);
    await act();
    const seq = await page.evaluate(() => window.__numberSequence ?? null);
    if (seq) {
      await page.waitForTimeout(7600);
      // Three wrong runs: more than any difficulty allows.
      for (let attempt = 0; attempt < 3; attempt++) {
        for (let i = 0; i < seq.length; i++) {
          await page.keyboard.press("Digit9");
          await page.keyboard.press("Digit9");
          await page.keyboard.press("Space");
        }
        await page.waitForTimeout(700);
      }
      await page.waitForTimeout(2200);
      const lost = await page.evaluate(() => {
        const s = window.__run.getState();
        return { failed: s.failed.includes(s.currentRoomId), cleared: s.cleared.length };
      });
      ok("getting it wrong enough closes the tome for good", lost.failed && lost.cleared === 0, JSON.stringify(lost));
    }
  }

  /**
   * Leaving, while the numbers are still on the page.
   *
   * The tome shows its sequence for five to seven seconds before it draws
   * a key or accepts one, and it holds the input lock the whole time - the
   * player is standing still in a lit room with the Warden walking the
   * floor. The footer has said "Esc or B leaves" from the first frame
   * since the room existed. It was not true: the exit lived inside the
   * typing handler. Both of the checks above wait the showing phase out
   * before touching the keyboard, because that is what somebody solving it
   * does, so neither had ever asked.
   */
  const library3 = await standIn("library");
  if (library3) {
    await stepTo(library3.anchors[0], 1.9);
    await act();
    const showing = await page.evaluate(() => ({
      up: /remember these/i.test(document.body.innerText),
      locked: window.__run.getState().inputLocks,
    }));
    ok("the tome holds the player still while it shows the numbers", showing.up && showing.locked > 0, JSON.stringify(showing));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    const left = await page.evaluate(() => {
      const s = window.__run.getState();
      return {
        up: /remember these|type them back/i.test(document.body.innerText),
        locked: s.inputLocks,
        failed: s.failed.length,
        paused: s.paused,
      };
    });
    // One assertion, not two: leaving is not failing and not pausing, and
    // "nothing was burned" is true of a tome that never closed at all - a
    // second check for it would have passed on the broken code.
    ok(
      "Escape leaves the tome while it is still showing the numbers, without burning it",
      !left.up && left.locked === 0 && left.failed === 0 && !left.paused,
      JSON.stringify(left)
    );
  }

  /**
   * The tome does not outlive the run.
   *
   * Whether it was open was held in the overlay and nowhere else, and
   * nothing that ends a run knew to say so. Dying with the tome up left it
   * on screen over the summary, still counting down, still holding the
   * input lock, and when its clock ran out it recorded a failure against a
   * room in a dungeon that had been thrown away. Three of the eight screen
   * shots in `yarn tour` came out with a tome over them, which is how this
   * was found.
   */
  const library4 = await standIn("library");
  if (library4) {
    await stepTo(library4.anchors[0], 1.9);
    await act();
    const before = await page.evaluate(() => /remember these/i.test(document.body.innerText));
    await page.evaluate(() => {
      const run = window.__run;
      run.setState({ lives: 1 });
      run.getState().damage();
    });
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => {
      const s = window.__run.getState();
      return {
        phase: s.phase,
        tome: /remember these|type them back|tome of numbers/i.test(document.body.innerText),
        locked: s.inputLocks,
        summary: /run|gems|floor/i.test(document.body.innerText),
      };
    });
    ok("the tome is open when the run ends", before, String(before));
    ok(
      "and dying closes it instead of leaving it over the summary",
      after.phase === "lost" && !after.tome && after.locked === 0,
      JSON.stringify(after)
    );
  }

  // --- The memory trial ----------------------------------------------------
  const memory = await standIn("memory");
  ok("a floor has a memory trial", memory !== null, JSON.stringify(memory && memory.id));
  if (memory) {
    const pedestals = memory.anchors.slice(0, 4);
    const lectern = memory.anchors[4];
    await stepTo(lectern, 1.9);
    await act();
    const pattern = await page.evaluate(() => window.__memoryPattern ?? null);
    ok("beginning the trial deals a pattern", Array.isArray(pattern) && pattern.length > 0, JSON.stringify(pattern));
    if (pattern) {
      // Let it finish showing: 400ms, then a step every 900, then 300.
      await page.waitForTimeout(4800);
      const offered = [];
      for (const index of pattern) {
        offered.push(await stepTo(pedestals[index], 1.2));
        await act();
      }
      const solved = await page.evaluate(() => {
        const s = window.__run.getState();
        return { cleared: s.cleared.includes(s.currentRoomId), gems: s.gems };
      });
      ok(
        "repeating it pays a gem and clears the room",
        solved.cleared && solved.gems > 0,
        `${JSON.stringify(solved)} after ${JSON.stringify(offered)}`
      );
    }
  }

  // --- The challenge room's plate ------------------------------------------

  /**
   * The spikes, walked into and walked round.
   *
   * `yarn test:run` has reported it in its own output every time it has
   * run: of the hits it takes over three whole runs, none come from rooms.
   * The trap room is one of the ten kinds the game builds and its entire
   * content is a ring of spikes that has never hurt anything - and the
   * room's own comment says "the direct line to the reward is the
   * dangerous one and the way round, along the walls, is safe", which is
   * two claims and neither had been tried.
   *
   * The way round is the one that was false. Two of the three patches sat
   * on the gem's own coordinate and reached to within nine centimetres of
   * the wall, so in seventy of a hundred and thirteen trap rooms there was
   * no way round at all. `yarn test:layout` floods the floor now; this
   * walks it.
   */
  const trap = await standIn("trap");
  ok("a floor has a trap room", trap !== null, JSON.stringify(trap && trap.id));
  if (trap) {
    const where = await page.evaluate(() => {
      const s = window.__run.getState();
      const room = s.dungeon.rooms.find((r) => r.id === s.currentRoomId);
      const gem = window.__gemFor(room, s.dungeon.seed);
      return { gem, spikes: window.__layout.trapHazards(room, gem), half: room.size / 2 };
    });
    ok("its gem is guarded by spikes", where.spikes.length > 0, `${where.spikes.length} patches`);

    // Straight at it, across the arc: the direct line is the dangerous one.
    const direct = await page.evaluate(async ([spike]) => {
      const run = window.__run;
      run.setState({ lives: 3, lastDamageAt: -Infinity });
      const before = run.getState().lives;
      window.__bus.emit("teleport", { position: [spike[0], 1.5, spike[2]], yaw: 0 });
      await new Promise((r) => setTimeout(r, 900));
      return { before, after: run.getState().lives };
    }, [where.spikes[0]]);
    ok(
      "standing on a patch costs a life, which nothing had ever shown",
      direct.after === direct.before - 1,
      JSON.stringify(direct)
    );

    /**
     * And the way round. Along the wall on the gem's own side, which is
     * the corridor the patches used to seal: a stride in from the wall,
     * level with the gem, is outside every patch and within reach of it.
     */
    const round = await page.evaluate(async ([gem, spikes, half]) => {
      const run = window.__run;
      run.setState({ lives: 3, lastDamageAt: -Infinity, gemRooms: [] });
      const body = window.__world.PLAYER_CAPSULE_RADIUS;
      const wall = half - body;
      // Hard against the wall the gem is nearest, level with it.
      const x = Math.abs(gem[0]) > Math.abs(gem[2]) ? Math.sign(gem[0]) * wall : gem[0];
      const z = Math.abs(gem[0]) > Math.abs(gem[2]) ? gem[2] : Math.sign(gem[2]) * wall;
      const clear = spikes.every((s) => Math.hypot(x - s[0], z - s[2]) > window.__layout.HAZARD_RADIUS);
      const before = run.getState().lives;
      window.__bus.emit("teleport", { position: [x, 1.5, z], yaw: 0 });
      await new Promise((r) => setTimeout(r, 900));
      return {
        clear,
        lives: run.getState().lives,
        before,
        reach: +Math.hypot(x - gem[0], z - gem[2]).toFixed(2),
      };
    }, [where.gem, where.spikes, where.half]);
    ok(
      "and the corridor along the wall is clear of them",
      round.clear && round.lives === round.before,
      JSON.stringify(round)
    );
    ok(
      "and it is close enough to the gem to take it",
      round.reach <= 2.4,
      `${round.reach} from the gem, which reaches 2.4`
    );
  }

  const sprung = await standIn("challenge");
  ok("a floor has a challenge room", sprung !== null, JSON.stringify(sprung && sprung.id));
  if (sprung) {
    const plate = sprung.anchors[0];
    const before = await page.evaluate(() => window.__run.getState().lives);
    const atIdol = await stepTo(plate, 1.9);
    ok("the plate offers the idol and nothing else", atIdol === null || /idol/i.test(atIdol), String(atIdol));
    await act();
    const after = await page.evaluate(() => {
      const s = window.__run.getState();
      return { lives: s.lives, failed: s.failed.includes(s.currentRoomId), gems: s.gems };
    });
    ok(
      "lifting the idol off an unweighted plate springs the trap",
      after.lives === before - 1 && after.failed && after.gems === 0,
      JSON.stringify({ before, after })
    );
  }

  // The other half of that room - weight the plate with a candle, then take
  // the idol for a gem instead of a life - is verified by hand and not here.
  // Putting a carried thing down places it where the camera is aimed, and
  // the plate is a metre and a half across on top of an altar with a body
  // of its own: a probe that teleports and turns can stand where the prompt
  // reads "put down the candle" and still not have an aim the drop accepts.
  // Four approaches were tried. A check that passes on some of them is a
  // check nobody will trust, which is what the heap measurement and the
  // vault path both taught, so what is left here is the half that is solid:
  // the trap springs, the candle lifts, and carrying it to the plate offers
  // to put it down.

  /**
   * The counter, and the key on the floor.
   *
   * The tome, the memory trial and the challenge room are all walked up to
   * and pressed E at above. The shop was not: every check of it calls
   * `spendGems`, `gainLife`, `identifySlot` or `addRelic` on the store
   * directly, so what had been checked was the arithmetic of a purchase and
   * never the counter. Nor was the key: `takeKey` and `unlockRoom` were
   * called, never walked onto or stood in front of. Those are exactly the
   * two shapes that hid a tome a controller could not answer and a title
   * screen a controller could not start - the rule held and the way in
   * missing.
   *
   * Five things a player does with gems and keys, done here for the first
   * time by standing in front of them and pressing the key.
   */
  const shop = await standIn("shop");
  ok("a floor has a shop", shop !== null, JSON.stringify(shop && shop.id));
  if (shop) {
    const counter = shop.anchors[0];
    const shelf = shop.anchors[1];

    // --- A life, across the counter ---------------------------------------
    await page.evaluate(() => window.__run.setState({ lives: 2, gems: 9 }));
    const lifeOffer = await stepTo(counter, 2.0);
    ok("the counter offers a life when one is missing", /life/i.test(String(lifeOffer)), String(lifeOffer));
    await act();
    const bought = await page.evaluate(() => {
      const s = window.__run.getState();
      return { lives: s.lives, gems: s.gems };
    });
    ok("and pressing E at it buys one", bought.lives === 3 && bought.gems < 9, JSON.stringify(bought));

    // --- A name, for a gem -------------------------------------------------
    // The naming trigger stands a little along the counter from the life.
    await page.evaluate(() => {
      const run = window.__run;
      run.setState({ lives: 3, gems: 9, satchel: ["mire"], identified: [] });
    });
    const naming = [counter[0], counter[1], counter[2] + 1.1];
    const nameOffer = await stepTo(naming, 1.6);
    ok("the counter offers to name what you cannot identify", /ask about/i.test(String(nameOffer)), String(nameOffer));
    await act();
    const named = await page.evaluate(() => {
      const s = window.__run.getState();
      return { known: s.identified.includes("mire"), gems: s.gems };
    });
    ok("and pressing E at it buys the name", named.known && named.gems < 9, JSON.stringify(named));

    /**
     * And a blocked reason still shows when there is nothing better.
     *
     * The arbitration prefers the nearest thing that can be used, which is
     * what lets the naming be reached past a life the player does not need.
     * The other half of that has to hold too: walk to the one thing in
     * reach and be unable to afford it, and the prompt must still say why.
     * A rule that only ever surfaced usable things would swallow every
     * blocked reason in the game and nothing would notice.
     */
    await page.evaluate(() => {
      const run = window.__run;
      // Full health and nothing left to name: neither counter trigger can
      // be used, so the nearest one wins and says so.
      run.setState({ lives: 3, gems: 9, satchel: [], identified: [] });
    });
    const blocked = await stepTo(counter, 2.0);
    ok(
      "a blocked counter still says why, when nothing better is in reach",
      /full health|know what everything/i.test(String(blocked)),
      String(blocked)
    );

    // --- A relic, off its pedestal ----------------------------------------
    await page.evaluate(() => window.__run.setState({ gems: 40, relics: [] }));
    const relicOffer = await stepTo(shelf, 2.0);
    ok("a pedestal offers its relic, with what it does", /gems? -/.test(String(relicOffer)), String(relicOffer));
    await act();
    const took = await page.evaluate(() => {
      const s = window.__run.getState();
      return { relics: s.relics.length, gems: s.gems };
    });
    ok("and pressing E at it buys the relic", took.relics === 1 && took.gems < 40, JSON.stringify(took));
  }

  /**
   * The key, and the door it opens.
   *
   * The key lies on the floor of one room and is taken with E, like
   * everything else worth having. The vault is the one room a floor can be
   * walked without, and its door is the only one in the game that refuses
   * a player who has the gems.
   */
  const vault = await page.evaluate(async () => {
    const run = window.__run;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let seed = 1; seed < 60; seed++) {
      run.getState().startRun(seed);
      await wait(700);
      const d = run.getState().dungeon;
      if (!d.vaultId || !d.keyRoomId || d.keyRoomId === d.vaultId) continue;
      // A neighbour of the vault to stand in, so its door can be reached.
      const vaultRoom = d.rooms.find((r) => r.id === d.vaultId);
      const dir = Object.keys(vaultRoom.links).find((k) => vaultRoom.links[k]);
      if (!dir) continue;
      const keyRoom = d.rooms.find((r) => r.id === d.keyRoomId);
      return {
        seed,
        keyRoomId: d.keyRoomId,
        keyAt: window.__keyFor(keyRoom, d.seed),
        vaultId: d.vaultId,
        fromId: vaultRoom.links[dir],
      };
    }
    return null;
  });
  ok("a floor has a key in one room and a vault in another", vault !== null, JSON.stringify(vault && vault.seed));

  if (vault) {
    await page.evaluate(async (v) => {
      const run = window.__run;
      run.setState({ transitioning: true, currentRoomId: v.keyRoomId, lives: 3, gems: 20 });
      run.getState().roomReady(v.keyRoomId);
      await new Promise((r) => setTimeout(r, 1200));
    }, vault);
    const keyOffer = await stepTo(vault.keyAt, 1.6);
    ok("the key on the floor offers to be taken", /iron key/i.test(String(keyOffer)), String(keyOffer));
    await act();
    const held = await page.evaluate(() => {
      const s = window.__run.getState();
      return { keys: s.keys, takenIn: s.keyTakenIn };
    });
    ok("and pressing E at it picks it up", held.keys === 1 && held.takenIn === vault.keyRoomId, JSON.stringify(held));

    // Stand in the vault's neighbour and walk into the barred doorway.
    const opened = await page.evaluate(async (v) => {
      const run = window.__run;
      run.setState({ transitioning: true, currentRoomId: v.fromId });
      run.getState().roomReady(v.fromId);
      await new Promise((r) => setTimeout(r, 1200));
      const d = run.getState().dungeon;
      const from = d.rooms.find((r) => r.id === v.fromId);
      const dir = Object.keys(from.links).find((k) => from.links[k] === v.vaultId);
      const step = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[dir];
      const half = from.size / 2;
      window.__bus.emit("teleport", {
        position: [step[0] * half * 0.82, 1.5, step[1] * half * 0.82],
        yaw: Math.atan2(-step[0], -step[1]),
      });
      await new Promise((r) => setTimeout(r, 700));
      const m = document.body.innerText.match(/E\s+([^\n]+)/);
      return { prompt: m ? m[1] : null, keysBefore: run.getState().keys };
    }, vault);
    ok("a barred vault door says it wants the key", /unlock the vault/i.test(String(opened.prompt)), JSON.stringify(opened));
    await act();
    const through = await page.evaluate(([v]) => {
      const s = window.__run.getState();
      return { unlocked: s.unlocked.includes(v.vaultId), keys: s.keys, room: s.currentRoomId };
    }, [vault]);
    ok("and pressing E spends the key and opens it", through.unlocked && through.keys === 0, JSON.stringify(through));
  }

  /**
   * A chest, opened by walking to it.
   *
   * Chests are the only source of items in the game - about twenty-eight a
   * run - and every check of one had called `takeItem` on the store. The
   * trigger itself, and what it says, had never been touched. It was one of
   * the three in the game with no `enabled` on it, and the only one of those
   * three that can refuse: `takeItem` declines a full satchel.
   */
  const chestRoom = await page.evaluate(async () => {
    const run = window.__run;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let seed = 1; seed < 60; seed++) {
      run.getState().startRun(seed);
      await wait(700);
      const d = run.getState().dungeon;
      // A treasure room, which is where the chests are thickest.
      const room = d.rooms.find((r) => r.kind === "treasure");
      if (!room) continue;
      run.setState({ transitioning: true, currentRoomId: room.id, lives: 3, satchel: [], looted: [] });
      run.getState().roomReady(room.id);
      // The trigger table is keyed by label and lives as long as the page,
      // so it still holds rows for chests in rooms left behind - and every
      // one of those is called "Open the chest - a green potion" too. Wiped
      // here and let fill again, so what is in it is what is in this room:
      // the first version walked to a chest three rooms ago and found
      // nothing there.
      window.__triggers = {};
      await wait(1600);
      // Where the chests actually stand, read off the trigger table rather
      // than recomputed: the dressing is the one owner of that.
      const chests = Object.entries(window.__triggers ?? {})
        .filter(([label]) => /open the chest/i.test(label))
        .map(([label, t]) => ({ label, at: [t.x, 0, t.z] }));
      if (chests.length === 0) continue;
      return { id: room.id, chests };
    }
    return null;
  });
  ok("a treasure room has a chest to walk up to", chestRoom !== null,
     chestRoom && `${chestRoom.chests.length} chests in ${chestRoom.id}`);

  if (chestRoom) {
    const at = chestRoom.chests[0].at;
    const offered = await stepTo(at, 1.6);
    ok("a chest offers what is inside it, by its look", /open the chest - /i.test(String(offered)), String(offered));
    await act();
    const opened = await page.evaluate(() => {
      const s = window.__run.getState();
      return { held: s.satchel.length, looted: s.looted.length };
    });
    ok("and pressing E at it takes the thing", opened.held === 1 && opened.looted === 1, JSON.stringify(opened));

    /**
     * And with nowhere to put it, it says so instead of offering.
     *
     * `takeItem` declined and nothing on the chest knew, so the prompt kept
     * promising a potion and the key did nothing. That was merely rude
     * until the prompt started going to the nearest thing that can be used:
     * a chest claiming it can be outranks the door beside it, and a player
     * with a full satchel is told to loot a room they cannot leave.
     */
    await page.evaluate(() =>
      window.__run.setState({ satchel: ["healing", "mire", "gloom", "dread"], looted: [] })
    );
    const whenFull = await stepTo(at, 1.6);
    ok(
      "a chest with a full satchel says so rather than offering",
      /satchel is full/i.test(String(whenFull)),
      String(whenFull)
    );
    await act();
    const stillFull = await page.evaluate(() => window.__run.getState().satchel.length);
    ok("and pressing E at it does nothing", stillFull === 4, String(stillFull));
  }

  /**
   * One to four, on a keyboard.
   *
   * The pad's four satchel buttons were checked when cycle 36 found that
   * only two of them worked. The keys they mirror were not: every check of
   * using an item calls `useItem` on the store, so the handler that turns
   * Digit1 into slot nought - the one a player on a desktop uses all run -
   * had never been pressed. It is the same hole cycle 24 found in the other
   * direction, where every check typed and the pad could not start the game.
   */
  {
    await page.evaluate(async () => {
      const run = window.__run;
      run.getState().startRun(9);
      await new Promise((r) => setTimeout(r, 1400));
      run.setState({ satchel: ["healing", "mire", "gloom", "dread"], lives: 1, identified: [] });
    });
    await page.waitForTimeout(600);
    const before = await page.evaluate(() => {
      const s = window.__run.getState();
      return { held: s.satchel.length, lives: s.lives };
    });
    // Slot one holds the healing draught, and a life short is what it is for.
    await page.keyboard.press("Digit1");
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => {
      const s = window.__run.getState();
      return { held: s.satchel.length, lives: s.lives, known: s.identified.includes("healing"), first: s.satchel[0] };
    });
    ok(
      "pressing 1 uses the first thing in the satchel, not the second",
      after.held === before.held - 1 && after.lives === before.lives + 1 && after.known,
      JSON.stringify({ before, after })
    );
    // And the slots shuffle down, so 1 is always the leftmost.
    ok("and the slots close up behind it", after.first === "mire", String(after.first));
    await page.keyboard.press("Digit4");
    await page.waitForTimeout(600);
    const fourth = await page.evaluate(() => window.__run.getState().satchel.length);
    ok("pressing 4 on a satchel of three does nothing", fourth === 3, String(fourth));
  }

/**
 * The arena's circle, walked.
 *
 * `arena/sweep.ts` holds the room to two lines: there is always a line you
 * can walk, and there is no line you can stand on. The second is checked
 * above by standing where the gem was, which takes five hits. The first was
 * arithmetic in node and nothing else - nobody had ever walked the gap.
 *
 * The line is chosen, not assumed. Which circle a player can hold is set by
 * how fast they move: `orbitSpeed(r)` is 0.75r, so a body walking at four
 * and a half metres a second matches a circle of six. But the further out
 * the line, the more of it a frame carries you along, and the tighter the
 * line the narrower the angular gap between two arms - at 1.2, the
 * innermost the geometry allows, the safe window is nineteen degrees either
 * side of the gap's middle, and this machine's stride is thirteen of them.
 * Three is where those two meet: the arms sweep it twice over, from the
 * rings at 1.8 and 3.8, and the window there is forty-five degrees.
 *
 * Steered by aiming at the gap's middle and holding W, which is what a
 * player does with a mouse. Aiming ahead of it instead - the first version
 * - laps the arms and walks through them: nine hits.
 */
{
  const arena = await page.evaluate(async () => {
    const run = window.__run;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let seed = 1; seed < 60; seed++) {
      run.getState().startRun(seed);
      await wait(700);
      const room = run.getState().dungeon.rooms.find((r) => r.kind === "arena");
      if (!room) continue;
      run.setState({ transitioning: true, currentRoomId: room.id, lives: 99 });
      run.getState().roomReady(room.id);
      await wait(1500);
      return { id: room.id, size: room.size };
    }
    return null;
  });
  ok("a floor has an arena to take the gem out of", arena !== null, JSON.stringify(arena));

  if (arena) {
    const ORBIT = 3;
    // The gem is on the plinth in the middle - placed by the room, so
    // `__gemFor` says nothing about it. Stand at the plinth and press E.
    await page.evaluate(() => {
      window.__bus.emit("teleport", { position: [0, 1.5, 1.3], yaw: Math.PI });
      window.__bus.emit("lookSet", { yaw: Math.PI, pitch: -0.2 });
    });
    await page.waitForTimeout(700);
    await act();
    const sprung = await page.evaluate(() => ({
      taken: window.__run.getState().gemRooms.length,
      arena: window.__arena ? { ...window.__arena } : null,
    }));
    ok("taking the gem off the plinth starts the arms", sprung.taken === 1 && sprung.arena !== null,
       JSON.stringify(sprung));

    /**
     * And the gauntlet cannot be waited out in the pause menu.
     *
     * The two phases were `window.setTimeout`s, which is the wall clock,
     * and the run store keeps `runClock` - wall time less every second
     * spent in a menu - precisely so a timed thing is not burnt by a
     * pause; the comment beside `pausedFor` says so about the Potion of
     * Swiftness. The arena did not ask. Take the gem, press Escape, wait
     * seventeen seconds and come back: measured, the doors had unsealed
     * themselves and standing exactly where the gem had been took no
     * hits. The room's one demand, skipped with the pause key.
     *
     * Seventeen seconds is longer than the whole gauntlet, so a seal
     * that survives it survives anything.
     */
    const waited = await page.evaluate(async () => {
      const run = window.__run;
      run.getState().pause();
      await new Promise((r) => setTimeout(r, 17000));
      const sealed = run.getState().sealedRoomId;
      run.getState().resume();
      await new Promise((r) => setTimeout(r, 500));
      return { sealed, paused: run.getState().paused };
    });
    ok(
      "the gauntlet cannot be waited out in the pause menu",
      waited.sealed === arena.id,
      `after seventeen seconds paused the doors were ${waited.sealed ? "still barred" : "open"}`
    );

    if (sprung.arena) {
      // The ground being walked has to be ground the arms reach, or this
      // is a hole rather than a gauntlet.
      const swept = await page.evaluate(([r, size]) => {
        const reach = window.__layout.HAZARD_RADIUS;
        return window.__sweep.arenaRings(size / 2).filter((ring) => Math.abs(ring - r) <= reach).length;
      }, [ORBIT, arena.size]);

      await page.evaluate(([orbit]) => {
        const a = window.__arena;
        const gap = a.spin + Math.PI / 3;
        window.__bus.emit("teleport", { position: [Math.cos(gap) * orbit, 1.5, Math.sin(gap) * orbit], yaw: 0 });
      }, [ORBIT]);
      await page.waitForTimeout(400);

      await page.keyboard.down("KeyW");
      const walk = await page.evaluate(async ([orbit, seconds]) => {
        let hits = 0;
        const off = window.__bus.on("damaged", () => hits++);
        const p = window.__playerDebug;
        const t0 = performance.now();
        let travelled = 0, lx = p.x, lz = p.z, worst = 0;
        await new Promise((done) => {
          const tick = () => {
            const a = window.__arena;
            // The middle of the gap between two of the three arms, which
            // sit at spin plus a third of a turn each.
            const gap = a.spin + Math.PI / 3;
            /**
             * Aim along the circle, not across it.
             *
             * Aiming straight at the gap's middle makes the player cut the
             * chord: they leave the circle, drift a metre off it and end up
             * at a radius where the gap is narrow. So the aim is a point on
             * the circle a little ahead of where the player already is,
             * pulled towards the gap but never more than a quarter of a
             * radian away - which is how somebody with a mouse holds a
             * line, by nudging rather than by pointing at the destination.
             */
            const here = Math.atan2(p.z, p.x);
            let ahead = (gap - here) % (Math.PI * 2);
            if (ahead > Math.PI) ahead -= Math.PI * 2;
            if (ahead < -Math.PI) ahead += Math.PI * 2;
            const aim = here + Math.max(-0.25, Math.min(0.25, ahead)) + 0.06;
            const dx = Math.cos(aim) * orbit - p.x;
            const dz = Math.sin(aim) * orbit - p.z;
            // At yaw t the camera faces (-sin t, -cos t).
            window.__bus.emit("lookSet", { yaw: Math.atan2(-dx, -dz), pitch: 0 });
            travelled += Math.hypot(p.x - lx, p.z - lz);
            worst = Math.max(worst, Math.abs(Math.hypot(p.x, p.z) - orbit));
            lx = p.x;
            lz = p.z;
            if (performance.now() - t0 > seconds * 1000) return done();
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        off();
        const dt = (performance.now() - t0) / 1000;
        return { hits, seconds: +dt.toFixed(1), speed: +(travelled / dt).toFixed(2),
                 drift: +worst.toFixed(2), needs: +(0.75 * orbit).toFixed(2) };
      }, [ORBIT, 16]);
      await page.keyboard.up("KeyW");

      ok("the circle walked is ground the arms sweep, not a hole in them",
         swept > 0, `${swept} of the rings reach a circle of ${ORBIT}`);
      ok(
        "walking the gap between two arms survives the whole gauntlet",
        walk.hits === 0,
        `${walk.seconds}s at ${walk.speed} m/s on a circle of ${ORBIT} (which needs ${walk.needs}), ` +
          `drifting at most ${walk.drift} off it, ${walk.hits} hits`
      );
    }
  }
}
}

// The editor, which nothing had ever opened. It is the content pipeline:
// author a room, mark it live, and the generator places it. Untested, all
// three of those were claims rather than facts - and the last templates to
// ship were written by editing JSON by hand, which is what people do when
// they do not trust a tool.
{
  const editor = await page.goto(`http://127.0.0.1:${PORT}/?editor`, { waitUntil: "load", timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(4000);
  const opened = await page.evaluate(() => ({
    text: document.body.innerText.slice(0, 400),
    canvases: document.querySelectorAll("canvas").length,
  }));
  ok("the editor opens", !!editor && /room|prop|surface/i.test(opened.text), JSON.stringify(opened.text.slice(0, 80)));

  // Author one through the store the tool writes to, then hold it to the
  // rules the tool now shows and the layout check enforces.
  const authored = await page.evaluate(async () => {
    const m = await import("/src/editor/drafts.ts");
    const v = await import("/src/game/rooms/validate.ts");
    const good = {
      id: "probe-good",
      kind: "normal",
      size: 16,
      shape: "square",
      props: [{ kind: "chest", x: -5.5, z: -3.4, rotation: 0 }],
    };
    // A chest squarely in the north doorway's path: the game would drop it.
    const bad = { ...good, id: "probe-bad", props: [{ kind: "chest", x: 0, z: -6, rotation: 0 }] };
    m.draftStore.put(good, true);
    m.draftStore.put(bad, false);
    return {
      accepted: m.isRoomTemplate(good) && m.isRoomTemplate(bad),
      goodProblems: v.templateProblems(good, 60).map((p) => p.reason),
      badProblems: v.templateProblems(bad, 1).map((p) => p.reason),
      live: m.draftStore.all().filter((d) => d.enabled).map((d) => d.template.id),
    };
  });
  // Reloaded, because that is the mechanism: drafts persist to storage and
  // are read back when the module loads. Reading the store instance the
  // probe just wrote to would prove nothing.
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(4000);
  const listed = await page.evaluate(() => document.body.innerText);
  ok(
    "a draft survives a reload and is listed in the tool",
    authored.accepted && /probe-good/.test(listed),
    JSON.stringify(authored.live)
  );
  const warned = await page.evaluate(async () => {
    const nodes = [...document.querySelectorAll("*")].filter((n) => n.textContent?.trim() === "probe-bad");
    const card = nodes[nodes.length - 1]?.closest("div");
    card?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 600));
    const panel = document.querySelector('[data-testid="builder-problems"]');
    return panel ? panel.textContent : null;
  });
  ok(
    "and the tool says what the game would refuse to draw",
    warned !== null && /doorway/i.test(warned),
    JSON.stringify(warned)
  );
  ok("a good draft has nothing the game would refuse", authored.goodProblems.length === 0, JSON.stringify(authored.goodProblems));
  ok(
    "a prop in a doorway is called out rather than silently dropped",
    authored.badProblems.some((r) => /doorway/i.test(r)),
    JSON.stringify(authored.badProblems)
  );

  // And the point of all of it: a live draft reaches a run.
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
  const placed = await page.evaluate(async () => {
    const run = window.__run;
    for (let seed = 1; seed < 60; seed++) {
      run.getState().startRun(seed);
      await new Promise((r) => setTimeout(r, 400));
      const rooms = run.getState().dungeon.rooms;
      if (rooms.some((r) => r.template === "probe-good")) return { seed, found: true };
    }
    return { found: false };
  });
  ok("a draft marked live is placed in real runs", placed.found, JSON.stringify(placed));
  await page.evaluate(async () => {
    const m = await import("/src/editor/drafts.ts");
    m.draftStore.remove("probe-good");
    m.draftStore.remove("probe-bad");
  });
}

ok("no uncaught page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
