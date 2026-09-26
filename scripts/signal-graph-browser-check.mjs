import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const port = process.argv[2] || process.env.PORT || "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/?editor`);
  await page.getByRole("button", { name: "SIGNALS" }).click();
  await page.locator('[data-testid="signal-graph"]').waitFor();
  const compareLiveDin = async (label) => {
    const sample = await page.evaluate(async () => {
      const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
      const { EMISSIONS, HELD } = await import("/src/game/din/emissions.ts");
      const { SUSCEPTIBILITY } = await import("/src/game/din/susceptibility.ts");
      const din = await import("/src/game/din/din.ts");
      const source = document.querySelector('[data-testid="signal-source"]').value;
      const [kind, id] = source.split(":");
      const dungeon = generateRunFloor(Number(document.querySelector('#signal-seed').value),
        Number(document.querySelector('#signal-floor').value),
        document.querySelector('[data-testid="signal-room-bias"]').checked);
      const fromId = document.querySelector('#signal-from').value;
      const toId = document.querySelector('#signal-to').value;
      const bars = new Set([document.querySelector('#signal-bar').value].filter(Boolean));
      const declaration = kind === "impulse" ? EMISSIONS[id] : HELD[id];
      din.reset();
      din.advance(0);
      if (kind === "impulse") din.strike(id, dungeon.rooms, dungeon.rooms.find(room => room.id === fromId),
        0, 0, bars, document.querySelector('#signal-footing')?.value);
      else din.hold("graph-check", id, dungeon.rooms, fromId,
        declaration.magnitude * Number(document.querySelector('#signal-strength').value), 0, 0, bars);
      din.advance(Number(document.querySelector('#signal-age')?.value ?? 0));
      const arrival = declaration.tags.length ? din.arriving(declaration.tags[0], toId) : 0;
      const receivers = Object.keys(SUSCEPTIBILITY).filter(id => din.answering(din.emptyArrival(), id, toId)).length;
      const displayed = Number(document.querySelector('[data-testid="signal-arrival"]').textContent.match(/([\d.]+)$/)?.[1]);
      const displayedReceivers = Number(document.querySelector('[data-testid="signal-active-count"]').textContent.match(/^(\d+)/)?.[1]);
      din.reset();
      return { source, fromId, toId, arrival, displayed, receivers, displayedReceivers };
    });
    assert.ok(Math.abs(sample.arrival - sample.displayed) < 0.011 && sample.receivers === sample.displayedReceivers,
      `${label}: graph agrees with live Din: ${JSON.stringify(sample)}`);
  };
  const replaySeed = 4294967295;
  await page.locator('[data-testid="signal-seed"]').fill("72.9");
  assert.equal(await page.locator('[data-testid="signal-seed"]').inputValue(), "72", "fractional seed input normalizes to a replayable integer");
  await page.locator('[data-testid="signal-seed"]').fill(String(replaySeed));
  assert.equal(await page.locator('[data-testid="signal-seed"]').inputValue(), String(replaySeed), "the graph preserves the full unsigned run seed");
  await page.locator('#signal-floor').selectOption("3");
  const signalReplay = await page.evaluate(async seed => {
    const { generateRunFloor, runFloorSeed } = await import("/src/game/dungeon/runFloor.ts");
    return { seed: runFloorSeed(seed, 3), ids: generateRunFloor(seed, 3).rooms.map(room => room.id) };
  }, replaySeed);
  assert.match(await page.locator('[data-testid="signal-floor-seed"]').innerText(), new RegExp(String(signalReplay.seed)));
  assert.deepEqual(await page.locator('#signal-from option').evaluateAll(nodes => nodes.map(node => node.value)),
    signalReplay.ids, "signal routes use the real third-floor graph for the run seed");
  const count = await page.evaluate(async () => Object.keys((await import("/src/game/din/susceptibility.ts")).SUSCEPTIBILITY).length);
  assert.equal(await page.locator('[data-testid^="signal-receiver-"]').count(), count, "every declared receiver has a node");
  assert.match(await page.getByTestId('signal-graph').ariaSnapshot(), /button/, 'receiver controls are exposed in the accessibility tree');
  assert.match(await page.locator('[data-testid="signal-active-count"]').innerText(), /\d+ of \d+ receivers answer/);
  assert.match(await page.locator('[data-testid="signal-receiver-warden"]').textContent() ?? "", /ANSWERS/);
  assert.match(await page.locator('[data-testid="signal-receiver-reaper"]').textContent() ?? "", /QUIET/);
  const keyboardReceiver = page.getByTestId("signal-receiver-wickling");
  await keyboardReceiver.focus();
  const scrollPositions = () => keyboardReceiver.evaluate(node => {
    const positions = [];
    for (let parent = node.parentElement; parent; parent = parent.parentElement) positions.push(parent.scrollTop);
    return positions;
  });
  const scrollBeforeSelection = await scrollPositions();
  await page.keyboard.press("Space");
  await page.waitForTimeout(350);
  assert.deepEqual(await scrollPositions(), scrollBeforeSelection,
    "Space selects a receiver without scrolling the graph away");
  assert.equal(await keyboardReceiver.getAttribute("aria-pressed"), "true", "keyboard selection is exposed to assistive technology");
  await page.getByTestId("signal-receiver-warden").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.getByTestId("signal-receiver-warden").getAttribute("aria-pressed"), "true", "Enter selects another receiver");
  assert.equal(await keyboardReceiver.getAttribute("aria-pressed"), "false", "previous receiver is no longer selected");
  await compareLiveDin("same-room bomb");
  assert.deepEqual(await page.locator('[data-testid="signal-route-room"]').evaluateAll(nodes => nodes.map(node => node.getAttribute("data-room-id"))),
    ["start"], "source and listener in one room need no doorway");
  await page.locator('[data-testid="signal-receiver-warden"]').click();
  assert.match(await page.locator("body").innerText(), /Thresholds: loud ≥ 0\.30/);

  const source = page.locator('[data-testid="signal-source"]');
  await source.selectOption("impulse:gemTaken");
  assert.match(await page.locator('[data-testid="signal-active-count"]').innerText(), /^0 of/);
  assert.equal(await page.locator('[data-testid^="signal-edge-"]').count(), 0, "silent theft has no graph edges");
  assert.equal(await page.locator('[data-testid="signal-route-room"]').count(), 0, "silent theft has no carry route");
  await compareLiveDin("silent theft");

  await source.selectOption("impulse:bombBurst");
  const initial = Number((await page.locator('[data-testid="signal-arrival"]').innerText()).match(/([\d.]+)$/)?.[1]);
  const nextRoom = await page.locator('[data-testid="signal-to"] option').nth(1).getAttribute("value");
  assert.ok(nextRoom);
  await page.locator('[data-testid="signal-to"]').selectOption(nextRoom);
  const throughDoor = Number((await page.locator('[data-testid="signal-arrival"]').innerText()).match(/([\d.]+)$/)?.[1]);
  assert.ok(throughDoor < initial, `doorway attenuates ${initial} to ${throughDoor}`);
  await compareLiveDin("doorway carry");
  const startDoor = await page.locator('[data-testid="signal-bar"] option').evaluateAll((options) =>
    options.find((option) => option.value.split("|").includes("start"))?.value);
  assert.ok(startDoor, "generated floor has a doorway from start");
  const neighbor = startDoor.split("|").find((id) => id !== "start");
  await page.locator('[data-testid="signal-to"]').selectOption(neighbor);
  const sourceLink = new URL(await page.locator('[data-testid="signal-play-source"]').getAttribute("href"));
  const listenerLink = new URL(await page.locator('[data-testid="signal-play-listener"]').getAttribute("href"));
  assert.deepEqual([sourceLink.searchParams.get("seed"), sourceLink.searchParams.get("floor"), sourceLink.searchParams.get("room")],
    [String(replaySeed), "3", "start"], "the graph opens its generated source room without truncating its seed");
  assert.equal(listenerLink.searchParams.get("room"), neighbor, "the graph opens its selected listener room");
  const popupPromise = page.waitForEvent("popup");
  await page.locator('[data-testid="signal-play-listener"]').click();
  const playable = await popupPromise;
  await playable.waitForFunction(({ room, seed }) => {
    const run = window.__run?.getState();
    return run?.phase === "playing" && run.runSeed === seed && run.floor === 3 && run.currentRoomId === room && !run.transitioning;
  }, { room: neighbor, seed: replaySeed }, { timeout: 20000 });
  await playable.close();
  assert.equal(await page.locator('[data-testid="signal-to"]').inputValue(), neighbor,
    "opening a playable room leaves the signal graph in place");
  const openDoorArrival = Number((await page.locator('[data-testid="signal-arrival"]').innerText()).match(/([\d.]+)$/)?.[1]);
  assert.deepEqual(await page.locator('[data-testid="signal-route-room"]').evaluateAll(nodes => nodes.map(node => node.getAttribute("data-room-id"))),
    ["start", neighbor], "the graph shows the direct open doorway");
  await page.locator('[data-testid="signal-bar"]').selectOption(startDoor);
  const barredArrival = Number((await page.locator('[data-testid="signal-arrival"]').innerText()).match(/([\d.]+)$/)?.[1]);
  assert.ok(barredArrival < openDoorArrival, `barred doorway reduces ${openDoorArrival} to ${barredArrival}`);
  const barredRoute = await page.locator('[data-testid="signal-route-room"]').evaluateAll(nodes => nodes.map(node => node.getAttribute("data-room-id")));
  assert.ok(barredRoute.length === 0 || barredRoute[1] !== neighbor,
    `barred doorway is absent from the displayed carry route: ${barredRoute.join(" > ")}`);
  await compareLiveDin("barred doorway");
  await page.locator('[data-testid="signal-bar"]').selectOption("");
  await page.locator('[data-testid="signal-age"]').fill("10");
  const aged = Number((await page.locator('[data-testid="signal-arrival"]').innerText()).match(/([\d.]+)$/)?.[1]);
  assert.ok(aged < throughDoor, `impulse decays from ${throughDoor} to ${aged}`);
  await compareLiveDin("aged impulse");

  await source.selectOption("held:lantern");
  assert.equal(await page.locator('[data-testid="signal-age"]').count(), 0, "held source has no decay control");
  assert.equal(await page.locator("#signal-strength").count(), 1);
  await page.locator("#signal-strength").fill("0.7");
  await compareLiveDin("held lantern");
  await source.selectOption("impulse:sprint");
  await page.locator("#signal-footing").selectOption("water");
  await compareLiveDin("water sprint");
  await page.locator('[data-testid="signal-room-bias"]').check();
  assert.equal(new URL(await page.locator('[data-testid="signal-play-listener"]').getAttribute("href")).searchParams.get("bias"), "1",
    "play links replay the graph's selected room bias");
  await page.locator('#signal-age').fill("2.5");
  await page.locator('#signal-from').selectOption({ index: 1 });
  await page.locator('#signal-to').selectOption({ index: 2 });
  await page.locator('#signal-bar').selectOption({ index: 1 });
  await page.getByTestId('signal-receiver-sentry').click();
  const graphSnapshot = target => target.evaluate(() => ({
    settings: ['signal-source', 'signal-seed', 'signal-floor', 'signal-from', 'signal-to', 'signal-bar',
      'signal-age', 'signal-footing', 'signal-strength'].map(id => [id, document.getElementById(id)?.value ?? null]),
    bias: document.querySelector('[data-testid="signal-room-bias"]').checked,
    selected: document.querySelector('[data-testid^="signal-receiver-"][aria-pressed="true"]').getAttribute('data-testid'),
    arrival: document.querySelector('[data-testid="signal-arrival"]').textContent,
    receivers: document.querySelector('[data-testid="signal-active-count"]').textContent,
    route: document.querySelector('[data-testid="signal-route"]').textContent,
    link: document.querySelector('[data-testid="signal-permalink"]').href,
  }));
  const expectedGraph = await graphSnapshot(page);
  const graphPopup = page.waitForEvent('popup');
  await page.getByTestId('signal-permalink').click();
  const restored = await graphPopup;
  restored.on('pageerror', error => errors.push(String(error)));
  await restored.getByTestId('signal-graph').waitFor();
  assert.deepEqual(await graphSnapshot(restored), expectedGraph, 'shared link restores the complete impulse investigation');
  await restored.reload();
  await restored.getByTestId('signal-graph').waitFor();
  assert.deepEqual(await graphSnapshot(restored), expectedGraph, 'reloading the shared graph preserves its state');
  await source.selectOption('held:lantern');
  await restored.goto(await page.getByTestId('signal-permalink').getAttribute('href'));
  await restored.getByTestId('signal-graph').waitFor();
  assert.deepEqual(await graphSnapshot(restored), await graphSnapshot(page), 'held strength and hidden underfoot settings round-trip too');
  const malformed = new URL(expectedGraph.link);
  for (const [key, value] of Object.entries({ source: 'impulse:__proto__', receiver: '__proto__', footing: 'lava',
    from: 'missing', to: 'missing', bar: 'missing', seed: '-2', floor: '99', age: '-5', strength: 'Infinity' })) {
    malformed.searchParams.set(key, value);
  }
  await restored.goto(malformed.toString());
  await restored.getByTestId('signal-graph').waitFor();
  const repaired = new URL(await restored.getByTestId('signal-permalink').getAttribute('href'));
  for (const [key, expected] of Object.entries({ source: 'impulse:bombBurst', receiver: 'warden', footing: 'stone',
    from: 'start', to: 'start', bar: '', seed: '1', floor: '3', age: '0', strength: '1' })) {
    assert.equal(repaired.searchParams.get(key), expected, `malformed ${key} falls back to valid graph state`);
  }
  await restored.close();
  if (process.argv.includes("--screenshot")) {
    await source.selectOption("impulse:bombBurst");
    await page.locator('[data-testid="signal-to"]').selectOption(neighbor);
    await page.screenshot({ path: "output/signal-graph.png", fullPage: true });
  }
  assert.deepEqual(errors, [], "signal graph renders without browser errors");
  console.log(`PASS ${count} receiver nodes; live Din agrees on silent, doorway, barred, aged, held and underfoot signals; playable room links; reproducible graph links, reload and invalid-input recovery`);
} finally { await browser.close(); }
