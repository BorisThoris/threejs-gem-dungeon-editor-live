import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run && !window.__run.getState().transitioning);
  const cases = await page.evaluate(async () => {
    const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
    const { surfaceOf } = await import("/src/game/din/emissions.ts");
    const found = new Map();
    for (let seed = 1; seed < 500 && found.size < 5; seed++) {
      const d = generateRunFloor(seed, 1);
      const room = d.rooms.find(r => Object.values(r.links).includes(d.vaultId));
      if (!room) continue;
      const dir = Object.keys(room.links).find(dir => room.links[dir] === d.vaultId);
      if (!found.has(dir)) found.set(dir, { seed, dir, tile: surfaceOf(room) === "tile" });
      if (surfaceOf(room) === "tile" && !found.has("tile")) found.set("tile", { seed, dir, tile: true });
    }
    return [...found.values()];
  });
  assert.equal(new Set(cases.map(c => c.dir)).size, 4, "generated fixtures cover all four door orientations");
  assert.ok(cases.some(c => c.tile), "one fixture distinguishes wall wiring from glazed-floor placement");
  const stage = async (seed, relics = [], keys = 1) => {
    const fixture = await page.evaluate(async ({ seed, relics, keys }) => {
      const { doorPosition, vaultMechanismPosition } = await import("/src/game/dungeon/layout.ts");
      const { DIR_STEP } = await import("/src/game/dungeon/types.ts");
      const run = window.__run;
      run.getState().startRun(seed);
      const d = run.getState().dungeon;
      const room = d.rooms.find(r => Object.values(r.links).includes(d.vaultId));
      const dir = Object.keys(room.links).find(dir => room.links[dir] === d.vaultId);
      const step = DIR_STEP[dir];
      const latch = vaultMechanismPosition(room, dir);
      const door = doorPosition(room, dir);
      run.setState({ currentRoomId: room.id, transitioning: true, keys, relics, satchel: ["snare", "snare"],
        identified: ["snare"], lastDamageAt: Infinity, floorRooms: 0, gemRooms: d.rooms.map(r => r.id) });
      run.getState().roomReady(room.id);
      return { room: room.id, vault: d.vaultId, dir, yaw: Math.atan2(-step.x, -step.z),
        latch: [latch[0] - step.x * 1.4, 1.5, latch[2] - step.z * 1.4],
        door: [door[0] - step.x * 0.8, 1.5, door[2] - step.z * 0.8] };
    }, { seed, relics, keys });
    await page.waitForFunction(() => Object.keys(window.__triggers ?? {}).some(label => label.startsWith("Wire the vault mechanism")));
    return fixture;
  };
  const teleport = async position => {
    await page.evaluate(position => window.__bus.emit("teleport", { position }), position);
    await page.waitForFunction(([x, , z]) => Math.hypot(window.__playerDebug.x - x, window.__playerDebug.z - z) < 0.3, position);
  };
  for (const fixture of cases) {
    const keys = fixture.tile ? 0 : 1;
    const f = await stage(fixture.seed, [], keys);
    await teleport([0, 1.5, 0]);
    assert.equal(await page.evaluate(() => window.__run.getState().wireVault()), false, "the latch cannot be wired remotely");
    if (fixture.tile) {
      assert.equal(await page.evaluate(() => window.__run.getState().placeDevice(0)), false, "a ground snare still skids on glaze");
    }
    await teleport(f.latch);
    await page.waitForFunction(() => /Wire the vault mechanism/.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
    if (fixture.tile) {
      await page.evaluate(() => window.__run.setState({ identified: [] }));
      await page.waitForFunction(() => /Use a known Wire Snare/.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
      assert.equal(await page.evaluate(() => window.__run.getState().wireVault()), false, "the mechanism cannot identify an unknown device for free");
      assert.deepEqual(await page.evaluate(() => window.__run.getState().satchel), ["snare", "snare"]);
      await page.evaluate(() => window.__run.setState({ identified: ["snare"] }));
      await page.waitForFunction(() => /Wire the vault mechanism/.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
    }
    if (fixture === cases[0]) {
      await page.evaluate(yaw => {
        window.__bus.emit("lookSet", { yaw, pitch: -0.25 });
        window.__run.getState().toggleLantern();
      }, f.yaw);
      await page.waitForTimeout(350);
      await page.screenshot({ path: "output/verification/vault-wire.png" });
    }
    const paused = await page.evaluate(() => {
      const run = window.__run;
      run.getState().pause();
      const result = run.getState().wireVault();
      run.getState().resume();
      return result;
    });
    assert.equal(paused, false, "paused play cannot spend wire");
    await page.keyboard.press("KeyE");
    await page.waitForFunction(vault => window.__run.getState().unlocked.includes(vault), f.vault);
    await page.getByText("Wire Snare. Spent holding the vault mechanism for one entry.", { exact: true }).waitFor();
    const wired = await page.evaluate(() => {
      const run = window.__run;
      const repeat = run.getState().wireVault();
      const s = run.getState();
      return { repeat, keys: s.keys, satchel: s.satchel, live: s.placed.filter(d => d.live).length,
        spent: s.floorRecord.spentAnItem, identified: s.identified.includes("snare") };
    });
    assert.deepEqual(wired, { repeat: false, keys, satchel: ["snare"], live: 0, spent: true, identified: true },
      "one wire opens the mechanism, counts for the vow, and cannot also catch a creature");
    await teleport(f.door);
    await page.waitForFunction(() => /Open the vault/.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
    await page.keyboard.press("KeyE");
    await page.waitForFunction(vault => window.__run.getState().currentRoomId === vault && !window.__run.getState().transitioning, f.vault);
    assert.equal(await page.evaluate(vault => window.__run.getState().unlocked.includes(vault), f.vault), false,
      "wire buys one entry, then the mechanism resets");
    assert.equal(await page.evaluate(() => window.__run.getState().keys), keys, "wire entry works without a key and preserves any key carried");
    console.log(`PASS wire entry at ${fixture.dir} vault${fixture.tile ? " above glazed floor" : ""}`);
  }
  for (const seal of [false, true]) {
    const f = await stage(cases[0].seed, seal ? ["cut"] : []);
    await teleport(f.door);
    await page.waitForFunction(() => /Unlock the vault/.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
    assert.match(await page.getByTestId("prompt-text").innerText(), seal ? /keep your key with Company Seal/ : /spend 1 iron key/);
    await page.keyboard.press("KeyE");
    await page.waitForFunction(vault => window.__run.getState().currentRoomId === vault && !window.__run.getState().transitioning, f.vault);
    assert.equal(await page.evaluate(() => window.__run.getState().keys), seal ? 1 : 0);
    assert.deepEqual(await page.evaluate(() => window.__run.getState().satchel), ["snare", "snare"], "choosing the key leaves wire for combat");
  }
  assert.deepEqual(errors, []);
  console.log("PASS vault choices: wire, ordinary key and Company Seal spend exactly the offered resource");
} finally { await browser.close(); }
