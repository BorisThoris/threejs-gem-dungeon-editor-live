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
import { useRun } from "../state/run";

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
  const [attempts, setAttempts] = useState(0);
  const [misses, setMisses] = useState(0);
  const progress = useRef(0);
  const pattern = useRef<number[]>([]);
  const timers = useRef<number[]>([]);
  const meshes = useRef<(Mesh | null)[]>([]);

  const anchors = useMemo(() => memoryAnchors(room), [room]);
  const pedestals = anchors.slice(0, 4);
  const lectern = anchors[4];
  const flaring = useRef(false);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

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
    setMisses(0);
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
    const m = misses + 1;
    setMisses(m);
    bus.emit("puzzleResult", { roomId: room.id, completed: false });
    if (m >= MISSES_ALLOWED) {
      const run = useRun.getState();
      run.damage();
      const a = attempts + 1;
      setAttempts(a);
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
      {pedestals.map((p, i) => (
        <group key={i} position={p}>
          <RigidBody type="fixed" colliders={false}>
            <mesh position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.32, 0.4, 1, 10]} />
              <meshStandardMaterial color="#6f6e78" roughness={0.9} />
            </mesh>
            <CylinderCollider args={[0.5, 0.4]} position={[0, 0.5, 0]} />
          </RigidBody>
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
