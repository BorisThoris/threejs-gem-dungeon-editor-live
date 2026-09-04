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

const BUTTON = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, start: 9, l3: 10, up: 12, down: 13, left: 14, right: 15 };
/** One button per satchel slot, in the order the slots are drawn. */
const SLOT_BUTTONS = [BUTTON.x, BUTTON.y, BUTTON.lb, BUTTON.rb];

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
  /**
   * Smaller than a Deck's panel on purpose. Nothing here reads a layout -
   * it reads button text and what the run did - and this machine renders
   * through a software rasteriser where the cost is all fill rate. At
   * 1280x800 the tome's 45-second clock ran out while the d-pad was still
   * walking the keypad, at about four frames a second; the game is not the
   * slow part and must not be tuned to this.
   */
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
  // Before any of the game's modules run: the pad module starts polling at
  // import time, and a pad that appears later is a different test.
  await context.addInitScript(INSTALL_PAD);
  page = await context.newPage();
  const reached = await page
    .goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load", timeout: 60000 })
    .then(() => true)
    .catch(() => false);
  if (!reached) {
    // A stack trace is not a test result. The dev server is somewhere else,
    // or not running, and saying which port was tried is the whole answer.
    console.log(`FAIL  a dev server is running on ${PORT}  - start one with \`yarn dev --port ${PORT}\`, or set PORT`);
    await browser.close();
    process.exit(1);
  }
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
 * And a frame the machine dropped does not swing the view.
 *
 * The stick's look was `GAMEPAD_LOOK_SPEED * delta` with nothing bounding
 * the delta - 2.4 radians a second, so a nine-hundred-millisecond hitch
 * with the stick held over turned the camera a hundred and twenty-four
 * degrees in a single frame. Cycle 44 went looking for raw deltas because
 * the Warden crossed four metres on one, and found it in the thing that
 * chases the player; it did not find the thing the player steers with.
 *
 * The mouse is deliberately not held to this. It reports pixels moved, so
 * a long frame carries more of them because the hand moved that far. A
 * stick reports a position, and how long it stood there is the game's to
 * decide.
 */
{
  const yawOf = () => page.evaluate(() => window.__run && window.__look ? window.__look.yaw : null);
  await page.evaluate(() => window.__pad.axis(2, 1));
  await frames(page, 3);
  const swing = await page.evaluate(async () => {
    const look = window.__look;
    const from = look.yaw;
    let worst = 0;
    let longest = 0;
    let last = look.yaw;
    let lastT = performance.now();
    const t0 = lastT;
    let stalled = false;
    await new Promise((done) => {
      const tick = () => {
        const now = performance.now();
        worst = Math.max(worst, Math.abs(look.yaw - last));
        longest = Math.max(longest, (now - lastT) / 1000);
        last = look.yaw;
        lastT = now;
        if (!stalled) {
          stalled = true;
          const until = performance.now() + 900;
          // eslint-disable-next-line no-empty
          while (performance.now() < until) {}
        }
        if (now - t0 > 1400) return done();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return { worst: +worst.toFixed(3), longest: +longest.toFixed(2), turned: +Math.abs(look.yaw - from).toFixed(2) };
  });
  await page.evaluate(() => window.__pad.axis(2, 0));
  await frames(page, 3);
  const cap = await page.evaluate(() => window.__world.GAMEPAD_LOOK_SPEED * window.__world.MAX_FRAME_S);
  ok("the check produced a frame long enough to matter", swing.longest >= 0.5, `longest frame ${swing.longest}s`);
  ok(
    "a dropped frame never swings the view further than a frame is worth",
    swing.worst <= cap + 0.02,
    `worst single frame turned ${(swing.worst * 57.3).toFixed(0)} degrees, cap is ${(cap * 57.3).toFixed(0)}`
  );
  void yawOf;
}

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

// --- A seed typed on the pad -----------------------------------------------
//
// The last screen in the game a controller could not use. The Records page
// has a box for replaying a dungeon by its number, and a d-pad could focus
// it and then do nothing: three cycles of gamepad work went past it, each
// time writing down that it was still keyboard-only. It has the tome's keys
// under it now, and the whole panel is one menu - a text box, a button
// beside it, twelve keys and two more buttons - which is what forced the
// pad's navigation to read rows off the page instead of counting columns.
{
  await page.evaluate(() => window.__run.getState().quitToMenu());
  await page.waitForTimeout(600);
  ok("back at the menu to reach the records from", await someButton(/records/i), (await buttons()).join(", "));
  await focusOn(page, /records/i);
  await tap(page, BUTTON.a);
  await page.waitForTimeout(600);
  ok("the records page opens on a pad", await someButton(/run it/i), (await buttons()).join(", "));

  // 407: a digit from each row of the keypad, so a walk that only works
  // along one row cannot pass this.
  const SEED = "407";
  const where = () =>
    page.evaluate(() => {
      const keys = [...document.querySelectorAll('[data-testid="keypad"] button')];
      return { labels: keys.map((k) => (k.textContent ?? "").trim()), at: keys.indexOf(document.activeElement) };
    });
  const onPage = await where();
  ok("the records page draws keys a pad can reach", onPage.labels.length >= 11, `${onPage.labels.length} keys`);
  let typed = onPage.labels.length > 0;
  for (const digit of SEED) {
    const { labels, at } = await where();
    const target = labels.indexOf(digit);
    // Without a keypad there is nothing to find, and `indexOf` and "where
    // the focus is" are both -1: the first version of this walked zero
    // steps, decided it had arrived, and passed on a page with no keys on
    // it at all.
    if (target < 0) {
      typed = false;
      break;
    }
    // Walked by feel rather than by arithmetic: this page is not a grid,
    // it is a grid with a text box on top of it and buttons underneath, and
    // the point of the check is that a player can get around it at all.
    let landed = false;
    for (let i = 0; i < 20 && !landed; i++) {
      const now = await where();
      if (now.at === target) landed = true;
      else await tap(page, now.at < 0 || now.at > target ? BUTTON.up : BUTTON.down, 3);
      const after = await where();
      if (after.at === target) landed = true;
      else if (after.at >= 0) {
        const row = Math.floor(after.at / 3);
        const want = Math.floor(target / 3);
        if (row === want) await tap(page, after.at < target ? BUTTON.right : BUTTON.left, 3);
      }
    }
    void at;
    if (!landed) typed = false;
    else await tap(page, BUTTON.a, 3);
  }
  ok("every digit of a seed can be reached on the records page", typed);
  const inBox = await page.evaluate(() => document.querySelector('[data-testid="records-seed"]')?.value ?? "");
  ok("the digits pressed land in the seed box", inBox === SEED, `"${inBox}"`);

  if (inBox === SEED) {
    await focusOn(page, /run it/i);
    await tap(page, BUTTON.a);
    await page.waitForTimeout(2000);
    const ran = await page.evaluate(() => ({
      seed: window.__run.getState().dungeon?.seed ?? null,
      phase: window.__run.getState().phase,
    }));
    ok(
      "a seed typed on the pad alone starts that dungeon",
      ran.phase === "playing" && ran.seed === Number(SEED),
      JSON.stringify(ran)
    );
    await page.evaluate(() => window.__run.getState().quitToMenu());
    await page.waitForTimeout(600);
  }
}

// --- The satchel, all of it ------------------------------------------------
//
// The satchel holds four and the pad reached two of them. A Deck player who
// filled it could drink the first two things they found and nothing else,
// for the whole run - and every check passed, because they all type. Four
// slots, four buttons: X, Y and the two shoulders.
{
  const filled = await page.evaluate(async () => {
    const run = window.__run;
    run.getState().startRun(9);
    await new Promise((r) => setTimeout(r, 1800));
    const ids = ["healing", "swiftness", "mapping", "gloom"];
    run.setState({ satchel: [...ids], lives: 1, phase: "playing" });
    return run.getState().satchel.length;
  });
  ok("a satchel can be filled to check every slot", filled === 4, `${filled} carried`);
  // Last slot first: using one closes the gap, so pressing X before RB
  // would leave the fourth slot empty and the check would report the bug it
  // is looking for whether or not the bug is there. It did, first time.
  const used = [];
  for (const button of [...SLOT_BUTTONS].reverse()) {
    const before = await page.evaluate(() => window.__run.getState().satchel.length);
    await tap(page, button);
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => window.__run.getState().satchel.length);
    used.push(before - after);
  }
  ok(
    "every satchel slot can be used with a pad, not just the first two",
    used.every((d) => d === 1),
    `slots consumed: ${used.join(", ")} (RB, LB, Y, X)`
  );
}

// --- Answering the tome with a controller ----------------------------------
//
// The library's tome listened for digits on the window and drew nothing to
// press: a controller could open the book, watch the numbers, and then sit
// there. One of the ten kinds of room the game builds, unfinishable on the
// only input a Steam Deck has. It is played here entirely on the pad - A to
// open it, the d-pad and A over the on-screen keys, and the sequence read
// off the DEV probe because a probe cannot remember numbers off a screen
// that has already hidden them.
/** A fresh run, stood at a library's lectern and looking at it. */
const standAtLectern = () =>
  page.evaluate(async () => {
    const run = window.__run;
    for (let seed = 1; seed < 80; seed++) {
      run.getState().startRun(seed);
      await new Promise((r) => setTimeout(r, 700));
      const room = run.getState().dungeon.rooms.find((r) => r.kind === "library");
      if (!room) continue;
      run.setState({ transitioning: true, currentRoomId: room.id, lives: 3 });
      run.getState().roomReady(room.id);
      await new Promise((r) => setTimeout(r, 1400));
      const at = window.__anchorsFor("library", room)[0];
      // Sideways rather than straight in, and looking at it: the same
      // approach the smoke test had to work out, for the same reasons.
      const d = Math.hypot(at[0], at[2]) || 1;
      const x = at[0] + (-at[2] / d) * 1.9;
      const z = at[2] + (at[0] / d) * 1.9;
      window.__bus.emit("teleport", { position: [x, 1.5, z], yaw: Math.atan2(-(at[0] - x), -(at[2] - z)) });
      return { id: room.id, seed };
    }
    return null;
  });

{
  const library = await standAtLectern();
  ok("a floor has a library to open with a pad", library !== null, JSON.stringify(library));
  if (library) {
    await page.waitForTimeout(600);
    await tap(page, BUTTON.a);
    await page.waitForTimeout(500);
    const sequence = await page.evaluate(() => window.__numberSequence ?? null);
    ok("A at the lectern opens the tome", Array.isArray(sequence), JSON.stringify(sequence));
    if (sequence) {
      // The numbers are hidden first - five to seven seconds by difficulty -
      // and nothing entered before that counts.
      await page.waitForTimeout(7600);
      ok(
        "the tome draws keys a pad can reach",
        await page.evaluate(() => !!document.querySelector('[data-testid="keypad"]')),
      );
      /**
       * Walk the keypad's focus onto a labelled key and press A.
       *
       * By the shortest route: rows with up and down, then columns with
       * left and right, which is what a player does and is at most five
       * presses on a keypad three wide. Walking it in one direction was
       * the first version and cost up to eleven, which mattered because
       * the tome is on a clock.
       */
      const COLUMNS = 3;
      const where = () =>
        page.evaluate(() => {
          const keys = [...document.querySelectorAll('[data-testid="keypad"] button')];
          return { labels: keys.map((k) => (k.textContent ?? "").trim()), at: keys.indexOf(document.activeElement) };
        });
      /**
       * The tome is on a clock, and this machine renders through a software
       * rasteriser at about a tenth of a Deck's frame rate. A frame-based
       * hold is right - a wall-clock one is what made this harness report
       * "Start pauses on alternate presses" - but every round trip to the
       * page costs a frame too, so the focus is tracked here and the page
       * is asked only once a key, to confirm it landed where it was sent.
       */
      const layout = await where();
      let at = layout.at;
      const pressKey = async (label) => {
        const target = layout.labels.indexOf(label);
        if (target < 0) return false;
        // Nothing focused yet: one press of a direction lands on the first
        // key, which is where padMenu starts a menu it has not been in.
        if (at < 0) {
          await tap(page, BUTTON.right, 2);
          at = 0;
        }
        const rows = Math.floor(target / COLUMNS) - Math.floor(at / COLUMNS);
        const cols = (target % COLUMNS) - (at % COLUMNS);
        for (let i = 0; i < Math.abs(rows); i++) await tap(page, rows > 0 ? BUTTON.down : BUTTON.up, 2);
        for (let i = 0; i < Math.abs(cols); i++) await tap(page, cols > 0 ? BUTTON.right : BUTTON.left, 2);
        at = target;
        if ((await where()).at !== target) return false;
        await tap(page, BUTTON.a, 2);
        return true;
      };
      let reached = true;
      let presses = 0;
      const startedAt = Date.now();
      for (const n of sequence) {
        for (const digit of String(n)) {
          reached = (await pressKey(digit)) && reached;
          presses++;
        }
        reached = (await pressKey("OK")) && reached;
        presses++;
      }
      const took = (Date.now() - startedAt) / 1000;
      ok("every key the answer needs can be reached with the d-pad", reached, `${presses} keys in ${took.toFixed(1)}s`);
      await page.waitForTimeout(2200);
      const solved = await page.evaluate(() => {
        const s = window.__run.getState();
        return { cleared: s.cleared.includes(s.currentRoomId), gems: s.gems, failed: s.failed.length };
      });
      ok(
        "the tome can be answered, and pays its gem, on a pad alone",
        solved.cleared && solved.gems >= 1 && solved.failed === 0,
        JSON.stringify(solved)
      );
    }
  }
}

/**
 * B, while the numbers are still up.
 *
 * "Esc or B leaves" is in the tome's footer from the first frame, and for
 * the five to seven seconds it is showing the sequence B is the only way
 * out a pad has - the keypad that carries B is not drawn yet, and the
 * tome holds the input lock, so the stick does nothing either. It did not
 * work. The check above waits the showing phase out before it touches the
 * pad, because that is what somebody solving it does, so it never asked.
 */
{
  const library = await standAtLectern();
  if (library) {
    await page.waitForTimeout(600);
    await tap(page, BUTTON.a);
    await page.waitForTimeout(500);
    const showing = await page.evaluate(() => ({
      up: /remember these/i.test(document.body.innerText),
      keys: !!document.querySelector('[data-testid="keypad"]'),
      locked: window.__run.getState().inputLocks,
    }));
    ok(
      "the tome shows its numbers before it draws a key, and holds the player there",
      showing.up && !showing.keys && showing.locked > 0,
      JSON.stringify(showing)
    );
    await tap(page, BUTTON.b);
    await page.waitForTimeout(600);
    const left = await page.evaluate(() => {
      const s = window.__run.getState();
      return {
        up: /remember these|type them back/i.test(document.body.innerText),
        locked: s.inputLocks,
        failed: s.failed.length,
      };
    });
    ok(
      "B leaves the tome while it is still showing the numbers",
      !left.up && left.locked === 0 && left.failed === 0,
      JSON.stringify(left)
    );
  }
}

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
