import { doorPosition } from "../dungeon/layout";
import { roomById, type Dir, type Room } from "../dungeon/types";
import { tollNow, useRun } from "../state/run";
import { DOOR_HEIGHT, DOOR_WIDTH, WALL_THICKNESS } from "../world";
import { InteractTrigger } from "./InteractTrigger";

const KIND_LABEL: Record<string, string> = {
  start: "the way back",
  end: "the exit",
  normal: "a chamber",
  treasure: "the vault",
  shop: "the shop",
  library: "the library",
  trap: "a dark chamber",
  arena: "the arena",
  memory: "the memory chamber",
  challenge: "the challenge room",
};

/**
 * The frame's glow: cool for any door, gold for an exit you can afford, red
 * for one you cannot. Unlit, so it reads the same from any angle, but well
 * short of full brightness - at full it was a neon strip stapled to a stone
 * dungeon, and it was the brightest thing on the screen.
 */
const FRAME_COLOR = { door: "#2a556e", exitOpen: "#8a6520", exitLocked: "#7a2530" };

interface DoorTriggerProps {
  room: Room;
  dir: Dir;
}

/**
 * A doorway, in the game's one interaction verb.
 *
 * Standing near it offers it; only E takes it. The exit door charges the
 * gem toll and says so before you pay it, so the reason a door will not open
 * is never a mystery. The frame glows so a doorway reads from across a dark
 * room, and the exit's frame says whether you can afford it before you walk
 * over.
 */
export function DoorTrigger({ room, dir }: DoorTriggerProps) {
  const gems = useRun((s) => s.gems);
  const toll = useRun(tollNow);
  const dungeon = useRun((s) => s.dungeon);
  const toId = room.links[dir];
  const target = dungeon && toId ? roomById(dungeon, toId) : undefined;
  if (!target) return null;

  const isExit = target.kind === "end";
  const enabled = !isExit || gems >= toll;
  const color = isExit ? (enabled ? FRAME_COLOR.exitOpen : FRAME_COLOR.exitLocked) : FRAME_COLOR.door;
  const position = doorPosition(room, dir);
  // The frame's own x runs along the wall the door is in.
  const alongZ = dir === "east" || dir === "west";

  return (
    <>
      <group position={position} rotation={[0, alongZ ? Math.PI / 2 : 0, 0]}>
        <DoorFrame color={color} />
        <pointLight position={[0, DOOR_HEIGHT - 0.6, 0]} color={color} intensity={7} distance={8} decay={1.8} />
      </group>
      <InteractTrigger
        position={position}
        label={`Open ${KIND_LABEL[target.kind] ?? "the door"}`}
        enabled={enabled}
        blockedReason={`The exit needs ${toll} gems (${gems}/${toll})`}
        onInteract={() => {
          const run = useRun.getState();
          if (isExit && !run.spendGems(tollNow(run))) return;
          run.travel(dir);
        }}
      />
    </>
  );
}

const JAMB = 0.1;
const DEPTH = WALL_THICKNESS + 0.06;

/** Two jambs and a lintel strip, unlit so they glow the same from any angle. */
function DoorFrame({ color }: { color: string }) {
  const x = DOOR_WIDTH / 2 + JAMB / 2;
  return (
    <group>
      {[-x, x].map((px) => (
        <mesh key={px} position={[px, DOOR_HEIGHT / 2, 0]}>
          <boxGeometry args={[JAMB, DOOR_HEIGHT, DEPTH]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
      <mesh position={[0, DOOR_HEIGHT + JAMB / 2, 0]}>
        <boxGeometry args={[DOOR_WIDTH + JAMB * 2, JAMB, DEPTH]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
