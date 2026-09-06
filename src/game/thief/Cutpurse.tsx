import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";

import { doorPosition } from "../dungeon/layout";
import { DIRS, halfSize, type Dir, type Room } from "../dungeon/types";
import { canControl, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { patchAt, steerAround, type Patch } from "../warden/steer";
import {
  CUTPURSE_SPEED,
  CUTPURSE_TOUCH_RADIUS,
  GROUND_Y,
  MAX_FRAME_S,
} from "../world";

interface CutpurseProps {
  room: Room;
  /** Everything on this floor that hurts things that walk into it. */
  hazards?: readonly Patch[];
  /** The furniture, which it goes round. */
  obstacles?: readonly Patch[];
}

/**
 * The Cutpurse: low, quick, and only interested in your pockets.
 *
 * It comes in at a doorway, runs at the player, takes one gem and runs
 * back out with it. It cannot hurt you and it is never in the room for
 * long - the whole encounter is about six seconds - and what it asks is
 * the one thing the rest of the game never does: react now.
 *
 * The two other things in the dungeon are answered by moving well. This
 * one is answered by moving *immediately*, which is why it moves at six
 * against a walk of five and a sprint of eight: walking after it is
 * watching it leave, and sprinting after it works only if the sprint
 * starts at once. `systems/pace.ts` owns that sentence and the two items
 * that break it on purpose.
 *
 * The floor treats it exactly as it treats the Warden: spikes and snares
 * do not care what walks into them, and a thief that runs over one drops
 * everything. That is not a special case in here - it is the same patch
 * list the Warden is given, asked the same question.
 */
export function Cutpurse({ room, hazards = [], obstacles = [] }: CutpurseProps) {
  const group = useRef<Group>(null);
  const phase = useRun((s) => s.thiefPhase);
  const holding = useRun((s) => s.thiefHolding);
  const scratch = useMemo(() => ({ to: new Vector3() }), []);

  /** The doorway it came in by, which is also the one it leaves by. */
  const door = useMemo<{ dir: Dir; at: [number, number] }>(() => {
    const open = DIRS.filter((d) => room.links[d]);
    const dir = open.length ? open[Math.floor(Math.random() * open.length)] : "north";
    const [x, , z] = doorPosition(room, dir);
    return { dir, at: [x * 0.9, z * 0.9] };
    // Chosen once, when it arrives. Re-rolling it mid-visit would move the
    // thing the player is chasing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  // What bites it comes in whole from `mobs/body.ts` - it kept its own
  // list of the snares once, with its own copy of their radius, and that
  // is two owners of one number.
  const inHazard = useRef(false);

  useEffect(() => {
    sfx.skitter(0);
    return () => {
      // It left, or the room did. Nothing here outlives the visit.
      inHazard.current = false;
    };
  }, []);

  useFrame((state, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const run = useRun.getState();
    if (!canControl(run)) return;
    // The same cap everything that moves on a delta uses. A hitch must not
    // teleport it out of the room with your gem any more than it may
    // teleport the Warden onto you.
    const delta = Math.min(rawDelta, MAX_FRAME_S);
    const t = state.clock.elapsedTime;

    const cam = state.camera.position;
    // Where it is going: at the player while it is stalking, at the doorway
    // it came in by once it has what it came for.
    const target =
      run.thiefPhase === "fleeing"
        ? { x: door.at[0], z: door.at[1] }
        : { x: cam.x, z: cam.z };
    const dx = target.x - g.position.x;
    const dz = target.z - g.position.z;
    const distance = Math.hypot(dx, dz) || 1;
    g.rotation.y = Math.atan2(dx, dz);
    // It runs rather than drifts: a fast, low scurry with the body dipping.
    g.position.y = GROUND_Y + 0.02 + Math.abs(Math.sin(t * 14)) * 0.06;

    if (import.meta.env.DEV) {
      const w = window as unknown as { __thief?: Record<string, number | string> };
      const probe = (w.__thief ??= { x: 0, z: 0, toPlayer: 0, phase: "away", holding: 0 });
      probe.x = g.position.x;
      probe.z = g.position.z;
      probe.toPlayer = Math.hypot(cam.x - g.position.x, cam.z - g.position.z);
      probe.phase = run.thiefPhase;
      probe.holding = run.thiefHolding;
    }

    sfx.skitter(
      Math.max(0, 1 - Math.hypot(cam.x - g.position.x, cam.z - g.position.z) / (halfSize(room) * 1.3)),
      sideOf(g.position.x - cam.x, g.position.z - cam.z)
    );

    const step = Math.min(CUTPURSE_SPEED * delta, distance);
    // It has a body: it goes round the furniture rather than through it.
    // The spikes it runs into like anything else on the floor.
    const heading = obstacles.length
      ? steerAround(g.position.x, g.position.z, target.x, target.z, obstacles, 0.2)
      : { dx: dx / distance, dz: dz / distance };
    scratch.to.set(heading.dx, 0, heading.dz).multiplyScalar(step);
    g.position.x += scratch.to.x;
    g.position.z += scratch.to.z;

    // The floor does not care what walks into it. Latched on entry, like
    // every other thing in this game that stands on spikes.
    const standing = patchAt(hazards, g.position.x, g.position.z);
    if (!standing) inHazard.current = false;
    else if (!inHazard.current) {
      inHazard.current = true;
      if (standing.key) useRun.getState().springSnare(standing.key);
      useRun.getState().thiefCaught();
      return;
    }

    if (run.thiefPhase === "stalking") {
      if (distance <= CUTPURSE_TOUCH_RADIUS) useRun.getState().thiefSteals();
      return;
    }

    // Fleeing. The player catching it is the same test in reverse: they
    // have to be on it, not near it, and the reach is the one it stole from.
    const toPlayer = Math.hypot(cam.x - g.position.x, cam.z - g.position.z);
    if (toPlayer <= CUTPURSE_TOUCH_RADIUS) {
      useRun.getState().thiefCaught();
      return;
    }
    if (distance <= 0.35) useRun.getState().thiefEscapes();
  });

  // It enters at its doorway and, if the room is already mid-visit when
  // this mounts, near it: the position is a ref, not state, so nothing
  // here re-renders while it runs.
  const start: [number, number, number] = [door.at[0], GROUND_Y, door.at[1]];
  const eye = phase === "fleeing" ? "#ffd23a" : "#7fe0a0";

  return (
    <group ref={group} position={start}>
      {/* A low body, hunched, about knee height on the player. */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <capsuleGeometry args={[0.18, 0.34, 4, 8]} />
        <meshStandardMaterial color="#3a3128" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.42, 0.2]} castShadow>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshStandardMaterial color="#4a4034" roughness={0.95} />
      </mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.46, 0.32]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshBasicMaterial color={eye} />
        </mesh>
      ))}
      {/* What it is carrying, held up in front where the player can see it.
          A chase with nothing visible at stake is just an animal running. */}
      {holding > 0 && (
        <group position={[0, 0.52, 0.18]}>
          <mesh>
            <octahedronGeometry args={[0.13, 0]} />
            <meshStandardMaterial
              color="#7fe6ff"
              emissive="#2b7f99"
              emissiveIntensity={0.8}
              roughness={0.2}
            />
          </mesh>
          <pointLight color="#7fe6ff" intensity={2.5} distance={3.5} decay={1.6} />
        </group>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.34, 14]} />
        <meshBasicMaterial color="#0b0a10" transparent opacity={0.45} />
      </mesh>
    </group>
  );
}
