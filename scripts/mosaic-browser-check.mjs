import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5199"}/?editor`);
  await page.getByRole("button", { name: "MOSAIC", exact: true }).click();
  await page.getByRole("button", { name: "diamond", exact: true }).click();
  await page.getByTestId("mosaic-cell-0").click();
  const firstPath = await page.getByTestId("mosaic-cell-0").locator("path").getAttribute("d");
  for (const index of [15, 240, 255]) {
    assert.equal(await page.getByTestId(`mosaic-cell-${index}`).locator("path").getAttribute("d"), firstPath,
      "four-way mirror retains the selected shape");
  }
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByRole("checkbox", { name: "mirror four ways" }).uncheck();
  const shapes = ["square", "circle", "diamond", "triangle", "hexagon"];
  for (const [index, shape] of shapes.entries()) {
    await page.getByRole("button", { name: shape, exact: true }).click();
    await page.getByTestId(`mosaic-cell-${index}`).click();
  }
  await page.getByRole("button", { name: 'Save "mosaic"', exact: true }).click();
  const measured = await page.evaluate(async shapes => {
    const load = src => new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
    });
    const saved = await load(JSON.parse(localStorage.getItem("gem-dungeon.surfaces")).mosaic);
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d"); context.drawImage(saved, 0, 0);
    const rows = [];
    for (const [index, shape] of shapes.entries()) {
      const svg = document.querySelector(`[data-testid="mosaic-cell-${index}"] svg`).cloneNode(true);
      svg.setAttribute("width", "8"); svg.setAttribute("height", "8");
      const image = await load(`data:image/svg+xml;base64,${btoa(new XMLSerializer().serializeToString(svg))}`);
      const preview = document.createElement("canvas"); preview.width = preview.height = 8;
      const ctx = preview.getContext("2d"); ctx.fillStyle = "#2a2a2e"; ctx.fillRect(0, 0, 8, 8); ctx.drawImage(image, 0, 0);
      const a = ctx.getImageData(0, 0, 8, 8).data, b = context.getImageData(index * 8, 0, 8, 8).data;
      const difference = a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length;
      rows.push({ shape, difference, path: svg.querySelector("path").getAttribute("d"),
        center: [...context.getImageData(index * 8 + 4, 4, 1, 1).data],
        corner: [...context.getImageData(index * 8, 0, 1, 1).data] });
    }
    return { rows, width: saved.width, height: saved.height };
  }, shapes);
  assert.equal(measured.width, 128); assert.equal(measured.height, 128);
  assert.equal(new Set(measured.rows.map(row => row.path)).size, shapes.length, "all five shapes have distinct live geometry");
  for (const row of measured.rows) {
    assert.ok(row.difference < 8, `${row.shape} live SVG and saved pixels agree: ${row.difference}`);
    assert.deepEqual(row.center, [200, 163, 74, 255], `${row.shape} retains the chosen color`);
    if (row.shape !== "square") assert.deepEqual(row.corner, [42, 42, 46, 255], `${row.shape} preserves the background outside its outline`);
  }
  await page.screenshot({ path: "output/world-review/mosaic-shapes.png" });
  await page.getByRole("button", { name: "SURFACES", exact: true }).click();
  await page.getByRole("combobox", { name: "Surface", exact: true }).selectOption("mosaic");
  await page.waitForFunction(() => ![...document.querySelectorAll("button")].find(button => button.textContent.startsWith("Save as"))?.disabled);
  assert.ok(await page.locator('canvas').first().evaluate(canvas =>
    canvas.toDataURL() === JSON.parse(localStorage.getItem("gem-dungeon.surfaces")).mosaic),
  "the painter receives the mosaic's exact saved pixels");
  assert.deepEqual(errors, []);
  console.log("PASS mosaic: mirrored shapes, five distinct live previews, saved pixel agreement and painter handoff", measured.rows.map(({ shape, difference }) => ({ shape, difference })));
} finally { await browser.close(); }
