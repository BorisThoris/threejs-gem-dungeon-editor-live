import { useRun } from "../game/state/run";
import { serviceTrailText } from "../game/worldbuilding/serviceTrail";

export function ServiceRubbing() {
  const dungeon = useRun(s => s.dungeon);
  const roomId = useRun(s => s.currentRoomId);
  const learned = useRun(s => s.waterCacheTaken);
  if (!learned || !dungeon?.serviceTrail || !roomId) return null;
  return <div data-testid="service-rubbing" style={{ color: "#c8a574", marginTop: 8 }}>
    {serviceTrailText(dungeon, roomId)}
  </div>;
}
