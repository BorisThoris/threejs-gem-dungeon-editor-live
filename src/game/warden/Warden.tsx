import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";

import { doorPosition } from "../dungeon/layout";
import { DIRS, halfSize, type Room } from "../dungeon/types";
import { bus } from "../events";
import { canControl, runClock, useRun, wardenStaggered } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import {
  GROUND_Y,
  WARDEN_ARRIVAL_GRACE_S,
  WARDEN_HAZARD_BERTH,
  WARDEN_MAX_STEP,
  WARDEN_TOUCH_RADIUS,
} from "../world";
import { patchAt, steerAround, type Patch } from "./steer";
import { behaviourFor } from "./tuning";

interface WardenProps {
  room: Room;
  /**
   * Everything in the room that wounds it, in room-local coordinates. The
   * floor does not care which of you stands on it.
   */
  hazards?: readonly Patch[];
  /**
   * The subset it knows about, which is what it walks round once it has
   * learned. A snare is in `hazards` and not in here, and that is the
   * whole reason a snare still works on a Warden that has been routed: it
   * has been taught to avoid the spikes it can see, and a wire on the
   * floor of an ordinary room is not one of them.
   */
  avoid?: readonly Patch[];
}

/** Proximity bands the DOM draws a vignette from: none, near, close, upon you. */
const BANDS = [7, 4, 2];
const bandFor = (distance: number): number => {
  for (let i = 0; i < BANDS.length; i++) if (distance > BANDS[i]) return i;
  return BANDS.length;
};

/**
 * The Warden, in the room the player is standing in.
 *
 * It has no rigid body and no collider: it walks through barrels and
 * pillars, and the only thing in the dungeon that stops it is a wall it
 * never crosses because it moves room to room, not through geometry. That
 * is deliberate. A threat you can pin behind a crate is a puzzle; one that
 * simply keeps coming is a reason to leave, which is the decision this
 * whole floor is built around.
 *
 * It cannot be fought. Its speed is under the player's walk at every alarm
 * level, so it never wins a straight race - it wins by being between you
 * and the door, and by arriving while you are deciding whether to be greedy.
 */
