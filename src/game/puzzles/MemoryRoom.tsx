import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import type { Mesh, MeshStandardMaterial } from "three";

import { bus } from "../events";
import { InteractTrigger } from "../interact/InteractTrigger";
import { memoryAnchors } from "./anchors";
import { createRng } from "../rng";
import { Dressing } from "../rooms/Dressing";
import type { RoomKindProps } from "../rooms/kinds";
import { runClock, useRun } from "../state/run";

const COLORS = [
  { base: "#ff6b6b", glow: "#ff4444" },
  { base: "#4ecdc4", glow: "#44cccc" },
  { base: "#45b7d1", glow: "#44aacc" },
  { base: "#96ceb4", glow: "#88ccaa" },
  { base: "#ffd93d", glow: "#e1c12f" },
];
const PATTERN_LENGTH = 4;
const MISSES_ALLOWED = 2;
const ATTEMPTS_ALLOWED = 2;
const STEP_MS = 900;
const GLOW_MS = 600;

type Phase = "idle" | "showing" | "playing" | "solved" | "burned";

/**
 * The memory trial: crystals on pedestals glow in an order, and the player
 * walks to each in turn and presses E.
 *
 * Ported from a room that asked for mouse clicks on floating cubes, applied
 * per-frame setState to shake them, and could only be started by an action
 * card that rendered nothing. Highlights are written straight to materials
 * on timers; React state changes only when the phase does.
 */
