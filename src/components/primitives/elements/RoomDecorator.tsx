import React, { useMemo } from "react";
import {
  BreakableTorch,
  BreakableCandle,
  BreakableBarrel,
  BreakableChest,
  BreakableTable,
  BreakableChair,
  BreakableBookshelf,
  BreakablePotionBottle,
  BreakableCrystal,
  BreakableSkull,
} from "./index";
import Pillar from "./Pillar";
import Web from "./Web";

interface RoomDecoratorProps {
  roomType: string;
  roomSize?: number;
  /** Seeds the layout so a room looks the same every time you walk back in. */
  roomId?: string;
}

/**
 * Half-width of the clear lane kept along each axis through the room.
 *
 * Doors sit at the middle of each wall, so the straight line from one doorway
 * to the one opposite runs through the centre of the room. Every layout here
 * used to put a table at [0, 0, 0] with a solid collider - directly across
 * that path - and a chest a metre behind it. Nothing may stand in the cross.
 */
const DOOR_LANE_HALF_WIDTH = 2.75;

/** Deterministic PRNG, so a room's dressing does not move when it re-renders. */
const seededRandom = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Spot = [number, number, number];

/**
 * Anchor points in the four diagonal quadrants.
 *
 * Diagonals are the only part of a four-doored room that is never on a path
 * between two doorways, and they are also where a prop reads as cover rather
 * than as an obstacle. `spread` is a fraction of the room's half-extent, so a
 * 27-unit arena is furnished across its whole floor instead of getting the
 * same two-metre huddle around the origin that a 10-unit room gets - which is
 * what every layout here used to do, at fixed coordinates.
 */
const quadrants = (half: number, spread: number): Spot[] => {
  const r = half * spread;
  // Clear of the lane by the lane's half-width plus room for the prop itself,
  // so a barrel's edge cannot creep into the path even in a small room.
  const d = Math.max(r / Math.SQRT2, DOOR_LANE_HALF_WIDTH + 0.9);
  return [
    [d, 0, d],
    [-d, 0, d],
    [d, 0, -d],
    [-d, 0, -d],
  ];
};

/** True when a spot would stand in a doorway's path. */
const blocksADoor = (spot: Spot) =>
  Math.abs(spot[0]) < DOOR_LANE_HALF_WIDTH ||
  Math.abs(spot[2]) < DOOR_LANE_HALF_WIDTH;

