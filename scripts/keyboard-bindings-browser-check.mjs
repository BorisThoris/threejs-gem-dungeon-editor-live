import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { chromium } from "./browser-safety.mjs";

const port = process.argv[2] ?? process.env.PORT ?? "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing"
    && !window.__run.getState().transitioning);
  await page.evaluate(() => window.__run.setState({ lastDamageAt: 1e9 }));
  const failures = [];
  for (const code of ["ControlLeft", "ControlRight", "AltLeft", "AltRight"]) {
    await page.keyboard.press("Escape");
    await page.getByTestId("bind-mark").click();
    await page.keyboard.press(code);
    assert.equal(await page.getByTestId("bind-mark").getAttribute("data-keys"), code);
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    const marked = () => page.evaluate(() => {
      const state = window.__run.getState();
      return state.marks.includes(state.currentRoomId);
    });
    const before = await marked();
    await page.keyboard.down(code);
    const after = await marked();
    await page.keyboard.down(code);
    assert.equal(await marked(), after, "auto-repeat does not toggle a bound action twice");
    await page.keyboard.up(code);
    if (before === after) failures.push(code);
    console.log(`${before !== after ? "PASS" : "FAIL"} rebinding map mark to ${code} works in play`);
  }
  await page.evaluate(() => window.__settings.getState().resetBindings());
  const before = await page.evaluate(() => window.__run.getState().glim);
  await page.keyboard.press("Control+KeyF");
  assert.equal(await page.evaluate(() => window.__run.getState().glim), before,
    "browser shortcut chords do not trigger the lantern");
  console.log("PASS browser shortcut chords remain separate from bound modifier keys");
  const defaults = await page.evaluate(() => window.__settings.getState().bindings);
  await page.evaluate(() => localStorage.setItem("gem-dungeon.settings", JSON.stringify({
    cameraBob: false, volume: 0.4,
    // An older save has no lantern row, but the player already uses F.
    bindings: { mark: ["KeyF"], forward: ["KeyI", "KeyI"], bar: [],
      left: ["Escape"], right: "KeyL", slot1: ["KeyF"],
      back: ["KeyBanana"], interact: ["Key"], shove: ["Spacebar"],
      slot2: ["Digit10"], slot3: ["ArrowSideways"], slot4: ["Numpad"] },
  })));
  await page.reload();
  await page.waitForFunction(() => window.__settings);
  const loaded = await page.evaluate(() => {
    const s = window.__settings.getState();
    return { bindings: s.bindings, cameraBob: s.cameraBob, volume: s.volume };
  });
  const check = (condition, message) => {
    console.log(`${condition ? "PASS" : "FAIL"} ${message}`);
    if (!condition) failures.push(message);
  };
  check(loaded.bindings.mark.join() === "KeyF" && loaded.bindings.lantern.length === 0,
    "saved assignments take precedence over missing actions' defaults");
  const keys = Object.values(loaded.bindings).flat();
  check(keys.length === new Set(keys).size && loaded.bindings.forward.join() === "KeyI",
    "loaded bindings cannot assign a key twice, within or between actions");
  check(loaded.bindings.bar.length === 0, "intentional unbound actions survive loading");
  check(JSON.stringify(loaded.bindings.left) === JSON.stringify(defaults.left)
    && JSON.stringify(loaded.bindings.right) === JSON.stringify(defaults.right),
    "forbidden keys and malformed rows recover their available defaults");
  check(loaded.cameraBob === false && loaded.volume === 0.4, "binding recovery preserves other preferences");
  check(["back", "interact", "shove", "slot2", "slot3", "slot4"].every(action =>
    isDeepStrictEqual(loaded.bindings[action], defaults[action])),
  "truncated or invented physical key codes recover usable defaults");
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => !window.__run.getState().transitioning && window.__run.getState().phase === "playing");
  const lamp = await page.evaluate(() => window.__run.getState().glim);
  await page.keyboard.press("KeyF");
  check(await page.evaluate(before => {
    const s = window.__run.getState();
    return s.marks.includes(s.currentRoomId) && s.glim === before;
  }, lamp), "the saved F key marks the map without also operating the lantern");
  await page.keyboard.press("Escape");
  check(await page.getByTestId("bind-lantern").getAttribute("data-keys") === ""
    && /Lantern/.test(await page.getByText(/^Unbound:/).innerText()),
    "the controls menu makes a recovered unbound action visible");
  await page.evaluate(() => window.__settings.getState().setVolume(0.5));
  await page.reload();
  await page.waitForFunction(() => window.__settings);
  check(isDeepStrictEqual(await page.evaluate(() => window.__settings.getState().bindings), loaded.bindings),
    "recovered bindings survive saving and another restart");
  check(await page.evaluate(() => {
    const settings = window.__settings;
    const before = JSON.stringify(settings.getState().bindings);
    settings.getState().bind("mark", "Escape");
    return JSON.stringify(settings.getState().bindings) === before;
  }), "the settings writer also refuses forbidden bindings");
  const validation = await page.evaluate(() => {
    const settings = window.__settings;
    const invalid = ["Key", "KeyBanana", "Keya", "Digit10", "ArrowSideways", "ShiftMiddle", "Spacebar", "Numpad", "Bracket", "CommaExtra", "KeyW\n"];
    settings.getState().resetBindings();
    const acceptedInvalid = invalid.filter(code => {
      const before = JSON.stringify(settings.getState().bindings);
      settings.getState().bind("interact", code);
      return JSON.stringify(settings.getState().bindings) !== before;
    });
    settings.getState().resetBindings();
    const valid = ["KeyZ", "Digit0", "ArrowDown", "ShiftRight", "ControlRight", "AltRight", "BracketLeft", "Backquote", "Numpad0", "NumpadSubtract", "NumpadComma", "NumpadMemoryStore", "NumpadHexA"];
    const refusedValid = valid.filter(code => {
      settings.getState().bind("interact", code);
      return settings.getState().bindings.interact.join() !== code;
    });
    settings.getState().resetBindings();
    return { acceptedInvalid, refusedValid };
  });
  check(validation.acceptedInvalid.length === 0,
    `rebinding refuses incomplete or invented codes: ${validation.acceptedInvalid.join(", ") || "none accepted"}`);
  check(validation.refusedValid.length === 0, "complete letter, digit, direction, modifier, punctuation and keypad codes remain bindable");
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, [], "live and saved bindings obey the same input rules");
} finally { await browser.close(); }
