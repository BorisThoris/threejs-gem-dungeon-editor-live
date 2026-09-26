import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  const url = `http://127.0.0.1:${process.env.PORT ?? "5199"}/?editor`;
  await page.goto(url);
  const ids = ["__proto__", "constructor", "toString", "ordinary-draft"];
  const templates = ids.map(id => ({ id, kind: "normal", shape: "square", size: 20, props: [] }));
  await page.locator('input[type="file"]').setInputFiles({ name: "rooms.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(templates)) });
  await page.getByText("ordinary-draft", { exact: true }).waitFor();
  const storedIds = () => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("gem-dungeon.drafts"))).sort());
  assert.deepEqual(await storedIds(), [...ids].sort(), "every valid imported ID is an own stored draft");
  await page.reload();
  await page.getByText("ordinary-draft", { exact: true }).waitFor();
  assert.deepEqual(await storedIds(), [...ids].sort(), "reserved-looking IDs survive reload");
  const operations = await page.evaluate(async () => {
    const { draftStore } = await import("/src/editor/drafts.ts");
    const { getTemplate } = await import("/src/game/rooms/templates.ts");
    const absent = draftStore.get("hasOwnProperty") === undefined;
    draftStore.setEnabled("hasOwnProperty", true);
    draftStore.setEnabled("__proto__", true);
    const live = getTemplate("__proto__")?.id === "__proto__";
    draftStore.remove("__proto__");
    return { absent, live, removed: draftStore.get("__proto__") === undefined && getTemplate("__proto__") === undefined };
  });
  assert.deepEqual(operations, { absent: true, live: true, removed: true });
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem("gem-dungeon.drafts"));
    stored["string-flag"] = { template: { id: "string-flag", kind: "normal", shape: "square", size: 20, props: [] }, enabled: "false", updatedAt: "yesterday" };
    stored["wrong-key"] = { template: { id: "different-id", kind: "normal", shape: "square", size: 20, props: [] }, enabled: true, updatedAt: 1 };
    localStorage.setItem("gem-dungeon.drafts", JSON.stringify(stored));
  });
  await page.reload();
  await page.getByText("string-flag", { exact: true }).waitFor();
  const recovered = await page.evaluate(async () => {
    const { draftStore } = await import("/src/editor/drafts.ts");
    const { getTemplate } = await import("/src/game/rooms/templates.ts");
    const draft = draftStore.get("string-flag");
    return { enabled: draft.enabled, updatedAt: draft.updatedAt, live: Boolean(getTemplate("string-flag")),
      mismatch: Boolean(draftStore.get("wrong-key") || getTemplate("different-id")), ids: draftStore.all().map(d => d.template.id).sort() };
  });
  assert.deepEqual(recovered, { enabled: false, updatedAt: 0, live: false, mismatch: false,
    ids: ["constructor", "ordinary-draft", "string-flag", "toString"] });
  const beforeFailure = await page.evaluate(() => localStorage.getItem("gem-dungeon.drafts"));
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreDraftStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) {
      if (key === "gem-dungeon.drafts") throw new DOMException("Storage full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "unsaved.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...templates[0], id: "unsaved-room" })) });
  await page.getByText("unsaved-room", { exact: true }).waitFor();
  await page.getByRole("alert").filter({ hasText: "Draft changes are only in this session" }).waitFor({ timeout: 5000 });
  assert.equal(await page.evaluate(() => localStorage.getItem("gem-dungeon.drafts")), beforeFailure,
    "failed writes leave the previous stored drafts intact");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all drafts" }).click();
  const exported = JSON.parse(readFileSync(await (await downloadEvent).path(), "utf8"));
  assert.ok(exported.some(template => template.id === "unsaved-room"), "export rescues the unsaved room");
  await page.getByRole("button", { name: "Retry saving drafts" }).click();
  assert.equal(await page.getByRole("alert").count(), 1, "failed retry keeps the warning visible");
  await page.evaluate(() => window.restoreDraftStorage());
  await page.getByRole("button", { name: "Retry saving drafts" }).click();
  await page.waitForFunction(() => !document.querySelector('[role="alert"]'));
  await page.reload();
  await page.getByText("unsaved-room", { exact: true }).waitFor();
  const malformed = [
    { name: { text: "Not a string" } }, { story: ["Not a string"] }, { tableau: 42 },
    { props: [{ kind: "barrel", x: 3, z: 3, slot: { name: "supplies" } }] },
    { slots: [{ slot: "supplies", op: ["subst"], into: ["urn"] }] },
  ].map((patch, index) => ({ ...templates[0], id: `malformed-${index}`, ...patch }));
  let skipped;
  page.once("dialog", async dialog => { skipped = dialog.message(); await dialog.accept(); });
  await page.locator('input[type="file"]').setInputFiles({ name: "mixed-rooms.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([...malformed, { ...templates[0], id: "valid-metadata",
      name: "Workroom", story: "A quiet workshop", tableau: "custom-story",
      props: [{ kind: "barrel", x: 3, z: 3, slot: "supplies" }],
      slots: [{ slot: "supplies", op: "subst", into: ["urn"] }] }])) });
  await page.getByText("valid-metadata", { exact: true }).waitFor();
  assert.equal(skipped, "5 of 6 entries were not room templates and were skipped.");
  assert.ok(!(await storedIds()).some(id => id.startsWith("malformed-")), "malformed optional fields never enter draft storage");
  assert.deepEqual(errors, []);
  console.log("PASS draft storage: arbitrary IDs, import/reload, corrupt metadata, failed-save warning, export rescue and retry recovery");
} finally { await browser.close(); }