export function Warden({ room, hazards = [], avoid = hazards }: WardenProps) {
  const group = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const alarm = useRun((s) => s.alarm);
  const cameFrom = useRun((s) => s.wardenCameFrom);
  // Once it has been routed it walks round what hurt it. Read as state
  // rather than in the frame loop: it changes twice a floor at most.
  const wary = useRun((s) => s.wardenWary);
  const band = useRef(-1);
  const scratch = useMemo(() => ({ to: new Vector3() }), []);

  // It comes in through the doorway it walked in from, so its arrival has
  // a direction the player can learn to read.
  const entry = useMemo<[number, number, number]>(() => {
    const half = halfSize(room);
    const dir = DIRS.find((d) => room.links[d] && room.links[d] === cameFrom);
    if (dir) {
      const [x, , z] = doorPosition(room, dir);
      return [x * 0.86, GROUND_Y, z * 0.86];
    }
    return [half * 0.7, GROUND_Y, -half * 0.7];
    // `cameFrom` is read once, at the moment it enters: it must not move the
    // Warden again while it is in the room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  /**
   * When it walked in, so an arrival cannot be a strike in the same frame.
   *
   * Set from the frame loop rather than an effect. An effect runs after
   * commit and `useFrame` runs on the next animation frame, and those two
   * can happen in either order: on a run where the frame won, the ref was
   * still null, null meant "no arrival to be inside" - and the Warden
   * struck 0.11s after walking in, with the grace in place and doing
   * nothing. Its own check caught it two cycles later. Keyed on the room
   * it arrived in, so there is no ordering left to get wrong.
   */
  const arrivedIn = useRef<string | null>(null);
  const arrivedAt = useRef(0);
  /**
   * Whether it is currently standing in a patch, latched the same way the
   * player's own hazard does it: a patch bites on entry, not every frame,
   * and walking off and back on is a second bite.
   */
  const inHazard = useRef(false);

  useEffect(() => {
    bus.emit("wardenProximity", { level: 0 });
    return () => {
      bus.emit("wardenProximity", { level: 0 });
      // It left the room, or the run ended: the held sound goes with it.
      sfx.stalkStop();
    };
  }, []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    if (arrivedIn.current !== room.id) {
      arrivedIn.current = room.id;
      arrivedAt.current = runClock(useRun.getState());
    }
    const t = state.clock.elapsedTime;
    const behaviour = behaviourFor(alarm);

    // It drifts rather than walks: a slow bob, and eyes that always face you.
    g.position.y = GROUND_Y + 0.06 + Math.sin(t * 1.6) * 0.05;

    const cam = state.camera.position;
    const dx = cam.x - g.position.x;
    const dz = cam.z - g.position.z;
    const distance = Math.hypot(dx, dz);
    g.rotation.y = Math.atan2(dx, dz);

    if (import.meta.env.DEV) {
      /**
       * Where it actually is, for the checks.
       *
       * Nothing outside this component had ever known: the run store knows
       * which room it is in and the bus says when it strikes, and between
       * those two the whole chase - the only thing the player can do about
       * the only threat in the game - was unobservable. `pace.ts` proves on
       * paper that a sprint outruns it and a walk does not, over 2,496
       * combinations, in node, from three constants. Whether the game moves
       * either body at those speeds was never asked, because there was no
       * way to ask it. Written into one object rather than a fresh one, at
       * frame rate.
       */
      const w = window as unknown as { __warden?: Record<string, number> };
      const probe = (w.__warden ??= { x: 0, z: 0, distance: 0, speed: 0, sinceArrival: 0 });
      probe.x = g.position.x;
      probe.z = g.position.z;
      probe.distance = distance;
      probe.speed = behaviour.speed;
      // How long since it walked in, so a check can tell "still inside its
      // arrival grace" from "not striking at all" - which is the difference
      // between a rule working and a rule stuck on.
      probe.sinceArrival = runClock(useRun.getState()) - arrivedAt.current;
    }

    const level = bandFor(distance);
    if (level !== band.current) {
      band.current = level;
      bus.emit("wardenProximity", { level });
    }

    // Heard as well as seen, from the moment it is in the room. The bearing
    // is to it rather than from it, and it is written every frame so the
    // sound moves as the player turns.
    const reach = halfSize(room) * 1.4;
    const closeness = Math.max(0, Math.min(1, 1 - (distance - WARDEN_TOUCH_RADIUS) / reach));
    if (canControl(useRun.getState())) {
      sfx.stalk(closeness, sideOf(-dx, -dz));
    } else {
      sfx.stalkStop();
      return;
    }

    // Reeling from the spikes: it neither walks nor strikes. This is the
    // only thing in the dungeon that stops it, and it is the floor's own
    // furniture that does it rather than anything the player carries.
    if (wardenStaggered(useRun.getState())) {
      // A shudder in place, so a player who bought this window can see they
      // bought it rather than guessing from a Warden that merely looks slow.
      g.position.y = GROUND_Y + 0.02 + Math.sin(t * 22) * 0.035;
      return;
    }

    if (distance <= WARDEN_TOUCH_RADIUS) {
      /**
       * Not on the frame it walked in on.
       *
       * It enters at the doorway it came through, and a player standing in
       * that doorway had it appear on top of them and take a life in the
       * same frame - no warning, and nothing the step cap guards against,
       * because the cap guards walking and this is placement. The grace is
       * on the run's clock, so it cannot be spent in the pause menu.
       */
      const since = runClock(useRun.getState()) - arrivedAt.current;
      if (since >= WARDEN_ARRIVAL_GRACE_S) useRun.getState().wardenStrike();
      return;
    }

    // Straight at the player, clamped inside the room so it never drifts
    // out through a wall it did not walk through - and never further in one
    // frame than WARDEN_MAX_STEP, whatever the frame cost. See world.ts:
    // an unbounded delta let a single slow frame put it on top of you from
    // across the room.
    const step = Math.min(
      behaviour.speed * delta,
      WARDEN_MAX_STEP,
      Math.max(0, distance - WARDEN_TOUCH_RADIUS * 0.5)
    );
    // Straight at the player until the spikes have taught it otherwise.
    const heading = wary
      ? steerAround(g.position.x, g.position.z, cam.x, cam.z, avoid, WARDEN_HAZARD_BERTH)
      : { dx: dx / distance, dz: dz / distance };
    scratch.to.set(heading.dx, 0, heading.dz).multiplyScalar(step);
    const limit = halfSize(room) - 0.6;
    g.position.x = Math.max(-limit, Math.min(limit, g.position.x + scratch.to.x));
    g.position.z = Math.max(-limit, Math.min(limit, g.position.z + scratch.to.z));

    // What it just walked into. Tested after the step, against the position
    // it actually ended the frame at, so a patch it was steered round is
    // never charged and one it was cornered into always is.
    const standing = patchAt(hazards, g.position.x, g.position.z);
    if (!standing) inHazard.current = false;
    else if (!inHazard.current) {
      inHazard.current = true;
      // The store decides whether that is actually a wound - it refuses one
      // while it is still reeling from the last - and the sound and the line
      // hang off the event it emits, so nothing here has a second opinion.
      // A patch that names itself is a snare, and springing it goes through
      // the same door so the two cannot drift apart.
      if (standing.key) useRun.getState().springSnare(standing.key);
      else useRun.getState().wardenWounded();
    }
  });

  const rouse = behaviourFor(alarm).rouse;
  const eyeColour = rouse > 0.6 ? "#ff5c3a" : rouse > 0.3 ? "#ffb03a" : "#9fd8ff";

  return (
    <group ref={group} position={entry}>
      {/* A hooded column that never quite touches the floor. The outer shell
          is a shade off black so the silhouette has an edge against a dark
          wall; without it the whole figure vanishes into the room. */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.66, 2.3, 14, 1, true]} />
        <meshStandardMaterial color="#1b1b24" roughness={1} metalness={0} side={2} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.26, 0.6, 2.28, 14, 1, true]} />
        <meshStandardMaterial color="#08080c" roughness={1} side={2} />
      </mesh>
      {/* The hood: a shallow cowl over the face, open at the front. */}
      <mesh position={[0, 2.26, 0]}>
        <sphereGeometry args={[0.3, 14, 10]} />
        <meshStandardMaterial color="#101017" roughness={1} />
      </mesh>
      {/* Two eyes, clear of the hood so they are never swallowed by it. */}
      <group ref={eyes} position={[0, 2.24, 0.3]}>
        {[-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, 0, 0]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshBasicMaterial color={eyeColour} />
          </mesh>
        ))}
      </group>
      {/* Set ahead of the hood so it lights the room it is walking into
          rather than the front of its own robe. */}
      <pointLight
        position={[0, 2.05, 0.75]}
        color={eyeColour}
        intensity={5 + rouse * 8}
        distance={9}
        decay={1.7}
      />
      {/* The smoke it stands in, so the gap under the hem reads as float. */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 18]} />
        <meshBasicMaterial color="#100c18" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