export function MemoryRoom({ room }: RoomKindProps) {
  const seed = useRun((s) => s.dungeon?.seed ?? 0);
  const cleared = useRun((s) => s.cleared.includes(room.id));
  const burnedBefore = useRun((s) => s.failed.includes(room.id));
  const [phase, setPhase] = useState<Phase>(cleared ? "solved" : burnedBefore ? "burned" : "idle");
  /**
   * How much of the trial is spent, from the run rather than from here.
   *
   * Both counts were `useState`, and `Scene` mounts only the room the
   * player is in: walking out after a mistake and back in unmounted the
   * component that remembered it. The trial costs a life at two misses and
   * burns the book at two attempts, and until this both could be avoided
   * for good by stepping through a door.
   */
  const trial = useRun((s) => s.trials[room.id]);
  const misses = trial?.misses ?? 0;
  const attempts = trial?.attempts ?? 0;
  const progress = useRef(0);
  const pattern = useRef<number[]>([]);
  const meshes = useRef<(Mesh | null)[]>([]);

  const anchors = useMemo(() => memoryAnchors(room), [room]);
  const pedestals = anchors.slice(0, 4);
  const lectern = anchors[4];
  const flaring = useRef(false);

  /**
   * The trial's clock, which stops when the game does.
   *
   * These deadlines were `window.setTimeout`s - the wall clock - so opening
   * the pause menu during "Watch." played the entire pattern out behind a
   * screen that is seven-tenths opaque, and the player resumed into a
   * display that had already finished and a trial that expected an answer.
   * They go on `runClock` now, which is wall time less every second spent
   * in a menu, and a frame runs the ones that have come due. Soonest first,
   * so a frame long enough to cover two of them still runs them in the
   * order they were meant to happen.
   */
  const pending = useRef<{ at: number; fn: () => void }[]>([]);
  const later = (ms: number, fn: () => void) => {
    const at = runClock(useRun.getState()) + ms / 1000;
    const queue = pending.current;
    let i = queue.length;
    while (i > 0 && queue[i - 1].at > at) i--;
    queue.splice(i, 0, { at, fn });
  };
  const clearTimers = () => {
    pending.current = [];
  };
  useEffect(() => clearTimers, []);

  useFrame(() => {
    const queue = pending.current;
    if (queue.length === 0) return;
    const now = runClock(useRun.getState());
    while (queue.length > 0 && queue[0].at <= now) {
      const due = queue.shift();
      if (due) due.fn();
    }
  });

  useEffect(() => {
    const text =
      phase === "idle"
        ? "Begin the trial at the lectern. Watch the crystals, then choose them in the same order."
        : phase === "showing"
          ? "Watch."
          : phase === "playing"
            ? `Choose the crystals in order. ${MISSES_ALLOWED - misses} mistake${MISSES_ALLOWED - misses === 1 ? "" : "s"} left.`
            : phase === "burned"
              ? "The trial is over."
              : null;
    bus.emit("hint", text);
    return () => bus.emit("hint", null);
  }, [phase, misses]);

  const glow = (index: number, ms = GLOW_MS) => {
    const mesh = meshes.current[index];
    if (!mesh) return;
    const mat = mesh.material as MeshStandardMaterial;
    mat.emissiveIntensity = 2.2;
    mesh.scale.setScalar(1.3);
    later(ms, () => {
      mat.emissiveIntensity = 0.35;
      mesh.scale.setScalar(1);
    });
  };

  const show = () => {
    setPhase("showing");
    progress.current = 0;
    pattern.current.forEach((index, step) => later(400 + step * STEP_MS, () => glow(index)));
    later(400 + pattern.current.length * STEP_MS + 300, () => setPhase("playing"));
  };

  const begin = () => {
    if (pedestals.length < 2) return;
    const rng = createRng(`${seed}:${room.id}:memory:${attempts}`);
    pattern.current = Array.from({ length: PATTERN_LENGTH }, () => Math.floor(rng() * pedestals.length));
    if (import.meta.env.DEV) {
      // For the browser probes, which cannot watch a material glow.
      (window as unknown as Record<string, unknown>).__memoryPattern = pattern.current;
    }
    // Not the misses: they are the run's now, and only spending an attempt
    // clears them. Beginning again after walking out is the same attempt.
    clearTimers();
    show();
  };

  const choose = (index: number) => {
    if (phase !== "playing") return;
    if (pattern.current[progress.current] === index) {
      glow(index, 350);
      progress.current += 1;
      if (progress.current >= pattern.current.length) {
        setPhase("solved");
        const run = useRun.getState();
        run.clearRoom(room.id);
        run.collectGem(`${room.id}:puzzle`);
        bus.emit("puzzleResult", { roomId: room.id, completed: true });
      }
      return;
    }
    // Wrong: input closes at once, every crystal flares red, then the
    // pattern replays. Closing input first is what stops a second press in
    // the flare from counting as a second miss.
    setPhase("showing");
    if (!flaring.current) {
      flaring.current = true;
      meshes.current.forEach((m) => {
        if (!m) return;
        const mat = m.material as MeshStandardMaterial;
        const was = mat.emissive.getHex();
        mat.emissive.set("#ff2020");
        mat.emissiveIntensity = 1.6;
        later(500, () => {
          mat.emissive.setHex(was);
          mat.emissiveIntensity = 0.35;
          flaring.current = false;
        });
      });
    }
    const run = useRun.getState();
    const m = run.trialMiss(room.id);
    bus.emit("puzzleResult", { roomId: room.id, completed: false });
    if (m >= MISSES_ALLOWED) {
      run.damage();
      const a = run.trialAttempt(room.id);
      if (a >= ATTEMPTS_ALLOWED) {
        run.failRoom(room.id);
        later(600, () => setPhase("burned"));
      } else {
        later(600, () => setPhase("idle"));
      }
      return;
    }
    later(900, show);
  };

  const canBegin = phase === "idle";

  return (
    <>
      <Dressing room={room} seed={seed} />
      {/* All four pedestals in one static body: rapier walks its body list
          every step, and these never move. */}
      <RigidBody type="fixed" colliders={false}>
        {pedestals.map((p, i) => (
          <CylinderCollider key={i} args={[0.5, 0.4]} position={[p[0], 0.5, p[2]]} />
        ))}
      </RigidBody>
      {pedestals.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.4, 1, 10]} />
            <meshStandardMaterial color="#6f6e78" roughness={0.9} />
          </mesh>
          <Crystal index={i} meshes={meshes} solved={phase === "solved"} />
          <InteractTrigger
            position={[0, 0, 0]}
            label="Choose this crystal"
            enabled={phase === "playing"}
            blockedReason={phase === "showing" ? "Watch" : "Not yet"}
            radius={2.2}
            onInteract={() => choose(i)}
          />
        </group>
      ))}
      <group position={lectern}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.7, 1.1, 0.5]} />
          <meshStandardMaterial color="#4a3320" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.12, 0]} rotation={[-0.4, 0, 0]}>
          <boxGeometry args={[0.6, 0.08, 0.45]} />
          <meshStandardMaterial color={phase === "burned" ? "#2b2b2b" : "#3b5f8a"} />
        </mesh>
        <InteractTrigger
          position={[0, 0, 0]}
          label="Begin the trial"
          enabled={canBegin}
          blockedReason={
            phase === "solved" ? "The trial is complete" : phase === "burned" ? "The book has burned" : "The trial is under way"
          }
          onInteract={begin}
        />
      </group>
    </>
  );
}

function Crystal({
  index,
  meshes,
  solved,
}: {
  index: number;
  meshes: React.MutableRefObject<(Mesh | null)[]>;
  solved: boolean;
}) {
  const ref = useRef<Mesh>(null);
  useEffect(() => {
    const list = meshes.current;
    list[index] = ref.current;
    return () => {
      list[index] = null;
    };
  }, [index, meshes]);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.8 + index;
  });
  const c = COLORS[index % COLORS.length];
  return (
    <mesh ref={ref} position={[0, 1.35, 0]} castShadow>
      <octahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial
        color={c.base}
        emissive={c.glow}
        emissiveIntensity={solved ? 1.2 : 0.35}
        roughness={0.25}
      />
    </mesh>
  );
}
