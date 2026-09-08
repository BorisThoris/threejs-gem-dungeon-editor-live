import { useMemo } from "react";

import { bus } from "../events";
import { GROUND_Y } from "../world";
import { InteractTrigger } from "../interact/InteractTrigger";
import { useLore } from "../state/lore";
import { useRecords } from "../state/records";
import { useRun } from "../state/run";
import { cutIn, namesOn } from "./placement";
import type { Room } from "../dungeon/types";

/**
 * What is cut into the walls of this room, and reading it.
 *
 * A trigger rather than a caption on approach, and that is the whole
 * design decision in this file: reading costs TIME, and time is the one
 * thing the floor is already charging for. A player who stops to read is
 * spending heat on the fiction, which is what makes reading a choice
 * instead of a subtitle. Nothing is ever voiced - these are cut into stone
 * by people who are gone, and a voice would put someone alive in the room.
 *
 * Never a marker on the map, for the same reason a draft is not: a player
 * who walks the walls finds them, and one who does not, does not.
 */
export function Cut({ room }: { room: Room }) {
  const dungeon = useRun((s) => s.dungeon);
  const floor = useRun((s) => s.floor);
  const cuts = useMemo(
    () => (dungeon ? cutIn(room, dungeon, floor) : []),
    [room, dungeon, floor]
  );
  if (cuts.length === 0) return null;
  return (
    <>
      {cuts.map(({ fragment, x, z }) => (
        <InteractTrigger
          key={fragment.id}
          position={[x, GROUND_Y, z]}
          label="Read what is cut here"
          onInteract={() => {
            useLore.getState().markRead(fragment.id);
            // The notice line, which is the channel for a line that says
            // itself and then goes - and never `hint`, which belongs to
            // the room's own standing instruction. Reading a wall must not
            // erase what the room is telling you to do.
            bus.emit("notice", fragment.text);
          }}
        />
      ))}
    </>
  );
}

/**
 * The names wall, in the start room of every floor.
 *
 * The fourth tripled fact's object leg - "you are the latest of many" -
 * and the only one whose third carrier is a rule that was already there:
 * run records persist between runs, so the wall is longer on the tenth run
 * than on the first. Nothing had to be invented to make that true, which is
 * the whole test of whether a piece of fiction is read off the mechanics or
 * painted onto them.
 *
 * The count is the records', never the run's: a delver who has died forty
 * times has forty names in front of them, and the wall says so without
 * saying anything about them.
 */
export function Names({ room }: { room: Room }) {
  const runs = useRecords((s) => s.runs);
  const escapes = useRecords((s) => s.escapes);
  const half = room.size / 2;
  const many = namesOn(runs);
  return (
    <InteractTrigger
      position={[0, GROUND_Y, -half * 0.9]}
      label="Read the names"
      onInteract={() => {
        bus.emit(
          "notice",
          many === 0
            ? "Names, cut one under another. There is room left at the bottom."
            : escapes === 0
              ? `${many} names, cut one under another. None of them is crossed out.`
              : `${many} names, cut one under another. ${escapes} are crossed out.`
        );
      }}
    />
  );
}
