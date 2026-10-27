import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const scratch = process.platform === "win32" ? "D:/agent-work/gem-dungeon/equipment-check" : join(tmpdir(), "gem-equipment");
mkdirSync(scratch, { recursive: true });
const bundle = join(scratch, `equipment-${process.pid}.mjs`);
await build({ stdin: { contents: `import './src/game/rooms/shipped';
  export * from './src/game/items/weapons';
  export * from './src/game/items/inventory';
  export * from './src/game/player/combat';
  export * from './src/game/player/where';
  export * from './src/game/warden/position';
  export * from './src/game/dungeon/runFloor';
  export { useRun, tollNow } from './src/game/state/run';`, resolveDir: process.cwd() },
  define: { "import.meta.env.DEV": "false", "import.meta.env": "{}" },
  bundle: true, platform: "node", format: "esm", outfile: bundle });
try {
  const L = await import(pathToFileURL(bundle));
  const run = L.useRun, initial = run.getState();
  const dungeon = L.generateRunFloor(1, 1);
  const shop = dungeon.rooms.find(r => r.kind === "shop");
  assert.ok(shop);
  run.setState({ phase: "playing", paused: true, transitioning: false, inputLocks: 0,
    dungeon, currentRoomId: shop.id, floor: 1, gems: 30, weapons: ["fists", "sword"], equippedWeapon: "sword" });
  assert.equal(run.getState().buyWeapon("spear"), true);
  assert.equal(run.getState().gems, 26);
  assert.equal(run.getState().equippedWeapon, "spear");
  assert.equal(run.getState().buyWeapon("spear"), false);
  assert.equal(run.getState().gems, 26, "repeat purchase cannot spend twice");
  for (const state of [{ paused: false }, { transitioning: true }, { inputLocks: 1 }, { phase: "dead" }, { currentRoomId: dungeon.startId }]) {
    const before = run.getState(); run.setState(state);
    assert.equal(run.getState().buyWeapon("axe"), false, JSON.stringify(state));
    assert.equal(run.getState().gems, 26);
    run.setState(before, true);
  }
  run.setState({ gems: L.tollNow(run.getState()) + 4 });
  assert.equal(run.getState().buyWeapon("axe"), false, "gear cannot spend reserved passage money");
  assert.equal(run.getState().equipWeapon("axe"), false, "unowned equipment cannot be equipped");
  assert.equal(run.getState().equipWeapon("fists"), true);
  assert.equal(L.inShoveArc(0, 4, 0, 1, 4.2, 22), true, "spear reaches a target beyond sword range");
  assert.equal(L.inShoveArc(0, 4, 0, 1, 2.8, 50), false);
  assert.equal(L.inShoveArc(1, 1, 0, 1, 4.2, 22), false, "spear thrust cannot sweep sideways");
  assert.equal(L.inShoveArc(1, 1, 0, 1, 2.5, 65), true);
  for (const id of L.WEAPON_IDS) {
    const weapon = L.WEAPONS[id];
    assert.equal(L.shoveStatusAt({ equippedWeapon: id, shoveReadyAt: 0, shoveChargingAt: 0 }, weapon.charge / 2).charge, 50);
  }
  // The actual store attack, including damage, cooldown, misses and death.
  const room = dungeon.rooms.find(r => r.id === dungeon.startId);
  Object.assign(L.playerAt, { x: 0, z: 0 });
  Object.assign(L.wardenAt, { x: 0, z: 1, roomId: room.id });
  run.setState({ currentRoomId: room.id, paused: false, equippedWeapon: "sword", shoveReadyAt: 0,
    wardenRoomId: room.id, enemyHealth: { warden: 12, harrier: 6 }, harrierAwake: false, thiefPhase: "away" });
  assert.equal(run.getState().shove(0, 1), true);
  assert.equal(run.getState().enemyHealth.warden, 10, "sword deals its two points through the real attack");
  assert.equal(run.getState().shove(0, 1), false, "recovery prevents repeated damage");
  run.setState({ shoveReadyAt: 0 });
  run.getState().shove(0, -1);
  assert.equal(run.getState().enemyHealth.warden, 10, "facing away misses");
  run.setState({ equippedWeapon: "axe" });
  for (let i = 0; i < 3; i++) { run.setState({ shoveReadyAt: 0 }); run.getState().shove(0, 1); }
  assert.equal(run.getState().enemyHealth.warden, 0);
  assert.equal(run.getState().wardenRoomId, null, "a slain Warden leaves the floor");
  run.setState({ transitioning: true, floorRooms: 100 });
  run.getState().roomReady(room.id);
  assert.equal(run.getState().wardenRoomId, null, "room entry cannot resurrect the slain Warden");
  assert.equal(L.clearShove(room, { x: 0, z: 0 }, { x: room.size * 2, z: 0 }, []), false,
    "the real geometry owner rejects an attack through the room boundary");
  run.setState(initial, true);
  console.log("PASS equipment: guarded purchases, passage reserve, ownership, weapon reach/arc/timing, real damage, misses, recovery and death");
} finally { unlinkSync(bundle); }
