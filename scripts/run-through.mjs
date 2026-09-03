/**
 * Can the game be finished?
 *
 *   yarn dev --port 5199   # in one terminal
 *   yarn test:run          # in another
 *
 * Nothing had ever answered that. The demo's whole claim is a run you can
 * complete - three floors, each charging more at the door than the last -
 * and the only evidence for it was this, in the smoke test:
 *
 *   run.setState({ gems: 9, floor: 3, currentRoomId: d.endId })
 *
 * which is not finishing the game, it is telling the game it has been
 * finished. Every other check drives a piece: a room, a puzzle, a purchase,
 * a sound. The one thing a player does - start at the top and come out of
 * the bottom - was the one thing nothing did.
 *
 * So this walks it. It reads the dungeon the way a player reads the map,
 * plans a route to a room that still has a gem, goes and takes it, and when
 * it can afford the door it goes and pays. Doors are taken by standing in
 * them and pressing E, which is how a player takes them. Nothing is set on
 * the run except lives, and that is the honest limit of this check: it says
 * the dungeon can be finished, not that you can survive it. The Warden is
 * walking the whole time and the walker makes no attempt to evade it, so a
 * run that was not topped up would end somewhere on floor two most times,
 * and a check that fails at random is worse than no check.
 */
import { chromium } from "playwright-core";

const PORT = process.argv[2] || process.env.PORT || "5199";
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SEEDS = [11, 404, 2718];

