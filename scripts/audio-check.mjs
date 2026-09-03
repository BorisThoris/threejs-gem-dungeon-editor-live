/**
 * Does the game make a sound?
 *
 *   yarn dev --port 5199   # in one terminal
 *   yarn test:audio        # in another
 *
 * The whole sound design is synthesised - a few oscillators and an envelope
 * each, no audio files, no licences - which is a nice property and also
 * means there is no asset whose absence would be obvious. Twenty-five cues
 * and an ambient bed, and the only thing any harness had ever checked about
 * any of it was that one cue could be driven twenty thousand times without
 * leaking. A build that shipped silent, or with one cue broken by a
 * refactor, would have passed every check this project has.
 *
 * How it listens. Before the app loads, `AudioNode.prototype.connect` is
 * wrapped: anything that connects to the context's destination is also
 * connected to an analyser the harness owns. So this measures the real
 * graph, as it ships, with nothing added to the game for the benefit of the
 * test - and it measures samples, not calls, so a cue that runs without
 * producing sound fails.
 *
 * What it cannot say: whether the cues sound good, whether they are mixed
 * sensibly against each other, or whether any of it is audible over a
 * fan. It says there is signal where there should be and silence where
 * there should be.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const root = new URL("..", import.meta.url).pathname;
const PORT = process.env.PORT || process.argv[2] || "5199";
const CHROMIUM =
  process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

let failures = 0;
const ok = (label, cond, detail = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  - " + detail : ""}`);
};

/**
 * The tap. Installed before any of the game's code runs, because the master
 * gain connects to the destination the first time a sound is asked for and
 * there is no second chance to see it happen.
 */
const TAP = `
  (() => {
    window.__tap = { analyser: null, ctx: null };
    const realConnect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest, ...rest) {
      const out = realConnect.call(this, dest, ...rest);
      if (dest && dest.context && dest === dest.context.destination) {
        const t = window.__tap;
        if (!t.analyser) {
          t.ctx = dest.context;
          t.analyser = dest.context.createAnalyser();
          t.analyser.fftSize = 2048;
        }
        realConnect.call(this, t.analyser);
      }
      return out;
    };
    /** The loudest sample in the analyser's window, right now. */
    window.__peak = () => {
      const t = window.__tap;
      if (!t.analyser) return null;
      const buf = new Float32Array(t.analyser.fftSize);
      t.analyser.getFloatTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v));
      return peak;
    };
    /** The loudest sample over a window of time, which is what a cue is. */
    window.__listen = async (ms) => {
      let peak = 0;
      const until = performance.now() + ms;
      while (performance.now() < until) {
        peak = Math.max(peak, window.__peak() ?? 0);
        await new Promise((r) => setTimeout(r, 12));
      }
      return peak;
    };
    /**
     * The average level over a window, which is what a continuous sound is.
     *
     * A cue is a peak - it happens once and the loudest moment is the whole
     * of it. The ambient bed is not: its noise runs through a low-pass
     * wobbled by an oscillator at 0.07Hz, a fourteen-second cycle, so any
     * short sample of it lands wherever that cycle happens to be. Comparing
     * two 600ms peaks of it read "quieter when roused" about one run in
     * three, which is a check that would have been believed the first time
     * it failed for real.
     */
    /**
     * The average energy in a frequency band, 0..1 per bin.
     *
     * The bed is what the alarm is carried on, and the way it tightens is a
     * low-pass opening from 320Hz to 740Hz. Trying to see that as loudness
     * does not work: the same filter is wobbled by an oscillator at
     * 0.07Hz, so the bed's own level wanders by more than the tension
     * changes it, and three different amplitude measures each gave a
     * different answer about whether it had moved at all. What the filter
     * does to the spectrum is not ambiguous.
     */
    window.__band = async (loHz, hiHz, ms) => {
      const a = window.__tap.analyser;
      if (!a) return 0;
      const bins = new Uint8Array(a.frequencyBinCount);
      const perBin = window.__tap.ctx.sampleRate / 2 / a.frequencyBinCount;
      const lo = Math.floor(loHz / perBin);
      const hi = Math.ceil(hiHz / perBin);
      let sum = 0;
      let n = 0;
      const until = performance.now() + ms;
      while (performance.now() < until) {
        a.getByteFrequencyData(bins);
        for (let i = lo; i <= hi && i < bins.length; i++) sum += bins[i];
        n += hi - lo + 1;
        await new Promise((r) => setTimeout(r, 12));
      }
      return n ? sum / n / 255 : 0;
    };
    window.__level = async (ms) => {
      let sum = 0;
      let n = 0;
      const until = performance.now() + ms;
      while (performance.now() < until) {
        sum += window.__peak() ?? 0;
        n++;
        await new Promise((r) => setTimeout(r, 12));
      }
      return n ? sum / n : 0;
    };
  })()
`;

