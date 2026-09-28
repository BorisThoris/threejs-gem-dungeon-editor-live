import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
const rows = [];
try {
  for (const fps of [30, 60, 144, 240]) {
    const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
    await page.getByTestId("menu-start").click();
    await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
    await page.evaluate(() => window.__run.getState().startRun(11));
    await page.waitForFunction(() => !window.__run.getState().transitioning);
    await page.evaluate(() => {
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      const fixture = { ...room, size: 20, shape: "square", links: {}, wings: {}, biome: "hewn" };
      window.__run.setState({ dungeon: { ...s.dungeon, rooms: s.dungeon.rooms.map(r => r.id === room.id ? fixture : r) },
        wardenRoomId: null, harrierSlain: true, reaperAwake: false, invulnerableUntil: 1e9 });
      window.__bus.emit("teleport", { position: [5, 1.5, 3] });
    });
    await page.waitForTimeout(300);
    await page.locator("canvas").click();
    await page.waitForFunction(() => document.pointerLockElement === document.querySelector("canvas"));
    await page.evaluate(() => {
      // Drive the mounted game's public R3F clock, including its real Rapier
      // stepper, rather than depending on the host monitor's refresh rate.
      let root;
      window.__scene.traverse(object => { root ??= object.__r3f?.root; });
      if (!root) throw Error("No mounted R3F root");
      window.__strideRoot = root;
      root.getState().setFrameloop("never");
      window.__bus.emit("lookSet", { yaw: -Math.PI / 2, pitch: 0 });
      window.__strideSteps = 0;
      const step = window.__sfx.step;
      window.__sfx.step = (...args) => { window.__strideSteps++; step(...args); };
      // This check measures movement, not pixels; the existing collision and
      // screenshot checks exercise the same scene with rendering enabled.
      root.getState().gl.render = () => {};
      window.__strideTime = 0;
    });
    let distance = 0;
    const speeds = [];
    await page.keyboard.down("ShiftLeft");
    for (let leg = 0; leg < 4; leg++) {
      const key = leg % 2 ? "KeyS" : "KeyW";
      await page.keyboard.down(key);
      const measured = await page.evaluate(async fps => {
        const { playerAt } = await import("/src/game/player/where.ts");
        const state = window.__strideRoot.getState(), speeds = [];
        let distance = 0, x = window.__playerDebug.x, z = window.__playerDebug.z;
        for (let frame = 0; frame < Math.round(fps * 0.4); frame++) {
          window.__strideTime += 1 / fps;
          state.advance(window.__strideTime);
          const p = window.__playerDebug;
          distance += Math.hypot(p.x - x, p.z - z); x = p.x; z = p.z;
          if (frame > 2) speeds.push(playerAt.speed);
        }
        return { distance, speeds };
      }, fps);
      await page.keyboard.up(key);
      distance += measured.distance;
      speeds.push(...measured.speeds);
    }
    await page.keyboard.up("ShiftLeft");
    rows.push({ fps, distance, steps: await page.evaluate(() => window.__strideSteps),
      minSpeed: Math.min(...speeds), maxSpeed: Math.max(...speeds) });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(rows);
  for (const row of rows) {
    assert.ok(row.distance > 10 && row.distance < 14, `${row.fps} fps traverses the actual clear lane`);
    assert.ok(row.steps >= 5 && row.steps <= 7, `${row.fps} fps keeps footsteps in pace with the same distance`);
    assert.ok(row.minSpeed > 7.8 && row.maxSpeed < 8.2, `${row.fps} fps publishes physical speed, not render-frame pulses`);
  }
  assert.ok(Math.max(...rows.map(r => r.steps)) - Math.min(...rows.map(r => r.steps)) <= 1,
    "the same journey has the same stride count across frame rates, within one boundary step");
  console.log("PASS real Rapier travel, footstep cadence and measured player speed at 30/60/144/240 fps");
} finally { await browser.close(); }
