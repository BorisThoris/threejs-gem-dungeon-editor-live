/**
 * What a room costs, checked against a written-down budget.
 *
 *   yarn dev --port 5199   # in one terminal
 *   yarn test:perf         # in another
 *
 * Frame time is not the measurement here. This machine renders through a
 * software rasteriser, where a millisecond says nothing about a Steam Deck.
 * Draw calls, triangles, live geometries and how fast the heap grows are a
 * different matter: three and the engine count them on the CPU, they do not
 * depend on the GPU at all, and they are exactly what goes wrong when a
 * cycle quietly adds a mesh per prop or an allocation per frame. Both have
 * happened in this project, and neither was caught by anything.
 *
 * The budgets below are the measured worst case across a hundred rooms with
 * about a third again on top. They are not aspirations - they are a tripwire
 * for the day something doubles.
 */
import { chromium } from "playwright-core";

const PORT = process.argv[2] || process.env.PORT || "5199";
const CHROMIUM =
  process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

/**
 * Measured max over 142 rooms: 51 calls, 2184 triangles, 63 geometries, 6
 * textures.
 *
 * `geometries` measures something different since the props started sharing
 * their shapes. It used to be a per-room cost - a room built a fresh
 * geometry for every mesh in it, 85 of them for 32 distinct shapes, and
 * threw them all away on the way out - so a rising number meant a room was
 * getting heavier. The props hold one geometry per shape for the program's
 * whole life now, and what a budget on this catches is a new shape being
 * added rather than a room leaking.
 *
 * It is not constant, though, and reading it as if it were is what made the
 * leak guard below fail at random for two cycles. A room's own floor and
 * walls are sized to the room, so they are built and thrown away with it:
 * measured over a lap of nine rooms the number reads 55 58 51 55 54 51 51
 * 58 59, and it reads exactly that every lap afterwards. Eight of swing
 * between rooms, and a room caught mid-mount reads lower still. The leak
 * guard compares a room with itself for that reason.
 */
const BUDGET = {
  calls: 72,
  triangles: 3400,
  geometries: 88,
  textures: 12,
  /**
   * Megabytes of heap still held after a collection, over ten seconds of
   * sprinting.
   *
   * Not allocation per frame: that was the first thing measured here and it
   * is not a measurement at all. Whether a collection happens inside a ten
   * second window is luck, so the same unchanged build read -94, -42, +0.04
   * and +23 KB a frame on four runs - a check that fails at random, which
   * is worse than no check because it teaches everyone to ignore it. What
   * survives a forced collection is a leak; what the collector keeps up
   * with is not, and the frame loop is allowed to allocate.
   */
  retainedMB: 8,
};
const SEEDS = [4242, 77];

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
    // So the check can ask for a collection and measure what survives one,
    // rather than measuring whether one happened to run.
    "--js-flags=--expose-gc",
  ],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load", timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2000);
const start = await page.$('button:has-text("Start")');
if (start) await start.click();
await page.waitForTimeout(9000);

if (!(await page.evaluate(() => Boolean(window.__perf)))) {
  console.log("FAIL  the frame loop reports what it drew  - window.__perf missing");
  await browser.close();
  process.exit(1);
}

// Every room of every floor, at the moment it is standing on its own.
const rooms = [];
for (const seed of SEEDS) {
  for (let floor = 1; floor <= 3; floor++) {
    const ids = await page.evaluate(
      async ([seed, floor]) => {
        const run = window.__run;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        run.getState().startRun(seed);
        await wait(1200);
        for (let f = 1; f < floor; f++) {
          const d = run.getState().dungeon;
          run.setState({ transitioning: true, currentRoomId: d.endId });
          run.getState().roomReady(d.endId);
          await wait(900);
        }
        return run.getState().dungeon.rooms.map((r) => [r.id, r.kind]);
      },
      [seed, floor]
    );
    for (const [id, kind] of ids) {
      const p = await page.evaluate(async (id) => {
        const run = window.__run;
        run.setState({ transitioning: true, currentRoomId: id });
        run.getState().roomReady(id);
        // Long enough for the room to mount and for a frame to be drawn
        // with everything in it.
        await new Promise((r) => setTimeout(r, 1100));
        return { ...window.__perf };
      }, id);
      rooms.push({ seed, floor, kind, ...p });
    }
  }
}

const worst = (key) => rooms.reduce((a, b) => (b[key] > a[key] ? b : a));
const report = (r, key) => `${r.kind} on floor ${r.floor} of seed ${r.seed}: ${r[key]}`;

const byCalls = worst("calls");
ok(`no room costs more than ${BUDGET.calls} draw calls`, byCalls.calls <= BUDGET.calls, report(byCalls, "calls"));
const byTris = worst("triangles");
ok(`no room costs more than ${BUDGET.triangles} triangles`, byTris.triangles <= BUDGET.triangles, report(byTris, "triangles"));
const byGeo = worst("geometries");
ok(`no room holds more than ${BUDGET.geometries} live geometries`, byGeo.geometries <= BUDGET.geometries, report(byGeo, "geometries"));
const byTex = worst("textures");
ok(`no room holds more than ${BUDGET.textures} live textures`, byTex.textures <= BUDGET.textures, report(byTex, "textures"));
ok("every room was measured", rooms.length > 40, `${rooms.length} rooms`);

