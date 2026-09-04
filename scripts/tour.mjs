/**
 * A photograph of every kind of room the game builds.
 *
 *   yarn dev --port 5199   # in one terminal
 *   yarn tour              # in another
 *
 * The room tour in PLAYTEST.md was shot once, by hand, and then the game
 * changed underneath it for thirty-six cycles: the props were rebuilt, five
 * more were added, the arena's arms were re-laid, the braziers became
 * instanced, the bookshelves got their books out of the carcass, the vault
 * was given a vault's furniture, and the watcher and the key were moved out
 * of the furniture they had been standing in. The pictures a reader looks
 * at first showed a game that no longer existed.
 *
 * So it is a command now rather than an afternoon. Each room is entered the
 * way a player enters it - stood in a doorway, looking down the room - so
 * the shots are comparable with each other and with the ones before them.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] || process.env.PORT || "5199";
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const root = new URL("..", import.meta.url).pathname;
const OUT = join(root, "docs/playtest");
mkdirSync(OUT, { recursive: true });

/** The kinds, and a seed known to build one on the floor named. */
const SHOTS = [
  { kind: "start", floor: 1, file: "room-start.png" },
  { kind: "normal", floor: 1, file: "room-normal.png" },
  { kind: "treasure", floor: 1, file: "room-treasure.png" },
  { kind: "shop", floor: 1, file: "room-shop.png" },
  { kind: "library", floor: 1, file: "room-library.png" },
  { kind: "trap", floor: 1, file: "room-trap.png" },
  { kind: "arena", floor: 1, file: "room-arena.png" },
  { kind: "memory", floor: 1, file: "room-memory.png" },
  { kind: "challenge", floor: 1, file: "room-challenge.png" },
  { kind: "end", floor: 1, file: "room-end.png" },
  // The two things that are not a room: a watcher turning its beam, and the
  // Warden in the room with you.
  { kind: "normal", floor: 3, file: "sentry.png", want: "sentry" },
  { kind: "normal", floor: 1, file: "warden.png", want: "warden" },
];

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-background-timer-throttling"],
});
const page = await (await browser.newContext({ viewport: { width: 1024, height: 640 } })).newPage();
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(2500);
const start = await page.$('button:has-text("Start")');
if (start) await start.click();
await page.waitForTimeout(3000);

