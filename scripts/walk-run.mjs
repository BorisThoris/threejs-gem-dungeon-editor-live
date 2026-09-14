/** Movement-based loop probe. Uses the full generated map to plan, but never
 * teleports, replenishes lives, or writes gameplay state after starting.
 * This establishes traversal/economy evidence, not a human playtest. */
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
  args: process.env.WALK_RENDERER === "hardware"
    ? ["--no-sandbox", "--enable-gpu", "--use-angle=d3d11"]
    : ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
const errors = [];
page.setDefaultTimeout(30000);
page.on("pageerror", (e) => errors.push(String(e)));
const snapshot = () => page.evaluate(() => {
  const s = window.__run.getState();
  return { phase: s.phase, floor: s.floor, gems: s.gems, lives: s.lives, roomId: s.currentRoomId,
    dungeon: s.dungeon, collected: s.gemRooms, transitioning: s.transitioning, paused: s.paused, inputLocks: s.inputLocks,
    player: window.__playerDebug, toll: window.__derived.toll(), satchel: s.satchel,
    keeper: window.__derived.keeper(), bombs: window.__derived.bombs(), clock: window.__derived.clock(),
    bombPrice: window.__world.BOMB_PRICE, reaper: s.reaperAwake,
    shoveReady: s.shoveReadyAt <= window.__derived.clock(), frames: window.__perf?.frames,
    threats: [s.wardenRoomId === s.currentRoomId && window.__warden ? { ...window.__warden, kind: "warden" } : null,
      window.__harrier?.room === s.currentRoomId && !window.__harrier.away && !window.__harrier.down ? window.__harrier : null].filter(Boolean) };
});

