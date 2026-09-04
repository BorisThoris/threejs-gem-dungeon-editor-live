import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import type { Group } from "three";

import { HAZARD_RADIUS } from "../dungeon/layout";
import { halfSize } from "../dungeon/types";
import { bus } from "../events";
import { Gem } from "../props/Gem";
import { Dressing } from "../rooms/Dressing";
import type { RoomKindProps } from "../rooms/kinds";
import { canControl, useRun } from "../state/run";
import {
  ARENA_ARMS,
  ARENA_DURATION_S,
  ARENA_SPIN,
  ARENA_WIND_UP_S,
  GROUND_Y,
} from "../world";
import { PLINTH_RADIUS, arenaRings } from "./sweep";

type Phase = "idle" | "winding" | "running" | "done";

const PLINTH_HEIGHT = 1.1;

/**
 * The arena, which until now was the largest room in the game with a gem in
 * a corner and nothing else in it.
 *
 * Its gem is on a plinth in the middle. Lifting it bars the doors and sets
 * three arms of spikes turning, sweeping the whole floor, so there is no
 * corner to wait in and no shelter behind the plinth either - the only safe
 * ground is the moving gap between two arms. Staying in it means walking a
 * circle for fourteen seconds, and how hard that is depends entirely on
 * which ring you choose to walk: the inner line is a stroll, the outer wall
 * needs a dash to hold. Which ground the arms reach is `sweep.ts`, and
 * `yarn test:layout` holds it to the two lines that are this room: there is
 * always a line you can walk, and there is no line you can stand on.
 *
 * Nothing here can be fought and nothing can be blocked, which is the same
 * bargain the rest of the floor makes. The difference is that the arena
 * tells you the price before you pay it: the arms wind up for two seconds
 * first, turning without teeth, so the room is only ever a surprise once.
 */
export function ArenaRoom({ room }: RoomKindProps) {
  const seed = useRun((s) => s.dungeon?.seed ?? 0);
  const taken = useRun((s) => s.gemRooms.includes(room.id));
  const [phase, setPhase] = useState<Phase>(taken ? "done" : "idle");
  const half = halfSize(room);

  // Where the patches sit is `arena/sweep.ts`, so that what the arms cover
  // can be checked without the room being mounted. It was wrong twice: the
  // corners of the box, and then the hole around the plinth.
  const radii = useMemo(() => arenaRings(half), [half]);
  const patches = useMemo(
    () =>
      Array.from({ length: ARENA_ARMS }, (_, arm) =>
        radii.map((radius) => ({ arm, radius }))
      ).flat(),
    [radii]
  );

  // Deliberately not keyed on `phase`: setting it would re-run this effect,
  // and the cleanup would cancel the very timers it had just set. The ref
  // is what stops a room walked back into from starting all over again.
  const alreadyTaken = useRef(taken);
  const running = useRef(false);

  const stop = useCallback(() => {
    running.current = false;
    bus.emit("arenaRun", { running: false });
    bus.emit("hint", null);
    if (useRun.getState().sealedRoomId === room.id) useRun.getState().sealRoom(null);
  }, [room.id]);
  useEffect(() => {
    if (!taken || alreadyTaken.current) return;
    setPhase("winding");
    bus.emit("hint", "The plinth is empty and the doors will not move. Keep walking.");
    bus.emit("arenaRun", { running: true });
    running.current = true;
    useRun.getState().sealRoom(room.id);
    const toRunning = window.setTimeout(() => setPhase("running"), ARENA_WIND_UP_S * 1000);
    const toDone = window.setTimeout(
      () => {
        setPhase("done");
        stop();
      },
      (ARENA_WIND_UP_S + ARENA_DURATION_S) * 1000
    );
    return () => {
      window.clearTimeout(toRunning);
      window.clearTimeout(toDone);
    };
    // `stop` is memoised on room.id, which is already here, so listing it
    // cannot re-run this effect and cancel its own timers - the bug this
    // room had the first time round.
  }, [taken, room.id, stop]);

  // Leaving mid-run - including by dying and starting a new run inside the
  // fourteen seconds - must not leave the doors barred, the arena flagged as
  // running, or its hint pinned to the top of the next run's screen. The
  // timer that used to clear all three was cancelled by the very unmount
  // that made clearing them necessary.
  useEffect(
    () => () => {
      if (running.current) stop();
    },
    [stop]
  );

  return (
    <>
      <Dressing room={room} seed={seed} />
      {/* The plinth, and the gem on top of it. */}
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[0, PLINTH_HEIGHT / 2, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.62, PLINTH_HEIGHT, 12]} />
          <meshStandardMaterial color="#5c5a63" roughness={0.9} />
        </mesh>
        <CylinderCollider args={[PLINTH_HEIGHT / 2, PLINTH_RADIUS]} position={[0, PLINTH_HEIGHT / 2, 0]} />
      </RigidBody>
      {!taken && (
        <Gem
          roomId={room.id}
          position={[0, GROUND_Y + PLINTH_HEIGHT + 0.45, 0]}
          takeLabel="Take the gem from the plinth"
        />
      )}
      {(phase === "winding" || phase === "running") && (
        <Arms patches={patches} live={phase === "running"} />
      )}
    </>
  );
}

