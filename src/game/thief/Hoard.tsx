import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

import { InteractTrigger } from "../interact/InteractTrigger";
import { useRun } from "../state/run";
import { CLOSE_REACH, GROUND_Y } from "../world";

/**
 * What the Cutpurse has taken, in a heap where it lives.
 *
 * The pile is the Hoard and the room is the nest, and they are two files
 * because they are two facts: `nest.ts` answers which room, from the floor
 * alone, and this draws what is in it. They were `nest.ts` and `Nest.tsx`
 * for about ten minutes, which is a pair of names no macOS or Windows
 * checkout can hold at once - the bundler on this machine found it first
 * and asked for a file that does not exist.
 *
 * The point of the nest is that a theft has an address. The gems are not
 * destroyed and they are not returned; they are somewhere, and the walk
 * there is priced in the only currency this game has - how much further
 * into a floor that is more awake than when you last crossed it are you
 * willing to go. Most of the time the answer for one gem is no, and that
 * is the design working rather than the player being denied something.
 *
 * Set against the wall rather than in the middle, so it never lands on the
 * room's own gem or in a doorway lane: the nest room is an ordinary room
 * and still has everything an ordinary room has.
 */
export function Hoard({ roomId, half }: { roomId: string; half: number }) {
  const group = useRef<Group>(null);
  const gems = useRun((s) => s.nestGems);
  // A corner, chosen from the room's own id so it is the same corner every
  // time the player walks back in.
  const at = useMemo<[number, number, number]>(() => {
    let h = 0;
    for (let i = 0; i < roomId.length; i++) h = (h * 31 + roomId.charCodeAt(i)) >>> 0;
    const sx = h & 1 ? 1 : -1;
    const sz = h & 2 ? 1 : -1;
    const d = half * 0.62;
    return [sx * d, GROUND_Y, sz * d];
  }, [roomId, half]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = state.clock.elapsedTime * 0.6;
  });

  if (gems < 1) return null;

  return (
    <group position={at}>
      {/* The heap it sleeps on: bones and scraps, always drawn, so the
          room reads as a nest rather than as gems on the floor. */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 16]} />
        <meshStandardMaterial color="#3b3025" roughness={1} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[Math.cos(i * 1.7) * 0.55, 0.07, Math.sin(i * 1.7) * 0.55]}
          rotation={[0, i * 0.9, 1.3]}
        >
          <capsuleGeometry args={[0.03, 0.24, 3, 5]} />
          <meshStandardMaterial color="#b6ac97" roughness={0.9} />
        </mesh>
      ))}
      <group ref={group} position={[0, 0.3, 0]}>
        {Array.from({ length: Math.min(6, gems) }, (_, i) => {
          const a = (i / Math.min(6, gems)) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.22, Math.sin(i * 2.1) * 0.06, Math.sin(a) * 0.22]}>
              <octahedronGeometry args={[0.12, 0]} />
              <meshStandardMaterial
                color="#7fe6ff"
                emissive="#2b7f99"
                emissiveIntensity={0.7}
                roughness={0.2}
              />
            </mesh>
          );
        })}
      </group>
      <pointLight position={[0, 0.6, 0]} color="#7fe6ff" intensity={5} distance={6} decay={1.7} />
      <InteractTrigger
        position={[0, 0.4, 0]}
        radius={CLOSE_REACH}
        label={`Take back ${gems} gem${gems === 1 ? "" : "s"}`}
        onInteract={() => useRun.getState().emptyNest()}
      />
    </group>
  );
}
