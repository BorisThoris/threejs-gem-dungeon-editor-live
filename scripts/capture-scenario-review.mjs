/** Capture the editor's generated scenario cover as a browsable art review. */
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const port = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : process.env.PORT || "5199";
const outArg = process.argv.find(argument => argument.startsWith("--out="));
const caseArg = process.argv.find(argument => argument.startsWith("--case="));
const output = resolve(outArg ? outArg.slice(6) : "output/scenario-review");
const base = `http://127.0.0.1:${port}/`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const rows = [];
const sceneHashes = new Set();
/** Small, fixed-resolution sample keeps this check independent of JPEG file size. */
const sceneExposure = (page, dark, lit) => page.evaluate(async ({ dark, lit }) => {
  const mean = async encoded => {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${encoded}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 40;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let total = 0;
    for (let i = 0; i < pixels.length; i += 4)
      total += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    return total / (canvas.width * canvas.height);
  };
  return { dark: await mean(dark), lit: await mean(lit) };
}, { dark: dark.toString("base64"), lit: lit.toString("base64") });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`${base}?editor=1&tab=cases`);
  const allCases = await page.evaluate(async () => (await import("/src/editor/scenarioCases.ts")).scenarioCoverageCases());
  const cases = caseArg ? allCases.filter(test => `${test.kind}/${test.shape}` === caseArg.slice(7)) : allCases;
  assert.ok(cases.length, `No scenario matches ${caseArg}`);
  for (const [index, test] of cases.entries()) {
    const url = await page.evaluate(async scenario =>
      (await import("/src/editor/scenario.ts")).scenarioUrl(scenario), test);
    const playablePath = new URL(url).pathname + new URL(url).search;
    await page.goto(url);
    await page.waitForFunction(({ floor, roomId }) => {
      const state = window.__run?.getState();
      return state?.phase === "playing" && state.floor === floor && state.currentRoomId === roomId &&
        !state.transitioning && !!window.__scene?.children.length && !!window.__playerDebug;
    }, test, { timeout: 20000 });
    await page.evaluate(() => window.__run.getState().pause());
    await page.waitForTimeout(250);
    if (errors.length) throw Error(`${test.kind}/${test.shape}: ${errors.join(" | ")}`);
    const stem = `${String(index + 1).padStart(2, "0")}-${test.kind}-${test.shape}`;
    const gameplayFile = `${stem}.jpg`, sceneFile = `${stem}-scene.jpg`;
    const litGameplayFile = `${stem}-lit.jpg`, litSceneFile = `${stem}-lit-scene.jpg`;
    const canvas = page.locator("canvas").first();
    const gameplayImage = await canvas.screenshot({ type: "jpeg", quality: 86,
      style: '[data-testid="pause-menu"] { visibility: hidden !important; }' });
    const sceneImage = await canvas.screenshot({ type: "jpeg", quality: 86,
      style: `[data-testid="pause-menu"], [data-testid="hud"], [data-testid="minimap"], [data-testid="guidance"],
        [data-testid="prompt"], [data-testid="scenario-badge"], [data-testid="deed-toast"],
        [data-testid^="moment-"] { visibility: hidden !important; }` });
    const sceneHash = createHash("sha256").update(sceneImage).digest("hex");
    assert.ok(sceneImage.length > 10000 && !sceneHashes.has(sceneHash),
      `${test.kind}/${test.shape} produced a blank or duplicate scene capture`);
    sceneHashes.add(sceneHash);
    const darkGlim = await page.evaluate(() => window.__run.getState().glim);
    assert.equal(darkGlim, 0, `${test.kind}/${test.shape} begins in the reviewed dark state`);
    const livesBeforeLight = await page.evaluate(() => window.__run.getState().lives);
    await page.evaluate(() => window.__run.getState().toggleLantern());
    await page.waitForFunction(() => window.__run.getState().glim >= 76 && window.__lantern?.distance >= 14,
      null, { timeout: 10000 });
    assert.equal(await page.evaluate(() => window.__run.getState().lives), livesBeforeLight,
      `${test.kind}/${test.shape} light comparison keeps the player out of combat damage`);
    const litGameplayImage = await canvas.screenshot({ type: "jpeg", quality: 86,
      style: '[data-testid="pause-menu"] { visibility: hidden !important; }' });
    const litSceneImage = await canvas.screenshot({ type: "jpeg", quality: 86,
      style: `[data-testid="pause-menu"], [data-testid="hud"], [data-testid="minimap"], [data-testid="guidance"],
        [data-testid="prompt"], [data-testid="scenario-badge"], [data-testid="deed-toast"],
        [data-testid^="moment-"] { visibility: hidden !important; }` });
    const litHash = createHash("sha256").update(litSceneImage).digest("hex");
    assert.ok(litSceneImage.length > 10000 && litHash !== sceneHash,
      `${test.kind}/${test.shape} has a distinct raised-lantern view`);
    const exposure = await sceneExposure(page, sceneImage, litSceneImage);
    assert.ok(exposure.lit >= 20 && exposure.lit - exposure.dark >= 3,
      `${test.kind}/${test.shape} needs a visible raised-lantern scene: ${JSON.stringify(exposure)}`);
    await writeFile(join(output, gameplayFile), gameplayImage);
    await writeFile(join(output, sceneFile), sceneImage);
    await writeFile(join(output, litGameplayFile), litGameplayImage);
    await writeFile(join(output, litSceneFile), litSceneImage);
    rows.push({ ...test, gameplayFile, sceneFile, sceneSha256: sceneHash, exposure,
      litGameplayFile, litSceneFile, litSceneSha256: litHash, url, playablePath });
    console.log(`${String(index + 1).padStart(2, "0")}/${cases.length} ${test.kind}/${test.shape} · seed ${test.seed} floor ${test.floor} ${test.roomId} · scene ${exposure.dark.toFixed(1)} → ${exposure.lit.toFixed(1)}`);
  }
} finally {
  await browser.close();
}
await writeFile(join(output, "manifest.json"), JSON.stringify({ capturedAt: new Date().toISOString(), cases: rows }, null, 2) + "\n");
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const reviewOrigin = "http://127.0.0.1:5199";
const cards = rows.map(test => `<article>
  <div class="views">
    <a href="${escapeHtml(test.sceneFile)}"><img src="${escapeHtml(test.sceneFile)}" alt="${escapeHtml(`${test.kind} ${test.shape} room in the dark`)}" loading="lazy"><span>Lantern down</span></a>
    <a href="${escapeHtml(test.litSceneFile)}"><img src="${escapeHtml(test.litSceneFile)}" alt="${escapeHtml(`${test.kind} ${test.shape} room with a raised lantern`)}" loading="lazy"><span>Lantern raised</span></a>
  </div>
  <div class="detail"><strong>${escapeHtml(test.kind)} · ${escapeHtml(test.shape)}</strong>
    <span>${escapeHtml(test.district)} · seed ${test.seed} · floor ${test.floor} · ${escapeHtml(test.roomId)}</span>
    <span>Scene exposure ${test.exposure.dark.toFixed(1)} → ${test.exposure.lit.toFixed(1)}</span>
    <span><a href="${escapeHtml(test.gameplayFile)}">Dark HUD</a> · <a href="${escapeHtml(test.litGameplayFile)}">Lit HUD</a> · <a data-scenario-path="${escapeHtml(test.playablePath)}" href="${escapeHtml(new URL(test.playablePath, reviewOrigin))}">Play this case ↗</a></span></div>
</article>`).join("\n");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gem Dungeon · Scenario Review</title>
<style>body{margin:0;padding:24px;background:#0a0c12;color:#e4d3b4;font:13px/1.5 system-ui,sans-serif}h1{margin:0 0 4px;font-size:24px}p{color:#b8b2a8}label{display:block;margin-top:12px}input{margin-left:8px;padding:5px 7px;width:min(280px,65vw);background:#171512;color:#e4d3b4;border:1px solid #50453a;border-radius:4px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:18px;margin-top:22px}article{background:#171512;border:1px solid #50453a;border-radius:8px;overflow:hidden}.views{display:grid;grid-template-columns:1fr 1fr;gap:2px}.views a{position:relative}.views img{display:block;width:100%;aspect-ratio:8/5;object-fit:cover;background:#000}.views span{position:absolute;bottom:0;left:0;right:0;padding:5px 7px;background:#0a0c12d9;color:#e4d3b4;font-size:11px}.detail{display:grid;gap:5px;padding:11px 13px}.detail span{color:#b8b2a8}a{color:#83ddf1}</style>
<h1>Gem Dungeon · Scenario Review</h1><p>${rows.length} generated cases covering every room kind and footprint in dark and raised-lantern states. Click an image for full size. Start a development server to play a case.</p>
<label for="dev-origin">Development server <input id="dev-origin" type="url" value="${reviewOrigin}" spellcheck="false"></label><span id="server-status" role="status"></span>
<main>${cards}</main><script>
const server = document.getElementById("dev-origin");
const status = document.getElementById("server-status");
const playLinks = [...document.querySelectorAll("a[data-scenario-path]")];
function updatePlayLinks() {
  let origin;
  try {
    const parsed = new URL(server.value);
    if (!["http:", "https:"].includes(parsed.protocol)) throw Error("invalid protocol");
    origin = parsed.origin;
  } catch {
    playLinks.forEach(link => link.removeAttribute("href"));
    status.textContent = " Enter a valid http(s) development server URL.";
    return;
  }
  playLinks.forEach(link => { link.href = new URL(link.dataset.scenarioPath, origin).href; });
  status.textContent = " Play links use " + origin + ".";
}
server.addEventListener("input", updatePlayLinks);
updatePlayLinks();
</script></html>\n`;
await writeFile(join(output, "index.html"), html);
const contactBrowser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const contactPage = await contactBrowser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await contactPage.goto(pathToFileURL(join(output, "index.html")).href);
  await contactPage.evaluate(async () => {
    const images = [...document.querySelectorAll("article img")];
    images.forEach(image => { image.loading = "eager"; });
    await Promise.all(images.map(image => image.decode()));
  });
  const play = contactPage.locator("a[data-scenario-path]");
  assert.equal(await play.count(), rows.length, "every captured room has a playable link");
  assert.equal(new URL(await play.first().getAttribute("href")).pathname +
    new URL(await play.first().getAttribute("href")).search, rows[0].playablePath,
  "the gallery keeps the game's exact scenario path");
  await contactPage.locator("#dev-origin").fill("http://127.0.0.1:5173");
  assert.ok(await play.evaluateAll(links => links.every(link =>
    link.href === new URL(link.dataset.scenarioPath, "http://127.0.0.1:5173").href)),
  "changing the development server updates every playable link");
  await contactPage.locator("#dev-origin").fill(reviewOrigin);
  await contactPage.screenshot({ path: join(output, "contact.jpg"), type: "jpeg", quality: 85, fullPage: true });
} finally {
  await contactBrowser.close();
}
console.log(`Review gallery: ${join(output, "index.html")}`);
