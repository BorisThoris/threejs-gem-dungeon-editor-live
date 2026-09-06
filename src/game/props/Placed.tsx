import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";

import { SNARE_RADIUS } from "../items/catalog";
import { runClock, useRun, wardNow, type PlacedDevice } from "../state/run";
import { GROUND_Y } from "../world";

/**
 * The things the player has put down in this room.
 *
 * Drawn small and low: a device is a mark on the floor rather than
 * furniture, and it has to be readable from across the room without being
 * mistaken for something to pick up. A sprung snare stays as wreckage, so
 * a player can see that the room's one answer has already been spent.
 */
export function PlacedDevices({ roomId }: { roomId: string }) {
  const placed = useRun((s) => s.placed);
  const here = useMemo(() => placed.filter((d) => d.roomId === roomId), [placed, roomId]);
  if (!here.length) return null;
  return (
    <>
      {here.map((device) => (
        <Device key={device.key} device={device} />
      ))}
    </>
  );
}

function Device({ device }: { device: PlacedDevice }) {
  switch (device.id) {
    case "snare":
      return <Snare device={device} />;
    case "wardstone":
      return <WardStone device={device} />;
    case "bomb":
      return <Bomb device={device} />;
    default:
      return <IronKnot device={device} />;
  }
}

/**
 * A ring of wire pegged to the floor, with the loop still standing while it
 * is live and flat once it has caught something.
 */
function Snare({ device }: { device: PlacedDevice }) {
  const pegs = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return [Math.cos(a) * SNARE_RADIUS * 0.72, Math.sin(a) * SNARE_RADIUS * 0.72] as const;
      }),
    []
  );
  const colour = device.live ? "#8f9aa8" : "#4a4a52";
  return (
    <group position={[device.x, GROUND_Y, device.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[SNARE_RADIUS * 0.66, SNARE_RADIUS * 0.78, 24]} />
        <meshBasicMaterial color={colour} transparent opacity={device.live ? 0.75 : 0.3} />
      </mesh>
      {pegs.map(([x, z], i) => (
        <mesh key={i} position={[x, device.live ? 0.09 : 0.02, z]}>
          <boxGeometry args={[0.05, device.live ? 0.18 : 0.04, 0.05]} />
          <meshStandardMaterial color={colour} metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** A cairn that glows while it holds, and goes dark when its time is up. */
function WardStone({ device }: { device: PlacedDevice }) {
  const group = useRef<Group>(null);
  const lit = useRef(true);
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    // Read off the store rather than kept in state: the ward is a deadline
    // on the run's clock, and a component that re-rendered when it expired
    // would be a second owner of when that is.
    const holding = wardNow(useRun.getState()) === device.roomId;
    lit.current = holding;
    const glow = holding ? 0.6 + Math.sin(state.clock.elapsedTime * 2.2) * 0.25 : 0;
    g.scale.setScalar(1);
    const mark = g.children[g.children.length - 1] as { material?: { opacity: number } };
    if (mark?.material) mark.material.opacity = 0.15 + glow * 0.5;
  });
  return (
    <group ref={group} position={[device.x, GROUND_Y, device.z]}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <dodecahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color="#cfc7ae" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.32, 0]} castShadow>
        <dodecahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color="#b9b19a" roughness={0.85} />
      </mesh>
      <pointLight position={[0, 0.5, 0]} color="#9fd8ff" intensity={4} distance={5} decay={1.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.1, 22]} />
        <meshBasicMaterial color="#9fd8ff" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

/** The knot of iron, lying where it landed and doing nothing further. */
function IronKnot({ device }: { device: PlacedDevice }) {
  return (
    <group position={[device.x, GROUND_Y, device.z]}>
      {[
        [0, 0.06, 0],
        [0.12, 0.05, 0.08],
        [-0.1, 0.05, 0.06],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0.4 * i, 0.7 * i, 0]} castShadow>
          <torusGeometry args={[0.09, 0.026, 6, 10]} />
          <meshStandardMaterial color="#6b6f78" metalness={0.8} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

/** A black sphere with a fuse that burns down. It is meant to be walked away from. */
function Bomb({ device }: { device: PlacedDevice }) {
  const fuse = useRef<Group>(null);
  useFrame(() => {
    const g = fuse.current;
    if (!g || device.fuseAt === undefined) return;
    const s = useRun.getState();
    // The fuse shortens as its time runs out, and flickers.
    const left = Math.max(0, device.fuseAt - runClock(s));
    g.scale.y = Math.max(0.05, Math.min(1, left / 3));
    g.visible = Math.floor(runClock(s) * 14) % 3 !== 0;
  });
  return (
    <group position={[device.x, GROUND_Y, device.z]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 10]} />
        <meshStandardMaterial color="#1c1c20" roughness={0.6} metalness={0.2} />
      </mesh>
      <group ref={fuse} position={[0, 0.44, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.24, 6]} />
          <meshStandardMaterial color="#e8b04a" emissive="#ff7a1a" emissiveIntensity={1.6} />
        </mesh>
      </group>
    </group>
  );
}
