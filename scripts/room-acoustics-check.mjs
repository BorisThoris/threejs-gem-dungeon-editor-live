import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
  args: ["--autoplay-policy=no-user-gesture-required"] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5173}/`);
  const measured = await page.evaluate(async () => {
    const { acousticsFor, createRoomReflections } = await import("/src/game/systems/roomAcoustics.ts");
    const room = { id: "acoustic", seed: 4, kind: "normal", size: 20, shape: "square", grid: { x: 0, z: 0 }, links: {}, biome: "hewn" };
    const small = acousticsFor(room), large = acousticsFor({ ...room, size: 36 });
    const soft = acousticsFor({ ...room, biome: "mossy" });
    const wax = acousticsFor({ ...room, biome: "tallow" });
    const circle = acousticsFor({ ...room, shape: "circle" });
    const gallery = acousticsFor({ ...room, district: "works", wings: { north: 10 }, wingWidths: { north: 10 } });
    const paired = acousticsFor({ ...room, district: "tombs", secret: { dir: "north", to: "sealed" },
      wings: { east: 10, west: 10 }, wingWidths: { east: 10, west: 10 } });
    const opened = acousticsFor({ ...room, district: "tombs", secret: { dir: "north", to: "sealed" },
      links: { north: "sealed" }, wings: { east: 10, west: 10 }, wingWidths: { east: 10, west: 10 } });
    const rooted = acousticsFor({ ...room, district: "gardens", wings: { north: 10 }, wingWidths: { north: 10 } });
    async function impulse(profile) {
      const ctx = new OfflineAudioContext(1, 44100, 44100);
      let nodes = 0;
      for (const name of ["createGain", "createDelay", "createBiquadFilter"]) {
        const original = ctx[name].bind(ctx);
        ctx[name] = (...args) => { nodes++; return original(...args); };
      }
      const reflections = createRoomReflections(ctx, ctx.destination);
      const built = nodes;
      for (let i = 0; i < 10000; i++) reflections.configure(i % 2 ? profile : null);
      reflections.configure(profile);
      const input = ctx.createBuffer(1, 1, 44100);
      input.getChannelData(0)[0] = 1;
      const source = ctx.createBufferSource(); source.buffer = input;
      source.connect(reflections.input); source.start();
      const data = (await ctx.startRendering()).getChannelData(0);
      let energy = 0, tail = 0, first = -1;
      for (let i = 0; i < data.length; i++) {
        energy += data[i] ** 2;
        if (i > 22050) tail += data[i] ** 2;
        if (first < 0 && Math.abs(data[i]) > 1e-7) first = i / 44100;
      }
      return { first, energy, tail, built, nodes };
    }
    return { small, large, soft, wax, circle, gallery, paired, opened, rooted,
      stoneSound: await impulse(small), largeSound: await impulse(large), softSound: await impulse(soft), muted: await impulse(null) };
  });
  assert.ok(measured.large.delay > measured.small.delay);
  assert.ok(measured.circle.delay < measured.small.delay);
  assert.ok(measured.gallery.delay > measured.small.delay);
  assert.ok(measured.paired.delay > measured.gallery.delay);
  assert.ok(measured.paired.gain > measured.gallery.gain);
  assert.ok(measured.paired.delay > measured.opened.delay);
  assert.ok(measured.paired.gain > measured.opened.gain);
  assert.ok(measured.rooted.gain < measured.gallery.gain);
  assert.ok(measured.rooted.cutoff < measured.paired.cutoff);
  assert.ok(measured.wax.gain < measured.small.gain && measured.wax.gain > measured.soft.gain);
  assert.ok(measured.wax.cutoff < measured.small.cutoff && measured.wax.cutoff > measured.soft.cutoff);
  assert.ok(measured.softSound.energy < measured.stoneSound.energy * .2);
  assert.ok(Math.abs(measured.stoneSound.first - measured.small.delay) < .002);
  assert.ok(measured.largeSound.first > measured.stoneSound.first + .04);
  assert.ok(measured.stoneSound.tail < 1e-12);
  assert.equal(measured.muted.energy, 0);
  assert.equal(measured.stoneSound.nodes, measured.stoneSound.built);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const lifecycle = await page.evaluate(async () => {
    const { ambience } = await import("/src/game/systems/audio.ts");
    const { acousticsFor } = await import("/src/game/systems/roomAcoustics.ts");
    const settle = () => new Promise(resolve => setTimeout(resolve, 100));
    await settle();
    const s = window.__run.getState(), r = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
    const expected = JSON.stringify(acousticsFor(r));
    const entered = JSON.stringify(ambience.roomAcoustics()) === expected;
    window.__run.setState({ paused: true }); await settle();
    const paused = ambience.roomAcoustics() === null;
    window.__run.setState({ paused: false }); await settle();
    const resumed = JSON.stringify(ambience.roomAcoustics()) === expected;
    window.__run.setState({ phase: "menu" }); await settle();
    return { entered, paused, resumed, ended: ambience.roomAcoustics() === null };
  });
  assert.ok(lifecycle.entered && lifecycle.paused && lifecycle.resumed && lifecycle.ended);
  assert.deepEqual(errors, []);
  console.log("PASS footprint acoustics, absorption, bounded tails, stable nodes and pause lifecycle", measured, lifecycle);
} finally { await browser.close(); }
