import { doorPosition } from "../dungeon/layout";
import { useTouchControls } from "../input/device";
import { roomById, type Dir, type Room } from "../dungeon/types";
import { barredNow, keeperHolds, keeperStalled, tollNow, useRun } from "../state/run";
import { barKey } from "../warden/bars";
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
const FRAME_COLOR = {
  door: "#2a556e",
  exitOpen: "#8a6520",
  exitLocked: "#7a2530",
  vault: "#7a5a1a",
};

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
  const toId = room.links[dir];
  const toll = useRun(tollNow);
  const sealed = useRun((s) => s.sealedRoomId === room.id);
  const vaultId = useRun((s) => s.dungeon?.vaultId ?? null);
  const keys = useRun((s) => s.keys);
  const unlocked = useRun((s) => (toId ? s.unlocked.includes(toId) : false));
  const dungeon = useRun((s) => s.dungeon);
  // Whether this is the barred doorway, and whether a bar could be put on
  // it. Both come off the store rather than being worked out here, so the
  // planks the player sees and the edge the Warden avoids cannot disagree.
  const barred = useRun((s) =>
    toId && s.currentRoomId ? barredNow(s) === barKey(s.currentRoomId, toId) : false
  );
  // The Keeper: whether it holds the last stairs, and whether it is
  // kneeling - both the store's, so the prompt, the frame and the refusal
  // in `travel` are one fact.
  const held = useRun(keeperHolds);
  const knelt = useRun(keeperStalled);
  const touch = useTouchControls();
  const target = dungeon && toId ? roomById(dungeon, toId) : undefined;
  if (!target) return null;

  const isExit = target.kind === "end";
  const kept = isExit && held;
  // A vault stays locked until a key is spent on it, and then stays open.
  const locked = target.id === vaultId && !unlocked;
  const enabled = (!isExit || gems >= toll) && !kept && !sealed && (!locked || keys > 0);
  const color = locked
    ? FRAME_COLOR.vault
    : isExit
      ? enabled
        ? FRAME_COLOR.exitOpen
        : FRAME_COLOR.exitLocked
      : FRAME_COLOR.door;
  const position = doorPosition(room, dir);
  // The frame's own x runs along the wall the door is in.
  const alongZ = dir === "east" || dir === "west";

  return (
    <>
      <group position={position} rotation={[0, alongZ ? Math.PI / 2 : 0, 0]}>
        <DoorFrame color={color} />
        <pointLight position={[0, DOOR_HEIGHT - 0.6, 0]} color={color} intensity={7} distance={8} decay={1.8} />
      </group>
      {/* The planks, if this is the one. Drawn across the gap and low, so
          a player can see at a glance which doorway they shut and from
          which side - it is the only thing in the game they have changed
          about the dungeon itself. */}
      {barred && (
        <group position={position} rotation={[0, alongZ ? Math.PI / 2 : 0, 0]}>
          {[0.7, 1.5, 2.3].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[0, 0, (y - 1.5) * 0.05]} castShadow>
              <boxGeometry args={[DOOR_WIDTH + 0.5, 0.22, 0.16]} />
              <meshStandardMaterial color="#6b4a2c" roughness={0.95} />
            </mesh>
          ))}
        </group>
      )}
      <InteractTrigger
        position={position}
        label={
          locked
            ? `Unlock the vault (1 iron key)`
            : barred
              ? `Lift your bar and open ${KIND_LABEL[target.kind] ?? "the door"}`
              : // The bar's key is said on the prompt the player is already
                // reading. It is the only verb in the game that is not E,
                // and a control nobody is told about is a control nobody
                // uses - but only where it can be used, so an exit and a
                // locked vault do not carry a hint about a thing they will
                // refuse.
                (isExit && knelt ? "Pay the toll and go - now" : `Open ${KIND_LABEL[target.kind] ?? "the door"}`) +
                (isExit || locked ? "" : touch ? "   ·   BAR shuts it" : "   ·   B bars it")
        }
        enabled={enabled}
        blockedReason={
          kept
            ? "The Keeper holds the stairs. A blast would make it kneel."
            : sealed
            ? "The door will not move"
            : locked
              ? "The vault is locked. Its key is somewhere on this floor."
              : `The exit needs ${toll} gems (${gems}/${toll})`
        }
        onInteract={() => {
          const run = useRun.getState();
          if (locked && !run.unlockRoom(target.id)) return;
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
