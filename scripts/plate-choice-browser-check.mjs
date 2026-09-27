import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
let page;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run && !window.__run.getState().transitioning);
  let sequence = 0;
  const stage = async (keys = 1) => {
    const f = await page.evaluate(async ({ seed, keys }) => {
      const { challengeAnchors } = await import("/src/game/puzzles/anchors.ts");
      const { SET_PIECE_GEMS } = await import("/src/game/world.ts");
      const { veinsShowing } = await import("/src/game/state/run.ts");
      const run = window.__run;
      let room;
      for (; seed < 1000; seed++) {
        run.getState().startRun(seed);
        room = run.getState().dungeon.rooms.find(r => r.kind === "challenge");
        if (room) break;
      }
      if (!room) throw new Error("No generated challenge fixture");
      run.setState({ currentRoomId: room.id, transitioning: true, keys, gems: 0,
        gemRooms: run.getState().dungeon.rooms.map(r => r.id), lastDamageAt: -Infinity, lives: 3 });
      const [exit, next] = Object.entries(room.links).find(([, id]) => id !== run.getState().dungeon.vaultId);
      const neighbor = run.getState().dungeon.rooms.find(r => r.id === next);
      const back = Object.keys(neighbor.links).find(dir => neighbor.links[dir] === room.id);
      return { room: room.id, anchors: challengeAnchors(room),
        reward: SET_PIECE_GEMS * (veinsShowing(run.getState()) ? 2 : 1), exit, next, back };
    }, { seed: ++sequence * 100, keys });
    await page.waitForFunction(({ room, anchors }) => {
      const s = window.__run.getState();
      const idol = Object.entries(window.__triggers ?? {}).find(([label]) => label.startsWith("Pick up the idol"))?.[1];
      return s.currentRoomId === room && !s.transitioning && window.__carry.carriedId() === null && idol
        && Math.hypot(idol.x - anchors[0][0], idol.z - anchors[0][2]) < 0.1;
    }, f);
    return f;
  };
  const approach = async (at, distance) => {
    const d = Math.hypot(at[0], at[2]);
    const x = at[0] - at[0] / d * distance;
    const z = at[2] - at[2] / d * distance;
    const yaw = Math.atan2(-(at[0] - x), -(at[2] - z));
    await page.evaluate(({ x, z, yaw }) => {
      window.__bus.emit("teleport", { position: [x, 1.5, z], yaw });
      window.__bus.emit("lookSet", { yaw, pitch: -0.25 });
    }, { x, z, yaw });
    await page.waitForFunction(({ x, z }) => Math.hypot(window.__playerDebug.x - x, window.__playerDebug.z - z) < 0.35, { x, z });
  };
  const prompt = async text => {
    try {
      await page.waitForFunction(text =>
        document.querySelector('[data-testid="prompt-text"]')?.textContent.includes(text), text);
    } catch (error) {
      console.error(await page.evaluate(() => ({ prompt: document.querySelector('[data-testid="prompt-text"]')?.textContent,
        triggers: window.__triggers, player: window.__playerDebug, carried: window.__carry.carriedId() })));
      throw error;
    }
  };
  const keyOfferGone = async () => page.waitForFunction(() =>
    !Object.keys(window.__triggers ?? {}).some(label => label.startsWith("Set the iron key")));

  // A player who already brought a free weight must be able to take the
  // idol with E, without a coincident key trigger taking that press.
  const candle = await stage();
  await approach(candle.anchors[1], 1.6);
  await prompt("Pick up the candle");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__carry.carriedId() === "candle-0");
  await approach(candle.anchors[0], 2.6);
  await prompt("Put down the candle");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => document.body.innerText.includes("Something else is holding the plate down"));
  await keyOfferGone();
  await approach(candle.anchors[0], 1.9);
  await prompt("the plate is held: it comes away safely");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(room => window.__run.getState().cleared.includes(room), candle.room);
  await keyOfferGone();
  assert.deepEqual(await page.evaluate(() => {
    const s = window.__run.getState();
    return { keys: s.keys, gems: s.gems, lives: s.lives, onPlate: s.keyOnPlateIn };
  }), { keys: 1, gems: candle.reward, lives: 3, onPlate: null });
  assert.equal(await page.evaluate(room => window.__run.getState().setKeyOnPlate(room), candle.room), false,
    "a completed puzzle cannot consume a key");
  await page.evaluate(dir => window.__run.getState().travel(dir), candle.exit);
  await page.waitForFunction(room => window.__run.getState().currentRoomId === room && !window.__run.getState().transitioning, candle.next);
  await page.evaluate(dir => window.__run.getState().travel(dir), candle.back);
  await page.waitForFunction(room => window.__run.getState().currentRoomId === room && !window.__run.getState().transitioning, candle.room);
  await approach(candle.anchors[0], 1.9);
  await prompt("already yours");
  await keyOfferGone();
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__carry.carriedId() === "idol");
  assert.equal(await page.evaluate(() => window.__run.getState().keys), 1, "returning to the solved room keeps the key");
  assert.equal(await page.evaluate(() => window.__run.getState().gems), candle.reward, "a solved idol never pays twice");
  console.log("PASS candle solves the plate through E while preserving the carried key");

  const key = await stage();
  await approach(key.anchors[0], 1.9);
  await prompt("Set the iron key on the plate");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(room => window.__run.getState().keyOnPlateIn === room, key.room);
  await prompt("the plate is held: it comes away safely");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(room => window.__run.getState().cleared.includes(room), key.room);
  assert.deepEqual(await page.evaluate(() => {
    const s = window.__run.getState();
    return { keys: s.keys, gems: s.gems, lives: s.lives };
  }), { keys: 0, gems: key.reward, lives: 3 });
  console.log("PASS choosing the key spends one key and awards the same safe idol reward");

  const failed = await stage(0);
  await approach(failed.anchors[0], 1.9);
  await prompt("the plate is bare: this springs the trap");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(room => window.__run.getState().failed.includes(room), failed.room);
  await page.evaluate(() => window.__run.setState({ keys: 1 }));
  await keyOfferGone();
  assert.equal(await page.evaluate(room => window.__run.getState().setKeyOnPlate(room), failed.room), false,
    "a spent trap cannot consume a newly found key");
  assert.equal(await page.evaluate(() => window.__run.getState().gems), 0);
  assert.equal(await page.evaluate(() => window.__run.getState().keys), 1);
  assert.equal(await page.evaluate(() => window.__run.getState().lives), 2);
  assert.deepEqual(errors, []);
  console.log("PASS spent plates stop offering an irreversible key sacrifice");
} catch (error) {
  if (page) console.error(await page.evaluate(() => {
    const s = window.__run.getState();
    return { prompt: document.querySelector('[data-testid="prompt-text"]')?.textContent,
      triggers: window.__triggers, player: window.__playerDebug, carried: window.__carry.carriedId(),
      phase: s.phase, paused: s.paused, transitioning: s.transitioning, locks: s.inputLocks,
      keys: s.keys, cleared: s.cleared, failed: s.failed };
  }));
  throw error;
} finally { await browser.close(); }
