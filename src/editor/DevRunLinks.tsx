import { useRun } from "../game/state/run";
import { colors, secondaryButton, text } from "../ui/overlay";
import { atlasUrl, scenarioUrl } from "./scenario";

/** Dev-only reproduction links. Opening a tab leaves the paused run intact. */
export default function DevRunLinks() {
  const seed = useRun(state => state.runSeed);
  const floor = useRun(state => state.floor);
  const roomId = useRun(state => state.currentRoomId);
  const dungeon = useRun(state => state.dungeon);
  if (!roomId || !dungeon) return null;
  const scenario = { seed, floor, roomId, roomBias: dungeon.roomBias };
  return <div data-testid="dev-run-links" style={{ margin: "8px 0 14px", textAlign: "left",
    borderTop: `1px solid ${colors.line}`, paddingTop: 9, fontSize: text.small }}>
    <div style={{ color: colors.dim, marginBottom: 6 }}>DEV · seed {seed} · floor {floor} · {roomId}
      {dungeon.roomBias ? " · Tally rooms" : ""}</div>
    <a data-testid="dev-inspect-atlas" href={atlasUrl(scenario)} target="_blank" rel="noreferrer"
      style={{ ...secondaryButton, display: "block", textAlign: "center", textDecoration: "none" }}>
      Inspect this room in Atlas
    </a>
    <a data-testid="dev-replay-room" href={scenarioUrl(scenario)} target="_blank" rel="noreferrer"
      style={{ ...secondaryButton, display: "block", textAlign: "center", textDecoration: "none" }}>
      Replay this room from its seed
    </a>
  </div>;
}