const RoomDecorator: React.FC<RoomDecoratorProps> = ({
  roomType,
  roomSize = 16,
  roomId = roomType,
}) => {
  const half = roomSize / 2;
  // Far enough in that a torch is not buried in the wall.
  const corner = Math.max(1.5, half - 1.6);

  const layout = useMemo(() => {
    const rand = seededRandom(`${roomId}:${roomType}`);
    const near = quadrants(half, 0.5);
    const far = quadrants(half, 0.78);
    const corners: Spot[] = [
      [corner, 0, corner],
      [-corner, 0, corner],
      [corner, 0, -corner],
      [-corner, 0, -corner],
    ];
    return { rand, near, far, corners };
  }, [roomId, roomType, half, corner]);

  const { rand, near, far, corners } = layout;

  // Every room is lit from its corners; the type decides what fills the
  // quadrants between them.
  const torches = corners.map((p, i) => (
    <BreakableTorch key={`torch-${i}`} position={p} />
  ));

  const getRoomElements = () => {
    switch (roomType) {
      case "start":
        return (
          <>
            {/* Nothing in the middle: this is the room that teaches walking,
                and it used to have a table across the way out. */}
            <BreakableChest position={near[0]} />
            <BreakableBarrel position={near[1]} />
            <BreakableTable position={far[2]} />
            <BreakableChair position={far[3]} />
          </>
        );

      case "end":
        return (
          <>
            <BreakableCrystal position={near[0]} color="#ff00ff" />
            <BreakableCrystal position={near[1]} color="#00ffff" />
            <BreakableCrystal position={near[2]} color="#ffff00" />
            <BreakableCandle position={near[3]} />
            <Pillar position={far[0]} height={4} />
            <Pillar position={far[1]} height={4} />
          </>
        );

      case "treasure":
        return (
          <>
            {/* The loot is spread to the corners so the room is worth
                crossing rather than read in one glance from the doorway. */}
            <BreakableChest position={near[0]} />
            <BreakableChest position={far[1]} />
            <BreakableChest position={far[2]} />
            <BreakableBarrel position={near[3]} />
            <BreakableCrystal position={far[3]} color="#ffd479" />
            <Pillar position={near[1]} height={3.5} />
            <Pillar position={near[2]} height={3.5} />
          </>
        );

      case "shop":
        return (
          <>
            {/* The counter and its stock sit off to the sides; the shop's
                InteractTrigger is at the counter, not in the doorway. */}
            <BreakableBarrel position={near[0]} />
            <BreakableBarrel position={near[1]} />
            <BreakableBookshelf position={far[2]} />
            <BreakablePotionBottle position={far[3]} color="#63d2ff" />
            <BreakableCandle position={near[2]} />
          </>
        );

      case "library":
        return (
          <>
            <BreakableBookshelf position={far[0]} />
            <BreakableBookshelf position={far[1]} />
            <BreakableBookshelf position={far[2]} />
            <BreakableTable position={near[3]} />
            <BreakableChair position={near[0]} />
            <BreakableCandle position={near[1]} />
          </>
        );

      case "memory-chamber":
      case "puzzle":
        return (
          <>
            {/* Pillars for sightlines: the memory puzzle asks you to watch a
                pattern, and a room with landmarks is easier to orient in. */}
            <Pillar position={near[0]} height={4} radius={0.35} />
            <Pillar position={near[1]} height={4} radius={0.35} />
            <Pillar position={near[2]} height={4} radius={0.35} />
            <Pillar position={near[3]} height={4} radius={0.35} />
            <BreakableCandle position={far[0]} />
            <BreakableCandle position={far[3]} />
          </>
        );

      case "challenge":
        return (
          <>
            <Pillar position={far[0]} height={4.5} radius={0.4} />
            <Pillar position={far[1]} height={4.5} radius={0.4} />
            <BreakableBarrel position={near[2]} />
            <BreakableSkull position={near[3]} />
            <Web position={corners[0]} />
          </>
        );

      case "arena":
        return (
          <>
            {/* An open middle with cover at the edges - the shape the room's
                name promises, and the one it did not have. */}
            <Pillar position={far[0]} height={5} radius={0.45} />
            <Pillar position={far[1]} height={5} radius={0.45} />
            <Pillar position={far[2]} height={5} radius={0.45} />
            <Pillar position={far[3]} height={5} radius={0.45} />
            <BreakableSkull position={near[0]} />
            <BreakableBarrel position={near[2]} />
          </>
        );

      case "trap":
        return (
          <>
            {/* The spike ring is placed by UnifiedRoomManager; this is the
                dressing that tells you what kind of room you walked into
                before you stand on one. */}
            <BreakableSkull position={near[0]} />
            <BreakableSkull position={far[2]} />
            <Web position={corners[1]} />
            <Web position={corners[2]} />
            <BreakableBarrel position={near[3]} />
          </>
        );

      case "boss":
      case "devil-room":
        return (
          <>
            <Pillar position={far[0]} height={5} radius={0.5} />
            <Pillar position={far[1]} height={5} radius={0.5} />
            <BreakableSkull position={near[0]} />
            <BreakableSkull position={near[1]} />
            <BreakableCrystal position={near[2]} color="#ff4d6d" />
          </>
        );

      case "secret":
      case "angel-room":
        return (
          <>
            <BreakableCrystal position={near[0]} color="#b9f6ff" />
            <BreakableChest position={far[1]} />
            <BreakableCandle position={near[2]} />
          </>
        );

      case "normal":
      default:
        return (
          <>
            <BreakableBarrel position={near[0]} />
            <BreakableTable position={far[1]} />
            <BreakableChair position={far[2]} />
            {rand() > 0.5 && (
              <BreakablePotionBottle position={near[3]} color="#7ef2a1" />
            )}
            <Web position={corners[3]} />
          </>
        );
    }
  };

  return (
    <group>
      {torches}
      {getRoomElements()}
    </group>
  );
};

export default RoomDecorator;
