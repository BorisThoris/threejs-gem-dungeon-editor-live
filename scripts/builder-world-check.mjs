import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5173}/?editor`);
  await page.getByLabel("COPY A SHIPPED ROOM").selectOption("hall-round-workroom");
  await page.getByLabel("Preview district").selectOption("tombs");
  await page.getByLabel("Preview seed").fill("12");
  assert.equal(await page.getByTestId("preview-supplies").innerText(), "supplies: 3 × Urn");
  const draft = await page.evaluate(async () => {
    const { draftStore } = await import("/src/editor/drafts.ts");
    const { templatesForKind, getTemplate, previewTemplateId } = await import("/src/game/rooms/templates.ts");
    const d = draftStore.all()[0];
    return { template: d.template, enabled: d.enabled,
      drawn: templatesForKind("normal").some(t => t.id === d.template.id),
      preview: !!getTemplate(previewTemplateId(d.template.id)) };
  });
  assert.ok(!draft.enabled && !draft.drawn && draft.preview);
  const source = JSON.parse(readFileSync(new URL("../src/content/templates.json", import.meta.url), "utf8"))
    .find(t => t.id === "hall-round-workroom");
  assert.deepEqual({ ...draft.template, id: source.id }, source);
  for (const district of ["gardens", "works", "tombs"]) {
    await page.getByLabel("Preview district").selectOption(district);
    const expected = await page.evaluate(async ({ district, template }) => {
      const { resolveSlots } = await import("/src/game/rooms/slots.ts");
      return resolveSlots(template.props, template.slots, "slots:12:preview:0,0", district)[4].kind;
    }, { district, template: draft.template });
    assert.equal(await page.getByTestId("preview-supplies").innerText(), `supplies: 3 × ${expected[0].toUpperCase() + expected.slice(1)}`);
  }
  await page.getByLabel("Preview biome").selectOption("fungal");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  const downloaded = await downloading;
  assert.deepEqual(JSON.parse(readFileSync(await downloaded.path(), "utf8")), draft.template);
  await page.getByRole("button", { name: "Live in runs: off", exact: true }).click();
  const live = () => page.evaluate(async id => {
    const { templatesForKind } = await import("/src/game/rooms/templates.ts");
    return templatesForKind("normal").some(t => t.id === id);
  }, draft.template.id);
  assert.ok(await live());
  await page.getByRole("button", { name: "Live in runs: on", exact: true }).click();
  assert.ok(!(await live()));
  await page.waitForTimeout(1000);
  if (process.env.SCREENSHOT) await page.screenshot({ path: process.env.SCREENSHOT });
  await page.getByRole("button", { name: "WORLD", exact: true }).click();
  const cleaned = await page.evaluate(async id => {
    const { getTemplate, previewTemplateId } = await import("/src/game/rooms/templates.ts");
    return !getTemplate(previewTemplateId(id));
  }, draft.template.id);
  assert.ok(cleaned);
  const restored = await page.evaluate(async () => {
    const { draftStore } = await import("/src/editor/drafts.ts");
    const { SHIPPED } = await import("/src/game/rooms/shipped.ts");
    const { getTemplate } = await import("/src/game/rooms/templates.ts");
    const original = SHIPPED.find(t => t.id === "hall-round-workroom");
    const override = { ...original, props: [] };
    draftStore.put(override, true);
    const overridden = getTemplate(original.id).props.length === 0;
    draftStore.setEnabled(original.id, false);
    const disabled = JSON.stringify(getTemplate(original.id)) === JSON.stringify(original);
    draftStore.put(override, true);
    draftStore.remove(original.id);
    return overridden && disabled && JSON.stringify(getTemplate(original.id)) === JSON.stringify(original);
  });
  assert.ok(restored);
  assert.deepEqual(errors, []);
  console.log("PASS shipped room copy, district/seed preview, unchanged export, live toggle and preview cleanup");
} finally { await browser.close(); }
