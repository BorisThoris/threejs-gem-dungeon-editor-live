import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const failures = [], errors = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__scene && window.__derived && !window.__run.getState().transitioning);
  async function stage(seed, depth, delver = "vagrant") {
    await page.evaluate(({ seed, depth, delver }) => {
      const run = window.__run;
      run.getState().startRun(seed, delver);
      while (run.getState().floor < depth) {
        run.setState({ currentRoomId: run.getState().dungeon.endId, transitioning: true });
        run.getState().roomReady(run.getState().dungeon.endId);
      }
      const s = run.getState();
      run.setState({ currentRoomId: s.dungeon.vaultId, transitioning: true, floorRooms: 0,
        gemRooms: s.dungeon.rooms.map(r => r.id), lastDamageAt: Infinity });
    }, { seed, depth, delver });
    await page.waitForFunction(() => !window.__run.getState().transitioning);
    const frame = await page.evaluate(() => window.__perf.frames);
    await page.waitForFunction(frame => window.__perf.frames >= frame + 3, frame);
  }
  async function sample() {
    return page.evaluate(() => {
      const s = window.__run.getState();
      let rendered = 0;
      window.__scene.traverse(o => { if (o.name === "prop-chest") rendered++; });
      return { rendered, keys: window.__derived.chestKeys(s.currentRoomId), floor: s.floor, target: s.fullCountFloor };
    });
  }
  async function check(label, action) {
    try { await action(); console.log(`PASS ${label}`); }
    catch (error) { failures.push(`${label}: ${error.message}`); console.error(`FAIL ${label}: ${error.message}`); }
  }
  for (const depth of [2, 3]) await check(`a pair completed on floor ${depth} pays on a remaining floor`, async () => {
    await stage(72, depth);
    const before = await sample();
    await page.evaluate(() => { window.__run.getState().addRelic("chit"); window.__run.getState().addRelic("tally"); });
    await page.waitForTimeout(150);
    const after = await sample();
    console.log({ depth, before: before.rendered, after: after.rendered, target: after.target });
    assert.ok(after.rendered > before.rendered, "the earned hoard is present instead of stranded upstairs");
    assert.equal(after.target, depth, "the selected remaining floor is recorded once");
    assert.equal(after.keys.length, after.rendered, "the chest owner and the renderer count the same hoard");
    assert.deepEqual(after.keys.slice(0, before.keys.length), before.keys, "existing chest identities survive the added hoard");
    const geometry = await page.evaluate(async () => {
      const { roomDressingOptions } = await import("/src/game/rooms/dressingContext.ts");
      const { placementsFor, chestKey } = await import("/src/game/rooms/placements.ts");
      const { PROP_SPECS } = await import("/src/game/props/specs.ts");
      const { insideRoom } = await import("/src/game/dungeon/footprint.ts");
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      const options = roomDressingOptions(s, room, s.dungeon.seed);
      const props = placementsFor(room, s.dungeon.seed, options), base = placementsFor(room, s.dungeon.seed, { ...options, brimming: false });
      const obstacles = window.__body.obstaclesFor("ground", room, s.dungeon.seed, s.placed, s.broken, options.sentry, options);
      const missing = props.filter(p => p.kind === "chest" && !obstacles.some(o => Math.hypot(o.x - p.x, o.z - p.z) < .001));
      const index = props.findIndex((p, i) => i >= base.length && p.kind === "chest"), chest = props[index];
      const solids = props.filter(p => PROP_SPECS[p.kind].solid);
      let approach;
      for (let i = 0; i < 32; i++) {
        const angle = i * Math.PI / 16, x = chest.x + Math.cos(angle), z = chest.z + Math.sin(angle);
        if (insideRoom(room, x, z, .4) && solids.every(p => Math.hypot(x - p.x, z - p.z) > PROP_SPECS[p.kind].radius * (p.scale ?? 1) + .35)) {
          approach = [x, 1.5, z]; break;
        }
      }
      if (!approach) throw Error("No clear approach to the extra chest");
      window.__bus.emit("teleport", { position: approach });
      return { missing: missing.length, key: chestKey(room.id, index) };
    });
    assert.equal(geometry.missing, 0, "ground creatures see every drawn chest as an obstacle");
    await page.waitForFunction(() => /Open the chest/.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
    if (process.env.HOARD_REVIEW === "1") {
      await page.getByTestId("moment-descent").waitFor({ state: "detached" });
      await page.screenshot({ path: `output/verification/full-count-floor-${depth}.png` });
    }
    await page.keyboard.press("e");
    await page.waitForFunction(key => window.__run.getState().looted.includes(key), geometry.key);
    assert.ok(await page.evaluate(() => window.__run.getState().satchel.length > 0), "the added hoard is usable through the real interaction");
  });
  await check("an early hoard is shared by the renderer and chest owner", async () => {
    await stage(11, 2);
    await page.evaluate(() => { window.__run.getState().addRelic("chit"); window.__run.getState().addRelic("tally"); });
    await page.waitForTimeout(150);
    const result = await sample();
    console.log({ rendered: result.rendered, chestKeys: result.keys.length, target: result.target });
    assert.equal(result.keys.length, result.rendered);
  });
  await check("the chosen floor persists through descent and resets only with a new run", async () => {
    const state = await page.evaluate(() => {
      const run = window.__run;
      run.getState().startRun(11);
      run.getState().addRelic("chit"); run.getState().addRelic("tally");
      const chosen = run.getState().fullCountFloor;
      const descend = () => { run.setState({ currentRoomId: run.getState().dungeon.endId, transitioning: true }); run.getState().roomReady(run.getState().dungeon.endId); };
      descend();
      const second = run.getState().fullCountFloor;
      run.getState().addRelic("tally"); run.getState().addRelic("rod");
      descend();
      const third = run.getState().fullCountFloor;
      run.getState().startRun(11);
      return { chosen, second, third, restarted: run.getState().fullCountFloor };
    });
    assert.deepEqual(state, { chosen: 2, second: 2, third: 2, restarted: null });
  });
  await check("a full Courier bag blocks chest offers before the key press", async () => {
    await stage(72, 1, "courier");
    await page.evaluate(() => window.__run.setState({ satchel: ["mapping", "mapping"], identified: ["mapping"] }));
    await page.waitForTimeout(150);
    const chests = await page.evaluate(() => Object.entries(window.__triggers).filter(([label]) => label.startsWith("Open the chest")));
    assert.ok(chests.length > 0);
    assert.ok(chests.every(([, row]) => !row.enabled), "the two-slot bag must not advertise another usable chest");
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
