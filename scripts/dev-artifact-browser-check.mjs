import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "./browser-safety.mjs";

const output = resolve("dist-electron");
mkdirSync(output, { recursive: true });
const directory = mkdtempSync(join(output, "watch-check-"));
const files = [join(directory, "LICENSES.chromium.html"), join(directory, "package.tmp")];
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const page = await browser.newPage();
  let navigations = 0;
  page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations++; });
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const before = await page.evaluate(() => {
    const run = window.__run.getState();
    run.pause();
    window.artifactWatchMarker = "the same document";
    return { seed: run.seed, room: run.currentRoomId };
  });
  const initialNavigations = navigations;
  // These are the outputs electron-builder writes while a dev run is open.
  for (const file of files) writeFileSync(file, "packaging probe");
  await page.waitForTimeout(2000);
  assert.equal(navigations, initialNavigations, "desktop outputs cannot reload a live dev run");
  const after = await page.evaluate(() => ({ marker: window.artifactWatchMarker,
    seed: window.__run?.getState().seed, room: window.__run?.getState().currentRoomId,
    paused: window.__run?.getState().paused }));
  assert.deepEqual(after, { marker: "the same document", ...before, paused: true });
  assert.equal((await page.request.get(`http://127.0.0.1:${process.env.PORT ?? 5199}/`)).status(), 200,
    "the development server remains available");
  console.log("PASS desktop packaging artifacts leave the dev server and paused run intact");
} finally {
  await browser.close();
  for (const file of files) { try { unlinkSync(file); } catch (error) { if (error.code !== "ENOENT") throw error; } }
  rmdirSync(directory);
}
