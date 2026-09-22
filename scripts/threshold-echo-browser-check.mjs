import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
  args: ["--autoplay-policy=no-user-gesture-required"] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5234"}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const result = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { thresholdEchoSitesFor } = await import("/src/game/worldbuilding/thresholdEcho.ts");
    const { playerAt } = await import("/src/game/player/where.ts");
    const { ambience, sfx } = await import("/src/game/systems/audio.ts");
    const fixtures = {};
    for (let seed = 1; seed <= 100 && Object.keys(fixtures).length < 2; seed++) for (const floor of [1, 2, 3]) {
      const dungeon = generateDungeon({ seed, floor });
      for (const room of dungeon.rooms) {
        if (room.kind !== "normal") continue;
        const sites = thresholdEchoSitesFor(room, dungeon.rooms);
        for (const site of sites) {
          const kind = site.district ? "district" : "material";
          if (!fixtures[kind] && Math.hypot(site.x, site.z) > 3.5)
            fixtures[kind] = { dungeon, floor, room, site };
        }
      }
    }
    const heard = [], played = [];
    const original = sfx.threshold;
    sfx.threshold = (site, pan) => { played.push({ destination: site.destination, pan }); return original(site, pan); };
    const off = window.__bus.on("thresholdHeard", site => heard.push(site));
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const teleport = async (x, z) => {
      window.__bus.emit("teleport", { position: [x, 1.5, z] });
      for (let i = 0; i < 60 && Math.hypot(playerAt.x - x, playerAt.z - z) > 0.8; i++) await wait(20);
      await wait(130);
    };
    const reviews = {};
    for (const kind of ["district", "material"]) {
      const fixture = fixtures[kind];
      if (!fixture) continue;
      const { dungeon, floor, room, site } = fixture;
      window.__run.setState({ dungeon, floor, currentRoomId: room.id, phase: "playing", paused: false,
        inputLocks: 0, transitioning: false, wardenRoomId: null, harrierSlain: true,
        reaperAwake: false, thiefPhase: "away", broken: [], looted: [], invulnerableUntil: 1e9 });
      window.__bus.emit("teleport", { position: [site.x, 1.5, site.z] });
      for (let i = 0; i < 100 && (window.__thresholdEchoes?.roomId !== room.id ||
        window.__thresholdEchoes?.roomSeed !== room.seed); i++) await wait(20);
      await wait(250);
      const first = heard.length, airBefore = ambience.airId();
      await teleport(0, 0);
      await teleport(site.x, site.z);
      const approach = heard.length, playedAfterApproach = played.length;
      await teleport(0, 0);
      await teleport(site.x, site.z);
      const repeated = heard.length;
      window.__run.setState({ paused: true });
      await teleport(0, 0);
      await teleport(site.x, site.z);
      const paused = heard.length;
      reviews[kind] = { first, approach, playedAfterApproach, repeated, paused,
        airUnchanged: ambience.airId() === airBefore, site,
        livePosition: [playerAt.x, playerAt.z] };
      window.__run.setState({ paused: false });
    }
    off(); sfx.threshold = original;
    return { kinds: Object.keys(fixtures), reviews, heard, played };
  });
  assert.deepEqual(result.kinds.sort(), ["district", "material"]);
  assert.equal(result.reviews.district.first, 0, "entering beside a border is quiet");
  assert.equal(result.reviews.district.approach, 1, "approaching a district border answers once");
  assert.equal(result.reviews.district.playedAfterApproach, 1, "district sound reaches the audio engine");
  assert.equal(result.reviews.district.repeated, 1, "the same district border stays quiet for the visit");
  assert.equal(result.reviews.district.paused, 1, "pause cannot fire another district cue");
  assert.equal(result.reviews.material.first, 1, "entering beside a material contact is quiet");
  assert.equal(result.reviews.material.approach, 2, "approaching a material contact answers once");
  assert.equal(result.reviews.material.playedAfterApproach, 2, "material sound reaches the audio engine");
  assert.equal(result.reviews.material.repeated, 2, "the same material contact stays quiet for the visit");
  assert.equal(result.reviews.material.paused, 2, "pause cannot fire another material cue");
  assert.ok(result.reviews.district.airUnchanged && result.reviews.material.airUnchanged,
    "a short preview never replaces the room's held air voice");
  assert.deepEqual(errors, []);
  console.log("PASS real district and geological thresholds answer once on approach, stay quiet on entry and pause, and keep the room air", result.reviews);
} finally { await browser.close(); }
