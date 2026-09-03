import { useRef } from "react";

import { useRun } from "../game/state/run";
import { useSettings } from "../game/state/settings";
import { body, button, colors, fullscreen, panel, secondaryButton, text, title } from "./overlay";
import { usePadMenu } from "./padMenu";

/** Esc pauses; the run is untouched underneath and resumes where it was. */
export function PauseMenu() {
  const resume = useRun((s) => s.resume);
  const quitToMenu = useRun((s) => s.quitToMenu);
  // B resumes, which is what backing out of a pause menu means.
  const panelRef = useRef<HTMLDivElement>(null);
  usePadMenu({ container: panelRef, onBack: resume });
  return (
    <div style={{ ...fullscreen, background: "rgba(5, 6, 8, 0.72)" }}>
      <div style={panel} ref={panelRef}>
        <h2 style={title}>PAUSED</h2>
        <p style={body}>The dungeon waits.</p>
        <button style={button} data-testid="pause-resume" onClick={resume}>
          Resume
        </button>
        <Options />
        <button style={secondaryButton} data-testid="pause-quit" onClick={quitToMenu}>
          Quit to menu
        </button>
      </div>
    </div>
  );
}

/**
 * The two settings worth having.
 *
 * Head bob is the one that matters: it makes some people ill, and a game
 * that forces it is a game they cannot play. It lives here rather than
 * behind a menu nobody opens, because the moment you want it off is the
 * moment you have just noticed it.
 */
export function Options() {
  const cameraBob = useSettings((s) => s.cameraBob);
  const sound = useSettings((s) => s.sound);
  const setCameraBob = useSettings((s) => s.setCameraBob);
  const setSound = useSettings((s) => s.setSound);
  return (
    <div style={{ margin: "4px 0 14px" }}>
      <Toggle label="Head bob" on={cameraBob} onChange={setCameraBob} testId="opt-bob" />
      <Toggle label="Sound" on={sound} onChange={setSound} testId="opt-sound" />
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
  testId,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
  testId: string;
}) {
  return (
    <button
      style={{
        ...secondaryButton,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: text.small,
      }}
      data-testid={testId}
      onClick={() => onChange(!on)}
    >
      <span>{label}</span>
      <span style={{ color: on ? colors.accent : colors.dim }}>{on ? "on" : "off"}</span>
    </button>
  );
}
