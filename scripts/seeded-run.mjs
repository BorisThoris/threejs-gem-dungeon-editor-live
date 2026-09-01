/**
 * End-to-end test: play a seeded run from the menu to the exit, using nothing
 * but the keys a player has.
 *
 * `scripts/smoke-test.mjs` proves the loop is wired together, but it moves the
 * player by dispatching `playerTeleport` events and finds the gem by
 * recomputing the placement hash in the test file. Neither is play: teleporting
 * skips movement, collision and the doorway triggers entirely, and a test that
 * re-derives the game's own formula agrees with itself no matter what the game
 * does.
 *
 * This one presses W/A/S/D, walks over gems to collect them, walks through
 * doorways to travel, and reads every position out of the running scene
 * (`window.__roomProbe`) rather than deriving it. The dungeon is seeded, so a
 * failure here is reproducible: the same `--seed` lays out the same rooms.
 *
 *   yarn dev --port 5199                    # one terminal
 *   node scripts/seeded-run.mjs             # another
 *   node scripts/seeded-run.mjs --seed x42  # a different dungeon
 *
 * Needs playwright-core and a Chromium binary; neither is a project
 * dependency, so this is a pre-ship check rather than a commit gate. Set
 * CHROMIUM_PATH if the binary is not where Playwright usually puts it.
 */
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

// The default dungeon. Any seed lays out a valid run, but this one is the one
// the test is known to walk end to end, so a failure here is a regression
// rather than an unlucky layout. Pass --seed to play a different dungeon.
const SEED = arg('seed', process.env.SEED || 'charlie-9');
const PORT = arg('port', process.env.PORT || '5199');
// `localhost`, not `127.0.0.1`: Vite binds ::1 on Windows, so a hard-coded IPv4
// host connects to nothing. The old smoke test swallowed that navigation error
// and then failed every assertion without ever saying why.
const BASE = process.env.BASE_URL || `http://localhost:${PORT}`;
const GEMS_REQUIRED = 3;

// A hazard's own radius is 1.2; this is how much room the walk leaves around one.
const HAZARD_CLEARANCE = 2.4;

/** Playwright's own Chromium, wherever this platform keeps it. */
function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    '/opt/pw-browsers',
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'ms-playwright'),
    process.env.HOME && join(process.env.HOME, '.cache', 'ms-playwright'),
  ].filter(Boolean);

  for (const root of roots) {
    if (!existsSync(root)) continue;
    const builds = readdirSync(root)
      .filter((entry) => entry.startsWith('chromium-'))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
    for (const build of builds) {
      const candidates = [
        'chrome-win/chrome.exe',
        'chrome-linux/chrome',
        'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      ];
      for (const candidate of candidates) {
        const executable = join(root, build, candidate);
        if (existsSync(executable)) return executable;
      }
    }
  }
  return undefined;
}

/** `--verbose` narrates every move, which is how you debug a failing run. */
const VERBOSE = process.argv.includes('--verbose');
const trace = (...parts) => {
  if (VERBOSE) console.log('     ·', ...parts);
};

