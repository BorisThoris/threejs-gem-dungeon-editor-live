import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, PerspectiveCamera } from "three";
import { runClock, useRun } from "../state/run";
import { useSettings } from "../state/settings";
import { SHOVE_CHARGE_S, SHOVE_COOLDOWN_S } from "./combat";

/** Camera-space viewmodel: readable in darkness and never buried in a wall. */
export function ShoveHand() {
  const root = useRef<Group>(null);
  const hand = useRef<Group>(null);
  const fingers = useRef<Group>(null);
  const chargeMarks = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (!root.current || !hand.current || !fingers.current || !chargeMarks.current) return;
    const run = useRun.getState();
    const now = runClock(run);
    const elapsed = now - (run.shoveReadyAt - SHOVE_COOLDOWN_S);
    const striking = run.shoveReadyAt > 0 && elapsed >= 0 && elapsed < 0.42;
    const charging = run.shoveChargingAt !== null;
    const charge = charging ? Math.min(1, Math.max(0, (now - run.shoveChargingAt!) / SHOVE_CHARGE_S)) : 0;
    const release = striking ? Math.max(0, 1 - elapsed / 0.1) : 0;
    const draw = charge * charge * (3 - 2 * charge) + release;
    const stroke = striking ? Math.sin(Math.min(1, elapsed / 0.42) * Math.PI) : 0;
    const breath = useSettings.getState().cameraBob ? Math.sin(now * 2.2) * 0.004 : 0;
    root.current.visible = run.phase === "playing";
    root.current.position.copy(camera.position);
    root.current.quaternion.copy(camera.quaternion);
    // Preserve the silhouette on portrait screens without shifting the crosshair.
    const fit = camera instanceof PerspectiveCamera ? Math.min(1, camera.aspect / 1.15) : 1;
    root.current.scale.setScalar(fit);
    hand.current.position.set(0.26 + draw * 0.035 - stroke * 0.14, -0.25 + draw * 0.035 + stroke * 0.075 + breath, -0.62 + draw * 0.07 - stroke * 0.3);
    hand.current.rotation.set(0.12 + draw * 0.5 - stroke * 0.25, -0.18 + stroke * 0.12, -0.12 - draw * 0.18);
    fingers.current.rotation.x = -0.22 - draw * 0.85 + stroke * 0.3;
    chargeMarks.current.scale.x = Math.max(0.001, charge);
    chargeMarks.current.visible = charging;
  });
  return <group ref={root}>
    <group ref={hand}>
      <mesh renderOrder={1000} position={[0.015, -0.16, 0.22]} rotation={[-0.48, 0, 0]}>
        <cylinderGeometry args={[0.072, 0.11, 0.43, 7]} />
        <meshBasicMaterial color="#394951" depthTest={false} depthWrite={false} />
      </mesh>
      <mesh renderOrder={1001} position={[0, -0.047, 0.06]} rotation={[-0.48, 0, 0]}>
        <cylinderGeometry args={[0.073, 0.078, 0.09, 8]} />
        <meshBasicMaterial color="#a18e69" depthTest={false} depthWrite={false} />
      </mesh>
      {[0, 1, 2].map(i => <mesh key={i} renderOrder={1002} position={[0, -0.027 - i * 0.02, 0.05 + i * 0.01]} rotation={[-0.48, 0, 0]}>
        <cylinderGeometry args={[0.076, 0.076, 0.007, 8]} />
        <meshBasicMaterial color="#655d4c" depthTest={false} depthWrite={false} />
      </mesh>)}
      <mesh renderOrder={1003} scale={[0.092, 0.105, 0.052]}>
        <sphereGeometry args={[1, 7, 5]} />
        <meshBasicMaterial color="#bc906b" depthTest={false} depthWrite={false} />
      </mesh>
      <group ref={fingers} position={[0, 0.063, -0.005]}>
        {[-0.062, -0.021, 0.021, 0.06].map((x, i) => <group key={x} position={[x, 0, 0]} rotation={[0, 0, (1.5 - i) * 0.07]}>
          <mesh renderOrder={1004} position={[0, 0.042, 0]}>
            <capsuleGeometry args={[0.019, i === 0 || i === 3 ? 0.057 : 0.08, 2, 6]} />
            <meshBasicMaterial color={i % 2 ? "#c69c76" : "#b88a65"} depthTest={false} depthWrite={false} />
          </mesh>
          <mesh renderOrder={1005} position={[0, 0.035, 0.018]}>
            <boxGeometry args={[0.024, 0.008, 0.005]} />
            <meshBasicMaterial color="#98704f" depthTest={false} depthWrite={false} />
          </mesh>
        </group>)}
      </group>
      <mesh renderOrder={1006} position={[-0.087, 0.003, 0.009]} rotation={[0.2, 0, -0.65]}>
        <capsuleGeometry args={[0.025, 0.066, 2, 6]} />
        <meshBasicMaterial color="#c39973" depthTest={false} depthWrite={false} />
      </mesh>
      <group ref={chargeMarks} position={[-0.057, -0.048, 0.107]}>
        <mesh renderOrder={1007} position={[0.057, 0, 0]}>
          <boxGeometry args={[0.114, 0.012, 0.008]} />
          <meshBasicMaterial color="#ffe1a0" toneMapped={false} depthTest={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  </group>;
}
