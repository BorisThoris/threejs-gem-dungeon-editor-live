import { useRun } from "../game/state/run";
import { FLOORS } from "../game/world";
import { body, button, colors, fullscreen, panel, secondaryButton, title } from "./overlay";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** The end of a run: what happened, and the two ways out of the screen. */
export function RunSummary() {
  const phase = useRun((s) => s.phase);
  const gemsTotal = useRun((s) => s.gemsTotal);
  const carried = useRun((s) => s.gems);
  const relics = useRun((s) => s.relics.length);
  const roomsSeen = useRun((s) => s.roomsSeen);
  const floor = useRun((s) => s.floor);
  const seconds = useRun((s) => Math.max(0, Math.round((s.endedAt - s.startedAt) / 1000)));
  const startRun = useRun((s) => s.startRun);
  const quitToMenu = useRun((s) => s.quitToMenu);
  const won = phase === "won";

  return (
    <div style={{ ...fullscreen, background: "rgba(5, 6, 8, 0.8)" }}>
      <div style={panel}>
        <h2 style={{ ...title, color: won ? colors.gold : colors.danger }}>
          {won ? "You made it out" : "You died down here"}
        </h2>
        {won ? (
          <p style={{ ...body, marginBottom: 8 }}>
            You got out with{" "}
            <span style={{ color: colors.gold, fontSize: "1.4em" }}>{carried}</span> gem
            {carried === 1 ? "" : "s"}.
          </p>
        ) : (
          <p style={{ ...body, marginBottom: 8 }}>
            You were carrying {carried} gem{carried === 1 ? "" : "s"} on floor {floor} of {FLOORS}.
            None of it comes back up.
          </p>
        )}
        <p style={body}>
          {gemsTotal} found · {relics} relic{relics === 1 ? "" : "s"} · {roomsSeen} rooms · {clock(seconds)}
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
