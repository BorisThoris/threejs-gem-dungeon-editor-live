/* eslint-disable react-refresh/only-export-components -- placementsFor is the
   pure half of this component and the editor previews with it directly. */
import { useMemo } from "react";

import {
  centreSpots,
  cornerSpots,
  HAZARD_RADIUS,
  inDoorLane,
  quadrantSpots,
  trapHazards,
  type Vec3,
} from "../dungeon/layout";
import { memoryAnchors } from "../puzzles/anchors";
import { createRng, shuffle } from "../rng";
import type { PropPlacement, Room, RoomKind } from "../dungeon/types";
import { InteractTrigger } from "../interact/InteractTrigger";
import { SATCHEL_SLOTS, nameOf, rollItem } from "../items/catalog";
import { describe } from "../items/charge";
import { Braziers } from "../props/Braziers";
import { ContactShadows } from "../props/ContactShadows";
import { BREAKABLE, breakKey } from "../props/breakable";
import { Prop, PropColliders } from "../props/catalog";
import { useRun } from "../state/run";
import { gemFor, keyFor, reservedAnchors } from "./kinds";
import { CLOSE_REACH } from "../world";
import { biomeFor } from "./biomes";
import { arrangementFor, type Spots } from "./layouts";
import { sentryFor } from "../sentry/placement";
import { authoredProps } from "./templates";

interface DressingProps {
  /** Dress it as a vault - a treasure room's chests - whatever it is. */
  hoard?: boolean;
  room: Room;
  seed: number;
}
import { placementsFor } from "./placements";

export { placementsFor, type DressingOptions } from "./placements";


/** Seeded per room, so it is the same every time you walk back in. */
export function Dressing({ room, seed, hoard = false }: DressingProps) {
  const asVault = useRun((s) => s.dungeon?.vaultId === room.id) || hoard;
  const hasKey = useRun((s) => s.dungeon?.keyRoomId === room.id);
  const floor = useRun((s) => s.floor);
  // The order a room is assembled in: the gem, then the key, then the
  // watcher, then the furniture. Each is worked out from the room and the
  // seed alone, so the room shell and this arrive at the same answers
  // without talking to each other.
  const key = useMemo(() => (hasKey ? keyFor(room, seed) : null), [room, seed, hasKey]);
  const sentry = useMemo(
    () => sentryFor(room, seed, floor, key ? [key] : [])?.at ?? null,
    [room, seed, floor, key]
  );
  const placements = useMemo(
    () => placementsFor(room, seed, { asVault, sentry, key }),
    [room, seed, asVault, sentry, key]
  );
  // The gem and the room's own content stand on the same floor the props
  // do, so they are grounded the same way.
  const grounded = useMemo(() => {
    const gem = gemFor(room, seed);
    return [...reservedAnchors(room), ...(gem ? [gem] : [])];
  }, [room, seed]);
  // The braziers are drawn as one instanced set rather than one at a time:
  // four of them in every room, seven identical meshes each, and nothing
  // about them ever moves. Split by kind here rather than in the layouts,
  // so an authored template that places a brazier joins the same set.
  // What has burst this floor stays burst: drawn as a wreck, walked
  // through, and not in the collider set. The chests keep the full list,
  // because their keys are its indices.
  const broken = useRun((s) => s.broken);
  const standing = useMemo(
    () => placements.filter((p) => !(BREAKABLE.has(p.kind) && broken.includes(breakKey(room, p)))),
    [placements, broken, room]
  );
  const wrecks = useMemo(
    () => placements.filter((p) => BREAKABLE.has(p.kind) && broken.includes(breakKey(room, p))),
    [placements, broken, room]
  );
  const [braziers, rest] = useMemo(() => {
    const lit: PropPlacement[] = [];
    const other: PropPlacement[] = [];
    for (const p of standing) (p.kind === "torch" ? lit : other).push(p);
    return [lit, other];
  }, [standing]);

  return (
    <group>
      <Braziers places={braziers} roomId={room.id} />
      {rest.map((p) => (
        <Prop key={`${p.kind}@${p.x.toFixed(1)},${p.z.toFixed(1)}`} kind={p.kind} position={[p.x, 0, p.z]} rotation={p.rotation} scale={p.scale} />
      ))}
      {wrecks.map((p) => (
        <Wreck key={breakKey(room, p)} x={p.x} z={p.z} />
      ))}
      <ContactShadows placements={standing} extra={grounded} />
      <PropColliders placements={standing} />
      <Chests room={room} placements={placements} />
    </group>
  );
}

/** Where a breakable stood: a few dark shards, for the rest of the floor. */
function Wreck({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {[0, 1.7, 3.5, 4.9].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3]} rotation={[0, a, 0.3]}>
          <boxGeometry args={[0.28, 0.08, 0.16]} />
          <meshStandardMaterial color="#2c2118" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The chests in a room, and what is in them.
 *
 * A chest was scenery until now. Each one holds one consumable, decided by
 * the run's seed and the floor, and stays empty once taken - so a room is
 * worth walking into for something other than its gem, and the vault, with
 * three of them, is finally worth its name.
 */
function Chests({ room, placements }: { room: Room; placements: PropPlacement[] }) {
  const seed = useRun((s) => s.dungeon?.seed ?? 0);
  const floor = useRun((s) => s.floor);
  const looted = useRun((s) => s.looted);
  const appearances = useRun((s) => s.appearances);
  const identified = useRun((s) => s.identified);
  /**
   * A chest with nowhere to put what is in it.
   *
   * `takeItem` declines a full satchel, and a chest was one of the three
   * triggers in the game with no `enabled` on it, so it went on offering
   * "Open the chest - a green potion" with four things already carried and
   * E did nothing but drop a hint afterwards. Saying so before the press is
   * better on its own, and it stopped being optional when the prompt began
   * going to the nearest thing that can actually be *used*: a chest that
   * claims it can be outranks the door standing beside it, and the player
   * cannot leave the room the game is telling them to loot.
   */
  const full = useRun((s) => s.satchel.length >= SATCHEL_SLOTS);
  const charges = useRun((s) => s.charges);

  return (
    <>
      {placements.map((p, i) => {
        if (p.kind !== "chest") return null;
        const key = `${room.id}:${i}`;
        if (looted.includes(key)) return null;
        const id = rollItem(seed, key, floor);
        const known = identified.includes(id);
        // "a cursed amber potion". The charge is on the prompt because it
        // is the whole decision at a chest: a cursed unknown bottle is a
        // real question, and an unknown bottle that might be cursed is the
        // coin flip the game already had. `describe` puts the word inside
        // the article rather than in front of it.
        const what = describe(charges[id], nameOf(id, appearances, known));
        return (
          <InteractTrigger
            key={key}
            position={[p.x, 0, p.z]}
            label={`Open the chest - ${what}`}
            enabled={!full}
            blockedReason="Your satchel is full. Use something first."
            radius={CLOSE_REACH}
            onInteract={() => useRun.getState().takeItem(id, key)}
          />
        );
      })}
    </>
  );
}