/**
 * Walking from room to room must not leak, asked room by room.
 *
 * This measured one number - `renderer.info.memory.geometries` - after a
 * settling walk, then again three laps later, and allowed two of drift. It
 * failed at random, and the reason is that the number it sampled is not the
 * program-wide constant the old comment here claimed. Measured over
 * fourteen laps of nine rooms, one lap reads
 *
 *   47 50 43 47 46 43 43 50 51
 *
 * and it reads that every lap, exactly, for ever. The props do share their
 * shapes for the life of the program; a room's own floor and walls are
 * sized to the room and are built and thrown away with it, so the count is
 * a property of *which room is mounted*, swinging sixteen within a single
 * lap. Sample it once at the end of a lap and you have sampled whichever
 * room the walk stopped on - and, at three hundred milliseconds a room on a
 * rasteriser drawing six frames a second, possibly a room that had not
 * finished mounting: the same walk with a longer dwell never dips, and with
 * a short one reads 35 where a settled room reads 51.
 *
 * So the comparison is per room and against itself. Each room is held until
 * its count stops moving, and the last lap's number for a room is compared
 * with the first's. That is stable to the unit - and it would catch a room
 * leaking one geometry a visit, which the old single number could not have
 * seen at all under a swing of sixteen.
 */
const drift = await page.evaluate(async () => {
  const run = window.__run;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  run.getState().startRun(555);
  await wait(1400);
  const ids = run.getState().dungeon.rooms.map((r) => r.id);

  /**
   * Stand in a room until its geometry count stops moving.
   *
   * Counted in *rendered frames*, not in milliseconds. Three equal readings
   * two hundred milliseconds apart sounds like patience, and on this
   * machine it is not: a frame here takes about two hundred and eighty
   * milliseconds, so consecutive polls routinely fall inside the same frame
   * and read the same number because nothing has been drawn between them.
   * The loop then declares a still-building room finished, and a lap that
   * settles early against a lap that settles late reports a leak that is
   * not there - which it did, on the same code that had passed a moment
   * before, naming "room_1 +3 over 3 laps".
   *
   * `__perf.frames` is incremented once per frame by the same loop that
   * publishes the counts, so waiting for it to advance is the one honest
   * way to say "a frame has happened". Three frames unchanged is settled.
   */
  const nextFrame = async () => {
    const from = window.__perf.frames;
    for (let i = 0; i < 40; i++) {
      await wait(50);
      if (window.__perf.frames > from) return true;
    }
    return false;
  };
  const settleIn = async (id) => {
    run.setState({ transitioning: true, currentRoomId: id });
    run.getState().roomReady(id);
    let last = -1;
    let same = 0;
    for (let i = 0; i < 24; i++) {
      if (!(await nextFrame())) break;
      const now = window.__perf.geometries;
      same = now === last ? same + 1 : 0;
      last = now;
      if (same >= 3) break;
    }
    return last;
  };
  const walk = async () => {
    const row = [];
    for (const id of ids) row.push(await settleIn(id));
    return row;
  };

  // One lap to build every shape the floor needs, then four more.
  //
  // The comparison is between the last two laps, not between the first and
  // the last. A room settles when three consecutive rendered frames agree,
  // and at four frames a second that can latch while the room is still
  // building - so a single early lap reads low and a first-to-last
  // comparison reports the difference as growth. The exit room of seed
  // 4242 reads 49 on its first visit and 54 on every visit after: five
  // geometries built once and cached, which is not a leak and which a
  // first-to-last comparison called one.
  //
  // A leak piles up. Whatever builds and never disposes does it on every
  // lap, so it shows between two consecutive settled laps - and a lap that
  // under-read cannot poison that, because the next lap is compared with
  // the one beside it rather than with the low one.
  await walk();
  const laps = [];
  for (let lap = 0; lap < 4; lap++) laps.push(await walk());
  // Kept for a second opinion on any room that appears to have grown,
  // without paying for a whole floor again.
  window.__settleIn = settleIn;
  return { ids, laps, first: laps[0], last: laps[laps.length - 1], rooms: ids.length };
});

/**
 * A leak is growth that keeps happening, so ask the room twice.
 *
 * A room settles when three consecutive rendered frames report the same
 * count, and on a rasteriser drawing four frames a second a room can
 * occasionally report one geometry more on the lap it was read than on
 * the lap it was built - a single geometry, which is the smallest reading
 * this check can take. It has twice now named a room that did not grow
 * when asked again. So a first reading of growth is a question rather
 * than a finding: walk that room again, and only call it a leak if it is
 * still above where it started. A real leak - a room that builds and
 * never disposes - grows on every lap and cannot come back clean.
 */
