/**
 * The desktop artifact: what is in it, and whether it starts.
 *
 *   yarn test:desktop
 *
 * This is the package Steam would ship, and until now the only thing ever
 * checked about it was that the builder exited zero. Nobody had looked
 * inside one or started one - which is how the Linux executable came to be
 * called `threejs-gem-dungeon-editor`, after the npm package, while
 * steam/README.md told whoever set up the store page to launch
 * `gem-dungeon`. A Steam Deck configured from that document would not have
 * started the game.
 *
 * So: read the package, then run it. Electron is Chromium, so it will open
 * a debugging port and let the same tooling that plays the web build play
 * the desktop one - through the menu and the keyboard, because a packaged
 * build has no probes in it either.
 *
 * Builds the current web assets and a directory package for this host, then
 * starts that package. Linux uses Xvfb; Windows and macOS use their native
 * window server.
 */
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const product = pkg.build.productName;
const platform = process.platform;
const layouts = {
  win32: { target: "--win", directory: "win-unpacked", executable: `${product}.exe`, asar: "resources/app.asar" },
  linux: { target: "--linux", directory: "linux-unpacked", executable: pkg.build.linux.executableName, asar: "resources/app.asar" },
  darwin: { target: "--mac", directory: "mac", executable: `${product}.app/Contents/MacOS/${product}`, asar: `${product}.app/Contents/Resources/app.asar` },
};
const layout = layouts[platform];
if (!layout) throw Error(`No desktop package check for ${platform}`);
const OUT = join(root, "dist-electron", layout.directory);
const executable = join(OUT, layout.executable);
const PORT = process.env.DESKTOP_PORT || "9333";

let failures = 0;
const ok = (label, cond, detail = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  - " + detail : ""}`);
};

console.log(`Building the current ${platform} desktop package...`);
execFileSync(process.execPath, [join(root, "node_modules", "vite", "bin", "vite.js"), "build"], { cwd: root, stdio: "inherit" });
execFileSync(process.execPath, [join(root, "node_modules", "electron-builder", "out", "cli", "cli.js"), layout.target, "dir"],
  { cwd: root, stdio: "inherit" });

// --- What is in the package ------------------------------------------------

ok(`the package has an executable called ${layout.executable}`, existsSync(executable));

/**
 * The name in the build config and the name in the Steam instructions are
 * the same fact written twice, and they were different. Whoever sets up the
 * store page reads the document, so the document is what has to be right -
 * and the only way to know is to compare it with what the builder made.
 */
const steamDoc = readFileSync(join(root, "steam/README.md"), "utf8");
/**
 * What each platform's launch executable is called, derived from the build
 * config rather than typed out again. electron-builder names the Windows
 * binary and the macOS bundle after the product; Linux takes whatever
 * executableName says, and said the npm package's name until this cycle.
 *
 * The current host's package is built and started below. The other platform
 * names are still checked against the shipping instructions.
 */
const launches = [
  ["Linux", pkg.build.linux.executableName],
  ["Windows", `${product}.exe`],
  ["macOS", `${product}.app`],
];
for (const [platform, name] of launches) {
  ok(
    `the Steam instructions name what the builder makes on ${platform}`,
    steamDoc.includes(`\`${name}\``),
    name
  );
}
// And where a package can actually be built here, the artifact itself.
for (const [platform, name, where] of [
  ["Windows", `${product}.exe`, "dist-electron/win-unpacked"],
  ["macOS", `${product}.app`, "dist-electron/mac"],
]) {
  if (existsSync(join(root, where, name))) {
    ok(`the ${platform} package that is here is named ${name}`, true);
  } else {
    console.log(`  no ${platform} package on this machine to check - it needs its own host`);
  }
}

const asar = join(OUT, layout.asar);
ok("the game is packed into an asar", existsSync(asar), asar);
const packed = readFileSync(asar, "utf8");
// Path strings survive in the asar's header, so it can be asked what it
// holds without unpacking it.
ok("the built game is inside it", packed.includes("index.html") && packed.includes("main.cjs"));
ok("no source maps ship", !packed.includes(".js.map"), "searched the asar header");
ok(
  "no authoring tools ship",
  !packed.includes("gem-dungeon.drafts") && !packed.includes("THE GAME WILL NOT DRAW")
);

const size = readdirSync(OUT).reduce((total, name) => {
  const path = join(OUT, name);
  return total + (statSync(path).isDirectory() ? 0 : statSync(path).size);
}, statSync(asar).size);
console.log(`  package: ${(size / (1024 * 1024)).toFixed(0)} MB of files beside the asar`);

