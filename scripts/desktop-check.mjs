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
 * Needs a virtual display (xvfb-run) and a Linux `dir` build, which it makes
 * if there is not one already.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const root = new URL("..", import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const EXECUTABLE = pkg.build.linux.executableName;
const OUT = join(root, "dist-electron/linux-unpacked");
const PORT = process.env.DESKTOP_PORT || "9333";

let failures = 0;
const ok = (label, cond, detail = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  - " + detail : ""}`);
};

if (!existsSync(join(OUT, EXECUTABLE))) {
  console.log("Building the Linux package...");
  execFileSync("npx", ["electron-builder", "--linux", "dir"], { cwd: root, stdio: "inherit" });
}

// --- What is in the package ------------------------------------------------

ok(`the package has an executable called ${EXECUTABLE}`, existsSync(join(OUT, EXECUTABLE)));

/**
 * The name in the build config and the name in the Steam instructions are
 * the same fact written twice, and they were different. Whoever sets up the
 * store page reads the document, so the document is what has to be right -
 * and the only way to know is to compare it with what the builder made.
 */
const steamDoc = readFileSync(join(root, "steam/README.md"), "utf8");
const product = pkg.build.productName;
/**
 * What each platform's launch executable is called, derived from the build
 * config rather than typed out again. electron-builder names the Windows
 * binary and the macOS bundle after the product; Linux takes whatever
 * executableName says, and said the npm package's name until this cycle.
 *
 * Only the Linux one can be built and started here - Windows packaging
 * needs Wine for the icon step and macOS needs Xcode's tooling to sign -
 * so for the other two this is the whole check, and it is still the one
 * that would have caught the bug.
 */
const launches = [
  ["Linux", EXECUTABLE],
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

const asar = join(OUT, "resources/app.asar");
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
const xvfb = spawn("Xvfb", [DISPLAY, "-screen", "0", "1280x800x24", "-nolisten", "tcp"], {
  stdio: "ignore",
  detached: true,
});
await new Promise((r) => setTimeout(r, 1500));

const app = spawn(
  join(OUT, EXECUTABLE),
  [
    "--no-sandbox",
    "--windowed",
    `--remote-debugging-port=${PORT}`,
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
  // Its own process group, so the whole tree can be killed: xvfb-run is a
  // shell that launches the app, and killing the shell leaves the app.
  { cwd: OUT, stdio: ["ignore", "pipe", "pipe"], detached: true, env: { ...process.env, DISPLAY } }
);
let appOutput = "";
app.stdout.on("data", (d) => (appOutput += d));
app.stderr.on("data", (d) => (appOutput += d));
let stopped = false;
const stop = () => {
  if (stopped) return;
  stopped = true;
  for (const child of [app, xvfb]) {
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
for (let i = 0; i < 30 && !browser; i++) {
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
