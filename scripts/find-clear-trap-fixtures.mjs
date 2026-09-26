/** Locate short, visible routes for live trap checks without playing every seed. */
import { chromium } from "playwright-core";

const port = process.argv[2] || process.env.PORT || "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => !!window.__traps && !!window.__body);
  const fixtures = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { pursuitArrival } = await import("/src/game/dungeon/arrival.ts");
    const { roomSegmentClear, insideRoom, roomStep } = await import("/src/game/dungeon/footprint.ts");
    const { steerInRoom } = await import("/src/game/warden/steer.ts");
    const { sightLineClear } = await import("/src/game/ladder/sight.ts");
    const clear = (room, seed, dir, target, body) => {
      const from = pursuitArrival(room, dir, body === "flying" ? 1.1 : 0.9);
      const props = window.__body.obstaclesFor(body, room, seed, []);
      return roomSegmentClear(room, from.x, from.z, target.x, target.z)
        && sightLineClear(from, target, props);
    };
    const out = { dart: null, pit: null, harrier: null };
    for (let seed = 1; seed <= 300 && Object.values(out).some((v) => !v); seed++) {
      const d = generateDungeon({ seed });
      for (const room of d.rooms) {
        const traps = window.__traps.trapsFor(room, d.seed, d.endId);
        for (const [dir, id] of Object.entries(room.links)) {
          if (!id) continue;
          const from = pursuitArrival(room, dir);
          for (const trap of traps) {
            if (trap.kind === "darts" && !out.dart && !traps.some((t) => t.kind === "pit")
              && Math.hypot(from.x - trap.x, from.z - trap.z) < 16
              && clear(room, d.seed, dir, trap, "ground"))
              out.dart = { seed, room: room.id, dir, distance: +Math.hypot(from.x - trap.x, from.z - trap.z).toFixed(1) };
            if (trap.kind === "pit" && !out.pit && !traps.some((t) => t.kind === "darts")) {
              const dx = trap.x - from.x, dz = trap.z - from.z, len = Math.hypot(dx, dz) || 1;
              const target = { x: trap.x + dx / len * 1.8, z: trap.z + dz / len * 1.8 };
              if (len < 16 && clear(room, d.seed, dir, target, "ground"))
                out.pit = { seed, room: room.id, dir, distance: +len.toFixed(1), target };
            }
          }
          if (room.kind === "trap" && !out.harrier) {
            const gem = window.__gemFor(room, d.seed);
            if (gem && Math.hypot(from.x - gem[0], from.z - gem[2]) < 18
              && clear(room, d.seed, dir, { x: gem[0], z: gem[2] }, "flying"))
              {
                const obstacles = window.__body.obstaclesFor("flying", room, d.seed, []);
                const harrierFrom = pursuitArrival(room, dir, 1.1);
                const heading = steerInRoom(room, harrierFrom.x, harrierFrom.z, gem[0], gem[2], obstacles, 0, 1);
                out.harrier = { seed, room: room.id, dir, shape: room.shape, size: room.size,
                  distance: +Math.hypot(harrierFrom.x - gem[0], harrierFrom.z - gem[2]).toFixed(1),
                  from: harrierFrom, inside: insideRoom(room, harrierFrom.x, harrierFrom.z, 1), heading,
                  next: roomStep(room, harrierFrom.x, harrierFrom.z, heading.dx, heading.dz, 1), obstacles };
              }
          }
        }
      }
    }
    return out;
  });
  console.log(JSON.stringify(fixtures, null, 2));
} finally { await browser.close(); }
