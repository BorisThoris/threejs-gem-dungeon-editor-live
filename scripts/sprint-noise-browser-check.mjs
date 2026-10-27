/** A real keyboard sprint must tell the Warden, then fall quiet again. */
import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const port = process.argv[2] || process.env.PORT || "5199";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const room = await page.evaluate(() => {
    window.__run.getState().startRun(31337);
    const state = window.__run.getState();
    const far = state.dungeon.rooms.find(candidate => candidate.id !== state.currentRoomId && candidate.id !== state.dungeon.endId);
    window.__run.setState({ alarm: 0, wardenRoomId: far.id });
    window.__bus.emit("teleport", { position: [0, 1.5, 0], yaw: 0 });
    window.__bus.emit("lookSet", { yaw: 0, pitch: 0 });
    return state.currentRoomId;
  });
  await page.waitForFunction(() => window.__run.getState().phase === "playing" && !window.__run.getState().transitioning &&
    Math.hypot(window.__playerDebug.x, window.__playerDebug.z) < 0.1);
  assert.equal(await page.evaluate(() => window.__derived.hears()), false, "the floor starts quiet");
  await page.mouse.click(640, 400);
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyW");
  try {
    await page.waitForFunction(() => window.__derived.hears() && window.__derived.hunts(), null, { timeout: 5000 });
  } finally {
    await page.keyboard.up("KeyW");
    await page.keyboard.up("ShiftLeft");
  }
  const heard = await page.evaluate(() => ({ player: window.__playerDebug,
    noiseFor: window.__run.getState().noisyUntil - window.__derived.clock() }));
  assert.ok(heard.noiseFor > 0 && Math.hypot(heard.player.x, heard.player.z) > 0.1,
    `the sprint moved and made noise: ${JSON.stringify(heard)}`);
  await page.waitForFunction(() => !window.__derived.hears() && !window.__derived.hunts(), null, { timeout: 9000 });
  const toggleMode = async () => {
    await page.evaluate(() => window.__run.getState().pause());
    await page.getByTestId("opt-sprint").click();
    await page.getByRole("button", { name: "Resume", exact: true }).click();
  };
  const resetPosition = async () => {
    await page.evaluate(() => {
      window.__bus.emit("teleport", { position: [0, 1.5, 0], yaw: 0 });
      window.__bus.emit("lookSet", { yaw: 0, pitch: 0 });
      window.__run.setState({ noisyUntil: 0 });
    });
    await page.waitForFunction(() => Math.hypot(window.__playerDebug.x, window.__playerDebug.z) < 0.1);
  };
  await toggleMode(); // hold -> press
  await resetPosition();
  await page.keyboard.press("ShiftLeft");
  await page.keyboard.down("KeyW");
  try {
    await page.waitForFunction(() => window.__derived.hears());
  } finally { await page.keyboard.up("KeyW"); }
  console.log("PASS press-to-sprint keeps running after the sprint key is released");
  await toggleMode(); // press -> hold; forget the previous toggle
  await toggleMode(); // hold -> press; start walking until explicitly toggled
  await resetPosition();
  await page.keyboard.down("KeyW");
  try {
    await page.waitForFunction(() => Math.hypot(window.__playerDebug.x, window.__playerDebug.z) > 0.5);
    assert.equal(await page.evaluate(() => window.__derived.hears()), false,
      "changing sprint mode away and back cannot restore an old toggle or alert the Warden");
  } finally { await page.keyboard.up("KeyW"); }
  console.log("PASS switching sprint modes resets the old toggle: fresh movement stays quiet");
  await toggleMode(); // back to hold for the readout cases
  for (const effect of ["none", "swift", "mire"]) {
    await page.evaluate(effect => {
      const s = window.__run.getState(), until = window.__derived.clock() + 30;
      window.__run.setState({ effects: { ...s.effects, swift: effect === "swift" ? until : 0,
        mire: effect === "mire" ? until : 0 }, wardenRoomId: null, harrierSlain: true });
    }, effect);
    for (const sprint of [false, true]) {
      await resetPosition();
      if (sprint) await page.keyboard.down("ShiftLeft");
      // Arm observation before pressing Forward: a tool round trip under
      // software rendering can otherwise consume the entire clear lane.
      const observation = page.evaluate(async () => {
        const { playerAt } = await import('/src/game/player/where.ts');
        const s = window.__run.getState();
        const half = s.dungeon.rooms.find(room => room.id === s.currentRoomId).size / 2;
        const samples = [], deadline = performance.now() + 8000;
        let started = false;
        while (samples.length < 12 && performance.now() < deadline) {
          await new Promise(resolve => requestAnimationFrame(resolve));
          if (!started && playerAt.speed < 0.2) continue;
          started = true;
          samples.push({ ...playerAt, heard: window.__derived.hears(),
            hud: document.querySelector('[data-testid="stealth-status"]').textContent });
          if (samples.length >= 3 && Math.abs(playerAt.z) >= half - 2) break;
        }
        return samples;
      });
      await page.keyboard.down("KeyW");
      try {
        const samples = await observation;
        // A slow renderer can reach the wall during this sample window. Its
        // correctly stopped body must not be asked to keep saying walking.
        // Read movement, noise and text together, before another tool round
        // trip can move the player beyond the observations being asserted.
        const moving = samples.filter(sample => sample.speed >= 0.2);
        assert.ok(moving.length >= 3, `${effect}: at least three moving frames exercise the readout: ${JSON.stringify(samples)}`);
        assert.ok(moving.every(sample => sample.gait === (sprint ? "running" : "walking")),
          `${effect}: gait stays readable between physics steps: ${JSON.stringify(samples)}`);
        assert.ok(moving.some(sample => (sprint ? /running/ : /walking/).test(sample.hud)),
          `${effect}: the readout identifies the moving gait, not a guessed speed threshold: ${JSON.stringify(samples)}`);
        assert.ok(moving.every(sample => sample.heard === sprint),
          `${effect}: only actual running makes fresh sprint noise`);
      } finally {
        await page.keyboard.up("KeyW");
        await page.keyboard.up("ShiftLeft");
      }
      await page.getByTestId("stealth-status").filter({ hasText: "still" }).waitFor();
    }
  }
  console.log("PASS walking/running readout agrees with actual noise under normal, swift and mire movement");
  assert.deepEqual(errors, [], "no browser errors");
  console.log(`PASS keyboard sprint in ${room} moves, alerts the Warden, and becomes quiet again`);
} finally {
  await browser.close();
}
