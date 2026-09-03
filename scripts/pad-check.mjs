/**
 * Play it with a controller.
 *
 *   yarn dev --port 5199   # in one terminal
 *   yarn test:pad          # in another
 *
 * The demo targets Steam and the Steam Deck, and the Deck has no keyboard.
 * Everything else in this project types: the smoke test presses W and E,
 * the production check presses W and Escape, the desktop check clicks a
 * button. So the one input a Deck actually has was the one input nothing
 * had ever used - and it turned out a player holding a controller could not
 * press Start on the title screen, because every menu in the game is a
 * column of `<button onClick>` and nothing under src/ui read the pad.
 *
 * What this can and cannot say. It installs a synthetic pad in front of
 * `navigator.getGamepads`, so it drives the game's own reading and mapping
 * of a standard-mapping controller: the axes, the buttons, the rising
 * edges, the menu focus. It cannot test the browser's or Electron's own
 * gamepad driver, or Steam Input's remapping, and it does not pretend to.
 * A real pad on a real Deck is still a thing a person has to do once.
 *
 * Runs against the dev server by default. Point it at the packaged desktop
 * build - the thing a Deck runs - with `yarn test:pad --desktop`, which
 * starts the Electron package under its own display and drives that.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const root = new URL("..", import.meta.url).pathname;
const DESKTOP = process.argv.includes("--desktop");
const PORT = process.env.PORT || (DESKTOP ? "9334" : "5199");
const CHROMIUM =
  process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

let failures = 0;
const ok = (label, cond, detail = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  - " + detail : ""}`);
};

/**
 * A standard-mapping pad, installed before any of the game's code runs.
 *
 * `navigator.getGamepads` is the whole of the Gamepad API a page can see,
 * and it cannot be driven from outside the page, so the pad is a plain
 * object the page holds and the harness pokes. Button indices are the
 * standard mapping the game reads: 0 A, 1 B, 2 X, 3 Y, 9 Start, 10 L3,
 * 12-15 the d-pad.
 */
const INSTALL_PAD = `
  (() => {
    const pad = {
      id: "Gem Dungeon test pad (STANDARD GAMEPAD)",
      index: 0,
      connected: true,
      mapping: "standard",
      timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    window.__pad = {
      pad,
      press(i) { pad.buttons[i] = { pressed: true, touched: true, value: 1 }; pad.timestamp = performance.now(); },
      release(i) { pad.buttons[i] = { pressed: false, touched: false, value: 0 }; pad.timestamp = performance.now(); },
      axis(i, v) { pad.axes[i] = v; pad.timestamp = performance.now(); },
      unplug() { pad.connected = false; },
    };
    navigator.getGamepads = () => [pad, null, null, null];
  })()
`;

