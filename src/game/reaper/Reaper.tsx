import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";

import { halfSize, type Room } from "../dungeon/types";
import { doorReach } from "../dungeon/footprint";
import { canControl, reaperStalled, runClock, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { GROUND_Y, REAPER_MAX_STEP, REAPER_SPEED, REAPER_TOUCH_RADIUS } from "../world";
import { reaperAt } from "./position";
import { floorHeightAt } from "../worldbuilding/elevation";

/**
 * The Reaper, in the room the player is standing in - which is the only
 * room it is ever in.
 *
 * A ghost body, and this component is what "ghost" means: it asks the
 * floor for nothing. No obstacles, because `obstaclesFor("ghost")` is an
 * empty list and it would be given nothing to steer round; no hazards,
 * because nothing on the floor bites it. It comes in through the corner
 * farthest from the player, drifts straight at them, and when they leave
 * through a doorway it is simply in the next room too. Being remounted
 * with the room is how it follows: there is no path to walk and nothing
 * it has to find.
 *
 * It cannot be fought, lured, warded or barred. A blast holds it for a
 * few seconds, and the exit is the only other answer.
 */
export function Reaper({ room }: { room: Room }) {
  const group = useRef<Group>(null);
  const placed = useRef(false);
  const scratch = useMemo(() => ({ to: new Vector3() }), []);
  useEffect(() => () => { reaperAt.roomId = null; }, []);
  // Remounted with the room, so the voice restarts a frame later: fine.
  useEffect(() => () => sfx.reapStop(), []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const run = useRun.getState();
    // Arrival uses the controlled camera, after travel has landed. The
    // entire pose freezes with the run, including facing and the blast tell.
    if (!canControl(run)) {
      sfx.reapStop();
      return;
    }
    const cam = state.camera.position;
    const half = halfSize(room);
    // Placed on its first frame rather than at mount, because that is the
    // first moment the camera - the player - can be asked where it is.
    if (!placed.current) {
      placed.current = true;
      g.position.set(Math.sign(-cam.x || 1) * half * 0.8, GROUND_Y, Math.sign(-cam.z || 1) * half * 0.8);
    }
    const t = runClock(run);
    const stalled = reaperStalled(run);
    g.position.y = floorHeightAt(room, g.position.x, g.position.z) + (stalled ? 0.1 + Math.sin(t * 18) * 0.03
      : 0.3 + Math.sin(t * 1.1) * 0.12);

    const dx = cam.x - g.position.x;
    const dz = cam.z - g.position.z;
    const distance = Math.hypot(dx, dz);
    g.rotation.y = Math.atan2(dx, dz);
    Object.assign(reaperAt, { x: g.position.x, z: g.position.z, roomId: room.id });

    if (import.meta.env.DEV) {
      // Where it actually is, for the checks, in one object at frame rate.
      const w = window as unknown as { __reaper?: Record<string, number | string> };
      const probe = (w.__reaper ??= { x: 0, z: 0, distance: 0, stalled: 0, room: "" });
      probe.x = g.position.x;
      probe.z = g.position.z;
      probe.y = g.position.y;
      probe.facing = g.rotation.y;
      probe.distance = distance;
      probe.stalled = stalled ? 1 : 0;
      probe.room = room.id;
    }

    // Its voice, from where it is: the one thing on the floor that cannot
    // be fought is also the one thing that must never arrive unheard.
    // Quieter while the blast holds it, never off.
    sfx.reap(Math.max(0.15, 1 - distance / (half * 2)) * (stalled ? 0.5 : 1), sideOf(-dx, -dz));
    if (stalled) {
      // Held by the blast: a shudder in place, so the hold can be seen.
      return;
    }
    if (distance <= REAPER_TOUCH_RADIUS) {
      run.reaperStrike();
      return;
    }
    const step = Math.min(
      REAPER_SPEED * delta,
      REAPER_MAX_STEP,
      Math.max(0, distance - REAPER_TOUCH_RADIUS * 0.5)
    );
    scratch.to.set(dx / distance, 0, dz / distance).multiplyScalar(step);
    // A ghost crosses solid cover and concave corners. Its outer bounds
    // still include every wing, so a closed gallery cannot shelter the
    // player forever merely by sitting beyond the furnished chamber.
    g.position.x = Math.max(-doorReach(room, "west") + 0.3,
      Math.min(doorReach(room, "east") - 0.3, g.position.x + scratch.to.x));
    g.position.z = Math.max(-doorReach(room, "north") + 0.3,
      Math.min(doorReach(room, "south") - 0.3, g.position.z + scratch.to.z));
    reaperAt.x = g.position.x;
    reaperAt.z = g.position.z;
  });

  return (
    <group ref={group}>
      {/* A tall shroud with nothing in it, lit from inside, that the room's
          light passes through. Pale where the Warden is dark, so the two
          never read as one thing. */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.2, 0.7, 2.6, 12, 1, true]} />
        <meshStandardMaterial
          color="#cfd8ff"
          emissive="#6f7fc0"
          emissiveIntensity={0.6}
          transparent
          opacity={0.35}
          side={2}
          depthWrite={false}
        />
      </mesh>
      {/* The hollow where a face would be. */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.28, 12, 8]} />
        <meshBasicMaterial color="#0a0a14" />
      </mesh>
      <pointLight position={[0, 2, 0]} color="#8fa0ff" intensity={3} distance={7} decay={1.8} />
    </group>
  );
}
