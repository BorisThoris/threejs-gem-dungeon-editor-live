import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
const scratch = process.platform === "win32" ? "D:/agent-work/gem-dungeon/progression-check" : join(tmpdir(), "gem-progression");
mkdirSync(scratch, { recursive: true });
const file = join(scratch, `progression-${process.pid}.mjs`);
await build({ stdin: { contents: `import './src/game/rooms/shipped';
  export * from './src/game/progression';
  export * from './src/game/player/where';
  export { useRun, runClock } from './src/game/state/run';`, resolveDir: process.cwd() },
  define: { "import.meta.env.DEV": "false", "import.meta.env": "{}" }, bundle: true, platform: "node", format: "esm", outfile: file });
try {
  globalThis.window = { setTimeout: () => 1, clearTimeout() {} };
  const L = await import(pathToFileURL(file)), run = L.useRun;
  assert.notEqual(L.expeditionSeed(315740088, 1), 315740088, "the LCG fixed point still gets a fresh dungeon");
  run.getState().startRun(11, "vagrant");
  const ready = () => run.getState().roomReady(run.getState().currentRoomId);
  ready();
  assert.equal(run.getState().continueExpedition(), false, "cannot skip the dungeon from play");
  assert.equal(run.getState().beginBoss(), false);
  run.setState({ satchel: ["healing", "bomb", "mire", "mapping", "snare"], weapons: ["fists", "sword", "axe"],
    equippedWeapon: "axe", identified: ["healing", "bomb"], relics: ["hood"], gems: 13, lives: 2, maxLives: 3, oil: 42 });
  const carried = () => {
    const s = run.getState();
    return Object.fromEntries(["satchel", "weapons", "equippedWeapon", "identified", "relics", "gems", "lives", "maxLives", "oil", "charges", "appearances"].map(k => [k, s[k]]));
  };
  const gear = structuredClone(carried());
  const crossroads = () => {
    run.setState({ floor: 3, currentRoomId: run.getState().dungeon.endId, transitioning: true });
    ready();
    assert.equal(run.getState().phase, "crossroads");
    assert.equal(run.getState().paused, true);
  };
  for (let cycle = 1; cycle <= 3; cycle++) {
    crossroads();
    const seed = run.getState().runSeed;
    assert.equal(run.getState().continueExpedition(), true);
    assert.equal(run.getState().newGamePlus, cycle);
    assert.equal(run.getState().floor, 1);
    assert.notEqual(run.getState().runSeed, seed);
    assert.deepEqual(carried(), gear, "all promised carried state survives without healing or reshuffling");
    assert.deepEqual(run.getState().enemyHealth, { warden: 12 * 2 ** cycle, harrier: 6 * 2 ** cycle });
    ready();
    run.setState({ lives: 100, lastDamageAt: -Infinity });
    run.getState().damage("warden");
    assert.equal(run.getState().lives, 100 - 2 ** cycle, "actual incoming damage scales exponentially");
    run.setState({ lives: gear.lives });
  }
  run.getState().startRun(11);
  ready();
  assert.equal(run.getState().newGamePlus, 0, "fresh run resets the cycle");
  crossroads();
  assert.equal(run.getState().beginBoss(), true);
  ready();
  assert.equal(run.getState().currentRoomId, L.BOSS_ROOM_ID);
  assert.equal(run.getState().bossHealth, 24);
  Object.assign(L.playerAt, { x: 0, z: 6 });
  const beatAt = elapsed => run.setState({ bossStartedAt: L.runClock(run.getState()) - elapsed, lastDamageAt: -Infinity });
  beatAt(1.5); run.getState().tickBoss();
  assert.equal(run.getState().lives, 3, "outside the inner strike is safe");
  beatAt(5.5); run.getState().tickBoss();
  assert.equal(run.getState().lives, 2, "outer strike reaches the outer floor");
  run.getState().tickBoss();
  assert.equal(run.getState().lives, 2, "one hit at most per beat");
  Object.assign(L.playerAt, { x: 0, z: 2 });
  run.setState({ paused: true }); beatAt(9.5); run.getState().tickBoss();
  assert.equal(run.getState().lives, 2, "pause freezes boss attacks");
  run.setState({ paused: false });
  const gems = run.getState().gems;
  for (let hit = 0; hit < 12; hit++) {
    run.setState({ shoveReadyAt: 0 });
    assert.equal(run.getState().shove(0, -1), true);
    assert.equal(run.getState().bossHealth, 24 - (hit + 1) * 2, "real melee wounds the boss");
  }
  assert.equal(run.getState().phase, "won");
  assert.equal(run.getState().gems, gems + L.BOSS_REWARD);
  assert.equal(run.getState().woundBoss(100), false, "victory cannot pay twice");
  assert.equal(run.getState().continueExpedition(), true, "boss victory also permits continued play");
  ready();
  run.setState({ lastDamageAt: -Infinity });
  run.getState().damage("keeper");
  assert.equal(run.getState().phase, "lost", "lethal scaled damage ends the carried expedition");
  assert.equal(run.getState().continueExpedition(), false, "death cannot restore carried equipment through NG+");
  assert.equal(L.bossZoneHits(0, 2, false), true);
  assert.equal(L.bossZoneHits(0, 2, true), false);
  assert.equal(L.bossZoneHits(0, 6, true), true);
  assert.ok(Number.isFinite(L.expeditionPower(1e9)), "defensive numeric ceiling never produces infinity");
  console.log("PASS progression: guarded crossroads, three NG+ cycles, full carryover, new seeds, real exponential health/damage, boss timing/zones/pause/melee/victory and one-time reward");
} finally { unlinkSync(file); }
