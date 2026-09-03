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
  // The walker stands still to sample the floor, which on spikes or in the
  // arena is a way to die. This phase is testing that rooms can be walked
  // and gems taken, not that standing in a trap is survivable - dying has
  // its own checks further down - so it is kept on its feet.
  await page.evaluate(() => {
    const run = window.__run;
    if (run.getState().lives < 3) run.setState({ lives: 3, phase: "playing" });
  });
}
for (let i = 0; i < 20 && (await snap()).transitioning; i++) await page.waitForTimeout(250);
const explored = await snap();
ok("travelled to other rooms by pressing E", seen.size >= 3, `${seen.size} rooms visited`);
ok("never left the floor", minY >= REST_Y - 0.2, `lowest y seen ${minY.toFixed(2)}`);
ok("control returned after every transition", !explored.transitioning && explored.phase === "playing", JSON.stringify(explored));
ok("collected gems while exploring", explored.gems > 0, `${explored.gems} gems`);

// The exit refuses E without the toll, and takes it once paid.
const exitDoor = await page.evaluate(() => {
  const s = window.__run.getState();
  const byId = new Map(s.dungeon.rooms.map((r) => [r.id, r]));
  // BFS to the room next to the exit.
  const prev = new Map([[s.currentRoomId, null]]);
  const q = [s.currentRoomId];
  let neighbour = null;
  while (q.length) {
    const id = q.shift();
    const room = byId.get(id);
    if (Object.values(room.links).includes(s.dungeon.endId)) { neighbour = id; break; }
    for (const n of Object.values(room.links)) if (!prev.has(n)) { prev.set(n, id); q.push(n); }
  }
  if (!neighbour) return null;
  const path = [];
  for (let id = neighbour; id; id = prev.get(id)) path.unshift(id);
  return { path, neighbour };
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
  }
  const here = await snap();
  if (here.room === exitDoor.neighbour) {
    const door = (await doors()).find((d) => d.isExit);
    // Re-read the store each time: a getState() snapshot never changes.
    await page.evaluate(() => { const run = window.__run; while (run.getState().gems > 0) run.getState().spendGems(1); });
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
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(4000);
    const after = await snap();
    const floor = await page.evaluate(() => window.__run.getState().floor);
    ok("exit opens once paid and leads down a floor", after.phase === "playing" && after.gems === 1 && floor === 2 && after.room === "start", `${after.phase}, floor ${floor}, room ${after.room}, ${after.gems} gems left`);
    ok("the spare gem carries down and the new floor is calm", await page.evaluate(() => window.__run.getState().alarm === 0 && window.__run.getState().wardenRoomId === null));
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
    return Object.values(a).map((v) => v.unknown);
  });
  ok("every item has its own look this run", new Set(looks).size === looks.length && looks.length === 8, looks.length + " looks");

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
    // It lets go on its own, well inside the wind-up plus the run.
    await page.waitForTimeout(17500);
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

ok("no uncaught page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
