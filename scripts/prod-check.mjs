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
import { spawn } from "node:child_process";
import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const PORT = process.env.PROD_PORT || "5198";
const CHROMIUM =
  process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

let failures = 0;
const ok = (label, cond, detail = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  - " + detail : ""}`);
};

// --- What is in the bundle, before anything is loaded ----------------------

const dist = new URL("../dist/", import.meta.url).pathname;
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

const started = spawn("npx", ["vite", "preview", "--port", PORT, "--strictPort"], {
  cwd: new URL("..", import.meta.url).pathname,
  stdio: "ignore",
});
const stop = () => started.kill();
process.on("exit", stop);

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

// vite preview takes a moment to bind.
let up = false;
for (let i = 0; i < 40 && !up; i++) {
  up = await page
    .goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load", timeout: 4000 })
    .then(() => true)
    .catch(() => false);
}
ok("the built site is served and loads", up);
await page.waitForTimeout(6000);

ok("nothing 404s", missing.length === 0, missing.slice(0, 3).join(" | "));
ok(
  "the probes the other checks use are not in the shipped game",
  await page.evaluate(() => [window.__run, window.__bus, window.__perf].every((h) => h === undefined))
);
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

/** What the canvas is actually drawing, as a rough colour signature. */
const painted = async () => {
  const shot = await page.screenshot({ clip: { x: 300, y: 250, width: 600, height: 380 } });
  let sum = 0;
  let varies = new Set();
  for (let i = 0; i < shot.length; i += 997) {
    sum += shot[i];
    varies.add(shot[i] >> 4);
  }
  return { sum, shades: varies.size };
};
const first = await painted();
ok("the world is drawn rather than a black rectangle", first.shades > 3, JSON.stringify(first));

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

await browser.close();
stop();
console.log(failures === 0 ? "\nAll production checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
