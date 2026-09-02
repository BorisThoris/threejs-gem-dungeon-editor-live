import { useRun } from "../game/state/run";
import { body, button, colors, fullscreen, panel, secondaryButton, title } from "./overlay";

/** The end of a run: what happened, and the two ways out of the screen. */
export function RunSummary() {
  const phase = useRun((s) => s.phase);
  const gemsTotal = useRun((s) => s.gemsTotal);
  const visited = useRun((s) => s.visited.length);
  const roomCount = useRun((s) => s.dungeon?.rooms.length ?? 0);
  const startRun = useRun((s) => s.startRun);
  const quitToMenu = useRun((s) => s.quitToMenu);
  const won = phase === "won";

  return (
    <div style={{ ...fullscreen, background: "rgba(5, 6, 8, 0.8)" }}>
      <div style={panel}>
        <h2 style={{ ...title, color: won ? colors.gold : colors.danger }}>
          {won ? "You made it out" : "You died down here"}
        </h2>
        <p style={body}>
          {gemsTotal} gem{gemsTotal === 1 ? "" : "s"} found · {visited} of {roomCount} rooms seen
        </p>
        <button style={button} data-testid="summary-again" onClick={() => startRun()}>
          Run again
        </button>
        <button style={secondaryButton} onClick={quitToMenu}>
          Main menu
        </button>
      </div>
    </div>
  );
}
