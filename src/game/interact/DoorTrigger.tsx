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
 * A doorway is masonry. Only the ones that MEAN something carry a light.
 *
 * The frame used to be three unlit strips of flat colour - a cool blue for
 * an ordinary door, gold or red for the exit - and the note above them said
 * they were "well short of full brightness" so as not to read as a neon
 * strip stapled to a stone dungeon. They read as one anyway, because an
 * unlit material is not lighting that happens to be dim: it is a colour the
 * room cannot touch, so the frames stayed the same flat teal whatever the
 * torches did, and the brightest, most saturated thing in every room was
 * its four exits. Four cyan rectangles in a grey stone box is the single
 * loudest thing in the game that says nobody has drawn this yet.
 *
 * So the frame is cut stone lit like the wall it sits in, and the colour
 * moves to a LAMP over the lintel - which only a doorway with something to
 * say gets. An ordinary chamber is an opening in a wall, with a little warm
 * spill low in it as though the next room had a torch in it too, and that
 * is enough to read from across a dark room without being a sign.
 */
const STONE = "#6a6158";
const LAMP = {
  exitOpen: "#f0ad46",
  exitLocked: "#b03a44",
  vault: "#e0b23a",
};
/** The warm nothing-in-particular of light from the next room along. */
const SPILL = "#c98a4a";

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
  /**
   * The lamp over the lintel, or none at all.
   *
   * An ordinary chamber gets no lamp: it is a hole in a wall, and a game
   * where every hole in every wall is lit up has no way left to say "this
   * one is the way out".
   */
  const lamp = locked
    ? LAMP.vault
    : isExit
      ? enabled
        ? LAMP.exitOpen
        : LAMP.exitLocked
      : null;
  const position = doorPosition(room, dir);
  // The frame's own x runs along the wall the door is in.
  const alongZ = dir === "east" || dir === "west";

  return (
    <>
      <group position={position} rotation={[0, alongZ ? Math.PI / 2 : 0, 0]}>
        <DoorFrame />
        {lamp ? (
          <>
            {/* The fitting, and the flame in it. Small, and the only thing
                here that is allowed to be brighter than the stone. */}
            <mesh position={[0, DOOR_HEIGHT + JAMB * 1.6, DEPTH / 2]}>
              <boxGeometry args={[0.26, 0.26, 0.18]} />
              <meshStandardMaterial color={lamp} emissive={lamp} emissiveIntensity={1.6} roughness={0.5} />
            </mesh>
            <pointLight position={[0, DOOR_HEIGHT - 0.2, 0.3]} color={lamp} intensity={4} distance={7} decay={1.9} />
          </>
        ) : (
          /* Light from the next room along, low in the opening, so a
             doorway reads from across a dark room without announcing
             itself. */
          <pointLight position={[0, 1.1, 0]} color={SPILL} intensity={1.5} distance={4.5} decay={2} />
        )}
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

/**
 * How thick the dressed stone around an opening is.
 *
 * Was a tenth of a metre, which is a drawn line rather than a piece of
 * masonry - fine when the frame was a coloured strip meant to be read as a
 * sign, wrong now that it is meant to be read as stone.
 */
const JAMB = 0.24;
const DEPTH = WALL_THICKNESS + 0.06;

/**
 * Two jambs and a lintel, cut from the same stone as the wall.
 *
 * Lit rather than unlit, which is the whole point: the frame now takes the
 * room's own torchlight, so it is dark where the room is dark and warm
 * where a torch is near, instead of holding one flat colour that no light
 * in the game could reach. Proud of the wall by a few centimetres and wide
 * enough to read as dressed masonry rather than as a drawn outline.
 */
function DoorFrame() {
  const x = DOOR_WIDTH / 2 + JAMB / 2;
  return (
    <group>
      {[-x, x].map((px) => (
        <mesh key={px} position={[px, DOOR_HEIGHT / 2, 0]} castShadow>
          <boxGeometry args={[JAMB, DOOR_HEIGHT, DEPTH]} />
          <meshStandardMaterial color={STONE} roughness={0.92} />
        </mesh>
      ))}
      <mesh position={[0, DOOR_HEIGHT + JAMB / 2, 0]} castShadow>
        <boxGeometry args={[DOOR_WIDTH + JAMB * 2, JAMB, DEPTH]} />
        <meshStandardMaterial color={STONE} roughness={0.92} />
      </mesh>
    </group>
  );
}
