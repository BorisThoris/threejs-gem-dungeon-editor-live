import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

mkdirSync("output/world-review", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5208"}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  for (const dir of ["north", "south", "east", "west"]) {
    const fixture = await page.evaluate(async dir => {
      const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
      const { corridorOffset, doorReach } = await import("/src/game/dungeon/footprint.ts");
      const { DIR_STEP, DIR_YAW } = await import("/src/game/dungeon/types.ts");
      for (let seed = 1; seed < 300; seed++) {
        const dungeon = generateDungeon({ seed, floor: 3 });
        const room = dungeon.rooms.find(r => r.kind === "normal" && r.wingProfiles?.[dir] === "apse");
        if (!room) continue;
        const axis = DIR_STEP[dir], shift = corridorOffset(room, dir), half = room.size / 2;
        window.__run.setState({ dungeon, floor: 3, currentRoomId: room.id, visited: [room.id], transitioning: false,
          paused: false, inputLocks: 0, wardenRoomId: null, wardenAwake: false, harrierSlain: true,
          thiefPhase: "away", reaperAwake: false, invulnerableUntil: 1e9, gemRooms: [], glim: 26 });
        window.__bus.emit("teleport", { position: [axis.x * (half - 1) + (axis.x ? 0 : shift), 1.5,
          axis.z * (half - 1) + (axis.x ? shift : 0)] });
        window.__bus.emit("lookSet", { yaw: DIR_YAW[dir], pitch: -0.14 });
        return { roomId: room.id, axis, shift, half, reach: doorReach(room, dir), dir };
      }
      throw Error(`No ${dir} apse`);
    }, dir);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `output/world-review/apse-${dir}.png` });
    await page.keyboard.down("KeyW");
    await page.waitForFunction(({ axis, reach }) => window.__playerDebug.x * axis.x + window.__playerDebug.z * axis.z > reach - 1,
      fixture, { timeout: 20000 });
    await page.waitForTimeout(400);
    await page.keyboard.up("KeyW");
    assert.ok(Math.abs(await page.evaluate(() => window.__playerDebug.y) - 2.3) < 0.15, "the shaped ramp supports the player at full landing height");
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(1200);
    await page.keyboard.up("KeyD");
    assert.ok(await page.evaluate(async ({ axis, shift, dir, roomId }) => {
      const { insideRoom, wingWidthAt } = await import("/src/game/dungeon/footprint.ts");
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === roomId), p = window.__playerDebug;
      const along = p.x * axis.x + p.z * axis.z, across = (axis.x ? p.z : p.x) - shift;
      return s.currentRoomId === roomId && insideRoom(room, p.x, p.z, 0.25) && Math.abs(across) < wingWidthAt(room, dir, along) / 2;
    }, fixture), "the tapered side wall holds the player inside the rounded landing");
    // Return through the widening courses using actual backward movement.
    await page.keyboard.down("KeyS");
    await page.waitForFunction(({ axis, half }) => window.__playerDebug.x * axis.x + window.__playerDebug.z * axis.z < half - 0.8,
      fixture, { timeout: 20000 });
    await page.keyboard.up("KeyS");
    await page.waitForTimeout(500);
    assert.ok(Math.abs(await page.evaluate(() => window.__playerDebug.y) - 1.1) < 0.15, "the player descends through the apse mouth to the original chamber");
  }
  assert.deepEqual(errors, [], "no runtime or shader errors");
  console.log("PASS apses: all four orientations, real ramp ascent/descent, tapered wall collision and rendered review");
} finally { await browser.close(); }
