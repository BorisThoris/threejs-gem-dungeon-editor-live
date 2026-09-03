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

/** Measured max over 108 rooms: 54 calls, 2214 triangles, 52 geometries, 6 textures. */
const BUDGET = {
  calls: 72,
  triangles: 3400,
  geometries: 72,
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

// Walking from room to room must not leak: three disposes what it is told
// to and nothing else, and a room that forgets is a run that gets heavier
// the longer it goes on.
const drift = await page.evaluate(async () => {
  const run = window.__run;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  run.getState().startRun(555);
  await wait(1400);
  const ids = run.getState().dungeon.rooms.map((r) => r.id);
  const walk = async () => {
    for (const id of ids) {
      run.setState({ transitioning: true, currentRoomId: id });
      run.getState().roomReady(id);
      await wait(320);
    }
  };
  await walk();
  const first = { ...window.__perf };
  for (let lap = 0; lap < 3; lap++) await walk();
  return { first, last: { ...window.__perf }, laps: 4, rooms: ids.length };
});
ok(
  "walking the floor four times over does not pile up geometries",
  drift.last.geometries <= drift.first.geometries + 12,
  JSON.stringify(drift)
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
