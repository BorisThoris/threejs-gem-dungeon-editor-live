/** Movement-based loop probe. Uses the full generated map to plan, but never
 * teleports, replenishes lives, or writes gameplay state after starting.
 * This establishes traversal/economy evidence, not a human playtest. */
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
const errors = [];
page.setDefaultTimeout(30000);
page.on("pageerror", (e) => errors.push(String(e)));
const snapshot = () => page.evaluate(() => {
  const s = window.__run.getState();
  return { phase: s.phase, floor: s.floor, gems: s.gems, lives: s.lives, roomId: s.currentRoomId,
    dungeon: s.dungeon, collected: s.gemRooms, transitioning: s.transitioning, paused: s.paused, inputLocks: s.inputLocks,
    player: window.__playerDebug, toll: window.__derived.toll(),
    shoveReady: s.shoveReadyAt <= window.__derived.clock(),
    threats: [s.wardenRoomId === s.currentRoomId ? window.__warden : null,
      window.__harrier?.room === s.currentRoomId && !window.__harrier.away && !window.__harrier.down ? window.__harrier : null].filter(Boolean) };
});

async function walkTo(target) {
  const plan = await page.evaluate(async (target) => {
    const { roomSegmentClear, insideRoom, doorReach } = await import("/src/game/dungeon/footprint.ts");
    const { obstaclesFor, bitesFor } = await import("/src/game/mobs/body.ts");
    const { trapsFor } = await import("/src/game/traps/placement.ts");
    const s = window.__run.getState(), room = s.dungeon.rooms.find((r) => r.id === s.currentRoomId);
    const start = { x: window.__playerDebug.x, z: window.__playerDebug.z };
    const blockers = [...obstaclesFor("ground", room, s.dungeon.seed, s.placed, s.broken),
      ...bitesFor("ground", room, s.dungeon.seed, s.placed, s.sprung),
      ...trapsFor(room, s.dungeon.seed, s.dungeon.endId).filter((t) => t.kind !== "grate").map((t) => ({ ...t, r: 1.1 }))];
    const clear = (a, b) => roomSegmentClear(room, a.x, a.z, b.x, b.z, 0.55) && blockers.every((p) => {
      const dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t) > p.r + 0.12;
    });
    const spacing = 0.75, nodes = [], byGrid = new Map();
    const reach = Math.max(...["north", "south", "east", "west"].map((dir) => doorReach(room, dir)));
    const n = Math.ceil(reach / spacing);
    for (let ix = -n; ix <= n; ix++) for (let iz = -n; iz <= n; iz++) {
      const p = { x: ix * spacing, z: iz * spacing, ix, iz };
      if (insideRoom(room, p.x, p.z, 0.55) && clear(p, p)) {
        byGrid.set(`${ix},${iz}`, nodes.length); nodes.push(p);
      }
    }
    const queue = [], previous = new Map();
    for (let i = 0; i < nodes.length; i++) if (Math.hypot(nodes[i].x - start.x, nodes[i].z - start.z) < 1.5 && clear(start, nodes[i])) {
      queue.push(i); previous.set(i, -1);
    }
    let end;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const index = queue[cursor], a = nodes[index];
      if (Math.hypot(a.x - target.x, a.z - target.z) < 1.5 && clear(a, target)) { end = index; break; }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const next = byGrid.get(`${a.ix + dx},${a.iz + dz}`);
        if (next !== undefined && !previous.has(next) && clear(a, nodes[next])) { previous.set(next, index); queue.push(next); }
      }
    }
    if (clear(start, target)) return [target];
    if (end === undefined) return null;
    const path = [target];
    for (let index = end; index !== -1; index = previous.get(index)) path.unshift(nodes[index]);
    const smooth = [], points = [start, ...path];
    for (let i = 0; i < points.length - 1;) {
      let j = points.length - 1;
      while (j > i + 1 && !clear(points[i], points[j])) j--;
      smooth.push(points[j]); i = j;
    }
    return smooth;
  }, target);
  assert.ok(plan, `no safe navigation path to ${JSON.stringify(target)}`);
  const initial = await snapshot();
  await page.keyboard.down("KeyW");
  try {
    for (const point of plan) {
      const deadline = Date.now() + 25000;
      let lastDistance = Infinity, stuckSince = Date.now();
      while (true) {
        const s = await snapshot();
        if (s.phase !== "playing" || s.roomId !== initial.roomId) throw new Error(`walk interrupted: ${s.phase}, lives ${s.lives}`);
        const threat = s.threats.find((p) => Math.hypot(p.x - s.player.x, p.z - s.player.z) < 2.8);
        if (process.env.WALK_SHOVE !== "off" && s.shoveReady && threat) {
          await page.keyboard.up("KeyW");
          await page.evaluate((yaw) => window.__bus.emit("lookSet", { yaw, pitch: 0 }), Math.atan2(s.player.x - threat.x, s.player.z - threat.z));
          await page.keyboard.press("Space");
          await page.waitForTimeout(80);
          await page.keyboard.down("KeyW");
        }
        const dx = point.x - s.player.x, dz = point.z - s.player.z, distance = Math.hypot(dx, dz);
        if (distance < 0.55) break;
        if (distance < lastDistance - 0.1) { stuckSince = Date.now(); lastDistance = distance; }
        if (Date.now() > deadline || Date.now() - stuckSince > 5000) throw new Error(`movement stuck in ${s.roomId}: ${JSON.stringify({ player: s.player, point, distance })}`);
        await page.evaluate((yaw) => window.__bus.emit("lookSet", { yaw, pitch: 0 }), Math.atan2(-dx, -dz));
        await page.waitForTimeout(120);
      }
    }
  } finally { await page.keyboard.up("KeyW"); }
}

