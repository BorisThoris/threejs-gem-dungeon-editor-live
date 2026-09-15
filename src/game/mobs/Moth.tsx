import { useEffect, useMemo, useRef } from "react";
import { roomStep } from "../dungeon/footprint";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";

import { halfSize, type Room } from "../dungeon/types";
import * as din from "../din/din";
import { canControl, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { steerInRoom, type Patch } from "../warden/steer";
import { MOTH_SPEED } from "../world";
import { wispAt } from "./lamplighter";

/**
 * The floor's moth, in the one room it perches in. A raised lantern draws
 * it; it settles on the light and, when the lantern goes down, carries
 * the light in the Warden's eye a while longer - which is the price of
 * having lit the room it lives in. It flies, so nothing on the floor bites
 * it, and it goes round the furniture because that is in the way at any
 * height.
 */
export function Moth({ room, obstacles }: { room: Room; obstacles: readonly Patch[] }) {
  const group = useRef<Group>(null);
  const perch = useMemo(() => {
    const half = halfSize(room);
    return { x: half * 0.5, y: 2.6, z: -half * 0.5 };
  }, [room]);
  const pos = useRef({ x: perch.x, y: perch.y, z: perch.z });
  const heard = useMemo(() => din.emptyArrival(), []);

  // Leaving the room takes it off the lantern, and its wings with it.
  useEffect(
    () => () => {
      useRun.getState().mothLeaves();
      sfx.flutterStop();
    },
    []
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const run = useRun.getState();
    if (!canControl(run)) {
      sfx.flutterStop();
      return;
    }
    const cam = state.camera.position;
    const p = pos.current;
    const t = state.clock.elapsedTime;
    /**
     * Its row is [bright] at 0.35, and this is now what it reads rather
     * than whether the lantern is up. Two things follow that a boolean
     * could not say: a flame turned down to a glimmer no longer draws it,
     * so lowering the lantern is the way to be rid of it; and the wisp,
     * which is brighter than a half-raised lantern, draws it instead when
     * the flame is low - the moth goes to the brightest thing in the
     * room, which is what a moth is.
     */
    const drawn = din.answering(heard, "moth", room.id);
    const toWisp = drawn && heard.source === "wisp" && wispAt.out && wispAt.roomId === room.id;
    // Its wings, while the light has it: at your ear when it is on you,
    // and nothing when it is back on its perch across the room.
    const toCam = Math.hypot(cam.x - p.x, cam.z - p.z);
    if (drawn) sfx.flutter(1 - toCam / 4, sideOf(p.x - cam.x, p.z - cam.z));
    else sfx.flutterStop();
    const target = !drawn
      ? perch
      : toWisp
        ? { x: wispAt.x + Math.cos(t * 2.2) * 0.5, y: 1.8 + Math.sin(t * 3) * 0.1, z: wispAt.z + Math.sin(t * 2.2) * 0.5 }
        : { x: cam.x + Math.cos(t * 2.2) * 0.7, y: cam.y + 0.2 + Math.sin(t * 3) * 0.1, z: cam.z + Math.sin(t * 2.2) * 0.7 };
    const h = steerInRoom(room, p.x, p.z, target.x, target.z, obstacles, 0, 0.15);
    const flat = Math.hypot(target.x - p.x, target.z - p.z);
    const stepFlat = Math.min(MOTH_SPEED * delta, flat, 0.5);
    [p.x, p.z] = roomStep(room, p.x, p.z, h.dx * stepFlat, h.dz * stepFlat, 0.15);
    p.y += Math.sign(target.y - p.y) * Math.min(MOTH_SPEED * delta, Math.abs(target.y - p.y));
    const near = Math.hypot(cam.x - p.x, cam.z - p.z) < 1.2;
    // It only carries the light in the Warden's eye when the light is yours.
    if (drawn && !toWisp && near) run.mothLands();
    else if ((!drawn || toWisp) && run.mothOn) run.mothLeaves();
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = t * 6;
    if (import.meta.env.DEV) {
      (window as unknown as { __moth?: { x: number; z: number; on: boolean; drawn: boolean; to: string } }).__moth = {
        x: p.x, z: p.z, on: run.mothOn, drawn, to: !drawn ? "perch" : toWisp ? "wisp" : "lantern",
      };
    }
  });

  return (
    <group ref={group} position={[perch.x, perch.y, perch.z]}>
      <mesh>
        <sphereGeometry args={[0.06, 6, 5]} />
        <meshBasicMaterial color="#e8e0b0" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.08, 0, 0]} rotation={[0, 0, s * 0.5]}>
          <planeGeometry args={[0.14, 0.1]} />
          <meshBasicMaterial color="#d8d0a0" side={2} transparent opacity={0.85} />
        </mesh>
      ))}
      <pointLight color="#ffe9a0" intensity={0.4} distance={2} />
    </group>
  );
}