let failures = 0;
const ok = (label, condition, detail = '') => {
  if (!condition) failures++;
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? '  - ' + detail : ''}`);
  return condition;
};

const browser = await chromium.launch({
  executablePath: findChromium(),
  args: [
    '--no-sandbox',
    '--use-gl=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-background-timer-throttling',
  ],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

const pageErrors = [];

/** Open the game at a seed and get as far as a running dungeon. */
async function startRun(seed, { collectErrors = false } = {}) {
  const page = await context.newPage();
  if (collectErrors) page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 160)));
  await page.goto(`${BASE}/?seed=${encodeURIComponent(seed)}`, {
    waitUntil: 'load',
    timeout: 60000,
  });
  await page.waitForSelector('button:has-text("Start run")', { timeout: 30000 });
  await page.click('button:has-text("Start run")');
  await page.waitForFunction(() => window.__roomProbe && window.__playerDebug, null, {
    timeout: 120000,
  });
  return page;
}

/** The dungeon as a comparable shape, for the reproducibility check. */
const layoutOf = (page) =>
  page.evaluate(() => {
    const map = window.__mapStore.getState().currentMap;
    return {
      seed: map.config.seed ?? null,
      start: map.startRoomId,
      end: map.endRoomId,
      rooms: map.rooms.map(
        (room) =>
          `${room.id}:${room.type}:${room.position.x},${room.position.z}:${(
            room.connections || []
          ).join('-')}`
      ),
    };
  });

const readState = (page) =>
  page.evaluate(() => {
    const store = window.__gameStore.getState();
    const player = window.__playerDebug;
    return {
      room: store.currentRoomId,
      gems: store.playerStats.gems,
      lives: store.playerStats.lives,
      visited: store.visitedRooms.size,
      moving: store.isMovementEnabled,
      transitioning: store.isTransitioning,
      x: +player.x.toFixed(2),
      y: +player.y.toFixed(2),
      z: +player.z.toFixed(2),
      vy: +player.linvel.y.toFixed(2),
      yaw: player.yaw ?? 0,
      collected: [...store.collectedGemRooms],
      probe: window.__roomProbe,
    };
  });

// ------------------------------------------------------------------ the run

const page = await startRun(SEED, { collectErrors: true });

// The most gems held at any point in the run. Only the end door takes gems
// away, so this is what the toll should be measured against - reading the count
// just before the final doorway misses a gem picked up on the way to it.
let peakGems = 0;
const state = async () => {
  const snapshot = await readState(page);
  peakGems = Math.max(peakGems, snapshot.gems);
  return snapshot;
};

const layout = await layoutOf(page);
ok('the seed reaches the generator', layout.seed === SEED, SEED);

{
  const replay = await startRun(SEED);
  const replayed = await layoutOf(replay);
  await replay.close();
  ok(
    'the same seed lays out the same dungeon',
    JSON.stringify(replayed.rooms) === JSON.stringify(layout.rooms),
    `${layout.rooms.length} rooms`
  );
}

const spawn = await state();
ok('the player spawns resting on a floor', spawn.vy === 0, `y=${spawn.y} vy=${spawn.vy}`);
ok('the run starts in the start room', spawn.room === layout.start, String(spawn.room));

// Which key drives which way in world space. Camera yaw is fixed while nothing
// touches the mouse, but measuring beats assuming - and a key that moves nobody
// is the single most important thing this test can catch.
const axes = {};
const calibratedYaw = spawn.yaw;
for (const key of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) {
  const before = await state();
  await page.keyboard.down(key);
  await page.waitForTimeout(320);
  await page.keyboard.up(key);
  await page.waitForTimeout(220);
  const after = await state();
  axes[key] = [after.x - before.x, after.z - before.z];
}
ok(
  'the movement keys move the player',
  Object.values(axes).every(([dx, dz]) => Math.hypot(dx, dz) > 0.5),
  Object.entries(axes)
    .map(([key, [dx, dz]]) => `${key}:(${dx.toFixed(1)},${dz.toFixed(1)})`)
    .join(' ')
);

let lowestY = spawn.y;
let fellOut = false;

let detourCount = 0;

/**
 * Hold whichever keys point at (x, z) until we arrive or run out of patience.
 *
 * Rooms are furnished, and a straight line from a doorway to a gem regularly
 * runs into a crate. A player walks around it; so does this, by strafing for a
 * moment whenever it stops making progress and then resuming the approach.
 */
async function walkTo(targetX, targetZ, { tolerance = 0.7, timeoutMs = 25000, until } = {}) {
  const deadline = Date.now() + timeoutMs;
  let held = [];
  let closest = Infinity;
  let progressAt = Date.now();
  let detour = null;
  let detourSide = 0;
  const release = async () => {
    for (const key of held) await page.keyboard.up(key);
    held = [];
  };

  while (Date.now() < deadline) {
    const now = await state();
    lowestY = Math.min(lowestY, now.y);
    if (now.y < -30) {
      fellOut = true;
      await release();
      return { arrived: false, fell: true, state: now };
    }
    if (until && (await until(now))) {
      await release();
      return { arrived: true, state: now };
    }
    // Movement is frozen mid-transition; holding keys through one does nothing
    // but confuse the next reading.
    if (now.transitioning || !now.moving) {
      await release();
      await page.waitForTimeout(200);
      continue;
    }

    const dx = targetX - now.x;
    const dz = targetZ - now.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= tolerance) {
      await release();
      return { arrived: true, state: now };
    }

    // Getting no closer for a while means something solid is in the way.
    if (distance < closest - 0.2) {
      closest = distance;
      progressAt = Date.now();
      detour = null;
    } else if (!detour && Date.now() - progressAt > 1800) {
      // Commit to one side and stay on it. Alternating left and right on every
      // attempt just rocks the player back and forth in front of the obstacle;
      // rooms are ringed with props and getting past one means walking along it
      // until it ends.
      if (detourSide === 0) {
        // Prefer the way that leads toward the middle of the room, which is
        // where the floor is clear.
        const towardCentreX = -now.x;
        const towardCentreZ = -now.z;
        detourSide = dz * towardCentreX - dx * towardCentreZ >= 0 ? 1 : -1;
      }
      detour = {
        until: Date.now() + 2500,
        x: detourSide * dz,
        z: -detourSide * dx,
      };
      progressAt = Date.now();
      trace(`sidestepping around something at (${now.x}, ${now.z})`);
    }
    if (detour && Date.now() >= detour.until) {
      detour = null;
      closest = distance;
      progressAt = Date.now();
    }

    let wantX = detour ? detour.x : dx;
    let wantZ = detour ? detour.z : dz;

    // Trap rooms ring the gem with spikes, and walking straight at it costs a
    // life every time. Push away from anything close enough to hurt, which is
    // what steers the walk through the gaps between them rather than over them.
    const hazards = (now.probe && now.probe.hazards) || [];
    if (hazards.length) {
      const reach = Math.hypot(wantX, wantZ) || 1;
      const dirX = wantX / reach;
      const dirZ = wantZ / reach;
      let steerX = 0;
      let steerZ = 0;

      for (const hazard of hazards) {
        const awayX = now.x - hazard[0];
        const awayZ = now.z - hazard[2];
        const gap = Math.hypot(awayX, awayZ);
        if (gap > HAZARD_CLEARANCE || gap === 0) continue;
        const push = (HAZARD_CLEARANCE - gap) / HAZARD_CLEARANCE;

        // Only the part of "away" that is sideways to where we are going.
        // Pushing straight back drove the player out through the doorway they
        // came in by, which in a trap room is an infinite loop that costs a
        // life every lap. Sliding sideways threads the gaps in the ring.
        const along = awayX * dirX + awayZ * dirZ;
        let perpX = awayX - along * dirX;
        let perpZ = awayZ - along * dirZ;
        const perp = Math.hypot(perpX, perpZ);
        if (perp < 0.001) {
          // Dead ahead: commit to one side rather than stalling.
          perpX = -dirZ;
          perpZ = dirX;
        } else {
          perpX /= perp;
          perpZ /= perp;
        }
        steerX += perpX * push;
        steerZ += perpZ * push;
      }

      wantX = dirX + steerX * 1.8;
      wantZ = dirZ + steerZ * 1.8;
    }

    // The keys were calibrated at one camera angle, and walking into a room
    // turns the camera to face inward - so the same key that walked north on
    // the way in walks south on the way out. Rotate the direction we want back
    // into the basis the axes were measured in before choosing keys, or the
    // player marches straight back out of the doorway they just came through.
    const turn = now.yaw - calibratedYaw;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const localX = wantX * cos - wantZ * sin;
    const localZ = wantX * sin + wantZ * cos;

    const useful = [];
    for (const [key, [ax, az]] of Object.entries(axes)) {
      const length = Math.hypot(ax, az) || 1;
      const projection = (localX * ax + localZ * az) / length;
      if (projection > 0.25) useful.push([key, projection]);
    }
    const keys = useful
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([key]) => key);

    for (const key of held) if (!keys.includes(key)) await page.keyboard.up(key);
    for (const key of keys) if (!held.includes(key)) await page.keyboard.down(key);
    held = keys;
    await page.waitForTimeout(90);
  }

  await release();
  return { arrived: false, state: await state() };
}

/** Neighbour-by-neighbour route between two rooms, over the real connections. */
function route(from, to) {
  const neighbours = new Map(
    layout.rooms.map((entry) => {
      const [id, , , connections] = entry.split(':');
      return [id, connections ? connections.split('-').filter(Boolean) : []];
    })
  );
  const cameFrom = new Map([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const room = queue.shift();
    if (room === to) break;
    for (const next of neighbours.get(room) || []) {
      if (cameFrom.has(next)) continue;
      cameFrom.set(next, room);
      queue.push(next);
    }
  }
  if (!cameFrom.has(to)) return null;
  const path = [];
  for (let room = to; room; room = cameFrom.get(room)) path.unshift(room);
  return path;
}

/** Walk over this room's gem, if it still has one. */
async function takeGem() {
  const now = await state();
  const gem = now.probe && now.probe.gem;
  if (!gem) return now.gems;
  const before = now.gems;
  await walkTo(gem[0], gem[2], {
    tolerance: 0.6,
    timeoutMs: 20000,
    until: async (current) => current.gems > before,
  });
  return (await state()).gems;
}

/**
 * Walk into the doorway that leads to `nextRoom`.
 *
 * Ending up somewhere else is not a failure: gems sit close enough to the walls
 * that a player sweeping a room genuinely does stumble through a doorway, and
 * the caller re-plans from wherever it lands. Only standing still counts as
 * stuck.
 */
async function stepInto(nextRoom, plannedFrom) {
  const now = await state();
  // Between planning the step and taking it the player may already have
  // wandered through a doorway. That is a new position to plan from, not a
  // failure to move.
  if (plannedFrom && now.room !== plannedFrom) {
    return { moved: true, arrived: now.room === nextRoom, room: now.room };
  }

  const door = ((now.probe && now.probe.doors) || []).find((entry) => entry.roomId === nextRoom);
  if (!door) return { moved: false, reason: `no doorway to ${nextRoom} in ${now.room}` };

  const from = now.room;

  // Head for the middle of the room first. Doorways are in the walls, and a
  // route that runs along a wall snags on every corner and every crate pushed
  // up against it; from the centre the approach is a clear straight line.
  if (Math.hypot(now.x, now.z) > 3.5) {
    await walkTo(0, 0, { tolerance: 2.5, timeoutMs: 12000, until: async (c) => c.room !== from });
  }

  const walk = await walkTo(door.position[0], door.position[2], {
    tolerance: 0.5,
    timeoutMs: 25000,
    until: async (current) => current.room !== from,
  });
  if (walk.fell) return { moved: false, reason: 'fell out of the world' };

  // The transition freezes movement and remounts the room; wait it out.
  await page
    .waitForFunction(() => !window.__gameStore.getState().isTransitioning, null, { timeout: 30000 })
    .catch(() => {});
  await page.waitForTimeout(900);

  const after = await state();
  return {
    moved: after.room !== from,
    arrived: after.room === nextRoom,
    room: after.room,
    reason:
      after.room === from
        ? `never left ${from} (at ${after.x},${after.z}, ${Math.hypot(
            door.position[0] - after.x,
            door.position[2] - after.z
          ).toFixed(2)} from the ${nextRoom} doorway at ${door.position[0].toFixed(
            1
          )},${door.position[2].toFixed(1)}; lives ${after.lives}; movement ${
            after.moving ? 'enabled' : 'disabled'
          }, ${after.transitioning ? 'mid-transition' : 'settled'})`
        : undefined,
  };
}

/**
 * Play toward a goal: keep taking the gem in the room we are standing in, and
 * otherwise take one step along the route to the nearest room worth visiting.
 * Re-reads the room after every action instead of assuming where the last one
 * left us.
 */
async function explore({ want, goal, maxSteps = 60 }) {
  let stuck = null;
  // Rooms are cluttered enough that one approach to a doorway can end up
  // wedged against a crate. A player would back off and come at it again, so
  // give each doorway a few goes before calling the run stuck.
  const attempts = new Map();
  for (let step = 0; step < maxSteps; step++) {
    const now = await state();
    if (goal && now.room === goal) return { gems: now.gems, stuck, reachedGoal: true };
    if (want && now.gems >= want && !goal) return { gems: now.gems, stuck };

    // A gem underfoot is always worth the detour.
    if (now.probe && now.probe.gem && !now.collected.includes(now.room)) {
      const before = now.gems;
      const after = await takeGem();
      trace(`gem in ${now.room}: ${before} -> ${after}`);
      if (after > before) continue;
    }

    const target = goal || nearestUncollected(now);
    if (!target) return { gems: now.gems, stuck };
    const path = route(now.room, target);
    if (!path || path.length < 2) return { gems: now.gems, stuck };

    trace(`in ${now.room} (${now.x}, ${now.y}, ${now.z}) gems=${now.gems} lives=${now.lives} moving=${now.moving} -> heading to ${target} via ${path[1]}`);
    const result = await stepInto(path[1], now.room);
    trace(`  door ${now.room} -> ${path[1]}: landed in ${result.room ?? now.room}`);
    if (!result.moved) {
      const attempt = `${now.room}->${path[1]}`;
      const tries = (attempts.get(attempt) || 0) + 1;
      attempts.set(attempt, tries);
      if (tries >= 3) {
        stuck = `${now.room} -> ${path[1]} after ${tries} tries: ${result.reason}`;
        return { gems: (await state()).gems, stuck };
      }
      // Cross to the far side of the room and approach from there instead.
      trace(`  retrying ${attempt} (try ${tries})`);
      const room = await state();
      await walkTo(-room.x, -room.z, {
        tolerance: 2,
        timeoutMs: 12000,
        until: async (c) => c.room !== room.room,
      });
    }
  }
  return { gems: (await state()).gems, stuck };
}

/** The closest room whose gem is still sitting there. */
function nearestUncollected(now) {
  const rooms = layout.rooms.map((entry) => entry.split(':')[0]);
  let best = null;
  let bestLength = Infinity;
  for (const room of rooms) {
    if (room === layout.end || room === now.room) continue;
    if (now.collected.includes(room)) continue;
    const path = route(now.room, room);
    if (path && path.length < bestLength) {
      best = room;
      bestLength = path.length;
    }
  }
  return best;
}

// Collect the toll, then walk out.
const explored = await explore({ want: GEMS_REQUIRED });
const gems = explored.gems;
const afterExploring = await state();

ok('walking through a doorway changes rooms', afterExploring.visited >= 2, `${afterExploring.visited} visited`);
ok('the player never got stuck on the way', explored.stuck === null, explored.stuck || '');
ok('walking over gems collects them', gems >= GEMS_REQUIRED, `${gems}/${GEMS_REQUIRED} gems`);
ok('the player never fell out of the world', !fellOut, `lowest y ${lowestY.toFixed(2)}`);
ok(
  'the run survived the search for gems',
  afterExploring.lives > 0,
  `${afterExploring.lives} lives left`
);

// The end door is what the gems were for.
const exit = await explore({ goal: layout.end });
ok('the player walks out through the end door', exit.reachedGoal === true, exit.stuck || `end room ${layout.end}`);

const finished = await state();
ok(
  'the end door charges its gems',
  finished.gems === peakGems - GEMS_REQUIRED,
  `${finished.gems} left of ${peakGems} carried`
);
ok('the run resolves when the exit is reached', finished.moving === false);
ok(
  'the victory summary appears',
  await page.evaluate(() => /made it out/i.test(document.body.innerText)),
  ''
);
ok('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

await browser.close();
console.log(
  failures === 0
    ? `\nAll checks passed (seed ${SEED}).`
    : `\n${failures} check(s) failed (seed ${SEED}).`
);
process.exit(failures === 0 ? 0 : 1);