/**
 * How much louder than the room a cue has to be to count as having played.
 *
 * Not an absolute level, because there is never silence to measure against:
 * the ambient bed runs under the whole game at about 0.022, and the first
 * version of this used a fixed floor of 0.01 - which the bed clears on its
 * own. Every cue would have passed on the room tone alone, including a cue
 * that made no sound at all. The floor is measured with nothing playing and
 * each cue has to beat it.
 */
/**
 * How much louder than the room a cue has to be to count as having played.
 *
 * Modest on purpose. The cues are not meant to be equally loud - a footstep
 * is meant to sit just above the room and a victory fanfare is meant to
 * fill it - so a single high bar would either fail the quiet ones or have
 * to be set so low that a silent cue passes. This asks only that the cue
 * measurably lifts the level, and the loud ones are checked separately for
 * being loud.
 */
const OVER_THE_ROOM = 1.3;
/** A cue the game means you to notice, and how loud that is. */
const LOUD_CUES = ["gem", "win", "lose", "hurt", "spotted", "relic"];
const LOUD = 3;

/**
 * How long to let the analyser's window flush before believing it.
 *
 * It holds the last 2048 samples, about 46ms, so a measurement taken the
 * instant after muting still contains what was playing before. That read as
 * "muting does not silence the cues" until the graph was measured directly
 * and turned out to be silent.
 */
const FLUSH_MS = 150;

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    // Headless has no speakers and a suspended context makes no samples.
    "--autoplay-policy=no-user-gesture-required",
    "--disable-background-timer-throttling",
  ],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addInitScript(TAP);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));

const reached = await page
  .goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load", timeout: 60000 })
  .then(() => true)
  .catch(() => false);
if (!reached) {
  console.log(`FAIL  a dev server is running on ${PORT}  - start one with \`yarn dev --port ${PORT}\`, or set PORT`);
  await browser.close();
  process.exit(1);
}
await page.waitForTimeout(2500);
const start = await page.$('button:has-text("Start")');
if (start) await start.click();
await page.waitForTimeout(7000);

// --- Is there an audio graph at all? ---------------------------------------

ok(
  "the game opens an audio context and it is running",
  await page.evaluate(() => window.__tap.ctx?.state === "running"),
  await page.evaluate(() => window.__tap.ctx?.state ?? "none")
);
ok("something is connected to the speakers", await page.evaluate(() => !!window.__tap.analyser));

// --- Every cue the game can play -------------------------------------------

/**
 * The cues, how long to listen for each, and the arguments the game calls
 * them with.
 *
 * The arguments matter and the first version of this did not pass any. A
 * footstep takes whether it is the strong half of the gait and whether the
 * player is running, so calling it bare measured the quietest sound in the
 * game and reported it as too quiet - a check failing on a call the game
 * never makes. The panned cues were all measured dead centre for the same
 * reason.
 */
