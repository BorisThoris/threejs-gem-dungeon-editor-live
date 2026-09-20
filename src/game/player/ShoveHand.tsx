import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { runClock, useRun } from "../state/run";
import { SHOVE_COOLDOWN_S } from "./combat";

/** A brief first-person hand motion gives even a missed shove a visible response. */
export function ShoveHand() {
  const root = useRef<Group>(null);
  const hand = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (!root.current || !hand.current) return;
    const run = useRun.getState();
    const elapsed = runClock(run) - (run.shoveReadyAt - SHOVE_COOLDOWN_S);
    root.current.visible = run.shoveReadyAt > 0 && elapsed >= 0 && elapsed < 0.35;
    root.current.position.copy(camera.position);
    root.current.quaternion.copy(camera.quaternion);
    const stroke = Math.sin(Math.min(1, Math.max(0, elapsed / 0.35)) * Math.PI);
    hand.current.position.set(0.27 - stroke * 0.13, -0.28 + stroke * 0.08, -0.45 - stroke * 0.4);
  });
  return <group ref={root} visible={false}>
    <group ref={hand}>
      <mesh><boxGeometry args={[0.18, 0.14, 0.2]} /><meshStandardMaterial color="#987a56" roughness={1} /></mesh>
      <mesh position={[0.04, -0.08, 0.19]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.13, 0.13, 0.3]} /><meshStandardMaterial color="#393e43" roughness={1} />
      </mesh>
    </group>
  </group>;
}