// --- Whether it starts -----------------------------------------------------

/**
 * Refuse to run against something already there.
 *
 * The first version of this leaked: it spawned xvfb-run without a process
 * group and then tried to kill one, so every run left an Electron behind
 * and the next run connected to the previous run's game rather than
 * starting its own - which read as the menu check passing on a screen that
 * was already mid-run. A harness that gives a different answer the second
 * time is worse than none, and this project has now learned that three
 * times.
 */
const stale = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(
  () => true,
  () => false
);
if (stale) {
  console.log(`FAIL  nothing is already listening on ${PORT}  - a previous run leaked; kill it first`);
  process.exit(1);
}

/**
 * The display and the app are started separately and owned outright.
 *
 * xvfb-run is a shell that launches what you give it, so killing it leaves
 * the app running under a display that is also still running - which is how
 * the first version of this leaked eight processes a run. Two processes we
 * spawned ourselves, each in its own group, can actually be killed.
 */
const DISPLAY = `:${90 + (Number(PORT) % 8)}`;
const xvfb = platform === "linux"
  ? spawn("Xvfb", [DISPLAY, "-screen", "0", "1280x800x24", "-nolisten", "tcp"], {
    stdio: "ignore", detached: true,
  })
  : null;
if (xvfb) await new Promise((r) => setTimeout(r, 1500));

const app = spawn(
  executable,
  [
    "--no-sandbox",
    "--windowed",
    `--remote-debugging-port=${PORT}`,
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
  // A separate process group on Unix lets cleanup stop the whole tree;
  // Windows cleanup uses taskkill /T for the same reason.
  { cwd: OUT, stdio: ["ignore", "pipe", "pipe"], detached: platform !== "win32", windowsHide: true,
    env: xvfb ? { ...process.env, DISPLAY } : process.env }
);
let appOutput = "";
app.stdout.on("data", (d) => (appOutput += d));
app.stderr.on("data", (d) => (appOutput += d));
app.on("error", (error) => (appOutput += `\n${error}`));
let stopped = false;
const stop = () => {
  if (stopped) return;
  stopped = true;
  for (const child of [app, xvfb].filter(Boolean)) {
    if (platform === "win32") {
      if (child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      continue;
    }
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      try {
        child.kill("SIGKILL");
      } catch {
        // Already gone.
      }
    }
  }
};
process.on("exit", stop);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => (stop(), process.exit(1)));

let browser = null;
for (let i = 0; i < 60 && !browser; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`).catch(() => null);
}
ok("the packaged game starts and opens its window", browser !== null, appOutput.slice(-200));

if (browser) {
  const contexts = browser.contexts();
  const pages = contexts.flatMap((c) => c.pages());
  const page = pages[0];
  ok("it has a page to show", !!page, `${pages.length} pages`);
  if (page) {
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
    await page.waitForTimeout(9000);
    const menu = await page.evaluate(() => document.body.innerText).catch(() => "");
    ok("the menu comes up in the packaged game", /start/i.test(menu), menu.slice(0, 60).replace(/\n/g, " · "));

    const start = await page.$('button:has-text("Start")');
    if (start) await start.click();
    await page.waitForTimeout(9000);
    const hud = await page.evaluate(() => document.body.innerText).catch(() => "");
    ok(
      "a run starts on the desktop build",
      /LIVES/.test(hud) && /FLOOR/.test(hud),
      hud.slice(0, 60).replace(/\n/g, " · ")
    );
    await page.keyboard.press("Escape");
    const paused = await page.locator('[data-testid="pause-resume"]').waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
    ok("Escape pauses the packaged game", paused);
    if (paused) {
      await page.locator('[data-testid="pause-resume"]').click();
      const resumed = await page.locator('[data-testid="pause-resume"]').waitFor({ state: "hidden", timeout: 10000 })
        .then(() => true).catch(() => false);
      ok("the packaged game resumes from its pause menu", resumed);
    }
    ok(
      "it loads from the packaged files rather than a dev server",
      await page.evaluate(() => location.protocol === "file:").catch(() => false)
    );
    ok("nothing errored while it played", errors.length === 0, errors.slice(0, 2).join(" | "));
  }
  await browser.close().catch(() => {});
}

stop();
console.log(failures === 0 ? "\nAll desktop checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
