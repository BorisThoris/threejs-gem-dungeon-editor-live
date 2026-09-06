import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, type Group, type InstancedMesh, type Mesh, type MeshBasicMaterial, type PointLight } from "three";

import { bus } from "../events";
import { useRun } from "../state/run";
import { BOMB_RADIUS, BURST_EMBERS, BURST_EMBER_S, BURST_LIGHT, BURST_LIGHT_S, GROUND_Y, MAX_FRAME_S } from "../world";

/**
 * What a blast looks like.
 *
 * The burst itself is the store's (`detonate`): it hurts whoever stands in
 * it, routs the Warden, downs the Harrier, kneels the Keeper, opens the
 * cracked wall, and for eight runs that was the whole of it - a boom and a
 * set of facts changing. The centrepiece of the arc, and nothing to see.
 * This listens to the same event the sound does and gives it a body: a
 * flash that dies in half a second, forty embers thrown out and up and
 * pulled back down, and a disc of dust spreading at the floor.
 *
 * One of everything. The embers are one instanced mesh and one draw call,
 * the light and the dust one mesh each, all mounted once and kept
 * invisible between blasts, so a burst costs no allocation and the room's
 * budget nothing it does not already pay. It plays in rendered frames -
 * each frame advances it by its delta, capped like the look and the wisp
 * are - so a machine drawing one frame a second still draws every stage
 * of it rather than the first and none of the rest, and a pause freezes
 * it mid-air like everything else. One burst at a time: a second one
 * restarts it, and there is one bomb a floor from the shop.
 *
 * Nothing here is state. The store does not know the light exists, and
 * the checks read the probe this writes rather than the scene.
 */
export function Burst() {
  const group = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const embers = useRef<InstancedMesh>(null);
  const dust = useRef<Mesh>(null);
  const state = useRef({ active: false, t: 0, x: 0, z: 0 });
  const vel = useMemo(() => new Float32Array(BURST_EMBERS * 3), []);
  const dummy = useMemo(() => new Object3D(), []);

  useEffect(
    () =>
      bus.on("bombBurst", ({ roomId, x, z }) => {
        // Only a blast in the room the player is in is seen. A bomb left
        // behind for the Warden goes off out of sight, as it should.
        if (useRun.getState().currentRoomId !== roomId) return;
        const s = state.current;
        s.active = true;
        s.t = 0;
        s.x = x;
        s.z = z;
        for (let i = 0; i < BURST_EMBERS; i++) {
          const a = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 5;
          vel[i * 3] = Math.cos(a) * speed;
          vel[i * 3 + 1] = 2.5 + Math.random() * 5;
          vel[i * 3 + 2] = Math.sin(a) * speed;
        }
      }),
    [vel]
  );

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const s = state.current;
    if (!s.active) {
      probe(false, 0, 0);
      return;
    }
    if (!useRun.getState().paused) s.t += Math.min(delta, MAX_FRAME_S);
    const t = s.t;
    if (t > BURST_EMBER_S) {
      s.active = false;
      g.visible = false;
      if (light.current) light.current.intensity = 0;
      probe(false, 0, 0);
      return;
    }
    g.visible = true;
    g.position.set(s.x, GROUND_Y, s.z);
    const l = light.current;
    const glow = Math.max(0, 1 - t / BURST_LIGHT_S) * BURST_LIGHT;
    if (l) l.intensity = glow;
    const m = embers.current;
    let alive = 0;
    if (m) {
      const life = 1 - t / BURST_EMBER_S;
      for (let i = 0; i < BURST_EMBERS; i++) {
        const y = vel[i * 3 + 1] * t - 4.9 * t * t;
        dummy.position.set(vel[i * 3] * t, Math.max(0.03, y), vel[i * 3 + 2] * t);
        dummy.scale.setScalar(0.12 * life);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        alive++;
      }
      m.instanceMatrix.needsUpdate = true;
    }
    const d = dust.current;
    if (d) {
      const k = Math.min(1, t / (BURST_EMBER_S * 0.7));
      d.scale.setScalar(0.4 + k * BOMB_RADIUS * 1.2);
      (d.material as MeshBasicMaterial).opacity = 0.35 * (1 - k);
    }
    probe(true, glow, alive);
  });

  return (
    <group ref={group} visible={false}>
      <pointLight ref={light} position={[0, 0.8, 0]} color="#ffb060" intensity={0} distance={BOMB_RADIUS * 3} decay={1.6} />
      <instancedMesh ref={embers} args={[undefined, undefined, BURST_EMBERS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffb060" />
      </instancedMesh>
      <mesh ref={dust} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color="#3a3028" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** For the checks: whether a blast is playing, how bright, and how many embers are up. */
function probe(active: boolean, light: number, embers: number) {
  if (!import.meta.env.DEV) return;
  const w = window as unknown as { __burst?: { active: boolean; light: number; embers: number } };
  const b = (w.__burst ??= { active: false, light: 0, embers: 0 });
  b.active = active;
  b.light = light;
  b.embers = embers;
}
