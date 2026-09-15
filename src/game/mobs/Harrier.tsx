import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";

import { encounterArrival } from "../dungeon/arrival";
import { keyFor } from "../rooms/kinds";
import { sentryFor } from "../sentry/placement";
import { bus } from "../events";
import { roomSegmentClear, roomStep } from "../dungeon/footprint";
import { HARRIER_ENTRY_GRACE_S, HARRIER_WINDUP_REACH, HARRIER_WINDUP_S } from "../player/combat";
import { type Room } from "../dungeon/types";
import { barredNow, canControl, runClock, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { barKey } from "../warden/bars";
import { patchAt, steerInRoom } from "../warden/steer";
import { FLIGHT_HEIGHT, HARRIER_MAX_STEP, HARRIER_SPEED, HARRIER_TOUCH_RADIUS } from "../world";
import { floorRiseAt, floorHeightAt } from "../worldbuilding/elevation";
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
  /** How near it is to a strike, nought to one: the dive it is already flying. */
  const tell = useRef(0);
  const pos = useRef({ x: 0, z: 0, placed: false });
  const arrivedAt = useRef<number | null>(null);
  const windingAt = useRef<number | null>(null);
  /** Whether it was wheeling away last frame, so the frame it starts to is heard once. */
  const wasAway = useRef(false);
  const dungeon = useRun((s) => s.dungeon);
  const floor = useRun((s) => s.floor);
  const placed = useRun((s) => s.placed);
  const broken = useRun((s) => s.broken);
  const sprung = useRun((s) => s.sprung);
  const seed = dungeon?.seed ?? 0;
  const roost = useMemo(() => (dungeon ? harrierRoostFor(dungeon, floor) : null), [dungeon, floor]);
  const entry = useMemo(() => (dungeon && roost ? harrierEntryFor(dungeon, roost, room.id) : null), [dungeon, roost, room.id]);
  const to = entry ? room.links[entry] : undefined;
  const obstacles = useMemo(() => {
    const key = dungeon?.keyRoomId === room.id ? keyFor(room, seed) : null;
    const watcher = sentryFor(room, seed, floor, key ? [key] : []);
    return obstaclesFor(BODIES.harrier, room, seed, placed, broken, watcher?.at ?? null);
  }, [room, seed, placed, broken, dungeon?.keyRoomId, floor]);
  // What would bite it on the ground: the ground body's list, read only while it is down.
  const bites = useMemo(() => bitesFor("ground", room, seed, placed, sprung), [room, seed, placed, sprung]);

  useEffect(
    () => () => {
      harrierAt.roomId = null;
      harrierAt.down = false;
      harrierAt.away = false;
      sfx.wingbeatStop();
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
    const away = now < run.harrierRetreatUntil;
    const down = now < run.harrierDownedUntil;
    const barred = to !== undefined && barredNow(run) === barKey(room.id, to);
    // Wheeling away, or kept out by the grate: unseen until it returns.
    const kept = away || barred;
    if (!p.placed && !kept && canControl(run)) {
      const start = encounterArrival(room, entry, cam, obstacles, 0.5);
      p.placed = true;
      p.x = start.x;
      p.z = start.z;
    }
    const t = state.clock.elapsedTime;
    const dx = cam.x - p.x;
    const dz = cam.z - p.z;
    const distance = Math.hypot(dx, dz);

    // Where it is, written at the end of the frame - after the step - so
    // what a check reads is where it will be downed, not where it was a
    // stride ago.
    const report = () => {
      harrierAt.x = p.x;
      harrierAt.z = p.z;
      harrierAt.roomId = room.id;
      harrierAt.down = down;
      harrierAt.away = kept;
      if (import.meta.env.DEV) {
        const w = window as unknown as { __harrier?: Record<string, unknown> };
        w.__harrier = { x: p.x, z: p.z, room: room.id, roost, via: entry, distance: Math.hypot(cam.x - p.x, cam.z - p.z), down, away, barred, tell: tell.current };
      }
    };

    g.visible = !kept;
    /**
     * Its wings, while it is in the air in this room.
     *
     * A flying thing that comes for you wherever you are, and until now
     * the only sounds it made were borrowed one-shots at the moments it
     * woke, hit, fell and died. Between those it crossed the room and
     * dived at the back of your head in silence. The beat quickens with
     * the dive, so this is the tell for a player facing the wrong way.
     */
    const side = sideOf(-dx, -dz);
    if (away && !wasAway.current && arrivedAt.current !== null) sfx.harrierAway(side);
    wasAway.current = away;
    if (kept || down || !canControl(run)) {
      sfx.wingbeatStop();
    } else {
      const dive = windingAt.current !== null ? tell.current : Math.max(0, Math.min(1, 1 - distance / 4));
      sfx.wingbeat(Math.max(0.25, 1 - distance / 12), side, dive);
    }
    if (kept) {
      arrivedAt.current = null;
      windingAt.current = null;
      p.placed = false;
      report();
      return;
    }
    if (!canControl(run)) {
      report();
      return;
    }
    if (arrivedAt.current === null) arrivedAt.current = now;
    if (now - arrivedAt.current < HARRIER_ENTRY_GRACE_S) {
      g.position.set(p.x, FLIGHT_HEIGHT + floorRiseAt(room, p.x, p.z), p.z);
      tell.current = 0;
      report();
      return;
    }

    if (down) {
      // On the floor, twitching. The floor decides what happens to it here.
      g.position.set(p.x, floorHeightAt(room, p.x, p.z) + 0.22 + Math.abs(Math.sin(t * 9)) * 0.04, p.z);
      g.rotation.z = Math.PI / 2 + Math.sin(t * 9) * 0.1;
      if (patchAt(bites, p.x, p.z)) run.slayHarrier();
      report();
      return;
    }
    g.rotation.z = 0;
    g.rotation.y = Math.atan2(dx, dz);
    if (distance <= HARRIER_WINDUP_REACH && roomSegmentClear(room, p.x, p.z, cam.x, cam.z)) {
      if (windingAt.current === null) {
        windingAt.current = now;
        bus.emit("notice", "The Harrier draws back. Dodge or shove.");
        sfx.harrierWind(side);
      }
      tell.current = Math.min(1, (now - windingAt.current) / HARRIER_WINDUP_S);
    } else {
      windingAt.current = null;
      tell.current = 0;
    }
    if (distance <= HARRIER_TOUCH_RADIUS && tell.current >= 1) {
      run.harrierStrike();
      windingAt.current = null;
      report();
      return;
    }
    if (windingAt.current !== null && tell.current < 1) {
      // Hover and spread the wings before committing. Walking back cancels the dive.
      g.position.set(p.x, FLIGHT_HEIGHT + floorRiseAt(room, p.x, p.z) + Math.sin(t * 12) * 0.1, p.z);
      g.rotation.x = -tell.current * 0.65;
      g.children[1].rotation.z = 0.35 + tell.current * 0.6;
      g.children[2].rotation.z = -0.35 - tell.current * 0.6;
      report();
      return;
    }
    const step = Math.min(HARRIER_SPEED * delta, HARRIER_MAX_STEP, Math.max(0, distance - HARRIER_TOUCH_RADIUS * 0.5));
    const heading = steerInRoom(room, p.x, p.z, cam.x, cam.z, obstacles, 0, 0.5);
    [p.x, p.z] = roomStep(room, p.x, p.z, heading.dx * step, heading.dz * step, 0.5);
    // It dives as it closes: at height across the room, at head height on
    // you. That descent is its tell - the same number the Warden's grace
    // and the Keeper's halberd publish - so it tips its nose with it and a
    // check can read the warning rather than the hit.
    const dive = Math.max(0, Math.min(1, 1 - distance / 4));
    g.rotation.x = -dive * 0.45;
    const y = FLIGHT_HEIGHT - (FLIGHT_HEIGHT - 1.4) * dive + Math.sin(t * 6) * 0.12;
    g.position.set(p.x, y + floorRiseAt(room, p.x, p.z), p.z);
    const wings = g.children;
    for (let i = 1; i < wings.length && i <= 2; i++) wings[i].rotation.z = (i === 1 ? 1 : -1) * Math.sin(t * 14) * 0.7;
    report();
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
