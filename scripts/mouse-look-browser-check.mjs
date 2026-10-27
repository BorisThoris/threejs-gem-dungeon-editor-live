import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const port = process.argv[2] ?? process.env.PORT ?? "5199";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox", "--mute-audio"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__look && !window.__run.getState().transitioning);
  await page.mouse.click(640, 400);
  await page.waitForFunction(() => !!document.pointerLockElement);
  const boundary = await page.evaluate(() => {
    const before = { ...window.__look };
    window.__run.setState({ transitioning: true });
    document.dispatchEvent(new MouseEvent("mousemove", { movementX: 150, movementY: 25, bubbles: true }));
    const during = { ...window.__look };
    window.__run.setState({ transitioning: false });
    document.dispatchEvent(new MouseEvent("mousemove", { movementX: 25, movementY: 10, bubbles: true }));
    return { before, during, after: { ...window.__look }, locked: !!document.pointerLockElement };
  });
  assert.ok(boundary.locked, "the input boundary is tested with an actual pointer lock");
  assert.deepEqual(boundary.during, boundary.before, "room-loading mouse movement must not turn the camera");
  assert.notEqual(boundary.after.yaw, boundary.before.yaw, "ordinary locked mouse movement still turns");
  const travel = await page.evaluate(() => {
    const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
    const dir = Object.keys(room.links).find(d => ![s.dungeon.endId, s.dungeon.vaultId].includes(room.links[d]));
    if (!dir) throw Error("Start-room fixture needs an ordinary doorway");
    window.__bus.emit("lookSet", { yaw: 1.234, pitch: 0.3 });
    s.travel(dir);
    return { room: room.links[dir], expected: { yaw: 1.234, pitch: 0.3 } };
  });
  await page.waitForFunction(id => window.__run.getState().currentRoomId === id && !window.__run.getState().transitioning, travel.room);
  assert.deepEqual(await page.evaluate(() => ({ ...window.__look })), travel.expected,
    "ordinary door travel preserves the player's yaw and pitch");
  await page.keyboard.press("Escape");
  await page.getByTestId("pause-menu").waitFor();
  const paused = await page.evaluate(() => {
    const before = { ...window.__look };
    document.dispatchEvent(new MouseEvent("mousemove", { movementX: 300, movementY: 200 }));
    return { before, after: { ...window.__look } };
  });
  assert.deepEqual(paused.after, paused.before, "menu pointer movement does not rotate the view");
  await page.getByTestId("pause-resume").click();
  await page.waitForFunction(() => !!document.pointerLockElement);
  assert.deepEqual(await page.evaluate(() => ({ ...window.__look })), paused.before,
    "resuming does not reset or accumulate menu movement");
  console.log("PASS mouse look: real lock, loading boundary, live movement, preserved doorway heading and pause/resume");
} finally { await browser.close(); }
