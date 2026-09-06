/**
 * Play it with two thumbs.
 *
 *   yarn dev --port 5199   # in one terminal
 *   yarn test:touch        # in another
 *
 * The game runs in a browser, and a browser is as likely to be on a phone
 * as on anything else. Every other check in this project has a keyboard,
 * a mouse or a pad: this one has fingers, and it asks the questions a
 * phone player would - does anything appear to walk with, does it walk,
 * does a drag look, does the big button open the door, does the tap on
 * the satchel drink the potion, is there a way to pause and a way back.
 *
 * What this can and cannot say. It emulates a touchscreen through the
 * browser's own device emulation - a coarse pointer, touch points, a
 * phone's viewport - and sends real touch events through the debugger,
 * so it drives the game's own reading of a touch: the pointer events, the
 * capture, the stick's throw, the rim that starts the run. It cannot say
 * how a thumb feels about the sizes, or what iOS Safari does with the
 * full-screen request, and it does not pretend to. A real phone in a real
 * hand is still a thing a person has to do once.
 *
 * Three screens, because the game decides by device: a phone, a tablet,
 * and a desktop that is never touched, which must not grow a stick.
 */
import { chromium } from "playwright-core";

const PORT = process.env.PORT || "5199";
const CHROMIUM =
  process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const URL = `http://127.0.0.1:${PORT}/`;

let failures = 0;
const ok = (label, cond, detail = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  - " + detail : ""}`);
};

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader",
         "--enable-unsafe-swiftshader", "--disable-background-timer-throttling"],
});

const errors = [];

/** A page in a context, with its errors kept and the game loaded. */
async function open(options, label) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${label}: ${String(e).slice(0, 160)}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${label}: ${m.text().slice(0, 160)}`));
  const reached = await page
    .goto(URL, { waitUntil: "load", timeout: 60000 })
    .then(() => true)
    .catch(() => false);
  if (!reached) {
    console.log(`FAIL  a dev server is running on ${PORT}  - start one with \`yarn dev --port ${PORT}\`, or set PORT`);
    await browser.close();
    process.exit(1);
  }
  await page.waitForTimeout(3000);
  return { context, page };
}

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
 * Fingers, through the debugger.
 *
 * `Input.dispatchTouchEvent` takes the whole set of points that are down
 * after the change and works out which one moved; keeping the set here
 * lets two fingers be down at once, which is the entire point of the
 * scheme under test - one walking, one looking.
 */
async function fingers(page) {
  const cdp = await page.context().newCDPSession(page);
  const down = new Map();
  const send = (type) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: [...down.entries()].map(([id, p]) => ({ id, x: p.x, y: p.y })),
    });
  return {
    async press(id, x, y) {
      down.set(id, { x, y });
      await send("touchStart");
    },
    /** In steps, the way a thumb moves: one jump reads as one pointermove. */
    async drag(id, x, y, steps = 8) {
      const from = down.get(id);
      for (let i = 1; i <= steps; i++) {
        down.set(id, { x: from.x + ((x - from.x) * i) / steps, y: from.y + ((y - from.y) * i) / steps });
        await send("touchMove");
        await frames(page, 1);
      }
    },
    async lift(id) {
      down.delete(id);
      await send("touchEnd");
    },
    async tap(x, y) {
      await this.press(9, x, y);
      await frames(page, 2);
      await this.lift(9);
      await frames(page, 2);
    },
    /**
     * A tap on a thing, scrolled into view first: a phone held sideways is
     * under four hundred pixels tall and every panel in the game scrolls
     * inside itself there, so a button's box can be below the fold - and a
     * tap at that box lands on whatever is drawn there instead. Scrolling
     * to it is what a thumb does.
     */
    async tapOn(selector) {
      const el = page.locator(selector).first();
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await frames(page, 1);
      const box = await el.boundingBox();
      if (!box) return false;
      await this.tap(box.x + box.width / 2, box.y + box.height / 2);
      return true;
    },
  };
}

