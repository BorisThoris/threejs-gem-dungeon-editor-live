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
  /** Kilobytes of heap per frame while sprinting. Measured: negative - the
   *  collector keeps up because the frame loop allocates almost nothing. */
  heapPerFrame: 1.5,
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
const before = await page.evaluate(() => ({
  heap: performance.memory?.usedJSHeapSize ?? 0,
  frames: window.__perf.frames,
  t: performance.now(),
}));
await page.waitForTimeout(10000);
const after = await page.evaluate(() => ({
  heap: performance.memory?.usedJSHeapSize ?? 0,
  frames: window.__perf.frames,
  t: performance.now(),
}));
await page.keyboard.up("KeyW");
await page.keyboard.up("ShiftLeft");

const frames = after.frames - before.frames;
const seconds = (after.t - before.t) / 1000;
const perFrame = (after.heap - before.heap) / 1024 / Math.max(1, frames);
// A liveness floor, not a speed claim: this machine has no GPU, so the only
// thing worth asserting is that the loop ran at all while a key was held.
ok("the frame loop keeps running while the player sprints", frames > 120, `${frames} frames in ${seconds.toFixed(1)}s`);
ok(
  `the frame loop allocates under ${BUDGET.heapPerFrame} KB a frame`,
  before.heap === 0 || perFrame <= BUDGET.heapPerFrame,
  `${perFrame.toFixed(2)} KB/frame over ${frames} frames`
);

console.log(
  `\nWorst room: ${byCalls.calls} calls, ${byTris.triangles} triangles, ` +
    `${byGeo.geometries} geometries, ${byTex.textures} textures, over ${rooms.length} rooms.`
);
await browser.close();
console.log(failures === 0 ? "All performance checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