/** Wait for the page to actually draw this many frames. */
const frames = (page, n) =>
  page.evaluate(
    (count) =>
      new Promise((done) => {
        let i = 0;
        const tick = () => (++i >= count ? done(null) : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      }),
    n
  );

/**
 * Hold a button for a few frames, then let go.
 *
 * Frames, not milliseconds. The pad is polled once per animation frame, so
 * a press is only ever seen if a frame lands inside it - and a frame here
 * is not a frame on a Deck: this runs headless on a software rasteriser
 * where one can take a fifth of a second. Holding for a fixed 90ms meant
 * roughly every other press fell entirely between two polls and was
 * invisible, which read as "Start pauses on alternate presses" and cost an
 * hour of looking for a bug in the game. A real controller held by a real
 * hand is down for 100ms or more against a 16ms frame.
 */
const tap = async (page, index, hold = 4) => {
  await page.evaluate((i) => window.__pad.press(i), index);
  await frames(page, hold);
  await page.evaluate((i) => window.__pad.release(i), index);
  await frames(page, hold);
};
const stick = (page, axis, value) => page.evaluate(([a, v]) => window.__pad.axis(a, v), [axis, value]);

const BUTTON = { a: 0, b: 1, x: 2, y: 3, start: 9, l3: 10, up: 12, down: 13, left: 14, right: 15 };

/**
 * Walk the focus down a menu until it lands on what you asked for.
 *
 * Bounded, and it says so when it fails rather than pressing down forever:
 * the first version of this had a bare `while` in it, met a menu whose
 * focus never moved, and sat there until the ten-minute timeout killed it.
 */
const focusOn = async (page, pattern, steps = 12) => {
  for (let i = 0; i < steps; i++) {
    if (pattern.test(await focused())) return true;
    await tap(page, BUTTON.down);
  }
  return pattern.test(await focused());
};

// --- Getting a page, from whichever build we are checking ------------------

let browser;
let page;
let stopApp = () => {};

if (DESKTOP) {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const OUT = join(root, "dist-electron/linux-unpacked");
  const EXECUTABLE = pkg.build.linux.executableName;
  if (!existsSync(join(OUT, EXECUTABLE))) {
    console.log("Building the Linux package...");
    execFileSync("npx", ["electron-builder", "--linux", "dir"], { cwd: root, stdio: "inherit" });
  }
  // Refuse to run against a leak, the same way the other two harnesses do.
  if (await fetch(`http://127.0.0.1:${PORT}/json/version`).then(() => true, () => false)) {
    console.log(`FAIL  nothing is already listening on ${PORT}  - a previous run leaked; kill it first`);
    process.exit(1);
  }
  const DISPLAY = `:${80 + (Number(PORT) % 8)}`;
  const xvfb = spawn("Xvfb", [DISPLAY, "-screen", "0", "1280x800x24", "-nolisten", "tcp"], {
    stdio: "ignore",
    detached: true,
  });
  await new Promise((r) => setTimeout(r, 1500));
  const app = spawn(
    join(OUT, EXECUTABLE),
    ["--no-sandbox", "--windowed", `--remote-debugging-port=${PORT}`,
     "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    { cwd: OUT, stdio: "ignore", detached: true, env: { ...process.env, DISPLAY } }
  );
  let stopped = false;
  stopApp = () => {
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
  process.on("exit", stopApp);
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => (stopApp(), process.exit(1)));

  for (let i = 0; i < 30 && !browser; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`).catch(() => null);
  }
  ok("the packaged game starts", browser !== null);
  if (!browser) process.exit(1);
  page = browser.contexts().flatMap((c) => c.pages())[0];
  ok("it has a page to show", !!page);
  if (!page) process.exit(1);
  // The app is already running, so the pad goes in now and the page is
  // reloaded so the game reads it from its first frame.
  await page.evaluate(INSTALL_PAD);
  await page.reload({ waitUntil: "load" }).catch(() => {});
  await page.addInitScript(INSTALL_PAD).catch(() => {});
  await page.evaluate(INSTALL_PAD);
  await page.waitForTimeout(9000);
} else {
  browser = await chromium.launch({
    executablePath: CHROMIUM,
    args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader",
           "--enable-unsafe-swiftshader", "--disable-background-timer-throttling"],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  // Before any of the game's modules run: the pad module starts polling at
  // import time, and a pad that appears later is a different test.
  await context.addInitScript(INSTALL_PAD);
  page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(3000);
}

const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
page.on("requestfailed", (r) => errors.push(`request failed: ${r.url().slice(-80)} ${r.failure()?.errorText ?? ""}`));

const screen = () => page.evaluate(() => document.body.innerText);
/**
 * What the focus is on, or "" for nothing.
 *
 * `document.activeElement` is `<body>` when nothing is focused, and its
 * textContent is the whole screen - which read as "something is focused"
 * and, worse, matched every regex asked of it.
 */
const focused = () =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return "";
    return el.textContent?.trim() ?? "";
  });
/**
 * The buttons on screen, which is what a menu actually is.
 *
 * Not the body text: the start room is called Start, so `/start/i` over the
 * whole screen is true during a run as well as on the title screen, and
 * three of this harness's first assertions were passing on the HUD's room
 * name rather than on a button. The packaged build has no store to ask, so
 * this is the one signal both builds share.
 */
const buttons = () =>
  page.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.textContent?.trim() ?? ""));
const someButton = async (pattern) => (await buttons()).some((b) => pattern.test(b));

ok("the game sees a pad", await page.evaluate(() => navigator.getGamepads()[0]?.connected === true));

// --- The title screen, which is where a Deck player is stuck ---------------

ok("the menu is up", await someButton(/^start$/i), (await buttons()).join(", "));
ok("nothing is focused before the pad is touched", (await focused()) === "");

await tap(page, BUTTON.down);
ok("the d-pad moves the focus onto a menu button", (await focused()).length > 0, await focused());
const first = await focused();
await tap(page, BUTTON.down);
ok("it moves on to the next one", (await focused()) !== first, `${first} then ${await focused()}`);
await tap(page, BUTTON.up);
ok("and back again", (await focused()) === first, await focused());

// Into Controls and back out with B, which is the one thing a console
// player will try without being told.
ok("the focus can be walked to Controls", await focusOn(page, /controls/i), await focused());
await tap(page, BUTTON.a);
await page.waitForTimeout(500);
ok("A opens the page the focus is on", /move|look|interact/i.test(await screen()), (await screen()).slice(0, 50).replace(/\n/g, " · "));
await tap(page, BUTTON.b);
await page.waitForTimeout(500);
ok("B backs out of it", await someButton(/^start$/i), (await buttons()).join(", "));

// Start the run.
ok("the focus can be walked back to Start", await focusOn(page, /^start$/i), await focused());
await tap(page, BUTTON.a);
await page.waitForTimeout(9000);
const hud = await screen();
ok(
  "A on Start begins a run",
  /LIVES/.test(hud) && /FLOOR/.test(hud) && (await buttons()).length === 0,
  (await buttons()).join(", ") || hud.slice(0, 50).replace(/\n/g, " · ")
);

// --- The run itself --------------------------------------------------------

/** What the canvas is drawing, as a rough colour signature. */
const painted = async () => {
  const shot = await page.screenshot({ clip: { x: 300, y: 250, width: 600, height: 380 } });
  let sum = 0;
  for (let i = 0; i < shot.length; i += 997) sum += shot[i];
  return sum;
};

const before = await painted();
await stick(page, 1, -1); // left stick forward
await page.waitForTimeout(2200);
await stick(page, 1, 0);
await page.waitForTimeout(600);
ok("the left stick walks", (await painted()) !== before);

const beforeLook = await painted();
await stick(page, 2, 1); // right stick right
await page.waitForTimeout(1200);
await stick(page, 2, 0);
await page.waitForTimeout(500);
ok("the right stick looks", (await painted()) !== beforeLook);

/**
 * The dropped-press check.
 *
 * The pad used to be polled by whoever read it first, memoised on a 4ms
 * wall-clock window, with rising edges computed on each real poll - so when
 * two of the four readers in a frame fell more than four milliseconds
 * apart, the second re-polled, saw the button already down, and reported
 * nothing. Pressing A did nothing, intermittently, more often the busier
 * the frame. Counting how many readers see one press is the whole of it.
 */
const seen = DESKTOP
  ? null // The packaged build has no module URLs to import; see below.
  : await page.evaluate(async () => {
  const { readGamepad } = await import("/src/game/input/gamepad.ts");
  window.__pad.press(0);
  // Four readers spread across a frame, the way the real ones are.
  const counts = await new Promise((done) => {
    requestAnimationFrame(() => {
      let n = 0;
      const read = () => {
        if (readGamepad().interactPressed) n++;
      };
      read();
      const spin = (ms) => {
        const until = performance.now() + ms;
        while (performance.now() < until) {
          /* busy, the way a frame with work in it is */
        }
      };
      spin(5);
      read();
      spin(5);
      read();
      spin(5);
      read();
      done(n);
    });
  });
  window.__pad.release(0);
  return counts;
});
if (seen === null) {
  // It reaches inside the module rather than through the game, so it needs
  // the dev server to serve one. Asking for it in the packaged build meant
  // a file:// request for a source path that is not there, which is a
  // failed request the error check then reported - a harness inventing its
  // own failure, which is worse than not running the check.
  console.log("  (the press-sharing check reads the module directly; dev build only)");
} else {
  ok("one press is seen by every reader in the frame, not just the first", seen === 4, `${seen} of 4`);
}

// Pause with Start, resume with Start, then pause and use the menu.
await tap(page, BUTTON.start);
await page.waitForTimeout(900);
ok("Start pauses", await someButton(/resume/i), (await buttons()).join(", ") || "no buttons");
await tap(page, BUTTON.start);
await page.waitForTimeout(900);
ok("Start resumes", !(await someButton(/resume/i)), (await buttons()).join(", ") || "no buttons");

await tap(page, BUTTON.start);
await page.waitForTimeout(900);
ok("the pause menu is up to back out of", await someButton(/resume/i), (await buttons()).join(", "));
await tap(page, BUTTON.b);
await page.waitForTimeout(900);
ok("B resumes from the pause menu", !(await someButton(/resume/i)), (await buttons()).join(", ") || "no buttons");

await tap(page, BUTTON.start);
await page.waitForTimeout(900);
ok("the focus can be walked to Quit to menu", await focusOn(page, /quit/i), await focused());
await tap(page, BUTTON.a);
await page.waitForTimeout(2500);
ok("A on Quit to menu leaves the run", await someButton(/^start$/i), (await buttons()).join(", "));

// --- What happens when the pad is put down ---------------------------------

await page.evaluate(() => window.__pad.unplug());
await page.waitForTimeout(400);
ok(
  "unplugging the pad takes the focus ring away rather than stranding it",
  await page.evaluate(() => {
    const el = document.activeElement;
    return !el || !el.style || el.style.outline === "";
  })
);

ok("nothing errored while it was played on a pad", errors.length === 0, errors.slice(0, 2).join(" | "));

if (browser) await browser.close().catch(() => {});
stopApp();
console.log(failures === 0 ? "\nAll gamepad checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
