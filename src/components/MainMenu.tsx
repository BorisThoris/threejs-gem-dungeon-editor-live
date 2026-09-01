import React, { useCallback, useState } from "react";

import { GEMS_REQUIRED_FOR_END, STARTING_LIVES } from "../configs/runRules";

interface MainMenuProps {
  /** Boots the dungeon: initialisation, map generation, then play. */
  onStartGame: () => void;
}

type Panel = "menu" | "controls" | "quit";

/**
 * The screen the game opens on.
 *
 * It used to boot straight into a run with no way to read the controls first
 * and no front door at all - this component existed but was never mounted.
 * Styled to match RunSummary so the demo's two full-screen menus look like
 * they belong to the same game.
 */
const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  const [panel, setPanel] = useState<Panel>("menu");

  const quit = useCallback(() => {
    setPanel("quit");
    // Works in the Electron build; browsers refuse to close a tab the script
    // did not open, which is why the farewell panel is shown either way.
    try {
      window.close();
    } catch {
      /* ignored: the panel below is the fallback */
    }
  }, []);

  return (
    <div style={backdropStyle}>
      <div style={panelStyle}>
        <h1 style={titleStyle}>GHOST DUNGEON</h1>
        <p style={subtitleStyle}>
          Find {GEMS_REQUIRED_FOR_END} gems, open the last door, get out alive.
        </p>

        {panel === "menu" && (
          <div style={buttonColumnStyle}>
            <button
              type="button"
              data-testid="menu-start"
              onClick={onStartGame}
              style={primaryButtonStyle}
            >
              Start run
            </button>
            <button
              type="button"
              data-testid="menu-controls"
              onClick={() => setPanel("controls")}
              style={secondaryButtonStyle}
            >
              Controls
            </button>
            <button
              type="button"
              data-testid="menu-quit"
              onClick={quit}
              style={secondaryButtonStyle}
            >
              Quit
            </button>
          </div>
        )}

        {panel === "controls" && (
          <>
            <dl style={listStyle}>
              <dt style={termStyle}>Move</dt>
              <dd style={definitionStyle}>W A S D</dd>
              <dt style={termStyle}>Look</dt>
              <dd style={definitionStyle}>Hold right mouse</dd>
              <dt style={termStyle}>Pause</dt>
              <dd style={definitionStyle}>Esc or X</dd>
              <dt style={termStyle}>Lives</dt>
              <dd style={definitionStyle}>{STARTING_LIVES} per run</dd>
            </dl>
            <div style={buttonColumnStyle}>
              <button
                type="button"
                onClick={() => setPanel("menu")}
                style={secondaryButtonStyle}
              >
                Back
              </button>
            </div>
          </>
        )}

        {panel === "quit" && (
          <>
            <p style={{ ...subtitleStyle, margin: "0 0 24px" }}>
              Thanks for playing. You can close this window now.
            </p>
            <div style={buttonColumnStyle}>
              <button
                type="button"
                onClick={() => setPanel("menu")}
                style={secondaryButtonStyle}
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#06080e",
  zIndex: 4000,
  fontFamily: "'Press Start 2P', monospace",
  color: "#f2f4f8",
};

const panelStyle: React.CSSProperties = {
  background: "#12151f",
  border: "2px solid #7fe3ff",
  borderRadius: 6,
  padding: "38px 44px",
  textAlign: "center",
  minWidth: 380,
  maxWidth: 520,
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 22,
  lineHeight: 1.4,
  color: "#7fe3ff",
};

const subtitleStyle: React.CSSProperties = {
  margin: "0 0 30px",
  fontSize: 10,
  lineHeight: 1.8,
  color: "#8b93a7",
};

const buttonColumnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  alignItems: "stretch",
};

const baseButtonStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 11,
  padding: "14px 26px",
  cursor: "pointer",
  border: "none",
  borderRadius: 4,
};

const primaryButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  color: "#0a0c12",
  background: "#7fe3ff",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  color: "#f2f4f8",
  background: "#1d2333",
  border: "1px solid #2b3345",
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "12px 20px",
  fontSize: 10,
  margin: "0 0 28px",
  textAlign: "left",
};

const termStyle: React.CSSProperties = { color: "#8b93a7" };
const definitionStyle: React.CSSProperties = { margin: 0 };

export default MainMenu;
