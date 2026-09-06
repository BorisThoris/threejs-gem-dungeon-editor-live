import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";

import { doorPosition } from "../dungeon/layout";
import { halfSize, type Room } from "../dungeon/types";
import { barredNow, canControl, runClock, useRun } from "../state/run";
import { barKey } from "../warden/bars";
import { patchAt, steerAround } from "../warden/steer";
import { FLIGHT_HEIGHT, GROUND_Y, HARRIER_MAX_STEP, HARRIER_SPEED, HARRIER_TOUCH_RADIUS } from "../world";
import { BODIES, bitesFor, obstaclesFor } from "./body";
import { harrierAt, harrierEntryFor, harrierRoostFor } from "./harrierRoost";

/**
 * The Harrier, in the room the player is in, while it is awake.
 *
 * A flying body, and this is what "flying" means on the floor: it asks the
 * body table for the tall furniture and steers round only that; it asks
 * for nothing that bites, because nothing does. It comes in at the doorway
 * the one owner names, dives at the player, and a touch is the ordinary
 * damage - then it wheels away through that doorway and is gone a while.
 * A grate across that doorway keeps it out; the room is the player's until
 * the bar lifts.
 *
 * Downed by a blast it lies on the floor, and while it lies there it is a
 * ground body: what bites feet bites it, which is the one way it dies.
 */
export function Harrier({ room }: { room: Room }) {
  const group = useRef<Group>(null);
  const pos = useRef({ x: 0, z: 0, placed: false });
  const dungeon = useRun((s) => s.dungeon);
  const floor = useRun((s) => s.floor);
  const placed = useRun((s) => s.placed);
  const broken = useRun((s) => s.broken);
  const sprung = useRun((s) => s.sprung);
  const seed = dungeon?.seed ?? 0;
  const roost = useMemo(() => (dungeon ? harrierRoostFor(dungeon, floor) : null), [dungeon, floor]);
  const entry = useMemo(() => (dungeon && roost ? harrierEntryFor(dungeon, roost, room.id) : null), [dungeon, roost, room.id]);
  const door = useMemo(() => (entry ? doorPosition(room, entry) : null), [room, entry]);
  const to = entry ? room.links[entry] : undefined;
  const obstacles = useMemo(() => obstaclesFor(BODIES.harrier, room, seed, placed, broken), [room, seed, placed, broken]);
  // What would bite it on the ground: the ground body's list, read only while it is down.
  const bites = useMemo(() => bitesFor("ground", room, seed, placed, sprung), [room, seed, placed, sprung]);

  useEffect(
    () => () => {
      harrierAt.roomId = null;
      harrierAt.down = false;
      harrierAt.away = false;
    },
    []
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const run = useRun.getState();
    const now = runClock(run);
    const cam = state.camera.position;
    const p = pos.current;
    const half = halfSize(room);
    const startX = door ? door[0] * 0.9 : 0;
    const startZ = door ? door[2] * 0.9 : 0;
    if (!p.placed) {
      p.placed = true;
      p.x = startX;
      p.z = startZ;
    }
    const away = now < run.harrierRetreatUntil;
    const down = now < run.harrierDownedUntil;
    const barred = to !== undefined && barredNow(run) === barKey(room.id, to);
    // Wheeling away, or kept out by the grate: at its doorway, unseen.
    const kept = away || barred;
    const t = state.clock.elapsedTime;
    const dx = cam.x - p.x;
    const dz = cam.z - p.z;
    const distance = Math.hypot(dx, dz);

    harrierAt.x = p.x;
    harrierAt.z = p.z;
    harrierAt.roomId = room.id;
    harrierAt.down = down;
    harrierAt.away = kept;
    if (import.meta.env.DEV) {
      const w = window as unknown as { __harrier?: Record<string, unknown> };
      w.__harrier = { x: p.x, z: p.z, room: room.id, roost, via: entry, distance, down, away, barred };
    }

    g.visible = !kept;
    if (kept) {
      p.x = startX;
      p.z = startZ;
      return;
    }
    if (!canControl(run)) return;

    if (down) {
      // On the floor, twitching. The floor decides what happens to it here.
      g.position.set(p.x, GROUND_Y + 0.22 + Math.abs(Math.sin(t * 9)) * 0.04, p.z);
      g.rotation.z = Math.PI / 2 + Math.sin(t * 9) * 0.1;
      if (patchAt(bites, p.x, p.z)) run.slayHarrier();
      return;
    }
    g.rotation.z = 0;
    g.rotation.y = Math.atan2(dx, dz);
    if (distance <= HARRIER_TOUCH_RADIUS) {
      run.harrierStrike();
      return;
    }
    const step = Math.min(HARRIER_SPEED * delta, HARRIER_MAX_STEP, Math.max(0, distance - HARRIER_TOUCH_RADIUS * 0.5));
    const heading = obstacles.length
      ? steerAround(p.x, p.z, cam.x, cam.z, obstacles, 0)
      : { dx: dx / distance, dz: dz / distance };
    const limit = half - 0.5;
    p.x = Math.max(-limit, Math.min(limit, p.x + heading.dx * step));
    p.z = Math.max(-limit, Math.min(limit, p.z + heading.dz * step));
    // It dives as it closes: at height across the room, at head height on you.
    const dive = Math.max(0, Math.min(1, 1 - distance / 4));
    const y = FLIGHT_HEIGHT - (FLIGHT_HEIGHT - 1.4) * dive + Math.sin(t * 6) * 0.12;
    g.position.set(p.x, y, p.z);
    const wings = g.children;
    for (let i = 1; i < wings.length && i <= 2; i++) wings[i].rotation.z = (i === 1 ? 1 : -1) * Math.sin(t * 14) * 0.7;
  });

  return (
    <group ref={group}>
      {/* A body the colour of the dark, two wings that beat, two eyes. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 0.7, 6]} />
        <meshStandardMaterial color="#17131c" roughness={1} />
      </mesh>
      <mesh position={[0.45, 0, 0]}>
        <planeGeometry args={[0.9, 0.35]} />
        <meshStandardMaterial color="#221c2a" roughness={1} side={2} />
      </mesh>
      <mesh position={[-0.45, 0, 0]}>
        <planeGeometry args={[0.9, 0.35]} />
        <meshStandardMaterial color="#221c2a" roughness={1} side={2} />
      </mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.06, 0.3]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshBasicMaterial color="#ff6a3a" />
        </mesh>
      ))}
    </group>
  );
}
