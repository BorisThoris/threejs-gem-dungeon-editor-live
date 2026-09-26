/**
 * Do the creatures read their rows?
 *
 *   yarn dev --port 5199   # in one terminal
 *   yarn test:rows         # in another
 *
 * `susceptibility.ts` says what each thing on the floor answers to, and for
 * a dozen runs most of it was a document: the store downed the Harrier by
 * "same room as the bomb" while its row said [blast] 0.20, the rats ran
 * from feet while their row said [loud] 0.45, and the Sentry read a flag
 * about the player's lantern while its row said [bright] 0.50. The layout
 * suite now greps for each wiring; this drives the running game and checks
 * the consequences a player would meet - a barrel bursting across the room
 * scatters the rats, the moth goes to the brightest thing in its room, the
 * Sentry's patience follows the light in the room and not the lantern's
 * switch, and a bomb next door puts the Harrier down.
 *
 * One consequence worth reading twice: the wisp comes out with a raised
 * lantern and is brighter (0.80) than a dimmed flame, so turning the flame
 * down does not get under the Sentry's or the moth's threshold while the
 * wisp is beside you - only the lantern fully down, and the wisp gone with
 * it after the three-second afterglow. That is the wisp's price, as its
 * row states it, and this checks it rather than assuming the bands alone
 * decide.
 */