const CUES = [
  ["gem", 300, []],
  ["door", 400, []],
  ["hurt", 400, []],
  ["unlock", 400, []],
  ["unlock2", 500, []],
  ["heal", 400, []],
  ["win", 900, []],
  ["lose", 900, []],
  ["solved", 500, []],
  ["wrong", 400, []],
  ["step", 250, [true, false]],
  ["step", 250, [true, true]],
  ["take", 300, []],
  ["drink", 400, []],
  ["bitter", 400, []],
  ["clatter", 400, []],
  ["spotted", 500, [0.4]],
  ["key", 400, []],
  ["named", 400, []],
  ["grind", 600, []],
  ["release", 400, []],
  ["relic", 600, []],
  ["charm", 500, []],
  ["wardenNear", 500, [-0.5]],
  ["wardenHere", 600, [0.5]],
];

/** The room with nothing played into it: the bed, and whatever else runs. */
const floorLevel = await page.evaluate(async (flush) => {
  await new Promise((r) => setTimeout(r, flush));
  return window.__listen(600);
}, FLUSH_MS);
ok("there is a room tone to measure a cue against", floorLevel > 0, floorLevel.toFixed(4));
const AUDIBLE = Math.max(0.01, floorLevel * OVER_THE_ROOM);

const silent = [];
const quiet = [];
const heard = new Map();
for (const [cue, ms, args] of CUES) {
  const peak = await page.evaluate(
    async ([name, listenFor, withArgs]) => {
      const fn = window.__sfx?.[name];
      if (typeof fn !== "function") return -1;
      const listening = window.__listen(listenFor);
      fn(...withArgs);
      return await listening;
    },
    [cue, ms, args]
  );
  const label = args.length ? `${cue}(${args.join(",")})` : cue;
  heard.set(label, peak);
  if (peak < AUDIBLE) silent.push(`${label} ${peak < 0 ? "(missing)" : peak.toFixed(4)}`);
  if (LOUD_CUES.includes(cue) && peak < floorLevel * LOUD) quiet.push(`${label} ${peak.toFixed(4)}`);
}
ok(
  `all ${CUES.length} cues are heard over the room`,
  silent.length === 0,
  silent.join(", ") || `each above ${AUDIBLE.toFixed(4)}, the room tone being ${floorLevel.toFixed(4)}`
);
ok(
  "the cues a player is meant to notice are well clear of it",
  quiet.length === 0,
  quiet.join(", ") || `each above ${(floorLevel * LOUD).toFixed(4)}`
);
{
  const sorted = [...heard].sort((a, b) => b[1] - a[1]);
  const say = (e) => `${e[0]} ${e[1].toFixed(3)}`;
  console.log(`  loudest: ${sorted.slice(0, 3).map(say).join(", ")}`);
  console.log(`  quietest: ${sorted.slice(-3).map(say).join(", ")}`);
}

// The one held sound: it starts, it keeps going, and it stops.
const held = await page.evaluate(
  async ([threshold, flush]) => {
    const sfx = window.__sfx;
    const heard = window.__listen(500);
    sfx.stalk(0.6, 0);
    const during = await heard;
    sfx.stalkStop();
    await new Promise((r) => setTimeout(r, 400 + flush));
    const after = await window.__listen(400);
    return { during, after, stillOn: sfx.isStalking(), threshold };
  },
  [AUDIBLE, FLUSH_MS]
);
ok("the Warden's held sound plays while it is on", held.during >= AUDIBLE, held.during.toFixed(4));
// Back to the room, not to silence: the ambient bed is still running, and
// asking for silence here failed on the bed rather than on the sound.
ok(
  "and stops when it is stopped",
  held.after < AUDIBLE && !held.stillOn,
  `${held.after.toFixed(4)} after, room tone ${floorLevel.toFixed(4)}`
);

// --- The setting that turns it off -----------------------------------------