const prev = drift.laps[drift.laps.length - 2];
let grew = drift.ids
  .map((id, i) => ({ id, by: drift.last[i] - prev[i] }))
  .filter((r) => r.by > 0);
if (grew.length) {
  // And ask the room once more before calling it. A settle that latched a
  // frame early reads low; a room that leaks reads higher every time it is
  // asked.
  const again = await page.evaluate(
    async ([ids, base]) => {
      const out = {};
      for (const id of ids) out[id] = (await window.__settleIn(id)) - base[id];
      return out;
    },
    [
      grew.map((r) => r.id),
      Object.fromEntries(grew.map((r) => [r.id, drift.last[drift.ids.indexOf(r.id)]])),
    ]
  );
  const before = grew.map((r) => `${r.id} +${r.by}`).join(", ");
  grew = grew.filter((r) => again[r.id] > 0).map((r) => ({ ...r, by: again[r.id] }));
  console.log(
    `      asked again: ${before} -> ${grew.length ? grew.map((r) => `${r.id} +${r.by}`).join(", ") : "clean"}`
  );
}
ok(
  "walking the floor over and over does not pile up geometries, room by room",
  grew.length === 0,
  grew.length
    ? `${grew.map((r) => `${r.id} +${r.by}`).join(", ")} lap on lap`
    : `${drift.rooms} rooms, none grew from one settled lap to the next: ${drift.last.join(" ")}`
);

// Sprinting is the frame loop at its busiest: input, physics, footsteps,
// head bob, the noise the Warden hears. If anything in there allocates per
// frame this is where it shows.
await page.evaluate(() => window.__run.getState().startRun(4242));
await page.waitForTimeout(1500);
await page.mouse.click(640, 400);
await page.keyboard.down("ShiftLeft");
await page.keyboard.down("KeyW");
await page.waitForTimeout(1500);
const settled = () =>
  page.evaluate(async () => {
    window.gc?.();
    // A collection is asynchronous at the edges; give it a beat to finish
    // before reading what is left.
    await new Promise((r) => setTimeout(r, 400));
    return {
      heap: performance.memory?.usedJSHeapSize ?? 0,
      frames: window.__perf.frames,
      t: performance.now(),
    };
  });
const before = await settled();
await page.waitForTimeout(10000);
const after = await settled();
await page.keyboard.up("KeyW");
await page.keyboard.up("ShiftLeft");

const frames = after.frames - before.frames;
const seconds = (after.t - before.t) / 1000;
const retained = (after.heap - before.heap) / (1024 * 1024);
// A liveness floor, not a speed claim: this machine has no GPU, so the only
// thing worth asserting is that the loop ran at all while a key was held.
ok("the frame loop keeps running while the player sprints", frames > 120, `${frames} frames in ${seconds.toFixed(1)}s`);
ok(
  `ten seconds of sprinting leaves under ${BUDGET.retainedMB} MB behind`,
  before.heap === 0 || retained <= BUDGET.retainedMB,
  `${retained.toFixed(2)} MB retained over ${frames} frames`
);

// The Warden in the room is the only sound that is held rather than fired
// once, and it is written to every frame while it closes. Rebuilt each
// frame instead of updated in place it would allocate an oscillator, a
// gain and a panner sixty times a second, which is the exact shape of this
// project's old stutters.
//
// Driven directly rather than by standing in front of the Warden: left to
// walk, it reaches the player in a couple of seconds and ends the run, so
// the measurement window closed before it opened. Twenty thousand calls is
// five minutes of frames, and it isolates the one claim being made.
{
  const held = await page.evaluate(() => {
    const sfx = window.__sfx;
    if (!sfx) return null;
    sfx.stalk(0.5, 0);
    const started = window.__stalking();
    window.gc?.();
    const from = performance.memory?.usedJSHeapSize ?? 0;
    const calls = 20000;
    for (let i = 0; i < calls; i++) sfx.stalk(0.2 + (i % 40) / 50, ((i % 21) - 10) / 10);
    window.gc?.();
    const to = performance.memory?.usedJSHeapSize ?? 0;
    const stillOne = window.__stalking();
    sfx.stalkStop();
    return { started, stillOne, stopped: window.__stalking(), bytes: to - from, calls, measured: from > 0 };
  });
  ok("the held sound can be driven at all", held !== null && held.started, JSON.stringify(held));
  ok(
    "driving it twenty thousand times builds one sound, not twenty thousand",
    held !== null && held.stillOne && !held.stopped && (!held.measured || held.bytes / held.calls < 64),
    held && `${(held.bytes / held.calls).toFixed(1)} bytes per call`
  );
}

console.log(
  `\nWorst room: ${byCalls.calls} calls, ${byTris.triangles} triangles, ` +
    `${byGeo.geometries} geometries, ${byTex.textures} textures, over ${rooms.length} rooms.`
);
await browser.close();
console.log(failures === 0 ? "All performance checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
