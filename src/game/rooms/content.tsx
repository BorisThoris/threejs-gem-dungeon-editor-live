/* eslint-disable react-refresh/only-export-components -- this module exports
   nothing on purpose: importing it registers the room kinds. */
import { quadrantSpots } from "../dungeon/layout";
import { bus } from "../events";
import { InteractTrigger } from "../interact/InteractTrigger";
import { useRun } from "../state/run";
import { GEMS_PER_LIFE } from "../world";
import { Dressing } from "./Dressing";
import { registerRoomKind, type RoomKindProps } from "./kinds";

/**
 * What each room kind puts inside the shell.
 *
 * Importing this module registers every kind. Kinds whose content is a
 * puzzle (memory, challenge) register from the puzzles module instead, so
 * the room shell never depends on puzzle code.
 */

function Dressed({ room }: RoomKindProps) {
  const seed = useRun((s) => s.dungeon?.seed ?? 0);
  return <Dressing room={room} seed={seed} />;
}

/**
 * The shop: where the run's two currencies meet. Gems are only otherwise
 * spent at the exit and lives can only otherwise be lost, so the counter is
 * the one place a careless run can pay for itself.
 */
function Shop({ room }: RoomKindProps) {
  const gems = useRun((s) => s.gems);
  const lives = useRun((s) => s.lives);
  const maxLives = useRun((s) => s.maxLives);
  const counter = quadrantSpots(room, 0.5)[2];
  const needsLife = lives < maxLives;
  const canAfford = gems >= GEMS_PER_LIFE;
  return (
    <>
      <Dressed room={room} />
      {/* The counter itself, at the trigger. */}
      <mesh position={[counter[0], 0.5, counter[2]]} castShadow>
        <boxGeometry args={[2.4, 1, 0.9]} />
        <meshStandardMaterial color="#5a3d26" roughness={0.85} />
      </mesh>
      <InteractTrigger
        position={[counter[0], 0, counter[2]]}
        label={`Buy a life (${GEMS_PER_LIFE} gem)`}
        enabled={needsLife && canAfford}
        blockedReason={
          !needsLife ? "Already at full health" : `Needs ${GEMS_PER_LIFE} gem (${gems}/${GEMS_PER_LIFE})`
        }
        onInteract={() => {
          const run = useRun.getState();
          if (run.lives >= run.maxLives) return;
          if (run.spendGems(GEMS_PER_LIFE)) run.gainLife();
        }}
      />
    </>
  );
}

/** The library: a lectern that opens the number puzzle. Solving it clears the room. */
function Library({ room }: RoomKindProps) {
  const cleared = useRun((s) => s.cleared.includes(room.id));
  const lectern = quadrantSpots(room, 0.5)[3];
  return (
    <>
      <Dressed room={room} />
      <mesh position={[lectern[0], 0.55, lectern[2]]} castShadow>
        <boxGeometry args={[0.7, 1.1, 0.5]} />
        <meshStandardMaterial color="#4a3320" roughness={0.9} />
      </mesh>
      <mesh position={[lectern[0], 1.12, lectern[2]]} rotation={[-0.4, 0, 0]}>
        <boxGeometry args={[0.6, 0.08, 0.45]} />
        <meshStandardMaterial color="#8a3b3b" />
      </mesh>
      <InteractTrigger
        position={[lectern[0], 0, lectern[2]]}
        label="Study the tome"
        enabled={!cleared}
        blockedReason="You have read this one"
        onInteract={() =>
          bus.emit("puzzleOpen", { kind: "number", difficulty: "medium", roomId: room.id })
        }
      />
    </>
  );
}

registerRoomKind("start", Dressed);
registerRoomKind("end", Dressed);
registerRoomKind("normal", Dressed);
registerRoomKind("treasure", Dressed);
registerRoomKind("trap", Dressed);
registerRoomKind("arena", Dressed);
registerRoomKind("shop", Shop);
registerRoomKind("library", Library);