import { chromium } from "playwright-core";
const PORT = process.env.PORT || process.argv[2] || "5199";
const CHROMIUM = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch({ executablePath: CHROMIUM,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load" });
await page.waitForTimeout(2500);
const start = await page.$('button:has-text("Start")');
if (start) await start.click();
await page.waitForTimeout(4000);
let failures = 0;
const ok = (label, cond, detail = "") => { if (!cond) failures++; console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  - " + detail : ""}`); };

const out = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const run = window.__run, A = window.__ambient, D = window.__derived, W = window.__world;
  const res = {};
  const enter = async (roomId) => { run.setState({ transitioning: true, currentRoomId: roomId, oil: 999 }); run.getState().roomReady(roomId); await wait(1400); };
  const tp = async (x, z) => { window.__bus.emit("teleport", { position: [x, 1.5, z] }); await wait(300); };
  const lowerTo = async (band) => { for (let i = 0; i < 8 && run.getState().glim > band; i++) { run.getState().toggleLantern(); await wait(150); } await wait(400); };

  // A floor with rats, a moth room and a Sentry (floor 2 has sentries).
  const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
  let d = null, ratRoom = null, sentryRoom = null, pondRoom = null;
  for (let seed = 1; seed < 60 && !(ratRoom && sentryRoom && pondRoom); seed++) {
    run.getState().startRun(seed);
    await wait(600);
    d = generateRunFloor(seed, 2);
    run.setState({ dungeon: d, floor: 2, phase: "playing" });
    ratRoom = d.rooms.find((r) => A.ratsFor(r, d.seed).length > 0 && r.size >= 16) ?? null;
    sentryRoom = d.rooms.find((r) => window.__sentryFor(r, d.seed, 2)) ?? null;
    pondRoom = d.rooms.find((r) => A.croakersFor(r, d.seed).length > 0) ?? null;
    res.seed = seed;
  }
  if (!d || !ratRoom || !sentryRoom || !pondRoom) return { error: "no floor with rats, a sentry, and croakers found", ratRoom: !!ratRoom, sentryRoom: !!sentryRoom, pondRoom: !!pondRoom };

  // --- Rats: a barrel bursting across the room scatters them. ---
  await enter(ratRoom.id);
  const holes = A.ratsFor(ratRoom, d.seed);
  // Stand in the corner farthest from the first hole, so feet are not the reason.
  const h = holes[0];
  const far = ratRoom.size / 2 - 1.5;
  await tp(-Math.sign(h.x || 1) * far, -Math.sign(h.z || 1) * far);
  await wait(1500);
  const before = (window.__rats ?? []).map((r) => ({ x: r.x, z: r.z, startled: r.startled }));
  const calm = before.every((r) => !r.startled);
  window.__bus.emit("propBroken", { roomId: ratRoom.id, kind: "barrel", key: "probe:barrel" });
  await wait(250);
  const during = (window.__rats ?? []).map((r) => ({ x: r.x, z: r.z, startled: r.startled }));
  await wait(900);
  const after = (window.__rats ?? []).map((r) => ({ x: r.x, z: r.z, startled: r.startled }));
  const moved = before.map((b, i) => Math.hypot((after[i]?.x ?? b.x) - b.x, (after[i]?.z ?? b.z) - b.z));
  res.rats = { count: before.length, calm, startled: during.some((r) => r.startled), moved: moved.map((m) => +m.toFixed(2)), toPlayer: before.map((b) => +Math.hypot(b.x - window.__playerDebug.x, b.z - window.__playerDebug.z).toFixed(1)) };

  // --- Moth: drawn by the lantern's light down to Guttered, and not below. ---
  const mothRoomId = A.mothRoom(d);
  if (mothRoomId) {
    await enter(mothRoomId);
    await tp(0, 0);
    if (run.getState().glim > 0) await lowerTo(0);
    await wait(300);
    const perched = window.__moth && !window.__moth.drawn;
    run.getState().toggleLantern();
    await wait(1800);
    const drawnFull = { ...window.__moth, glim: run.getState().glim };
    await lowerTo(51);
    const drawnGuttered = { ...window.__moth, glim: run.getState().glim };
    await lowerTo(26);
    const dim = { ...window.__moth, glim: run.getState().glim, on: run.getState().mothOn, wisp: run.getState().wispOut };
    await lowerTo(0);
    // The afterglow keeps the wisp out for three seconds; after that there is no light in the room.
    await wait(3600);
    const dark = { ...window.__moth, glim: run.getState().glim, on: run.getState().mothOn, wisp: run.getState().wispOut };
    res.moth = { perched, drawnFull, drawnGuttered, dim, dark };
  }

  // --- Sentry: its patience halves in light over half, and not under. ---
  await enter(sentryRoom.id);
  const post = window.__sentryFor(sentryRoom, d.seed, 2);
  await tp(post.at[0] + 2, post.at[2] + 2);
  const { playerLightIn } = await import("/src/game/ladder/sight.ts");
  const { SUSCEPTIBILITY } = await import("/src/game/din/susceptibility.ts");
  const sentryLight = () => ({ lit: window.__sentry?.lit_by_light, level: playerLightIn(sentryRoom.id) });
  await lowerTo(0);
  await wait(3600);
  const dark = sentryLight();
  run.getState().toggleLantern();
  await wait(1800);
  const lit = sentryLight();
  await lowerTo(26);
  const dimmed = { ...sentryLight(), wisp: run.getState().wispOut };
  await lowerTo(0);
  await wait(3600);
  const out = { ...sentryLight(), wisp: run.getState().wispOut };
  res.sentry = { dark, lit, dimmed, out, threshold: SUSCEPTIBILITY.sentry.answers.bright };

  // --- Toads: they sing in a wet room, hush underfoot, and go under at a noise. ---
  // A plain room for preference: a trap room's plate, crossed by the
  // teleport, is loud enough to put them under, which is right and is
  // not what this is measuring.
  const ponds = d.rooms.filter((r) => A.croakersFor(r, d.seed).length > 0);
  const pond = ponds.find((r) => r.kind === "normal" && !A.roostFor(r, d.seed)) ?? ponds.find((r) => r.kind === "normal") ?? ponds[0] ?? null;
  if (pond) {
    // The floor's heat buys a roost going up at about forty seconds of
    // dwell, and the toads answer the roost - which is the chain the rows
    // describe and is not what this is measuring. Mark the heat's
    // purchases delivered so the probe reads the toads and not the floor.
    run.setState({ heatBought: ["cutpurse", "bats", "ceiling", "harrier"] });
    await enter(pond.id);
    await lowerTo(0);
    const spots = A.croakersFor(pond, d.seed);
    // Stand across the room from all of them.
    const cx = -Math.sign(spots[0].x || 1) * (pond.size / 2 - 1.5);
    const cz = -Math.sign(spots[0].z || 1) * (pond.size / 2 - 1.5);
    // A teleport across a flooded room is a dash on standing water, which
    // is loud enough to put them under - correctly. So after each move,
    // wait for them to come back up before reading.
    const resurface = () => wait(W.CROAKER_UNDER_S * 1000 + 800);
    // What the floor was loud about while they were watched, for the report.
    const noises = [];
    const offs = ["wardenHeard", "trapSprung", "propBroken", "barBroken", "batsRoused", "snareSprung", "doorBarred", "keyDropped", "bombBurst", "croakersDove", "roomEntered"]
      .map((e) => window.__bus.on(e, (p) => noises.push(`${e}@${D.clock().toFixed(1)}${p && p.kind ? ":" + p.kind : ""}`)));
    await tp(cx, cz);
    await resurface();
    const singing = { ...window.__croakers, noises: noises.slice(), kind: pond.kind };
    await tp(spots[0].x - Math.sign(spots[0].x || 1) * 0.8, spots[0].z - Math.sign(spots[0].z || 1) * 0.8);
    await resurface();
    const hushed = { ...window.__croakers };
    await tp(cx, cz);
    await resurface();
    const dove = [];
    const offDove = window.__bus.on("croakersDove", ({ roomId }) => dove.push(roomId));
    window.__bus.emit("propBroken", { roomId: pond.id, kind: "barrel", key: "probe:pond" });
    await wait(400);
    const under = { ...window.__croakers, dove: dove.slice(), noises: noises.slice() };
    offDove();
    offs.forEach((off) => off());
    res.toads = { room: pond.id, spots: spots.length, singing, hushed, under };
  }

  // --- Harrier: a bomb in the room next door puts it down. ---
  const events = [];
  const off = window.__bus.on("harrierDowned", () => events.push("downed"));
  const here = ratRoom;
  const dir = Object.keys(here.links).find((k) => here.links[k]);
  const nextId = here.links[dir];
  const next = d.rooms.find((r) => r.id === nextId);
  await enter(next.id);
  await tp(0, 0);
  await lowerTo(0);
  run.setState({ satchel: ["bomb"], lives: 9, harrierAwake: false, harrierSlain: false, harrierRetreatUntil: 0, harrierDownedUntil: 0 });
  const placed = run.getState().placeDevice(0);
  // Walk through the door before it goes: be in the room next door with the Harrier awake there.
  await enter(here.id);
  await tp(0, 0);
  run.getState().wakeHarrier();
  const t0 = performance.now();
  while (!events.includes("downed") && performance.now() - t0 < 6000) await wait(100);
  off();
  res.harrier = { placed, bombRoom: next.id, playerRoom: run.getState().currentRoomId, downed: events.includes("downed"), harrierRoom: window.__harrierAt?.roomId ?? null, arriving: null };
  return res;
});

console.log(JSON.stringify(out, null, 1));
if (out.error) { ok(out.error, false); }
else {
  ok("rats calm before the noise, and startled by a barrel bursting across the room", out.rats.calm && out.rats.startled, JSON.stringify(out.rats));
  ok("and they ran", out.rats.moved.some((m) => m > 0.5), out.rats.moved.join(","));
  if (out.moth) {
    ok("the moth is drawn by a full lantern", out.moth.drawnFull.drawn && out.moth.drawnFull.to === "lantern", JSON.stringify(out.moth.drawnFull));
    ok("and still at Guttered, which is over its row", out.moth.drawnGuttered.drawn && out.moth.drawnGuttered.glim === 51, JSON.stringify(out.moth.drawnGuttered));
    ok("a quarter flame is under its row, so it goes to the wisp instead and leaves your lantern", out.moth.dim.drawn && out.moth.dim.to === "wisp" && !out.moth.dim.on && out.moth.dim.wisp === true, JSON.stringify(out.moth.dim));
    ok("and with the lantern down and the wisp gone it is back on its perch", !out.moth.dark.drawn && out.moth.dark.wisp === false, JSON.stringify(out.moth.dark));
  }
  ok("the Sentry follows local light at its row's threshold, including room fixtures",
    [out.sentry.dark, out.sentry.lit, out.sentry.dimmed, out.sentry.out].every((sample) => sample.lit === (sample.level >= out.sentry.threshold)) && out.sentry.lit.lit === true,
    JSON.stringify(out.sentry));
  ok("a quarter flame is under its row, but the wisp beside you is not: that is the wisp's price", out.sentry.dimmed.lit === true && out.sentry.dimmed.wisp === true, JSON.stringify(out.sentry.dimmed));
  ok("the lantern down removes the wisp and its light contribution", out.sentry.out.wisp === false && out.sentry.out.level < out.sentry.dimmed.level, JSON.stringify(out.sentry.out));
  ok("a bomb next door downs the Harrier through its row", out.harrier.placed && out.harrier.downed, JSON.stringify(out.harrier));
  if (out.toads) {
    ok("the toads sing in a wet room with nobody near them", out.toads.singing.singing === out.toads.spots && out.toads.singing.under === 0, JSON.stringify(out.toads.singing));
    ok("and hush, without diving, for a player standing over one", out.toads.hushed.singing < out.toads.spots && out.toads.hushed.under === 0, JSON.stringify(out.toads.hushed));
    ok("and go under, all of them, at a barrel bursting - and say so", out.toads.under.under === out.toads.spots && out.toads.under.singing === 0 && out.toads.under.dove.includes(out.toads.room), JSON.stringify(out.toads.under));
  } else ok("a floor with toads on it was found", false, "none in the seeds tried");
}
ok("no page errors", errors.length === 0, errors.join(" | "));
await browser.close();
process.exit(failures ? 1 : 0);
