import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const port = process.argv[2] || process.env.PORT || "5199";
const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const assertMountedReach = async (kind, scale, rotation) => {
    const measured = await page.evaluate(async ({ kind, scale, rotation }) => {
      const { propColliderAxisExtents } = await import("/src/game/props/specs.ts");
      const world = window.__hallPhysicsWorld;
      let at;
      world.colliders.forEach((collider) => { at = collider.translation(); });
      const measure = (axis) => {
        let furthest = 0;
        for (let offset = -2.4; offset <= 2.4; offset += 0.01) {
          const ray = { origin: { x: at.x + (axis === "x" ? -2.4 : offset), y: at.y,
            z: at.z + (axis === "z" ? -2.4 : offset) },
            dir: { x: axis === "x" ? 1 : 0, y: 0, z: axis === "z" ? 1 : 0 } };
          const hit = world.castRay(ray, 4.8, true);
          if (hit) furthest = Math.max(furthest, 2.4 - hit.timeOfImpact);
        }
        return furthest;
      };
      return { actual: { x: measure("x"), z: measure("z") },
        expected: propColliderAxisExtents({ kind, x: at.x, z: at.z, scale, rotation }) };
    }, { kind, scale, rotation });
    assert.ok(["x", "z"].every((axis) => Math.abs(measured.actual[axis] - measured.expected[axis]) < 0.03),
      `${kind} catalog extents match the mounted Rapier body: ${JSON.stringify(measured)}`);
  };
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${port}/?editor`);
  await page.getByRole("button", { name: "PROPS", exact: true }).click();
  await page.locator('[data-testid="inspector-scale"]').fill("1.5");
  assert.match(await page.locator('[data-testid="inspector-placement"]').inputValue(), /scale: 1\.50/, "copyable placement keeps the selected scale");
  for (const kind of ["torch", "spikes"]) {
    await page.locator(`[data-testid="inspector-prop-${kind}"]`).click();
    assert.equal(await page.locator('[data-testid="inspector-scale"]').count(), 0, `${kind} inspector hides unsupported scale`);
    assert.match(await page.locator('[data-testid="inspector-placement"]').inputValue(), new RegExp(`kind: "${kind}"`));
  }
  await page.getByRole("button", { name: "TEST HALL" }).click();
  await page.locator("canvas").waitFor();
  const kinds = await page.evaluate(async () => (await import("/src/game/dungeon/types.ts")).PROP_KINDS);
  assert.equal(await page.locator('[data-testid^="hall-station-"]').count(), kinds.length, "one station for every catalog kind");
  const colliderKinds = await page.evaluate(async () => {
    const { PROP_SPECS } = await import("/src/game/props/specs.ts");
    return Object.keys(PROP_SPECS).filter((kind) => Boolean(PROP_SPECS[kind].collider));
  });
  await page.locator('[data-testid="hall-footprints"]').check();
  await page.locator('[data-testid="hall-colliders"]').check();
  await page.waitForFunction(({ propCount, colliderCount }) => {
    let footprints = 0;
    let colliders = 0;
    window.__hallScene?.traverse((object) => {
      if (object.name === "hall-footprint") footprints++;
      if (object.name === "hall-collider") colliders++;
    });
    return footprints === propCount && colliders === colliderCount;
  }, { propCount: kinds.length, colliderCount: colliderKinds.length });
  await page.waitForFunction((count) => window.__hallPhysicsWorld?.colliders.len() === count, colliderKinds.length);
  const allCollidersMatch = await page.evaluate(async () => {
    const { PROP_SPECS } = await import("/src/game/props/specs.ts");
    const outlines = [];
    window.__hallScene.traverse((object) => {
      if (object.name === "hall-collider-group") outlines.push(object);
    });
    const live = [];
    window.__hallPhysicsWorld.colliders.forEach((collider) => live.push(collider));
    return outlines.every((outline) => {
      const spec = PROP_SPECS[outline.userData.kind].collider;
      const collider = live.find((candidate) => {
        const at = candidate.translation();
        return Math.abs(at.x - outline.position.x) < 0.001 && Math.abs(at.z - outline.position.z) < 0.001;
      });
      if (!collider || Math.abs(collider.translation().y - spec.y) > 0.001) return false;
      if (spec.shape === "cuboid") {
        const half = collider.halfExtents();
        return Boolean(half) && spec.args.every((value, i) => Math.abs(value - [half.x, half.y, half.z][i]) < 0.001);
      }
      return Math.abs(collider.halfHeight() - spec.args[0]) < 0.001
        && Math.abs(collider.radius() - spec.args[1]) < 0.001;
    });
  });
  assert.ok(allCollidersMatch, "every live Rapier collider matches its station's catalog shape and position");
  await page.locator('[data-testid="hall-sweep"]').click();
  await page.waitForFunction((count) => document.querySelectorAll('[data-testid^="hall-sweep-"][data-pass="true"]').length === count * 2, kinds.length);
  await page.waitForFunction((count) => document.querySelectorAll('[data-testid^="hall-body-"][data-pass="true"]').length === count * 2, kinds.length);
  await page.waitForFunction((count) => document.querySelectorAll('[data-testid^="hall-clearance-"][data-pass="true"]').length === count * 2, kinds.length);
  assert.match(await page.locator('[data-testid="hall-sweep-results"]').innerText(), new RegExp(`${kinds.length * 6}/${kinds.length * 6} lanes`),
    "every station blocks or clears the real player body along its intended lanes");
  for (const [index, kind] of kinds.entries()) {
    await page.locator(`[data-testid="hall-station-${kind}"]`).click();
    assert.ok(await page.locator('[data-testid="hall-selection"]').isVisible(), `${kind} can be inspected`);
    await page.locator("canvas").waitFor();
    if (index === 0) {
      await page.waitForTimeout(500);
      assert.equal(await page.locator('[data-testid="hall-sweep-results"]').count(), 0,
        "changing stations clears the old sweep request until the author runs it again");
    }
  }
  for (const kind of ["torch", "spikes"]) {
    await page.locator(`[data-testid="hall-station-${kind}"]`).click();
    assert.equal(await page.locator('[data-testid="hall-scale"]').count(), 0, `${kind} does not offer a scale it ignores`);
    assert.match(await page.locator('[data-testid="hall-selection"]').innerText(), /Fixed-size gameplay effect/);
  }
  await page.locator('[data-testid="hall-station-crate"]').click();
  assert.match(await page.locator('[data-testid="hall-physical-reach"]').innerText(), /Furthest collider corner 0\.59 m/,
    "the hall distinguishes the crate's physical corner from its 0.45 m placement guide");
  await page.locator('[data-testid="hall-station-chest"]').click();
  const chestSpec = await page.evaluate(async () => (await import("/src/game/props/specs.ts")).PROP_SPECS.chest.collider);
  await page.locator('[data-testid="hall-scale"]').fill("1.25");
  await page.locator('[data-testid="hall-rotation"]').fill("90");
  await page.waitForFunction(() => {
    const groups = [];
    let footprints = 0;
    window.__hallScene?.traverse((object) => {
      if (object.name === "hall-collider-group") groups.push(object);
      if (object.name === "hall-footprint") footprints++;
    });
    return footprints === 1 && groups.length === 1
      && Math.abs(groups[0].scale.x - 1.25) < 0.001
      && Math.abs(groups[0].rotation.y - Math.PI / 2) < 0.001;
  });
  await page.waitForFunction((spec) => {
    const world = window.__hallPhysicsWorld;
    if (!world || world.colliders.len() !== 1) return false;
    let matching = false;
    world.colliders.forEach((collider) => {
      const half = collider.halfExtents();
      const turn = collider.rotation();
      matching = Boolean(half)
        && Math.abs(half.x - spec.args[0] * 1.25) < 0.001
        && Math.abs(half.y - spec.args[1] * 1.25) < 0.001
        && Math.abs(half.z - spec.args[2] * 1.25) < 0.001
        && Math.abs(Math.abs(turn.y) - Math.SQRT1_2) < 0.001;
    });
    return matching;
  }, chestSpec).catch(async (error) => {
    console.error("Hall physics diagnostic", await page.evaluate(() => {
      const colliders = [];
      window.__hallPhysicsWorld?.colliders.forEach((collider) => colliders.push({
        half: collider.halfExtents(), turn: collider.rotation(), at: collider.translation(),
      }));
      return colliders;
    }));
    throw error;
  });
  await assertMountedReach("chest", 1.25, Math.PI / 2);
  await page.locator('[data-testid="hall-sweep"]').click();
  await page.waitForFunction(() => ["x", "z"].every((axis) =>
    document.querySelector(`[data-testid="hall-sweep-chest-${axis}"]`)?.getAttribute("data-pass") === "true"
    && document.querySelector(`[data-testid="hall-body-chest-${axis}"]`)?.getAttribute("data-pass") === "true"
    && document.querySelector(`[data-testid="hall-clearance-chest-${axis}"]`)?.getAttribute("data-pass") === "true"));
  for (const mode of ["player", "clearance"]) {
    await page.getByTestId(`hall-${mode === "player" ? "body" : "clearance"}-chest-x`).click();
    await page.waitForFunction(mode => window.__hallScene.getObjectByName("hall-sweep-view")?.userData.mode === mode, mode);
    const trace = await page.evaluate(async () => {
      const view = window.__hallScene.getObjectByName("hall-sweep-view");
      const marker = view.getObjectByName("hall-sweep-contact");
      const { PLAYER_CAPSULE_RADIUS, PLAYER_CAPSULE_HALF_HEIGHT } = await import("/src/game/world.ts");
      return { query: view.userData, contact: marker.position.toArray(), shape: marker.geometry.parameters,
        radius: PLAYER_CAPSULE_RADIUS, length: PLAYER_CAPSULE_HALF_HEIGHT * 2 };
    });
    assert.equal(trace.shape.radius, trace.radius, "contact ghost uses the game's capsule radius");
    assert.equal(trace.shape.height, trace.length, "contact ghost uses the game's capsule height");
    assert.deepEqual(trace.contact, trace.query.origin.map((value, axis) =>
      value + trace.query.direction[axis] * (trace.query.distance ?? trace.query.length)),
    "contact ghost is placed at the measured query result");
    assert.equal(trace.query.distance === null, mode === "clearance", "centre lane contacts; side lane reaches its end");
  }
  await page.getByTestId("hall-body-chest-x").click();
  if (process.env.HALL_SCREENSHOT) await page.screenshot({ path: "output/world-review/hall-sweep.png" });
  await page.locator('[data-testid="hall-chest-open"]').check();
  await page.waitForFunction(() => {
    let openLid = false;
    window.__hallScene?.traverse((object) => {
      if (object.userData.lid && Math.abs(object.rotation.x + 1.15) < 0.001) openLid = true;
    });
    return openLid;
  });
  await page.locator('[data-testid="hall-station-wall"]').click();
  await page.waitForFunction(() => !window.__hallScene.getObjectByName("hall-sweep-view"));
  await page.locator('[data-testid="hall-scale"]').fill("1.5");
  await page.locator('[data-testid="hall-rotation"]').fill("45");
  await page.waitForFunction(() => {
    const world = window.__hallPhysicsWorld;
    if (!world || world.colliders.len() !== 1) return false;
    let ready = false;
    world.colliders.forEach((collider) => {
      ready = Math.abs(Math.abs(collider.rotation().y) - Math.sin(Math.PI / 8)) < 0.001
        && Math.abs(collider.halfExtents().x - 2.25) < 0.001;
    });
    return ready;
  });
  await assertMountedReach("wall", 1.5, Math.PI / 4);
  await page.locator('[data-testid="hall-sweep"]').click();
  await page.waitForFunction(() => ["x", "z"].every((axis) =>
    document.querySelector(`[data-testid="hall-sweep-wall-${axis}"]`)?.getAttribute("data-pass") === "true"
    && document.querySelector(`[data-testid="hall-body-wall-${axis}"]`)?.getAttribute("data-pass") === "true"
    && document.querySelector(`[data-testid="hall-clearance-wall-${axis}"]`)?.getAttribute("data-pass") === "true"));
  if (process.argv.includes("--screenshot")) {
    await page.locator('[data-testid="hall-selection"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: "output/test-hall.png", fullPage: true });
  }
  await page.getByRole("button", { name: "WORLD", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Run seed" }).fill("72");
  await page.getByRole("combobox", { name: "World depth" }).selectOption("3");
  const atlasReplay = await page.evaluate(async () => {
    const { generateRunFloor, runFloorSeed } = await import("/src/game/dungeon/runFloor.ts");
    const dungeon = generateRunFloor(72, 3);
    return { seed: runFloorSeed(72, 3), ids: dungeon.rooms.map(room => room.id) };
  });
  assert.match(await page.locator('[data-testid="atlas-floor-seed"]').innerText(), new RegExp(String(atlasReplay.seed)));
  assert.deepEqual(await page.locator('[data-testid="atlas-room"]').evaluateAll(nodes => nodes.map(node => node.getAttribute("data-room-id"))),
    atlasReplay.ids, "atlas previews the real third-floor room graph for the run seed");
  await page.getByRole("button", { name: "Route from start" }).click();
  assert.equal(await page.getByRole("button", { name: "Route from start" }).getAttribute("aria-pressed"), "true", "route toggle announces its active state");
  for (const [index, key] of [[1, 'Space'], [2, 'Enter']]) {
    const node = page.getByTestId('atlas-room').nth(index);
    await node.focus();
    const scrolling = () => node.evaluate(element => {
      const positions = [];
      for (let parent = element.parentElement; parent; parent = parent.parentElement) positions.push(parent.scrollTop);
      return positions;
    });
    const beforeScroll = await scrolling();
    await page.keyboard.press(key);
    await page.waitForTimeout(300);
    assert.deepEqual(await scrolling(), beforeScroll, `${key} selects without scrolling the atlas`);
    assert.equal(await node.getAttribute('aria-pressed'), 'true', `${key} announces the selected room`);
    assert.equal(await page.locator('[data-testid="atlas-room"][aria-pressed="true"]').count(), 1, 'exactly one room is selected');
    const link = new URL(await page.getByTestId('atlas-play-room').getAttribute('href'));
    assert.equal(link.searchParams.get('room'), await node.getAttribute('data-room-id'), 'keyboard selection updates the playable scenario');
  }
  assert.ok(await page.locator('[data-testid="atlas-route-edge"]').count() > 0, "atlas graph draws a route to the selected room");
  assert.match(await page.locator('[data-testid="atlas-route-length"]').innerText(), /\d+ doors from start/, "atlas names the route length");
  assert.deepEqual(errors, [], "the hall renders every kind without browser errors");
  console.log(`PASS  ${kinds.length} prop stations, ${kinds.length * 6} ray/player/clearance lanes, rotated Rapier extents, ${colliderKinds.length} live colliders and outlines, prop variants and atlas route graph`);
} finally {
  await browser.close();
}
