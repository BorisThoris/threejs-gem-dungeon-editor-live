import { useRun } from "../game/state/run";
import { body, button, fullscreen, panel, secondaryButton, title } from "./overlay";

/** Esc pauses; the run is untouched underneath and resumes where it was. */
export function PauseMenu() {
  const resume = useRun((s) => s.resume);
  const quitToMenu = useRun((s) => s.quitToMenu);
  return (
    <div style={{ ...fullscreen, background: "rgba(5, 6, 8, 0.72)" }}>
      <div style={panel}>
        <h2 style={title}>PAUSED</h2>
        <p style={body}>The dungeon waits.</p>
        <button style={button} data-testid="pause-resume" onClick={resume}>
          Resume
        </button>
        <button style={secondaryButton} data-testid="pause-quit" onClick={quitToMenu}>
          Quit to menu
        </button>
      </div>
    </div>
  );
}
