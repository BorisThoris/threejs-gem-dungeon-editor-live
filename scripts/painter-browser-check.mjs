import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => { errors.push(String(error)); console.error(String(error)); });
  await page.addInitScript(() => {
    const tile = color => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const context = canvas.getContext("2d");
      context.fillStyle = color; context.fillRect(0, 0, 128, 128);
      return canvas.toDataURL();
    };
    const red = tile("#ff0000"), blue = tile("#0000ff");
    window.__paintFixtures = { red, blue };
    localStorage.setItem("gem-dungeon.surfaces", JSON.stringify({ stone: red, wood: blue, brick: "data:image/png;base64,broken" }));
    window.__pendingSurfaceLoads = [];
    const NativeImage = window.Image;
    window.Image = function (...args) {
      const image = new NativeImage(...args);
      let onload;
      Object.defineProperty(image, "onload", { get: () => onload, set: handler => { onload = handler; } });
      image.addEventListener("load", () => window.__pendingSurfaceLoads.push({ src: image.src,
        fire: () => onload?.call(image, new Event("load")) }));
      return image;
    };
  });
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5199"}/?editor`);
  await page.getByRole("button", { name: "SURFACES", exact: true }).click();
  const save = page.getByRole("button", { name: /^Save as/ });
  const surface = page.getByRole("combobox").first();
  const pixel = () => page.locator("canvas").first().evaluate(canvas => [...canvas.getContext("2d").getImageData(64, 64, 1, 1).data]);
  const release = async color => {
    await page.waitForFunction(color => window.__pendingSurfaceLoads.some(load => load.src === window.__paintFixtures[color]), color);
    await page.evaluate(color => {
      const ready = window.__pendingSurfaceLoads.filter(load => load.src === window.__paintFixtures[color]);
      window.__pendingSurfaceLoads = window.__pendingSurfaceLoads.filter(load => load.src !== window.__paintFixtures[color]);
      ready.forEach(load => load.fire());
    }, color);
  };
  assert.ok(await save.isDisabled(), "a pending surface cannot overwrite saved work");
  const pendingPixel = await pixel();
  await page.locator('canvas').first().click();
  assert.deepEqual(await pixel(), pendingPixel, 'painting is disabled until the selected surface is decoded');
  await surface.selectOption("wood");
  assert.ok(await save.isDisabled());
  await release("blue");
  assert.deepEqual(await pixel(), [0, 0, 255, 255]);
  assert.ok(await save.isEnabled());
  await release("red");
  assert.deepEqual(await pixel(), [0, 0, 255, 255], "late stone decode cannot paint over selected wood");
  await save.click();
  assert.ok(await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem("gem-dungeon.surfaces"));
    return stored.stone === window.__paintFixtures.red && stored.wood === document.querySelector("canvas").toDataURL();
  }), "saving touches only the selected surface with the visible pixels");
  await surface.selectOption("brick");
  await page.getByRole("status").filter({ hasText: "could not be loaded" }).waitFor();
  assert.ok(await save.isDisabled(), "a failed decode cannot overwrite saved work");
  await page.getByRole("button", { name: "Reset to default" }).click();
  assert.ok(await save.isEnabled(), "explicit reset recovers a corrupt surface");
  await surface.selectOption("stone");
  await page.waitForFunction(() => window.__pendingSurfaceLoads.some(load => load.src === window.__paintFixtures.red));
  await page.getByRole("button", { name: "PROPS", exact: true }).click();
  await release("red");
  await page.getByRole("button", { name: "SURFACES", exact: true }).click();
  for (const id of ["custom-floor", "__proto__", "constructor", "toString", "hasOwnProperty"]) {
    const input = page.getByPlaceholder("or a new surface id…");
    await input.fill(id);
    await input.press("Enter");
    await page.waitForFunction(() => document.querySelector('canvas[aria-label="Paint surface"]')?.getAttribute("aria-busy") === "false",
      null, { timeout: 5000 });
    assert.equal(await surface.inputValue(), id, "new surface selection agrees with the save destination before its first save");
    const pixels = await page.locator('canvas[aria-label="Paint surface"]').evaluate(canvas =>
      [...canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data]);
    assert.ok(pixels.some((value, index) => index % 4 !== 3 && value !== 0), `${id} gets a real procedural surface`);
    await save.click();
    assert.ok(await page.evaluate(id => Object.hasOwn(JSON.parse(localStorage.getItem("gem-dungeon.surfaces")), id), id));
    await page.getByRole("button", { name: "Reset to default" }).click();
    assert.equal(await surface.inputValue(), id, "reset keeps the active custom surface selected after removing its override");
  }
  assert.deepEqual(errors, [], "late loads after unmount cause no runtime errors");
  console.log("PASS painter: pending save guard, out-of-order decodes, saved pixels, corrupt image recovery, unmount cleanup and arbitrary surface IDs");
} finally { await browser.close(); }
