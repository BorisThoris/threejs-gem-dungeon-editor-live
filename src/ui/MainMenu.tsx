import { useState } from "react";

import { useRun } from "../game/state/run";
import { FLOORS, GEMS_FOR_EXIT, STARTING_LIVES } from "../game/world";
import { body, button, colors, fullscreen, panel, secondaryButton, title } from "./overlay";

const isElectron = () =>
  typeof navigator !== "undefined" && /electron/i.test(navigator.userAgent);

export function MainMenu() {
  const [page, setPage] = useState<"menu" | "controls">("menu");
  const startRun = useRun((s) => s.startRun);

  return (
    <div style={{ ...fullscreen, background: "#050608" }}>
      <div style={panel}>
        <h1 style={title}>GEM DUNGEON</h1>
        {page === "menu" ? (
          <>
            <p style={body}>
              {FLOORS} floors down. On each, find {GEMS_FOR_EXIT} gems to open the way. You have {STARTING_LIVES} lives.
            </p>
            <button style={button} data-testid="menu-start" onClick={() => startRun()}>
              Start
            </button>
            <button style={secondaryButton} onClick={() => setPage("controls")}>
              Controls
            </button>
            {isElectron() && (
              <button style={secondaryButton} onClick={() => window.close()}>
                Quit
              </button>
            )}
          </>
        ) : (
          <>
            <dl style={{ ...body, textAlign: "left", display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 18px" }}>
              <dt style={{ color: colors.accent }}>Move</dt>
              <dd style={{ margin: 0 }}>W A S D, or the left stick</dd>
              <dt style={{ color: colors.accent }}>Look</dt>
              <dd style={{ margin: 0 }}>Click the game to take the mouse, Esc gives it back; or the right stick</dd>
              <dt style={{ color: colors.accent }}>Use</dt>
              <dd style={{ margin: 0 }}>E at a door, counter or lectern, or A on a pad</dd>
              <dt style={{ color: colors.accent }}>Run</dt>
              <dd style={{ margin: 0 }}>Hold Shift</dd>
              <dt style={{ color: colors.accent }}>Pause</dt>
              <dd style={{ margin: 0 }}>Esc, or Start on a pad</dd>
            </dl>
            <button style={secondaryButton} onClick={() => setPage("menu")}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
