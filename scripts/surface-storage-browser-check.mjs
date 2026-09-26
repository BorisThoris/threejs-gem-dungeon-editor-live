import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5199"}/?editor`);
  await page.getByRole("button", { name: "SURFACES", exact: true }).click();
  await page.getByRole("button", { name: /^Save as/ }).click();
  const previous = await page.evaluate(() => localStorage.getItem("gem-dungeon.surfaces"));
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreSurfaceStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) {
      if (key === "gem-dungeon.surfaces") throw new DOMException("Full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.locator('canvas[aria-label="Paint surface"]').click();
  await page.getByRole("button", { name: /^Save as/ }).click();
  await page.getByRole("alert").filter({ hasText: "Surface changes are only in this session" }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem("gem-dungeon.surfaces")), previous);
  const expected = await page.evaluate(async () => (await import("/src/game/textures/registry.ts")).getSurfaceOverride("stone"));
  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download stone PNG", exact: true }).click();
  assert.deepEqual(readFileSync(await (await downloading).path()), Buffer.from(expected.split(",")[1], "base64"));
  await page.getByRole("button", { name: "MOSAIC", exact: true }).click();
  await page.getByRole("alert").waitFor();
  await page.getByRole("button", { name: 'Save "mosaic"', exact: true }).click();
  await page.getByRole("link", { name: "Download mosaic PNG", exact: true }).waitFor();
  await page.getByRole("button", { name: "Retry saving surfaces" }).click();
  assert.equal(await page.getByRole("alert").count(), 1);
  await page.evaluate(() => window.restoreSurfaceStorage());
  await page.getByRole("button", { name: "Retry saving surfaces" }).click();
  await page.waitForFunction(() => !document.querySelector('[role="alert"]'));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gem-dungeon.surfaces")));
  assert.equal(saved.stone, expected);
  assert.ok(saved.mosaic.startsWith("data:image/png"));
  await page.reload();
  await page.getByRole("button", { name: "SURFACES", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Paint surface"]')?.getAttribute("aria-busy") === "false");
  assert.equal(await page.locator('canvas[aria-label="Paint surface"]').evaluate(canvas => canvas.toDataURL()), expected);
  assert.equal(await page.getByRole("alert").count(), 0);
  assert.deepEqual(errors, []);
  console.log("PASS surface storage: quota warning across tools, exact PNG rescue, repeated failure, retry and reload");
} finally { await browser.close(); }
