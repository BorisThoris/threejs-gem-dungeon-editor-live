/**
 * Play the build that actually ships.
 *
 *   yarn test:prod
 *
 * Everything else in this project drives the dev server, and the production
 * bundle is a different program. `import.meta.env.DEV` is statically false
 * there, so every probe handle the other checks lean on - `window.__run`,
 * the bus, the perf counters - is gone, and the whole editor tree is
 * supposed to be dropped from the bundle. Which means the thing Cloudflare
 * Pages and Electron serve had never been loaded, never been played, and
 * the claim that the editor does not ship had never been read back off a
 * built file.
 *
 * So this drives it the way a stranger does: through the menu, the keyboard
 * and what is on the screen. No probes, because in this build there are
 * none - and that is the point.
 *
 * It builds and serves dist itself, so it needs no terminal of its own.
 */
import { spawn, spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const PORT = process.env.PROD_PORT || "5198";
const CHROMIUM = process.env.CHROMIUM_PATH || undefined;
const root = fileURLToPath(new URL("..", import.meta.url));

let failures = 0;
const ok = (label, cond, detail = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  - " + detail : ""}`);
};

// --- What is in the bundle, before anything is loaded ----------------------

const dist = join(root, "dist");
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
};
walk(dist);
const scripts = files.filter((f) => f.endsWith(".js"));
const bundle = scripts.map((f) => readFileSync(f, "utf8")).join("\n");

ok("a build exists to test", scripts.length > 0, `${files.length} files, ${scripts.length} scripts`);

/**
 * What a first visit costs to download.
 *
 * Nothing measured this, and it is the one budget a web build has that a
 * desktop one does not. Almost all of it is two libraries - rapier's
 * WebAssembly glue and three - so the number moves when a dependency does
 * rather than when a cycle adds a room, which is exactly what makes it
 * worth a tripwire: a careless import of a whole library shows up here and
 * nowhere else. Measured at 1.05 MB over the wire, 3.5 MB on disk; the
 * budget is that with a bit under a third on top.
 */
const OVER_THE_WIRE_MB = 1.35;
const wire = files
  .filter((f) => /\.(js|css|html|json)$/.test(f))
  .reduce((total, f) => total + gzipSync(readFileSync(f)).length, 0);
const wireMB = wire / (1024 * 1024);
ok(
  `a first visit downloads under ${OVER_THE_WIRE_MB} MB`,
  wireMB <= OVER_THE_WIRE_MB,
  `${wireMB.toFixed(2)} MB gzipped, ${(files.reduce((t, f) => t + statSync(f).size, 0) / (1024 * 1024)).toFixed(1)} MB on disk`
);
// The editor is behind a dynamic import guarded by a statically false
// constant, so it should be gone rather than merely unreachable. Strings
// only the authoring tools use are the cheapest way to ask.
const editorTells = ["Live in runs", "THE GAME WILL NOT DRAW", "gem-dungeon.drafts"];
const shipped = editorTells.filter((tell) => bundle.includes(tell));
ok("the editor is not in the bundle at all", shipped.length === 0, shipped.join(", ") || "none of its strings");

/**
 * Refuse to run against a server that is already there.
 *
 * The first version of this killed npx rather than the group it started,
 * so vite kept the port - and the next run bound nothing, connected to the
 * leftover, and reported the previous build as passing. Being able to
 * connect is not the same as having served what is in dist right now.
 */
const taken = await fetch(`http://127.0.0.1:${PORT}/`).then(
  () => true,
  () => false
);
if (taken) {
  console.log(`FAIL  nothing is already serving ${PORT}  - a previous run leaked; kill it first`);
  process.exit(1);
}

// Launch Vite directly, so the process we stop is the server itself.
const vite = join(root, "node_modules", "vite", "bin", "vite.js");
const started = spawn(process.execPath, [vite, "preview", "--host", "127.0.0.1", "--port", PORT, "--strictPort"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
  windowsHide: true,
});
let serverOutput = "";
for (const stream of [started.stdout, started.stderr]) {
  stream.on("data", (chunk) => {
    serverOutput = (serverOutput + chunk.toString()).slice(-4000);
  });
}
started.on("error", (error) => {
  serverOutput = `${serverOutput}\n${error}`;
});
let stopped = false;
const stop = () => {
  if (stopped) return;
  stopped = true;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(started.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    return;
  }
  try {
    process.kill(-started.pid, "SIGKILL");
  } catch {
    started.kill("SIGKILL");
  }
};
process.on("exit", stop);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => (stop(), process.exit(1)));

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-background-timer-throttling",
  ],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