async function walkTo(target, { prepareOnly = false, plan: prepared, untilKeeper = false } = {}) {
  // A room can report ready before the player probe has sampled its new pose.
  const frame = (await snapshot()).frames;
  if (!prepared) await page.waitForFunction((frame) => window.__perf.frames >= frame + 2, frame);
  const plan = prepared ?? await page.evaluate(async (target) => {
    const { roomSegmentClear, insideRoom, doorReach } = await import("/src/game/dungeon/footprint.ts");
    const { obstaclesFor, bitesFor } = await import("/src/game/mobs/body.ts");
    const { trapsFor } = await import("/src/game/traps/placement.ts");
    const { sentryFor } = await import("/src/game/sentry/placement.ts");
    const { keyFor } = await import("/src/game/rooms/kinds.ts");
    const { PIT_RADIUS } = await import("/src/game/world.ts");
    const s = window.__run.getState(), room = s.dungeon.rooms.find((r) => r.id === s.currentRoomId);
    const start = { x: window.__playerDebug.x, z: window.__playerDebug.z };
    const key = s.dungeon.keyRoomId === room.id ? keyFor(room, s.dungeon.seed) : null;
    const sentry = sentryFor(room, s.dungeon.seed, s.floor, key ? [key] : []);
    const blockers = [...obstaclesFor("ground", room, s.dungeon.seed, s.placed, s.broken),
      ...(sentry ? [{ x: sentry.at[0], z: sentry.at[2], r: 0.22 + 0.35 }] : []),
      ...bitesFor("ground", room, s.dungeon.seed, s.placed, s.sprung),
      ...trapsFor(room, s.dungeon.seed, s.dungeon.endId).filter((t) => t.kind !== "grate").map((t) => ({ ...t, r: t.kind === "pit" ? PIT_RADIUS + 0.35 : 1.1 }))];
    const clear = (a, b) => roomSegmentClear(room, a.x, a.z, b.x, b.z, 0.65) && blockers.every((p) => {
      const dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t) > p.r + 0.12;
    });
    if (target.reach) {
      // Add a continuous approach for a stand almost flush with the wall.
      // A coarse grid can miss its reachable strip by a few centimetres.
      const half = room.size / 2 - 0.7;
      const approach = { x: Math.max(-half, Math.min(half, target.x)), z: Math.max(-half, Math.min(half, target.z)) };
      if (Math.hypot(approach.x - target.x, approach.z - target.z) < target.reach - 0.6 && clear(approach, approach)) target = approach;
    }
    const spacing = 0.75, nodes = [], byGrid = new Map();
    const reach = Math.max(...["north", "south", "east", "west"].map((dir) => doorReach(room, dir)));
    const n = Math.ceil(reach / spacing);
    for (let ix = -n; ix <= n; ix++) for (let iz = -n; iz <= n; iz++) {
      const p = { x: ix * spacing, z: iz * spacing, ix, iz };
      if (insideRoom(room, p.x, p.z, 0.65) && clear(p, p)) {
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
      if (target.reach ? Math.hypot(a.x - target.x, a.z - target.z) < target.reach - 0.6
        : Math.hypot(a.x - target.x, a.z - target.z) < 1.5 && clear(a, target)) { end = index; break; }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const next = byGrid.get(`${a.ix + dx},${a.iz + dz}`);
        if (next !== undefined && !previous.has(next) && clear(a, nodes[next])) { previous.set(next, index); queue.push(next); }
      }
    }
    if (clear(start, target)) return [target];
    if (end === undefined) return null;
    // Goods can stand against a wall: the player needs to reach their
    // interaction radius, rather than stand at the goods' exact centre.
    const path = target.reach ? [] : [target];
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
  if (prepareOnly) return plan;
  const initial = await snapshot();
  let sprinting = false;
  await page.keyboard.down("KeyW");
  try {
    for (const point of plan) {
      const deadline = Date.now() + 25000;
      const started = Date.now(), startedFrames = (await snapshot()).frames;
      let lastDistance = Infinity, stuckSince = Date.now();
      while (true) {
        const s = await snapshot();
        if (untilKeeper && s.keeper.stalled) return;
        if (s.phase !== "playing" || s.roomId !== initial.roomId) throw new Error(`walk interrupted: ${s.phase}, lives ${s.lives}`);
        const wantsSprint = s.reaper || s.threats.some((p) => p.kind === "warden" && Math.hypot(p.x - s.player.x, p.z - s.player.z) < 5);
        if (wantsSprint !== sprinting) {
          if (wantsSprint) await page.keyboard.down("ShiftLeft");
          else await page.keyboard.up("ShiftLeft");
          sprinting = wantsSprint;
        }
        const threat = s.threats.find((p) => Math.hypot(p.x - s.player.x, p.z - s.player.z) < 2.8);
        if (process.env.WALK_SHOVE !== "off" && s.shoveReady && threat) {
          await page.keyboard.up("KeyW");
          await page.evaluate((yaw) => window.__bus.emit("lookSet", { yaw, pitch: 0 }), Math.atan2(s.player.x - threat.x, s.player.z - threat.z));
          await page.keyboard.press("Space");
          await page.waitForTimeout(80);
          await page.keyboard.down("KeyW");
        }
        const dx = point.x - s.player.x, dz = point.z - s.player.z, distance = Math.hypot(dx, dz);
        if (distance < (point === plan.at(-1) ? 0.55 : 0.12)) break;
        if (distance < lastDistance - 0.03) stuckSince = Date.now();
        lastDistance = distance;
        if (Date.now() > deadline || Date.now() - stuckSince > 5000) {
          const reason = Date.now() > deadline ? "segment deadline" : "no distance progress";
          throw new Error(`movement stopped by ${reason} in ${s.roomId}: ${JSON.stringify({ player: s.player, point, distance,
            elapsed: (Date.now() - started) / 1000, frames: s.frames - startedFrames, paused: s.paused, inputLocks: s.inputLocks })}`);
        }
        await page.evaluate((yaw) => window.__bus.emit("lookSet", { yaw, pitch: 0 }), Math.atan2(-dx, -dz));
        await page.waitForTimeout(Math.max(20, Math.min(120, distance / 8 * 600)));
      }
    }
  } finally { await page.keyboard.up("KeyW"); await page.keyboard.up("ShiftLeft"); }
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
  console.log("RENDERER", await page.evaluate(() => {
    const gl = document.querySelector("canvas").getContext("webgl2");
    const extension = gl.getExtension("WEBGL_debug_renderer_info");
    return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : "unavailable";
  }));
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
    const needsBomb = s.keeper.holds && !s.satchel.includes("bomb");
    const required = s.toll + (needsBomb ? s.bombPrice : 0);
    const gem = await page.evaluate(() => {
      const s = window.__run.getState(), room = s.dungeon.rooms.find((r) => r.id === s.currentRoomId);
      return s.gemRooms.includes(room.id) ? null : window.__gemFor(room, s.dungeon.seed);
    });
    if (gem && s.gems < required) {
      await walkTo({ x: gem[0], z: gem[2] });
      await page.waitForFunction((id) => window.__run.getState().gemRooms.includes(id), room.id);
      continue;
    }
    if (needsBomb && s.gems >= required && room.kind === "shop") {
      const offer = await page.evaluate(() => {
        const s = window.__run.getState(), room = s.dungeon.rooms.find((r) => r.id === s.currentRoomId);
        return window.__shopOffers(room).find((o) => o.id === "bomb");
      });
      await walkTo(offer);
      await page.keyboard.press("KeyE");
      await page.waitForFunction(() => window.__run.getState().satchel.includes("bomb"));
      console.log("PASS purchased Keeper bomb through the shop interaction");
      continue;
    }
    const keeperPost = s.keeper.posts.find((p) => p.roomId === room.id);
    if (keeperPost && s.keeper.holds && s.satchel.includes("bomb")) {
      const spots = await page.evaluate(async (dir) => {
        const { insideRoom, roomSegmentClear } = await import("/src/game/dungeon/footprint.ts");
        const { obstaclesFor, bitesFor } = await import("/src/game/mobs/body.ts");
        const { trapsFor } = await import("/src/game/traps/placement.ts");
        const { PIT_RADIUS, BOMB_RADIUS } = await import("/src/game/world.ts");
        const s = window.__run.getState(), room = s.dungeon.rooms.find((r) => r.id === s.currentRoomId);
        const axis = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[dir];
        const door = window.__derived.door(room.id, dir), post = { x: door[0] * 0.72, z: door[2] * 0.72 };
        const blocks = [...obstaclesFor("ground", room, s.dungeon.seed, s.placed, s.broken), ...bitesFor("ground", room, s.dungeon.seed, s.placed, s.sprung),
          ...trapsFor(room, s.dungeon.seed, s.dungeon.endId).filter((t) => t.kind !== "grate").map((t) => ({ ...t, r: t.kind === "pit" ? PIT_RADIUS + 0.35 : 1.1 }))];
        const clear = (a, b) => roomSegmentClear(room, a.x, a.z, b.x, b.z, 0.6) && blocks.every((p) => {
          const dx = b.x - a.x, dz = b.z - a.z;
          const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
          return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t) > p.r + 0.3;
        });
        const safe = (p) => insideRoom(room, p.x, p.z, 0.6) && Math.hypot(p.x - post.x, p.z - post.z) > 3 &&
          blocks.every((b) => Math.hypot(p.x - b.x, p.z - b.z) > b.r + 0.3);
        for (const side of [0, 1.5, -1.5, 2.5, -2.5]) {
          const bomb = { x: post.x - axis[0] * 4 + axis[1] * side, z: post.z - axis[1] * 4 - axis[0] * side };
          if (!safe(bomb)) continue;
          for (let i = 0; i < 16; i++) {
            const angle = i * Math.PI / 8, retreat = { x: bomb.x + Math.cos(angle) * 4.5, z: bomb.z + Math.sin(angle) * 4.5 };
            if (!safe(retreat) || !clear(bomb, retreat)) continue;
            // Stay moving during the fuse. Standing at the first safe point
            // lets the faster-than-walking Reaper close before detonation.
            for (const turn of [1, -1]) {
              const orbit = [retreat];
              for (let j = 1; j <= 10; j++) {
                const a = angle + turn * j * Math.PI / 4;
                const p = { x: bomb.x + Math.cos(a) * 4.5, z: bomb.z + Math.sin(a) * 4.5 };
                if (!safe(p) || !clear(orbit.at(-1), p)) break;
                orbit.push(p);
              }
              // Every chord stays outside the blast, even with arrival error.
              if (orbit.length >= 3 && 4.5 * Math.cos(Math.PI / 8) - 0.55 > BOMB_RADIUS) return { bomb, orbit };
            }
          }
        }
        return null;
      }, keeperPost.dir);
      assert.ok(spots, "Keeper room offers a bomb placement and escape outside halberd reach");
      await walkTo(spots.bomb);
      // Plan before lighting the fuse so planning cannot consume the escape window.
      const escape = await walkTo(spots.orbit[0], { prepareOnly: true });
      const slot = (await snapshot()).satchel.indexOf("bomb");
      await page.keyboard.press(`Digit${slot + 1}`);
      await page.waitForFunction(() => !window.__run.getState().satchel.includes("bomb"));
      console.log("BOMB", JSON.stringify((await snapshot()).bombs));
      await walkTo(spots.orbit[0], { plan: escape });
      const orbit = [...spots.orbit.slice(1), ...spots.orbit.slice(0, -1).reverse()];
      const fuseDeadline = Date.now() + 5000;
      while (!(await snapshot()).keeper.stalled && Date.now() < fuseDeadline) {
        await walkTo(orbit.at(-1), { plan: orbit, untilKeeper: true });
      }
      await page.waitForFunction(() => window.__derived.keeper().stalled, null, { timeout: 5000 });
      console.log("PASS bomb set with satchel key, escaped blast, Keeper kneels");
      continue;
    }
    const candidates = await page.evaluate(() => {
      const s = window.__run.getState();
      return s.dungeon.rooms.filter((r) => !s.gemRooms.includes(r.id) && window.__gemFor(r, s.dungeon.seed)).map((r) => r.id);
    });
    const shop = s.dungeon.rooms.find((r) => r.kind === "shop");
    const goals = s.gems >= required ? [needsBomb ? shop?.id : s.dungeon.endId] : candidates;
    const paths = goals.map((id) => route(s, id)).filter((p) => p?.length > 1).sort((a, b) => a.length - b.length);
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
  if (stopFloor === 4) {
    assert.equal((await snapshot()).phase, "won", "the final paid stairs complete the run");
    await page.getByTestId("summary-again").click();
    await page.waitForFunction(() => {
      const s = window.__run.getState();
      return s.phase === "playing" && s.floor === 1 && !s.transitioning;
    });
    const fresh = await snapshot();
    assert.equal(fresh.gems, 0, "a new run starts without the previous haul");
    assert.equal(fresh.lives, 3, "a new run restores its initial health");
    assert.ok(!fresh.reaper && fresh.bombs.length === 0, "previous pursuit and placed bombs do not persist");
    console.log("PASS escaped summary starts a fresh playable run through Run again");
  }
} catch (e) {
  console.error(e);
  const s = await snapshot();
  console.error("FINAL", JSON.stringify({ floor: s.floor, room: s.roomId, phase: s.phase, lives: s.lives, gems: s.gems, player: s.player, paused: s.paused, inputLocks: s.inputLocks, bombs: s.bombs, clock: s.clock, keeper: s.keeper }));
  process.exitCode = 1;
} finally { await browser.close(); }
