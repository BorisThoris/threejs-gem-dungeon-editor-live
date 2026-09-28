import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run && window.__scene && !window.__run.getState().transitioning);
  const fixture = await page.evaluate(async () => {
    const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
    let worst;
    for (let seed = 1; seed <= 60; seed++) {
      const dungeon = generateRunFloor(seed, 3);
      for (const room of dungeon.rooms.filter(r => r.kind !== "secret")) {
        const reach = Math.max(...dungeon.rooms.map(r => Math.hypot(r.grid.x - room.grid.x, r.grid.z - room.grid.z)));
        if (!worst || reach > worst.reach) worst = { seed, roomId: room.id, reach };
      }
    }
    const run = window.__run;
    run.getState().startRun(worst.seed);
    while (run.getState().floor < 3) {
      run.setState({ currentRoomId: run.getState().dungeon.endId, transitioning: true });
      run.getState().roomReady(run.getState().dungeon.endId);
    }
    run.setState({ currentRoomId: worst.roomId, transitioning: true, wardenRoomId: null,
      reaperAwake: false, harrierAwake: false, thiefPhase: "away", lastDamageAt: Infinity,
      satchel: ["mapping"], identified: ["mapping"], charges: { ...run.getState().charges, mapping: "plain" } });
    return worst;
  });
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.keyboard.press("1");
  await page.waitForFunction(() => window.__run.getState().mapped);
  const fit = await page.getByTestId("minimap").evaluate(map => {
    const svg = map.querySelector("svg"), size = +svg.getAttribute("width");
    const radii = [...map.querySelectorAll('[data-testid="map-room"]')].map(room => {
      const box = room.getBBox(), matrix = room.getCTM();
      return Math.max(...[[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
        .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix))
        .map(p => Math.hypot(p.x - size / 2, p.y - size / 2)));
    });
    return { rooms: radii.length, farthest: Math.max(...radii), safeRadius: size / 2 - 12 };
  });
  console.log({ fixture, fit });
  assert.ok(fit.farthest <= fit.safeRadius, "Mapping keeps the whole known floor inside the visible dial");
  await page.evaluate(() => window.__bus.emit("lookSet", { yaw: Math.PI / 2, pitch: 0 }));
  await page.keyboard.press("Escape");
  await page.getByTestId("pause-menu").waitFor();
  await page.getByTestId("pause-map").focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("floor-map").waitFor();
  const barrierFixture = await page.evaluate(() => {
    const s = window.__run.getState(), edges = [];
    for (const room of s.dungeon.rooms) for (const to of Object.values(room.links)) {
      if (room.id < to && room.kind !== "end" && to !== s.dungeon.endId && to !== s.dungeon.vaultId)
        edges.push([room.id, to].sort().join("|"));
    }
    // Both effects may occupy one edge. Expiring its grate must leave the
    // reusable barricade visible, just as it leaves that doorway blocked.
    window.__run.setState({ barricades: [edges[0]], barredDoor: edges[0], barUntil: window.__derived.clock() + 0.5 });
    return { key: edges[0], grateKey: edges[1] };
  });
  const barriers = testId => page.getByTestId(testId).getByTestId("map-barrier");
  await page.waitForFunction(() => document.querySelector('[data-testid="floor-map"] [data-barrier="barricade"]'));
  assert.equal(await barriers("floor-map").count(), 1, "overlapping grate and barricade share one edge marker");
  assert.equal(await barriers("minimap").getAttribute("data-edge"), barrierFixture.key);
  await page.evaluate(key => window.__run.setState({ barredDoor: key }), barrierFixture.grateKey);
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="floor-map"] [data-testid="map-barrier"]').length === 2);
  await page.waitForTimeout(700);
  for (const map of ["minimap", "floor-map"]) {
    assert.equal(await barriers(map).count(), 2, "paused grate retains its marker alongside the barricade");
    assert.equal(await page.getByTestId(map).locator('[data-barrier="grate"]').getAttribute("data-edge"), barrierFixture.grateKey);
  }
  await page.waitForFunction(() => {
    const player = document.querySelector('[data-testid="floor-map"] [data-testid="map-player"]');
    return Math.abs(player?.parentElement.transform.baseVal.consolidate()?.matrix.b + 1) < .01;
  });
  const orientation = await page.getByTestId("floor-map").evaluate(map => {
    const room = map.querySelector('[data-map-state="here"]'), player = map.querySelector('[data-testid="map-player"]');
    const centre = room.getCTM(), arrow = player.getCTM(), dial = room.parentElement.transform.baseVal.consolidate().matrix;
    return { x: Math.abs(centre.e - arrow.e), y: Math.abs(centre.f - arrow.f), north: dial.a === 1 && dial.b === 0 };
  });
  assert.ok(orientation.north && orientation.x < .001 && orientation.y < .001,
    "the planning map stays north-up while its west-facing arrow stays in the current room");
  const identities = testId => page.getByTestId(testId).locator('[data-testid="map-room"]').evaluateAll(rooms => rooms.map(r => r.dataset.roomId));
  assert.deepEqual(await identities("floor-map"), await identities("minimap"), "both maps show exactly the same known rooms");
  const paused = await page.evaluate(() => ({ clock: window.__derived.clock(), marks: window.__run.getState().marks }));
  await page.keyboard.press("m");
  await page.waitForTimeout(600);
  assert.deepEqual(await page.evaluate(() => ({ clock: window.__derived.clock(), marks: window.__run.getState().marks })), paused,
    "route planning freezes time and does not turn reading keys into actions");
  for (const [name, width, height] of [["desktop", 1280, 800], ["phone", 390, 844], ["landscape", 844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.getByTestId("floor-map").scrollIntoViewIfNeeded();
    const bounds = await page.getByTestId("floor-map").evaluate(map => {
      const box = map.getBoundingClientRect();
      const rooms = [...map.querySelectorAll('[data-testid="map-room"]')].map(r => r.getBoundingClientRect());
      return { left: box.left, right: box.right, width: box.width,
        clipped: rooms.some(r => r.left < box.left || r.right > box.right || r.top < box.top || r.bottom > box.bottom),
        smallest: Math.min(...rooms.map(r => Math.min(r.width, r.height))) };
    });
    assert.ok(bounds.left >= 0 && bounds.right <= width && !bounds.clipped, `${name}: the full map fits its panel and screen`);
    assert.ok(bounds.smallest >= 10, `${name}: room symbols remain readable`);
    if (process.env.MAP_REVIEW === "1" && name !== "landscape") await page.screenshot({ path: `output/verification/floor-map-${name}.png` });
  }
  const fogEdge = await page.evaluate(() => {
    const s = window.__run.getState(), rooms = s.dungeon.rooms;
    const from = rooms.find(room => room.id !== s.currentRoomId && Object.values(room.links).length > 1
      && Object.values(room.links).some(to => to !== s.currentRoomId && Object.values(rooms.find(r => r.id === to).links).length > 1));
    const to = Object.values(from.links).find(id => id !== s.currentRoomId && Object.values(rooms.find(r => r.id === id).links).length > 1);
    window.__run.setState({ mapped: false, visited: rooms.filter(r => r.id !== from.id && r.id !== to).map(r => r.id) });
    return { from: from.id, to };
  });
  await page.waitForFunction(({ from, to }) => {
    const map = document.querySelector('[data-testid="floor-map"]');
    return [from, to].every(id => map.querySelector(`[data-room-id="${id}"]`)?.dataset.mapState === "known");
  }, fogEdge);
  const hasFogEdge = () => page.getByTestId("floor-map").getByTestId("map-passage").evaluateAll((edges, { from, to }) =>
    edges.some(edge => [edge.dataset.from, edge.dataset.to].includes(from) && [edge.dataset.from, edge.dataset.to].includes(to)), fogEdge);
  assert.equal(await hasFogEdge(), false, "two adjacent unvisited rooms do not reveal their connecting doorway");
  await page.evaluate(() => window.__run.setState({ mapped: true }));
  await page.waitForFunction(({ from, to }) => [...document.querySelectorAll('[data-testid="floor-map"] [data-testid="map-passage"]')]
    .some(edge => [edge.dataset.from, edge.dataset.to].includes(from) && [edge.dataset.from, edge.dataset.to].includes(to)), fogEdge);
  assert.equal(await hasFogEdge(), true, "Mapping can reveal that same real doorway");
  await page.evaluate(() => {
    const s = window.__run.getState();
    window.__run.setState({ mapped: false, visited: [s.currentRoomId], marks: [s.currentRoomId], nestSeen: false, nestGems: 0, nestKey: false });
  });
  assert.deepEqual(await identities("floor-map"), await identities("minimap"));
  assert.equal(await page.getByTestId("floor-map").locator('[data-map-state="known"] [data-testid="map-room-footprint"]').count(), 0,
    "the planning map does not expose unexplored room shapes");
  assert.equal(await page.getByTestId("floor-map").getByTestId("map-mark").count(), 1, "the player's own route reminder is retained");
  assert.ok((await identities("floor-map")).length < fit.rooms, "unlearned rooms are omitted rather than merely dimmed");
  const privateEdges = await page.getByTestId("floor-map").getByTestId("map-passage").evaluateAll(edges => {
    const s = window.__run.getState();
    return edges.every(edge => s.visited.includes(edge.dataset.from) || s.visited.includes(edge.dataset.to));
  });
  assert.ok(privateEdges, "knowing two rooms exist does not disclose the door between them");
  await page.evaluate(() => window.__run.setState({ effects: { ...window.__run.getState().effects, gloom: window.__derived.clock() + 20 } }));
  await page.getByTestId("floor-map").getByText("GLOOM", { exact: true }).waitFor();
  assert.equal(await page.getByTestId("floor-map").locator("svg").getAttribute("aria-hidden"), "true", "pause planning respects Gloom");
  await page.evaluate(() => window.__run.setState({ effects: { ...window.__run.getState().effects, gloom: 0 } }));
  await page.getByTestId("floor-map").getByText("GLOOM", { exact: true }).waitFor({ state: "detached" });
  await page.getByTestId("pause-resume").click();
  await page.getByTestId("pause-menu").waitFor({ state: "detached" });
  assert.ok(await page.evaluate(() => !window.__run.getState().paused), "resume returns to the same run");
  await page.waitForFunction(() => window.__run.getState().barredDoor === null);
  await page.evaluate(() => window.__run.setState({ mapped: true }));
  await page.locator('[data-testid="minimap"] [data-barrier="barricade"]').waitFor();
  assert.equal(await barriers("minimap").count(), 1, "grate expiry leaves the independent barricade standing");
  await page.evaluate(() => window.__run.getState().startRun(11));
  await barriers("minimap").waitFor({ state: "detached" });
  assert.deepEqual(errors, []);
  console.log("PASS map coverage, orientation, desktop/phone planning, knowledge privacy, marks, Gloom, pause and resume");
} finally { await browser.close(); }