interface Patch {
  arm: number;
  radius: number;
}

/**
 * The turning arms. Positions are written to refs every frame rather than
 * held in state: fifteen spike patches re-rendering at sixty hertz would
 * cost more than the room is worth.
 */
function Arms({ patches, live }: { patches: Patch[]; live: boolean }) {
  const groups = useRef<(Group | null)[]>([]);
  const started = useRef<number | null>(null);

  useFrame((state) => {
    if (started.current === null) started.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - started.current;
    const spin = t * ARENA_SPIN;
    const control = canControl(useRun.getState());
    const cam = state.camera.position;

    if (import.meta.env.DEV) {
      /**
       * Where the arms are, for the check that walks the gap.
       *
       * The room's promise has two halves and only one of them could be
       * driven: standing where the gem was is checked and takes five hits.
       * Walking the circle between two arms needs to know where the arms
       * are, and nothing outside this component did. Written into one
       * object, at frame rate.
       */
      const w = window as unknown as { __arena?: Record<string, number | boolean> };
      const probe = (w.__arena ??= { spin: 0, live: false, arms: ARENA_ARMS });
      probe.spin = spin;
      probe.live = live;
      probe.arms = ARENA_ARMS;
    }

    patches.forEach((patch, i) => {
      const g = groups.current[i];
      if (!g) return;
      const angle = spin + (patch.arm / ARENA_ARMS) * Math.PI * 2;
      const x = Math.cos(angle) * patch.radius;
      const z = Math.sin(angle) * patch.radius;
      g.position.set(x, GROUND_Y, z);
      if (!live || !control) return;
      const dx = cam.x - x;
      const dz = cam.z - z;
      if (dx * dx + dz * dz <= HAZARD_RADIUS * HAZARD_RADIUS) useRun.getState().damage();
    });
  });

  return (
    <>
      {patches.map((patch, i) => (
        <group
          key={i}
          ref={(g) => {
            groups.current[i] = g;
          }}
        >
          {/* Retracted during the wind-up, so the shape of the sweep can be
              read before it can hurt anyone. */}
          <mesh position={[0, live ? 0.24 : 0.05, 0]} castShadow>
            <coneGeometry args={[0.34, live ? 0.5 : 0.12, 7]} />
            <meshStandardMaterial
              color={live ? "#c3ccd6" : "#5d646d"}
              metalness={0.7}
              roughness={0.35}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <circleGeometry args={[HAZARD_RADIUS, 18]} />
            <meshBasicMaterial
              color={live ? "#8a1f2d" : "#4a3a1f"}
              transparent
              opacity={live ? 0.32 : 0.18}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
