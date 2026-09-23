import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Group, Mesh, MeshBasicMaterial, PerspectiveCamera } from "three";
import { runClock, useRun } from "../state/run";
import { useSettings } from "../state/settings";
import { SHOVE_CHARGE_S, SHOVE_COOLDOWN_S } from "./combat";
import { createHandGeometry } from "./handGeometry";
import { localLightAt } from "../lighting/perception";

/** Camera-space viewmodel: readable in darkness and never buried in a wall. */
export function ShoveHand() {
  const geometry = useMemo(createHandGeometry, []);
  useEffect(() => () => { Object.values(geometry).forEach(g => g.dispose()); }, [geometry]);
  const joints = useRef<(Group | null)[]>([]);
  const root = useRef<Group>(null);
  const hand = useRef<Group>(null);
  const sleeve = useRef<Mesh>(null);
  const fingers = useRef<Group>(null);
  const chargeMarks = useRef<Group>(null);
  const palette = useRef(new Map<MeshBasicMaterial, Color>());
  const brightness = useRef(0.65);
  useEffect(() => {
    const colours = palette.current;
    root.current?.traverse(object => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshBasicMaterial)) return;
      object.material.fog = false;
      if (object.material.toneMapped) colours.set(object.material, object.material.color.clone());
    });
    return () => { colours.clear(); };
  }, []);
  useFrame(({ camera }, delta) => {
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
    const recovery = striking ? 0 : Math.max(0, Math.min(1, (run.shoveReadyAt - now) / (SHOVE_COOLDOWN_S - 0.42)));
    const breath = useSettings.getState().cameraBob ? Math.sin(now * 2.2) * 0.004 : 0;
    root.current.visible = run.phase === "playing" && !run.transitioning;
    const light = run.currentRoomId ? localLightAt(run.currentRoomId, camera.position.x, camera.position.z) ?? 0.3 : 0.3;
    brightness.current += (0.24 + light * 0.76 - brightness.current) * (1 - Math.exp(-delta * 8));
    for (const [material, colour] of palette.current) material.color.copy(colour).multiplyScalar(brightness.current);
    root.current.position.copy(camera.position);
    root.current.quaternion.copy(camera.quaternion);
    // Preserve the silhouette on portrait screens without shifting the crosshair.
    const fit = camera instanceof PerspectiveCamera ? Math.min(1, camera.aspect / 1.15) : 1;
    root.current.scale.setScalar(fit);
    // Keep the wrist small on portrait screens, but let the sleeve continue
    // below the frame instead of leaving a floating severed forearm.
    if (sleeve.current) {
      const extension = 0.215 * (1 / fit - 1);
      sleeve.current.scale.y = 1 / fit;
      sleeve.current.position.set(0.015, -0.16 - extension * Math.cos(0.48), 0.22 + extension * Math.sin(0.48));
    }
    hand.current.position.set(0.26 + draw * 0.035 - stroke * 0.14, (-0.25 + draw * 0.035 + stroke * 0.075 + breath - recovery * 0.035) / fit, (-0.62 + draw * 0.07 - stroke * 0.3) / fit);
    hand.current.rotation.set(0.12 + draw * 0.5 - stroke * 0.25, -0.18 + stroke * 0.12, -0.12 - draw * 0.18 + recovery * 0.12);
    fingers.current.rotation.x = -0.18 - draw * 0.55 + stroke * 0.32;
    joints.current.forEach((joint, i) => { if (joint) joint.rotation.x = -0.28 - draw * (0.68 + i * 0.035) + stroke * 0.3; });
    chargeMarks.current.scale.x = Math.max(0.001, charge);
    chargeMarks.current.visible = charging;
  });
  return <group ref={root} name="shove-hand">
    <group ref={hand}>
      <mesh ref={sleeve} geometry={geometry.sleeve} renderOrder={1000} position={[0.015, -0.16, 0.22]} rotation={[-0.48, 0, 0]}>
        <meshBasicMaterial vertexColors depthTest={false} depthWrite={false} />
      </mesh>
      <mesh geometry={geometry.cuff} renderOrder={1001} position={[0, -0.047, 0.06]} rotation={[-0.48, 0, 0]}>
        <meshBasicMaterial vertexColors depthTest={false} depthWrite={false} />
      </mesh>
      <mesh name="hand-palm" geometry={geometry.palm} renderOrder={1002}>
        <meshBasicMaterial vertexColors depthTest={false} depthWrite={false} />
      </mesh>
      <group ref={fingers} position={[0, 0.057, -0.003]}>
        {[-0.048, -0.016, 0.018, 0.049].map((x, i) => <group key={x}
          position={[x, [0, 0.013, 0.009, -0.006][i], 0]} scale={[1, [0.87, 1, 0.95, 0.73][i], 1]}
          rotation={[0, 0, (1.5 - i) * 0.085]}>
          <mesh geometry={geometry.proximal} renderOrder={1003}>
            <meshBasicMaterial vertexColors depthTest={false} depthWrite={false} />
          </mesh>
          <group ref={value => { joints.current[i] = value; }} position={[0, 0.053, 0]}>
            <mesh geometry={geometry.distal} renderOrder={1004}>
              <meshBasicMaterial vertexColors depthTest={false} depthWrite={false} />
            </mesh>
          </group>
        </group>)}
      </group>
      <group position={[-0.062, -0.017, 0.008]} rotation={[0.15, -0.15, 0.9]} scale={1.22}>
        <mesh geometry={geometry.proximal} renderOrder={1005}>
          <meshBasicMaterial vertexColors depthTest={false} depthWrite={false} />
        </mesh>
        <mesh geometry={geometry.distal} renderOrder={1006} position={[0, 0.052, 0]} rotation={[-0.38, 0, 0]}>
          <meshBasicMaterial vertexColors depthTest={false} depthWrite={false} />
        </mesh>
      </group>
      <group ref={chargeMarks} position={[-0.045, -0.048, 0.12]}>
        <mesh renderOrder={1007} position={[0.045, 0, 0]}>
          <boxGeometry args={[0.09, 0.008, 0.006]} />
          <meshBasicMaterial color="#ffe1a0" toneMapped={false} depthTest={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  </group>;
}