const count = (page, selector) => page.locator(selector).count();
const attr = (page, selector, name) => page.locator(selector).first().getAttribute(name);
/**
 * Until something is so, or a while has passed. A fixed sleep is a bet on
 * the frame rate, and this runs on a software rasteriser beside whatever
 * else the machine is doing: the door's prompt took under a second alone
 * and over two with the smoke test running next to it.
 */
const until = async (page, test, ms = 8000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await test()) return true;
    await page.waitForTimeout(100);
  }
  return test();
};
const snap = (page) =>
  page.evaluate(() => {
    const s = window.__run.getState();
    const p = window.__playerDebug ?? {};
    return {
      phase: s.phase,
      paused: s.paused,
      room: s.currentRoomId,
      lantern: s.lanternRaised,
      satchel: s.satchel.length,
      locks: s.inputLocks,
      x: p.x ?? 0,
      z: p.z ?? 0,
      yaw: window.__look?.yaw ?? 0,
      pitch: window.__look?.pitch ?? 0,
    };
  });
/** The fastest the body went over a few frames. */
const topSpeed = (page, n) =>
  page.evaluate(
    (count) =>
      new Promise((done) => {
        let i = 0;
        let best = 0;
        const tick = () => {
          const p = window.__playerDebug;
          if (p) best = Math.max(best, Math.hypot(p.vx, p.vz));
          if (++i >= count) done(best);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    n
  );

// --- A desktop, never touched -----------------------------------------------

{
  const { context, page } = await open({ viewport: { width: 1280, height: 800 } }, "desktop");
  await page.click("[data-testid=menu-start]");
  await page.waitForTimeout(4000);
  const s = await snap(page);
  ok("desktop: a run starts", s.phase === "playing", s.phase);
  ok("desktop: no stick and no buttons are drawn for a mouse", (await count(page, "[data-testid=touch-controls]")) === 0);
  ok("desktop: and no buttons", (await count(page, "[data-testid=touch-buttons]")) === 0);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  ok(
    "desktop: the options carry no touch rows when there is nothing to touch",
    (await count(page, "[data-testid=opt-touch]")) === 0
  );
  await context.close();
}

// --- A phone, held sideways ------------------------------------------------

const PHONE = { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };
{
  const { context, page } = await open(PHONE, "phone");
  const f = await fingers(page);
  const seen = await page.evaluate(() => ({
    points: navigator.maxTouchPoints,
    coarse: matchMedia("(pointer: coarse)").matches,
    hover: matchMedia("(hover: none)").matches,
    short: Math.min(screen.width, screen.height),
  }));
  ok(
    "phone: the emulated screen reads as one",
    seen.points > 0 && (seen.coarse || seen.hover) && seen.short <= 620,
    JSON.stringify(seen)
  );
  ok("phone: nothing to walk with on the title screen", (await count(page, "[data-testid=touch-controls]")) === 0);

  ok("phone: the title's Start can be tapped", await f.tapOn("[data-testid=menu-start]"));
  await page.waitForTimeout(4000);
  let s = await snap(page);
  ok("phone: a run starts from a tap", s.phase === "playing", s.phase);
  ok("phone: the stick and the buttons are drawn", (await count(page, "[data-testid=touch-controls]")) === 1);
  ok("phone: and they are the phone's size", (await attr(page, "[data-testid=touch-controls]", "data-device")) === "phone");
  ok("phone: the walking thumb is the left one until told otherwise", (await attr(page, "[data-testid=touch-controls]", "data-stick")) === "left");
  ok("phone: the first-time line says what the thumbs do", await page.evaluate(() => /one thumb walks/i.test(document.body.innerText)));
  ok("phone: nothing says to click the game", !(await page.evaluate(() => /click the game/i.test(document.body.innerText))));

  // Walking: a thumb lands on the left half and pushes up.
  const stickBefore = await page.locator("[data-testid=touch-stick]").boundingBox();
  await f.press(1, 180, 300);
  await frames(page, 2);
  const stickUnder = await page.locator("[data-testid=touch-stick]").boundingBox();
  ok(
    "phone: the stick comes to where the thumb landed",
    stickUnder && Math.abs(stickUnder.x + stickUnder.width / 2 - 180) < 3 && Math.abs(stickUnder.y + stickUnder.height / 2 - 300) < 3,
    JSON.stringify({ before: stickBefore, under: stickUnder })
  );
  const before = await snap(page);
  await f.drag(1, 180, 262, 4);
  // Sampled while the push is fresh, before a wall can stop the body: a
  // speed read against a wall is nought whatever the stick says.
  const walkSpeed = await topSpeed(page, 10);
  await frames(page, 10);
  const after = await snap(page);
  const walked = Math.hypot(after.x - before.x, after.z - before.z);
  ok("phone: pushing the stick walks the player", walked > 0.4, `${walked.toFixed(2)}m`);
  const world = await page.evaluate(() => ({ walk: window.__world.WALK_SPEED, dash: window.__world.DASH_SPEED }));
  ok(
    "phone: a push short of the rim is a walk, not a run",
    walkSpeed > 1 && walkSpeed <= world.walk + 0.3,
    `${walkSpeed.toFixed(2)} m/s against a walk of ${world.walk}`
  );
  ok("phone: and the run is not on", (await attr(page, "[data-testid=touch-run]", "data-on")) === "no");

  // The rim: shove the knob well past its throw, and the run starts.
  //
  // From a few metres behind where the run began, along the line the walk
  // above took, and read on the very next frames. This runs headless on a
  // software rasteriser at a handful of frames a second, and at eight
  // metres a second the far wall of the start room is a frame or two
  // away: the first version of this waited politely, sampled a body that
  // had already stopped against the wall, and read nought.
  const along = Math.hypot(after.x - before.x, after.z - before.z) || 1;
  const back = [before.x - ((after.x - before.x) / along) * 5, before.z - ((after.z - before.z) / along) * 5];
  await page.evaluate(([x, z]) => window.__bus.emit("teleport", { position: [x, 1.5, z] }), back);
  await frames(page, 1);
  await f.drag(1, 180, 300 - 46 * 1.6, 2);
  const runSpeed = await topSpeed(page, 8);
  ok("phone: shoving the stick past its rim starts the run", (await attr(page, "[data-testid=touch-run]", "data-on")) === "yes");
  ok("phone: and the player is running", runSpeed > world.walk + 0.5, `${runSpeed.toFixed(2)} m/s against a walk of ${world.walk}`);
  await f.lift(1);
  await frames(page, 4);
  ok("phone: letting go of the stick ends the run", (await attr(page, "[data-testid=touch-run]", "data-on")) === "no");
  const stopped = await topSpeed(page, 6);
  ok("phone: and stops the player", stopped < 0.5, `${stopped.toFixed(2)} m/s`);
  const rested = await page.locator("[data-testid=touch-stick]").boundingBox();
  ok(
    "phone: the stick goes back to its corner",
    rested && stickBefore && Math.abs(rested.x - stickBefore.x) < 2 && Math.abs(rested.y - stickBefore.y) < 2,
    JSON.stringify({ before: stickBefore, rested })
  );

  // Looking: the other thumb drags on the right half.
  const looked0 = await snap(page);
  await f.press(2, 640, 180);
  await f.drag(2, 440, 180, 10);
  await frames(page, 2);
  const looked1 = await snap(page);
  ok("phone: dragging the right half turns the view", Math.abs(looked1.yaw - looked0.yaw) > 0.4, `${(looked1.yaw - looked0.yaw).toFixed(2)} rad`);
  await f.drag(2, 440, 240, 6);
  await frames(page, 2);
  const looked2 = await snap(page);
  ok("phone: and dragging down looks down", looked2.pitch < looked1.pitch - 0.1, `${looked2.pitch.toFixed(2)}`);
  await f.lift(2);
  await frames(page, 2);

  // Both at once: the entire point of two thumbs.
  const both0 = await snap(page);
  await f.press(1, 180, 300);
  await f.drag(1, 180, 262, 3);
  await f.press(2, 640, 200);
  await f.drag(2, 540, 200, 6);
  await frames(page, 12);
  const both1 = await snap(page);
  ok(
    "phone: one thumb walks while the other looks",
    Math.hypot(both1.x - both0.x, both1.z - both0.z) > 0.2 && Math.abs(both1.yaw - both0.yaw) > 0.2,
    `${Math.hypot(both1.x - both0.x, both1.z - both0.z).toFixed(2)}m, ${(both1.yaw - both0.yaw).toFixed(2)} rad`
  );
  await f.lift(1);
  await f.lift(2);
  await frames(page, 4);
  await page.waitForTimeout(400);
  ok("phone: the teaching line goes once both thumbs have been used", !(await page.evaluate(() => /one thumb walks/i.test(document.body.innerText))));

  // The lantern.
  const lamp0 = await snap(page);
  await f.tapOn("[data-testid=touch-lantern]");
  await frames(page, 2);
  const lamp1 = await snap(page);
  ok("phone: LAMP raises the lantern", lamp1.lantern !== lamp0.lantern, `${lamp0.lantern} -> ${lamp1.lantern}`);
  ok("phone: and the button says so", (await attr(page, "[data-testid=touch-lantern]", "data-on")) === (lamp1.lantern ? "yes" : "no"));
  await f.tapOn("[data-testid=touch-lantern]");
  await frames(page, 2);

  // The satchel: a slot is the button.
  await page.evaluate(() => window.__run.getState().takeItem("healing"));
  await page.waitForTimeout(300);
  const bag0 = await snap(page);
  ok("phone: the satchel draws the slot", (await count(page, "[data-testid=satchel-0]")) === 1);
  await f.tapOn("[data-testid=satchel-0]");
  await page.waitForTimeout(400);
  const bag1 = await snap(page);
  ok("phone: tapping the slot uses what is in it", bag1.satchel === bag0.satchel - 1, `${bag0.satchel} -> ${bag1.satchel}`);

  // USE at a door: stand in a doorway and press the big button.
  const door = await page.evaluate(() => {
    const s = window.__run.getState();
    const room = s.dungeon.rooms.find((r) => r.id === s.currentRoomId);
    const half = room.size / 2;
    const step = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
    // A door that opens: not the exit, which wants the toll, and not the
    // vault, which wants a key the run has not found yet.
    const [dir, to] = Object.entries(room.links).find(([, id]) => id !== s.dungeon.endId && id !== s.dungeon.vaultId);
    return { to, x: step[dir][0] * half, z: step[dir][1] * half };
  });
  await page.evaluate(([x, z]) => window.__bus.emit("teleport", { position: [x, 1.5, z] }), [door.x * 0.8, door.z * 0.8]);
  ok(
    "phone: USE lights when a door is in reach",
    await until(page, async () => (await attr(page, "[data-testid=touch-use]", "data-lit")) === "yes")
  );
  const promptText = () => page.locator("[data-testid=prompt-text]").first().textContent().catch(() => "");
  ok(
    "phone: the prompt's chip says USE rather than E",
    (await page.locator("[data-testid=prompt-key]").first().textContent().catch(() => "")) === "USE"
  );
  ok(
    "phone: the bar hint names the button",
    await until(page, async () => /BAR shuts it/.test((await promptText()) ?? "")),
    JSON.stringify(await promptText())
  );
  const roomBefore = (await snap(page)).room;
  await f.tapOn("[data-testid=touch-use]");
  await until(page, async () => (await snap(page)).room !== roomBefore);
  const roomAfter = (await snap(page)).room;
  ok("phone: USE goes through the door", roomAfter !== roomBefore && roomAfter === door.to, `${roomBefore} -> ${roomAfter}`);

  // Pause, and the touch rows in the options.
  await f.tapOn("[data-testid=touch-pause]");
  await page.waitForTimeout(400);
  ok("phone: the II pauses", (await snap(page)).paused === true);
  ok("phone: the options carry the touch rows", (await count(page, "[data-testid=opt-touch]")) === 1);
  ok("phone: the on-screen controls are on auto", (await attr(page, "[data-testid=opt-touch] span[data-value]", "data-value")) === "auto");
  await f.tapOn("[data-testid=opt-touch]"); // on
  await f.tapOn("[data-testid=opt-touch]"); // off
  await page.waitForTimeout(300);
  ok("phone: turned off, they go", (await count(page, "[data-testid=touch-controls]")) === 0);
  await f.tapOn("[data-testid=opt-touch]"); // auto
  await page.waitForTimeout(300);
  ok("phone: and come back on auto", (await count(page, "[data-testid=touch-controls]")) === 1);
  await f.tapOn("[data-testid=opt-stick]");
  await page.waitForTimeout(300);
  ok("phone: the walking thumb can be made the right one", (await attr(page, "[data-testid=touch-controls]", "data-stick")) === "right");
  await f.tapOn("[data-testid=opt-stick]");
  await f.tapOn("[data-testid=pause-resume]");
  await page.waitForTimeout(400);
  ok("phone: Resume resumes", (await snap(page)).paused === false);

  // With the stick on the right, a thumb on the right half walks.
  await f.tapOn("[data-testid=touch-pause]");
  await page.waitForTimeout(300);
  await f.tapOn("[data-testid=opt-stick]");
  await f.tapOn("[data-testid=pause-resume]");
  await page.waitForTimeout(600);
  const mirrored0 = await snap(page);
  await f.press(3, 660, 300);
  await f.drag(3, 660, 262, 3);
  await frames(page, 20);
  const mirrored1 = await snap(page);
  ok(
    "phone: with the stick on the right, the right thumb walks",
    Math.hypot(mirrored1.x - mirrored0.x, mirrored1.z - mirrored0.z) > 0.3,
    `${Math.hypot(mirrored1.x - mirrored0.x, mirrored1.z - mirrored0.z).toFixed(2)}m`
  );
  await f.lift(3);
  await page.evaluate(() => window.__settings.getState().setStickSide("left"));

  // The controls page describes thumbs, not keys.
  await f.tapOn("[data-testid=touch-pause]");
  await page.waitForTimeout(300);
  await f.tapOn("[data-testid=pause-quit]");
  await page.waitForTimeout(800);
  await f.tapOn("button:has-text('Controls')");
  await page.waitForTimeout(300);
  ok("phone: the controls page is the touch one", (await count(page, "[data-testid=controls-touch]")) === 1);
  ok("phone: and it does not tell a thumb to press W", !(await page.evaluate(() => /W A S D/.test(document.body.innerText))));
  await context.close();
}

// --- The same phone, held upright -----------------------------------------

{
  const { context, page } = await open({ ...PHONE, viewport: { width: 390, height: 844 } }, "portrait");
  const f = await fingers(page);
  await f.tapOn("[data-testid=menu-start]");
  await page.waitForTimeout(4000);
  ok("portrait: the run still starts", (await snap(page)).phase === "playing");
  ok("portrait: the player is told to turn the phone", (await count(page, "[data-testid=touch-sideways]")) === 1);
  await context.close();
}

// --- A tablet ---------------------------------------------------------------

{
  const { context, page } = await open(
    { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
    "tablet"
  );
  const f = await fingers(page);
  await f.tapOn("[data-testid=menu-start]");
  await page.waitForTimeout(4000);
  ok("tablet: a run starts from a tap", (await snap(page)).phase === "playing");
  ok("tablet: the controls are the tablet's", (await attr(page, "[data-testid=touch-controls]", "data-device")) === "tablet");
  const use = await page.locator("[data-testid=touch-use]").boundingBox();
  ok("tablet: the big button is bigger than a phone's", use && use.width > 72, `${use?.width}px`);
  ok("tablet: nobody is told to turn it", (await count(page, "[data-testid=touch-sideways]")) === 0);
  await context.close();
}

ok("nothing errored while it was played by touch", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close().catch(() => {});
console.log(failures === 0 ? "\nAll touch checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
