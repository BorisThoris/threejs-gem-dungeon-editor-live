import { useShallow } from "zustand/react/shallow";
import { barsNow, useRun } from "../game/state/run";
import { secretTrailText } from "../game/worldbuilding/secretTrail";

/** Standing guidance for a learned landmark route, including known ways back. */
export function SecretTrailGuide() {
  const dungeon = useRun(state => state.dungeon);
  const roomId = useRun(state => state.currentRoomId);
  const visited = useRun(state => state.visited);
  const bars = useRun(useShallow(barsNow));
  const learned = useRun(state => !!state.dungeon?.secretTrail
    && state.visited.includes(state.dungeon.secretTrail.sourceId));
  if (!learned || !dungeon || !roomId) return null;
  return <div data-testid="secret-trail-guide" style={{ color: "#cdb982", marginTop: 8 }}>
    {secretTrailText(dungeon, roomId, visited, bars)}
  </div>;
}