let failures = 0;
const ok = (label, cond, detail = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  - " + detail : ""}`);
};

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-background-timer-throttling"],
});
const page = await (await browser.newContext({ viewport: { width: 800, height: 600 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(2500);

if (!(await page.evaluate(() => Boolean(window.__run && window.__gemFor && window.__derived)))) {
  console.log("FAIL  the probes a walker needs are on the page  - __run, __gemFor or __derived missing");
  await browser.close();
  process.exit(1);
}

/**
 * One whole run, played inside the page.
 *
 * In the page rather than out here because a step is a teleport, a key
 * press and a wait, and a floor is fifty of them: driven from node every
 * one of those is a round trip, and the run took minutes rather than
 * seconds. The key press is the exception - only Playwright can send a real
 * one - so the walker asks for it by leaving a flag and node presses E.
 */
const playFloor = (page, budget) =>
  page.evaluate(async (budget) => {
    const run = window.__run;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const state = () => run.getState();
    const here = () => state().dungeon.rooms.find((r) => r.id === state().currentRoomId);

    /** Shortest room-to-room route, avoiding the vault: it is locked. */
    const route = (fromId, toId) => {
      const d = state().dungeon;
      const blocked = d.vaultId && d.vaultId !== toId ? d.vaultId : null;
      const back = new Map([[fromId, null]]);
      const queue = [fromId];
      while (queue.length) {
        const id = queue.shift();
        if (id === toId) break;
        const room = d.rooms.find((r) => r.id === id);
        for (const next of Object.values(room.links)) {
          if (back.has(next) || next === blocked) continue;
          back.set(next, id);
          queue.push(next);
        }
      }
      if (!back.has(toId)) return null;
      const path = [];
      for (let id = toId; id !== null; id = back.get(id)) path.unshift(id);
      return path;
    };

    const notes = { steps: 0, gems: 0, rooms: new Set(), toppedUp: 0 };
    const keepStanding = () => {
      if (state().lives < 3) {
        notes.toppedUp++;
        run.setState({ lives: 3, phase: "playing" });
      }
    };

    /** Stand in the doorway to `nextId` and ask node to press E. */
    const walkThrough = async (nextId) => {
      const room = here();
      const dir = Object.keys(room.links).find((d) => room.links[d] === nextId);
      if (!dir) return false;
      const step = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[dir];
      const half = room.size / 2;
      window.__bus.emit("teleport", { position: [step[0] * half * 0.8, 1.5, step[1] * half * 0.8] });
      await wait(500);
      const was = state().currentRoomId;
      window.__wantE = true;
      for (let i = 0; i < 30 && state().currentRoomId === was; i++) await wait(200);
      keepStanding();
      notes.steps++;
      notes.rooms.add(state().currentRoomId);
      return state().currentRoomId !== was;
    };

    const walkRoute = async (path) => {
      for (const next of path.slice(1)) if (!(await walkThrough(next))) return false;
      return true;
    };

    /** A room that still holds a gem the walker can simply pick up. */
    const gemRooms = () => {
      const s = state();
      const seed = s.dungeon.seed;
      return s.dungeon.rooms
        .filter((r) => r.id !== s.dungeon.vaultId && !s.gemRooms.includes(r.id))
        .map((r) => ({ room: r, at: window.__gemFor(r, seed) }))
        .filter((g) => g.at !== null);
    };

    while (notes.steps < budget) {
      keepStanding();
      const toll = window.__derived.toll();
      if (state().gems >= toll) break;
      // The nearest room with a gem in it, by rooms walked rather than by
      // distance: a player reads the map the same way.
      const options = gemRooms()
        .map((g) => ({ ...g, path: route(state().currentRoomId, g.room.id) }))
        .filter((g) => g.path)
        .sort((a, b) => a.path.length - b.path.length);
      if (options.length === 0) return { ...notes, rooms: notes.rooms.size, stuck: "no gem left to take" };
      const target = options[0];
      if (!(await walkRoute(target.path))) return { ...notes, rooms: notes.rooms.size, stuck: "a door would not open" };
      const before = state().gems;
      window.__bus.emit("teleport", { position: [target.at[0], 1.5, target.at[2]] });
      await wait(700);
      keepStanding();
      if (state().gems > before) notes.gems += state().gems - before;
    }

    // Afford it: now go and pay. The exit is the doorway into the last
    // room, so the walker has to reach one of its neighbours first.
    const d = state().dungeon;
    const path = route(state().currentRoomId, d.endId);
    if (!path) return { ...notes, rooms: notes.rooms.size, stuck: "no way to the exit" };
    const paid = await walkRoute(path);
    return { ...notes, rooms: notes.rooms.size, gemsHeld: state().gems, paid, stuck: paid ? null : "the exit would not open" };
  }, budget);

/**
 * The walker asks for the one thing it cannot do itself.
 *
 * Runs alongside the walk and stops the moment the walk does. The first
 * version ran for a fixed budget instead, so a floor crossed in twenty
 * seconds still cost a hundred and fifty and the whole check took twenty
 * minutes: it was waiting for a clock rather than for the thing it was
 * waiting for.
 */
const pressWhenAsked = async (page, done, seconds) => {
  const until = Date.now() + seconds * 1000;
  while (!done() && Date.now() < until) {
    if (await page.evaluate(() => (window.__wantE ? ((window.__wantE = false), true) : false))) {
      await page.keyboard.press("KeyE");
    }
    await page.waitForTimeout(60);
  }
};

const results = [];
for (const seed of SEEDS) {
  await page.evaluate((seed) => window.__run.getState().startRun(seed), seed);
  await page.waitForTimeout(2000);
  const startedAt = Date.now();
  const floors = [];
  let phase = "playing";
  for (let floor = 1; floor <= 3; floor++) {
    let walked = false;
    const walking = playFloor(page, 60).then((r) => ((walked = true), r));
    await pressWhenAsked(page, () => walked, 240);
    const notes = await walking;
    floors.push(notes);
    await page.waitForTimeout(800);
    phase = await page.evaluate(() => window.__run.getState().phase);
    if (!notes.paid) break;
  }
  results.push({ seed, phase, floors, seconds: (Date.now() - startedAt) / 1000 });
  const line = floors.map((f, i) => `floor ${i + 1}: ${f.rooms} rooms, ${f.gems} gems`).join("; ");
  ok(`seed ${seed} can be played from the first room to the last`, phase === "won", `${phase} - ${line}`);
}

const won = results.filter((r) => r.phase === "won");
ok("every seed tried can be finished", won.length === SEEDS.length, `${won.length} of ${SEEDS.length}`);

if (won.length) {
  const rooms = won.map((r) => r.floors.reduce((a, f) => a + f.rooms, 0));
  const gems = won.map((r) => r.floors.reduce((a, f) => a + f.gems, 0));
  const steps = won.map((r) => r.floors.reduce((a, f) => a + f.steps, 0));
  const saved = won.map((r) => r.floors.reduce((a, f) => a + f.toppedUp, 0));
  const range = (xs) => (Math.min(...xs) === Math.max(...xs) ? `${xs[0]}` : `${Math.min(...xs)} to ${Math.max(...xs)}`);
  // Not a claim about how long a run takes: this machine has no GPU and
  // the walker teleports between doorways rather than walking the floor.
  // Rooms, doors and gems are what it actually measured.
  console.log(
    `\nA finished run: ${range(rooms)} rooms entered, ${range(steps)} doors taken, ` +
      `${range(gems)} gems picked up.`
  );
  console.log(`Lives topped up ${range(saved)} times a run - the walker does not evade the Warden.`);
}

ok("nothing errored while the run was played", errors.length === 0, errors.slice(0, 2).join(" | "));

await browser.close();
console.log(failures === 0 ? "\nThe game can be finished." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