const missing = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
page.on("response", (r) => r.status() >= 400 && missing.push(`${r.status()} ${r.url()}`));

/**
 * vite preview takes a moment to bind, so this waits for it.
 *
 * It used to retry forty times with nothing in between, and a connection to
 * a port nothing is listening on is refused immediately - so all forty
 * attempts were spent inside a second, while the server was still starting,
 * and the check failed. Everything after it passed, because by then the
 * server was up: one red line in an otherwise green run, on maybe one run
 * in five. A flake that says the built site does not load is exactly the
 * kind nobody chases and everybody learns to ignore.
 */
let up = false;
const deadline = Date.now() + 40000;
while (!up && Date.now() < deadline) {
  up = await page
    .goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load", timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (!up) await new Promise((r) => setTimeout(r, 500));
}
ok("the built site is served and loads", up, up ? "" : serverOutput.trim() || `preview exited with ${started.exitCode}`);
if (!up) {
  await browser.close();
  stop();
  process.exit(1);
}
await page.waitForTimeout(6000);

ok("nothing 404s", missing.length === 0, missing.slice(0, 3).join(" | "));
/**
 * Every probe the source declares, rather than three of them by name.
 *
 * This listed `__run`, `__bus` and `__perf`, which were all the probes
 * there were when it was written. There are a dozen now - the world's
 * constants and the layout's, the beam's arithmetic and the sweep's, where
 * the Warden is, how long the Sentry has held you, where the arena's arms
 * are, where the camera points, the trigger table, the player's body, the
 * gem and the key. All of them are stripped, which is why nothing noticed.
 * A check that names what it is looking for goes on passing while the
 * thing it was written to catch walks past it.
 *
 * So the list is read out of `src/` instead of kept here. Add a probe and
 * this covers it without being told. Asking the page for everything on
 * `window` beginning with two underscores is the other way to write it,
 * and it catches `__THREE__`, which is three.js's own revision marker and
 * not ours to remove.
 */
// Any `.__name`, not only `window.__name`: most probes use a typed cast.
const sourceFiles = [];
const walkSource = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkSource(path);
    else if (/\.[jt]sx?$/.test(name)) sourceFiles.push(path);
  }
};
walkSource(join(root, "src"));
const declared = [...new Set(sourceFiles.flatMap((path) =>
  [...readFileSync(path, "utf8").matchAll(/\.__[A-Za-z][A-Za-z0-9]*/g)].map(([match]) => match.slice(1))
))].sort();
ok("the source declares probes for the checks to read", declared.length >= 10, `${declared.length}: ${declared.join(" ")}`);
const leaked = await page.evaluate((names) => names.filter((n) => window[n] !== undefined), declared);
ok("and not one of them survives into the shipped game", leaked.length === 0, leaked.join(", "));
ok(
  "the editor route gives the game, not the tools",
  await page
    .goto(`http://127.0.0.1:${PORT}/?editor`, { waitUntil: "load", timeout: 20000 })
    .then(async () => {
      await page.waitForTimeout(4000);
      const text = await page.evaluate(() => document.body.innerText);
      return /start/i.test(text) && !/SURFACES|MOSAIC/i.test(text);
    })
    .catch(() => false)
);

// --- Played, through the menu and the keyboard only ------------------------

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load", timeout: 20000 });
await page.waitForTimeout(5000);
ok("the menu is there for a first-time visitor", /start/i.test(await page.evaluate(() => document.body.innerText)));

const start = await page.$('button:has-text("Start")');
if (start) await start.click();
await page.waitForTimeout(9000);

const hud = await page.evaluate(() => document.body.innerText);
ok("starting a run shows the HUD", /LIVES/.test(hud) && /GEMS/.test(hud) && /FLOOR/.test(hud), hud.slice(0, 60).replace(/\n/g, " · "));