const muted = await page.evaluate(async (flush) => {
  const sfx = window.__sfx;
  sfx.setMuted(true);
  // Let the analyser's window empty of what was playing a moment ago.
  await new Promise((r) => setTimeout(r, flush));
  const heard = window.__listen(400);
  sfx.gem();
  sfx.door();
  sfx.hurt();
  const quiet = await heard;
  sfx.setMuted(false);
  const back = window.__listen(400);
  sfx.gem();
  return { quiet, loud: await back, reports: sfx.isMuted() };
}, FLUSH_MS);
// Silence, and it means it: the setting is on the master gain, so the
// ambient bed goes quiet too, which is what a player who turns sound off
// is asking for.
ok("muting silences everything, the bed included", muted.quiet === 0, muted.quiet.toFixed(4));
ok("and unmuting brings them back", muted.loud >= AUDIBLE, muted.loud.toFixed(4));
ok("the module agrees about whether it is muted", muted.reports === false);

// --- The ambient bed, which is the sound the alarm is carried on -----------

const bed = await page.evaluate(async () => {
  // The probe, not an import of the module: see the note in App.tsx. A
  // dynamic import here got a second copy of the module whose bed had never
  // been started, so every call did nothing and the check measured drift.
  const ambience = window.__ambience;
  // Measured in the spectrum, not in loudness, and alternated.
  //
  // Three amplitude measures were tried and all three were wrong: a short
  // peak disagreed with itself one run in three, a long average read the
  // change as 1.5%, and a long peak read it as nothing. The control that
  // settled it was stopping the bed entirely and watching the level go
  // *up* - the bed's own fourteen-second filter wobble is larger than
  // anything the tension does to its volume. What the tension actually
  // does is open that filter, so that is what to look at.
  const calm = [];
  const roused = [];
  // Above where the calm filter rolls off and below where the roused one
  // does: what the bed puts here is the whole of the difference.
  const BAND = [420, 900];
  for (let i = 0; i < 2; i++) {
    ambience.setTension(0);
    await new Promise((r) => setTimeout(r, 1400));
    calm.push(await window.__band(...BAND, 2000));
    ambience.setTension(1);
    await new Promise((r) => setTimeout(r, 1400));
    roused.push(await window.__band(...BAND, 2000));
  }
  ambience.setTension(0);
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return { calm: mean(calm), roused: mean(roused) };
});
ok("the floor has an ambient bed under it", bed.calm > 0, bed.calm.toFixed(4));
ok(
  "and it opens up as the floor is roused",
  bed.roused > bed.calm * 1.15,
  `${bed.calm.toFixed(4)} calm, ${bed.roused.toFixed(4)} roused, in 420-900Hz`
);

// --- Cues nobody plays are cues nobody hears -------------------------------

/**
 * A source check rather than a sound one: a cue that exists and is never
 * called is content that ships and is never heard, which is the same class
 * of quiet waste as a room template the generator never places.
 */
{
  const audio = readFileSync(`${root}src/game/systems/audio.ts`, "utf8");
  const exported = [...audio.matchAll(/^ {2}(\w+)\(/gm)].map((m) => m[1]);
  const sfxStart = audio.indexOf("export const sfx");
  const cues = exported.filter((name, i) => audio.indexOf(`  ${name}(`, sfxStart) > 0 && i >= 0);
  // The whole tree, not a list of files somebody remembered: the first
  // version of this looked in two and reported the footstep and the
  // Warden's stalk as cues nobody plays, because they are played from the
  // player and from the Warden.
  const everywhere = execFileSync("grep", ["-rho", "sfx\\.[a-zA-Z0-9_]*", `${root}src`], {
    encoding: "utf8",
  });
  const grep = (name) => new RegExp(`sfx\\.${name}$`, "m").test(everywhere);
  const unused = cues.filter(
    (name) => !["setMuted", "isMuted", "isStalking", "setTension", "start", "stop"].includes(name) && !grep(name)
  );
  ok("every cue the module offers is played by something", unused.length === 0, unused.join(", ") || "none unused");
}

ok("nothing errored while it played", errors.length === 0, errors.slice(0, 2).join(" | "));

await browser.close();
console.log(failures === 0 ? "\nAll audio checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