let taken = 0;
for (const shot of SHOTS) {
  const found = await page.evaluate(
    async ([kind, floor, want]) => {
      const run = window.__run;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let seed = 1; seed < 120; seed++) {
        run.getState().startRun(seed);
        await wait(900);
        for (let f = 1; f < floor; f++) {
          const d = run.getState().dungeon;
          run.setState({ transitioning: true, currentRoomId: d.endId });
          run.getState().roomReady(d.endId);
          await wait(900);
        }
        const d = run.getState().dungeon;
        const rooms = d.rooms.filter((r) => r.kind === kind);
        const room = want === "sentry" ? rooms.find((r) => window.__sentryFor(r, d.seed, floor)) : rooms[0];
        if (!room) continue;
        run.setState({ transitioning: true, currentRoomId: room.id, lives: 3 });
        run.getState().roomReady(room.id);
        await wait(1600);
        // Backed against a wall, looking across the room.
        //
        // Three framings were wrong before this one, and each was wrong in
        // a way the picture made obvious. A doorway is on an axis, so half
        // the room is behind the camera - the trap room came out with
        // neither its spikes nor its gem in shot. A corner puts the camera
        // on the gem, which collects it, and inside the spike ring, and
        // two metres from a brazier, which filled the arena with a flame.
        // Pulled in along the diagonal, the camera stood against a pillar
        // that hid three of the memory chamber's five crystals.
        //
        // A wall is behind every anchor a room uses, so nothing can be at
        // the camera and everything is in front of it. Preferring a wall
        // with no door in it keeps the doorway's black rectangle out of
        // the middle of the picture.
        const half = room.size / 2;
        const gem = window.__gemFor(room, d.seed);
        const walls = [
          { dir: "north", x: 0, z: -(half - 1.0) },
          { dir: "south", x: 0, z: half - 1.0 },
          { dir: "east", x: half - 1.0, z: 0 },
          { dir: "west", x: -(half - 1.0), z: 0 },
        ];
        // Of the walls with no door in them, the one furthest from what
        // the room's kind stands in it: the shop's counter is on a near
        // anchor, and standing at the nearest blank wall put it at the edge
        // of the frame with its back to the camera.
        const content = [...window.__anchorsFor(room.kind, room), ...(gem ? [gem] : [])];
        const clearance = (w) =>
          content.length
            ? Math.min(...content.map((c) => Math.hypot(c[0] - w.x, c[2] - w.z)))
            : 1;
        // A room with content of its own is photographed from directly
        // opposite it: the counter, the lectern, the plate. Choosing the
        // wall furthest from it instead put the camera beside the shop's
        // counter looking along it, which is a picture of a shop that sells
        // nothing. A room with no content of its own gets the blank wall
        // and the middle of the floor.
        const own = window.__anchorsFor(room.kind, room)[0] ?? null;
        let x;
        let z;
        let look = [0, 0, 0];
        if (own) {
          const len = Math.hypot(own[0], own[2]) || 1;
          x = (-own[0] / len) * (half - 1.2);
          z = (-own[2] / len) * (half - 1.2);
          look = own;
        } else {
          const blank = walls.filter((w) => !room.links[w.dir]);
          const from = (blank.length ? blank : walls).reduce((best, w) =>
            clearance(w) > clearance(best) ? w : best
          );
          x = from.x;
          z = from.z;
        }
        const yaw = Math.atan2(-(look[0] - x), -(look[2] - z));
        window.__bus.emit("teleport", { position: [x, 1.5, z], yaw });
        window.__bus.emit("lookSet", { yaw, pitch: -0.10 });
        if (want === "warden") run.setState({ wardenRoomId: room.id, alarm: 5 });
        await wait(1400);
        /**
         * Wait for the beam to be pointing this way.
         *
         * The first sentry shot had the post in it and no light on the
         * floor, which is a photograph of a watcher that appears to be
         * doing nothing - and the room is entirely about judging where the
         * light is. The wedge was there all along (radius 11, a 48-degree
         * fan, opacity 0.28, checked in the scene graph); it was simply
         * aimed elsewhere at the moment the shutter opened. It turns once
         * every eleven seconds, so this waits.
         */
        if (want === "sentry") {
          const post = window.__sentryFor(room, d.seed, floor).at;
          const towards = Math.atan2(x - post[0], z - post[2]);
          for (let i = 0; i < 220; i++) {
            let facing = null;
            window.__scene.traverse((o) => {
              if (o.geometry?.type === "CircleGeometry" && o.geometry.parameters.radius > 10) {
                facing = o.parent.rotation.y;
              }
            });
            if (facing === null) break;
            let off = (towards - facing) % (Math.PI * 2);
            if (off > Math.PI) off -= Math.PI * 2;
            if (off < -Math.PI) off += Math.PI * 2;
            if (Math.abs(off) < 0.18) break;
            await wait(60);
          }
        }
        return { seed, id: room.id, size: room.size, shape: room.shape };
      }
      return null;
    },
    [shot.kind, shot.floor, shot.want ?? null]
  );
  if (!found) {
    console.log(`MISS  ${shot.file} - no ${shot.kind} found`);
    continue;
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, shot.file) });
  taken++;
  console.log(`shot  ${shot.file}  ${shot.kind} ${found.size} ${found.shape}, seed ${found.seed}`);
}

await browser.close();
console.log(`\n${taken} of ${SHOTS.length} shots written to docs/playtest.`);
process.exit(taken === SHOTS.length ? 0 : 1);
