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
for (let hop = 0; hop < 6; hop++) {
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
}
for (let i = 0; i < 20 && (await snap()).transitioning; i++) await page.waitForTimeout(250);
const explored = await snap();
ok("travelled to other rooms by pressing E", seen.size >= 3, `${seen.size} rooms visited`);
ok("never left the floor", minY >= REST_Y - 0.2, `lowest y seen ${minY.toFixed(2)}`);
ok("control returned after every transition", !explored.transitioning && explored.phase === "playing");
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


ok("no uncaught page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
