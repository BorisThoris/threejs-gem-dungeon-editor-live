import { useRun } from "../game/state/run";
import { secretTrailText } from "../game/worldbuilding/secretTrail";

/** Standing guidance for the landmark route, shown only after finding its source. */
export function SecretTrailGuide() {
  const dungeon = useRun(state => state.dungeon);
  const roomId = useRun(state => state.currentRoomId);
  const learned = useRun(state => !!state.dungeon?.secretTrail
    && state.visited.includes(state.dungeon.secretTrail.sourceId));
  if (!learned || !dungeon || !roomId || !dungeon.secretTrail?.route.includes(roomId)) return null;
  return <div data-testid="secret-trail-guide" style={{ color: "#cdb982", marginTop: 8 }}>
    {secretTrailText(dungeon, roomId)}
  </div>;
}