function route(s, to) {
  const queue = [s.roomId], prev = new Map([[s.roomId, null]]);
  for (let i = 0; i < queue.length && !prev.has(to); i++) {
    const room = s.dungeon.rooms.find((r) => r.id === queue[i]);
    for (const [dir, next] of Object.entries(room.links)) {
      if (next === s.dungeon.vaultId || room.secret?.dir === dir || prev.has(next)) continue;
      prev.set(next, room.id); queue.push(next);
    }
  }
  if (!prev.has(to)) return null;
  const path = [];
  for (let id = to; id !== null; id = prev.get(id)) path.unshift(id);
  return path;
}

try {
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5200"}/`);
  await page.waitForFunction(() => window.__run && window.__derived);
  page.on("console", (message) => { if (message.text().startsWith("WALK ")) console.log(message.text()); });
  await page.evaluate(() => {
    for (const event of ["damaged", "wardenStruck", "harrierStruck", "keeperStruck", "reaperStruck", "notice"]) {
      window.__bus.on(event, (detail) => {
        const s = window.__run.getState();
        console.log("WALK " + JSON.stringify({ event, detail, floor: s.floor, room: s.currentRoomId, lives: s.lives }));
      });
    }
  });
  await page.evaluate((seed) => window.__run.getState().startRun(seed), Number(process.env.WALK_SEED ?? 11));
  await page.waitForFunction(() => window.__playerDebug);
  const initialFloor = 1, stopFloor = Number(process.env.WALK_FLOORS ?? 3) + initialFloor;
  let doors = 0;
  while (true) {
    await page.waitForFunction(() => !window.__run.getState().transitioning);
    const s = await snapshot();
    console.log(JSON.stringify({ floor: s.floor, room: s.roomId, gems: s.gems, lives: s.lives, phase: s.phase }));
    if (s.floor >= stopFloor || s.phase === "won") break;
    assert.equal(s.phase, "playing", "walker survives with earned resources");
    assert.ok(doors < 80, "route completes within room budget");
    const room = s.dungeon.rooms.find((r) => r.id === s.roomId);
    const gem = await page.evaluate(() => {
      const s = window.__run.getState(), room = s.dungeon.rooms.find((r) => r.id === s.currentRoomId);
      return s.gemRooms.includes(room.id) ? null : window.__gemFor(room, s.dungeon.seed);
    });
    if (gem && s.gems < s.toll) {
      await walkTo({ x: gem[0], z: gem[2] });
      await page.waitForFunction((id) => window.__run.getState().gemRooms.includes(id), room.id);
      continue;
    }
    const candidates = await page.evaluate(() => {
      const s = window.__run.getState();
      return s.dungeon.rooms.filter((r) => !s.gemRooms.includes(r.id) && window.__gemFor(r, s.dungeon.seed)).map((r) => r.id);
    });
    const paths = (s.gems >= s.toll ? [s.dungeon.endId] : candidates).map((id) => route(s, id)).filter((p) => p?.length > 1).sort((a, b) => a.length - b.length);
    assert.ok(paths.length, "uncollected gems or payable stairs remain reachable");
    const next = paths[0][1], dir = Object.keys(room.links).find((dir) => room.links[dir] === next);
    const target = await page.evaluate(({ id, dir }) => window.__derived.door(id, dir), { id: room.id, dir });
    const axis = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[dir];
    await walkTo({ x: target[0] - axis[0] * 1.7, z: target[2] - axis[1] * 1.7 });
    await page.keyboard.press("KeyE");
    await page.waitForFunction(({ room, floor }) => window.__run.getState().currentRoomId !== room || window.__run.getState().floor !== floor, { room: room.id, floor: s.floor }, { timeout: 5000 });
    doors++;
  }
  assert.deepEqual(errors, [], "no browser runtime errors");
  console.log(`PASS movement-only collect/pay/descend: ${doors} doors, no teleports or restored lives`);
} catch (e) {
  console.error(e);
  const s = await snapshot();
  console.error("FINAL", JSON.stringify({ floor: s.floor, room: s.roomId, phase: s.phase, lives: s.lives, gems: s.gems, player: s.player, paused: s.paused, inputLocks: s.inputLocks }));
  process.exitCode = 1;
} finally { await browser.close(); }