/** Decode pixels: compressed PNG bytes also vary in a completely blank image. */
const pixels = (target, shot) => target.evaluate(async encoded => {
  const image = new Image();
  image.src = `data:image/png;base64,${encoded}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 40;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0;
  const shades = new Set();
  for (let i = 0; i < data.length; i += 4) {
    const light = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    sum += light;
    shades.add(light >> 4);
  }
  return { sum, mean: sum / (canvas.width * canvas.height), shades: shades.size };
}, shot.toString("base64"));
const showsWorld = sample => sample.mean > 2 && sample.shades > 3;
// Exercise the same decoder and guard with real encoded, uniformly blank images.
for (const colour of ["black", "white"]) {
  const blank = await page.evaluate(colour => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 380;
    const context = canvas.getContext("2d");
    context.fillStyle = colour;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png").split(",")[1];
  }, colour);
  const sample = await pixels(page, Buffer.from(blank, "base64"));
  ok(`the rendered-world guard rejects a ${colour} frame`, !showsWorld(sample), JSON.stringify(sample));
}
const painted = async () => pixels(page,
  await page.screenshot({ clip: { x: 300, y: 250, width: 600, height: 380 } }));
const first = await painted();
ok("the world is drawn rather than a black rectangle", showsWorld(first), JSON.stringify(first));

// Walk. There are no probes here, so what is checked is that holding a key
// changes what is on the screen and breaks nothing.
await page.mouse.click(640, 400);
await page.keyboard.down("KeyW");
await page.waitForTimeout(2500);
await page.keyboard.up("KeyW");
await page.waitForTimeout(600);
const after = await painted();
ok("walking changes what is on the screen", after.sum !== first.sum, `${first.sum} then ${after.sum}`);

// The pause menu is the one piece of UI a player is guaranteed to reach.
await page.keyboard.press("Escape");
await page.waitForTimeout(1200);
const paused = await page.evaluate(() => document.body.innerText);
ok("Escape opens the pause menu", /resume|quit|paused/i.test(paused), paused.slice(0, 60).replace(/\n/g, " · "));

ok("no errors on the console or off it", errors.length === 0, errors.slice(0, 2).join(" | "));

/**
 * And it starts for somebody who has played an older build.
 *
 * A demo that ships updates meets its own saved data written by a version
 * that no longer exists: renamed fields, retired ones, values of the wrong
 * type, and whatever a half-finished write left behind. Four keys ship -
 * settings, records, surfaces and the editor's drafts - and the boot is the
 * one moment where a bad byte costs the whole session, because there is no
 * game yet to fall back into.
 *
 * Records and settings read every field through a type check with a
 * default. The surface store did not: it wrote whatever it parsed into the
 * override map, and got away with it only because a bad `img.src` never
 * fires `onload`. That is safety by accident, and this is the check that
 * would notice the day it stopped being true.
 */
const STALE = [
  ["garbage in every key", {
    "gem-dungeon.settings": "}{not json",
    "gem-dungeon.records": "}{not json",
    "gem-dungeon.surfaces": "}{not json",
    "gem-dungeon.drafts": "}{not json",
  }],
  ["json of the wrong shape", {
    "gem-dungeon.settings": "42",
    "gem-dungeon.records": "[1,2,3]",
    "gem-dungeon.surfaces": "null",
    "gem-dungeon.drafts": '"a string"',
  }],
  ["an older build's fields, and overrides that are not images", {
    "gem-dungeon.settings": JSON.stringify({ cameraBob: "yes", sound: 1, musicVolume: 0.5 }),
    "gem-dungeon.records": JSON.stringify({ runs: "12", bestHaul: null, retiredField: true }),
    "gem-dungeon.surfaces": JSON.stringify({
      stone: 123, wood: { src: "x" }, brick: "", moss: "not-a-url", iron: null, dirt: "javascript:0",
    }),
    "gem-dungeon.drafts": JSON.stringify([{ id: 1 }]),
  }],
];
for (const [label, store] of STALE) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p2 = await ctx.newPage();
  const bad = [];
  p2.on("pageerror", (e) => bad.push(String(e).slice(0, 120)));
  await p2.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, store);
  await p2.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load", timeout: 20000 }).catch(() => {});
  await p2.waitForTimeout(3500);
  const menu = await p2.evaluate(() => /start/i.test(document.body.innerText));
  const start = await p2.$('button:has-text("Start")');
  if (start) await start.click();
  await p2.waitForTimeout(9000);
  // No probes in the shipped bundle, so the evidence is what is drawn.
  const lit = await p2.evaluate(() => document.body.innerText);
  const shot = await p2.screenshot({ clip: { x: 440, y: 250, width: 400, height: 300 } });
  const sample = await pixels(p2, shot);
  ok(
    `it starts with ${label}`,
    menu && /lives|gems/i.test(lit) && showsWorld(sample) && bad.length === 0,
    `menu ${menu}, hud ${/lives|gems/i.test(lit)}, pixels ${JSON.stringify(sample)}` +
      (bad.length ? `, errors ${JSON.stringify(bad.slice(0, 1))}` : "")
  );
  await ctx.close();
}

await browser.close();
stop();
console.log(failures === 0 ? "\nAll production checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
