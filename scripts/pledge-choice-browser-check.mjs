import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`, { timeout: 60000 });
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run && !window.__run.getState().transitioning);
  for (const hidden of [false, true]) for (const id of ["unlit", "unbarred", "unspent"]) {
    const fixture = await page.evaluate(async ({ hidden, id }) => {
      const { secretStoryFor } = await import("/src/game/dungeon/secret.ts");
      const { vowAnchors } = await import("/src/game/rooms/anchors.ts");
      const { PLEDGES, pledgeCost } = await import("/src/game/heat/pledge.ts");
      const run = window.__run;
      for (let seed = hidden ? 1 : 4; seed < 80; seed++) {
        run.getState().startRun(seed);
        let dungeon = run.getState().dungeon;
        const found = dungeon.rooms.find(r => hidden ? r.kind === "secret" && secretStoryFor(r, dungeon.seed).flavour === "shrine" : r.kind === "shrine");
        if (!found) continue;
        if (hidden) {
          const host = dungeon.rooms.find(r => r.secret?.to === found.id);
          run.getState().revealSecret(host.id);
          dungeon = run.getState().dungeon;
        }
        const room = dungeon.rooms.find(r => r.id === found.id);
        const index = PLEDGES.findIndex(p => p.id === id), at = vowAnchors(room)[index];
        run.setState({ currentRoomId: room.id, transitioning: true, floorRooms: 0 });
        // Consecutive fixtures may reuse the same mounted room id.
        run.getState().roomReady(room.id);
        return { seed, room: room.id, shape: room.shape, at, name: PLEDGES[index].name,
          alarm: run.getState().alarm, cost: pledgeCost(run.getState().pledgesKept) };
      }
      throw Error("No shrine fixture");
    }, { hidden, id });
    assert.ok(fixture.at, "each pledge has a place in the actual revealed room");
    await page.waitForFunction(() => !window.__run.getState().transitioning);
    await page.waitForFunction(() => Object.keys(window.__triggers).filter(s => s.startsWith("Swear ")).length === 3);
    const stones = await page.evaluate(() => {
      let count = 0;
      window.__scene.traverse(object => {
        const p = object.geometry?.parameters;
        if (p?.width === .5 && p?.height === 1.24 && p?.depth === .22) count++;
      });
      return count;
    });
    assert.equal(stones, 3, "each choice has a visible stone in the mounted scene");
    if (process.env.VOW_REVIEW === "1" && !hidden && id === "unlit") {
      await page.evaluate(async () => {
        const { vowAnchors } = await import("/src/game/rooms/anchors.ts");
        const run = window.__run, s = run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
        const spots = vowAnchors(room), x = spots.reduce((sum, p) => sum + p[0], 0) / spots.length,
          z = spots.reduce((sum, p) => sum + p[2], 0) / spots.length;
        run.setState({ glim: 4, glimUpAt: 0 });
        window.__bus.emit("teleport", { position: [0, 1.5, 0] });
        window.__bus.emit("lookSet", { yaw: Math.atan2(-x, -z), pitch: -.12 });
      });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: "output/verification/vow-stones.png" });
      await page.evaluate(() => window.__run.setState({ glim: 0, glimUpAt: 0 }));
    }
    await page.evaluate(at => window.__bus.emit("teleport", { position: [at[0], 1.5, at[2]] }), fixture.at);
    await page.waitForFunction(name => document.querySelector('[data-testid="prompt-text"]')?.textContent?.startsWith(`Swear ${name}`), fixture.name);
    const legal = await page.evaluate(async () => {
      const { insideRoom } = await import("/src/game/dungeon/footprint.ts");
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      return insideRoom(room, window.__playerDebug.x, window.__playerDebug.z, .3);
    });
    assert.ok(legal, "the selected prompt can be reached while standing inside the physical room");
    await page.keyboard.press("e");
    await page.waitForFunction(id => window.__run.getState().pledge === id, id);
    const after = await page.evaluate(() => ({ alarm: window.__run.getState().alarm, choices: Object.keys(window.__triggers).filter(s => s.startsWith("Swear ")).length }));
    assert.equal(after.alarm, fixture.alarm + fixture.cost);
    await page.waitForFunction(() => !Object.keys(window.__triggers).some(s => s.startsWith("Swear ")));
    console.log(`PASS ${hidden ? "hidden" : "ordinary"} ${fixture.shape} shrine: ${fixture.name} selected through its physical prompt`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
