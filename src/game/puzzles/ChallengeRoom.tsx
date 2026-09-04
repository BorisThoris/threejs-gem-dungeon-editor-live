import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Color, Vector3, type MeshStandardMaterial } from "three";

import { bus } from "../events";
import { Dressing } from "../rooms/Dressing";
import type { RoomKindProps } from "../rooms/kinds";
import { useRun } from "../state/run";
import { GROUND_Y } from "../world";
import { challengeAnchors } from "./anchors";
import { Carryable, carry } from "./Carryable";

const PLATE_RADIUS = 0.9;
const IDOL = "idol";
const PLATE_SAFE = new Color("#2f8f4a");
const PLATE_ARMED = new Color("#8f2f38");


/**
 * The idol on the plate.
 *
 * Lift the idol with nothing else weighing the plate and the trap springs.
 * Put a candle on the plate first and the idol is yours. The plate reads
 * what is resting on it every frame; the verdict is given the instant the
 * idol leaves it.
 */
export function ChallengeRoom({ room }: RoomKindProps) {
  const seed = useRun((s) => s.dungeon?.seed ?? 0);
  const cleared = useRun((s) => s.cleared.includes(room.id));
  const sprungBefore = useRun((s) => s.failed.includes(room.id));
  const [outcome, setOutcome] = useState<"pending" | "solved" | "sprung">(
    cleared ? "solved" : sprungBefore ? "sprung" : "pending"
  );
  const plateMat = useRef<MeshStandardMaterial>(null);
  const plateWeighted = useRef<boolean | null>(null);
  /**
   * Whether the plate is held down, in words as well as in colour.
   *
   * The plate went green or red and that was the whole readout: the room's
   * standing line said what the trap was in general and never what the
   * plate was doing at that moment. Red against green is the commonest
   * colour-blind failure there is, and this was the one state in the game
   * a player has to act on that was encoded in colour alone - so about one
   * man in twelve was being asked to guess. It is state rather than a ref
   * because the line has to re-render; it is set from the same frame that
   * repaints the plate, which only runs when the answer changes.
   */
  const [safeNow, setSafeNow] = useState(false);
  const [plate, ...candleSpots] = challengeAnchors(room);

  useEffect(() => {
    bus.emit(
      "hint",
      outcome === "pending"
        ? safeNow
          ? "Something else is holding the plate down. The idol will come away safely."
          : "The plate is bare: lift the idol now and the trap springs. Weigh it down with something else first."
        : outcome === "solved"
          ? "The idol is yours."
          : "The trap has sprung. The idol can still be taken, but it no longer pays."
    );
    return () => bus.emit("hint", null);
  }, [outcome, safeNow]);

  /** Something other than the idol is holding the plate down. */
  const weighted = () => carry.countResting(plate[0], plate[2], PLATE_RADIUS, IDOL) > 0;

  // The plate shows whether lifting the idol is safe: green when weighted
  // by something else, red when the idol alone holds it. Written only on
  // change, so the frame loop allocates nothing.
  useFrame(() => {
    if (!plateMat.current) return;
    const safe = weighted();
    if (safe === plateWeighted.current) return;
    plateWeighted.current = safe;
    plateMat.current.emissive.copy(safe ? PLATE_SAFE : PLATE_ARMED);
    setSafeNow(safe);
  });

  const onIdolLifted = () => {
    if (outcome !== "pending") return;
    const run = useRun.getState();
    if (weighted()) {
      setOutcome("solved");
      run.clearRoom(room.id);
      run.collectGem(`${room.id}:puzzle`);
      bus.emit("puzzleResult", { roomId: room.id, completed: true });
    } else {
      setOutcome("sprung");
      run.failRoom(room.id);
      run.damage();
      bus.emit("puzzleResult", { roomId: room.id, completed: false });
    }
  };

  /** Anything dropped near the plate lands exactly on it. */
  const snapToPlate = (aim: Vector3) => {
    const dx = aim.x - plate[0];
    const dz = aim.z - plate[2];
    if (dx * dx + dz * dz <= (PLATE_RADIUS + 0.6) ** 2) {
      return new Vector3(plate[0], GROUND_Y + 0.35, plate[2]);
    }
    return null;
  };

  return (
    <>
      <Dressing room={room} seed={seed} />

      {/* The altar and its plate. */}
      <group position={plate}>
        <RigidBody type="fixed" colliders={false}>
          <mesh position={[0, 0.17, 0]} castShadow>
            <cylinderGeometry args={[1.3, 1.4, 0.34, 16]} />
            <meshStandardMaterial color="#5c5a63" roughness={0.9} />
          </mesh>
          <CuboidCollider args={[1.35, 0.17, 1.35]} position={[0, 0.17, 0]} />
        </RigidBody>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[PLATE_RADIUS, PLATE_RADIUS, 0.05, 20]} />
          <meshStandardMaterial ref={plateMat} color="#6a5a3a" emissive="#8f2f38" emissiveIntensity={0.45} metalness={0.4} roughness={0.5} />
        </mesh>
      </group>

      <Carryable
        id={IDOL}
        name="idol"
        position={[plate[0], GROUND_Y + 0.35, plate[2]]}
        onPickUp={onIdolLifted}
        snapDrop={snapToPlate}
      >
        <mesh position={[0, 0.3, 0]} castShadow>
          <dodecahedronGeometry args={[0.28, 0]} />
          <meshStandardMaterial color="#e0b040" emissive="#8a6a10" emissiveIntensity={0.5} metalness={0.7} roughness={0.3} />
        </mesh>
      </Carryable>

      {candleSpots.map((p, i) => (
        <Carryable key={i} id={`candle-${i}`} name="candle" position={[p[0], GROUND_Y, p[2]]} snapDrop={snapToPlate}>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.07, 0.08, 0.32, 10]} />
            <meshStandardMaterial color="#efe6c8" />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <coneGeometry args={[0.04, 0.12, 8]} />
            <meshStandardMaterial color="#ffb24d" emissive="#ff9a2e" emissiveIntensity={2} />
          </mesh>
          <pointLight position={[0, 0.5, 0]} color="#ffb86c" intensity={2} distance={3.5} />
        </Carryable>
      ))}
    </>
  );
}
