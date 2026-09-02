import { doorPosition } from "../dungeon/layout";
import { roomById, type Dir, type Room } from "../dungeon/types";
import { useRun } from "../state/run";
import { GEMS_FOR_EXIT } from "../world";
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

interface DoorTriggerProps {
  room: Room;
  dir: Dir;
}

/**
 * A doorway, in the game's one interaction verb.
 *
 * Standing near it offers it; only E takes it. The exit door charges the
 * gem toll and says so before you pay it, so the reason a door will not open
 * is never a mystery.
 */
export function DoorTrigger({ room, dir }: DoorTriggerProps) {
  const gems = useRun((s) => s.gems);
  const dungeon = useRun((s) => s.dungeon);
  const toId = room.links[dir];
  const target = dungeon && toId ? roomById(dungeon, toId) : undefined;
  if (!target) return null;

  const isExit = target.kind === "end";
  const enabled = !isExit || gems >= GEMS_FOR_EXIT;

  return (
    <InteractTrigger
      position={doorPosition(room, dir)}
      label={`Open ${KIND_LABEL[target.kind] ?? "the door"}`}
      enabled={enabled}
      blockedReason={`The exit needs ${GEMS_FOR_EXIT} gems (${gems}/${GEMS_FOR_EXIT})`}
      onInteract={() => {
        const run = useRun.getState();
        if (isExit && !run.spendGems(GEMS_FOR_EXIT)) return;
        run.travel(dir);
      }}
    />
  );
}
