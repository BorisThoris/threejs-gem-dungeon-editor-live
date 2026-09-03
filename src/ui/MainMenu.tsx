import { Fragment, useState } from "react";

import { useRecords } from "../game/state/records";
import { useRun } from "../game/state/run";
import { FLOORS, STARTING_LIVES, tollForFloor } from "../game/world";
import { Options } from "./PauseMenu";
import { FONT, body, button, clock, colors, fullscreen, panel, secondaryButton, text, title } from "./overlay";

const isElectron = () =>
  typeof navigator !== "undefined" && /electron/i.test(navigator.userAgent);

export function MainMenu() {
  const [page, setPage] = useState<"menu" | "controls" | "records">("menu");
  const [seed, setSeed] = useState("");
  const startRun = useRun((s) => s.startRun);

  return (
    <div style={{ ...fullscreen, background: "#050608" }}>
      <div style={panel}>
        <h1 style={title}>GEM DUNGEON</h1>
        {page === "menu" ? (
          <>
            <p style={body}>
              {FLOORS} floors down. Each door out costs gems, and costs more the deeper you
              are: {Array.from({ length: FLOORS }, (_, i) => tollForFloor(i + 1)).join(", ")}. Whatever you
              still carry when you climb out is what you got away with.
              <br />
              <br />
              Every gem you take wakes the thing that walks the floor. You cannot fight it.
              You have {STARTING_LIVES} lives. Each floor down is larger, more closely
              watched, and wakes sooner than the one above it.
            </p>
            <button style={button} data-testid="menu-start" onClick={() => startRun()}>
              Start
            </button>
            <button style={secondaryButton} onClick={() => setPage("controls")}>
              Controls
            </button>
            <button style={secondaryButton} data-testid="menu-records" onClick={() => setPage("records")}>
              Records
            </button>
            {isElectron() && (
              <button style={secondaryButton} onClick={() => window.close()}>
                Quit
              </button>
            )}
          </>
        ) : page === "records" ? (
          <Records seed={seed} setSeed={setSeed} onBack={() => setPage("menu")} />
        ) : (
          <>
            <dl style={{ ...body, textAlign: "left", display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 18px" }}>
              <dt style={{ color: colors.accent }}>Move</dt>
              <dd style={{ margin: 0 }}>W A S D, or the left stick</dd>
              <dt style={{ color: colors.accent }}>Look</dt>
              <dd style={{ margin: 0 }}>Click the game to take the mouse, Esc gives it back; or the right stick</dd>
              <dt style={{ color: colors.accent }}>Use</dt>
              <dd style={{ margin: 0 }}>E at a door, counter or lectern, or A on a pad</dd>
              <dt style={{ color: colors.accent }}>Satchel</dt>
              <dd style={{ margin: 0 }}>1 to 4 drinks or reads that slot, or X and Y on a pad</dd>
              <dt style={{ color: colors.accent }}>Run</dt>
              <dd style={{ margin: 0 }}>Hold Shift, or L3. The Warden is slower than you are.</dd>
              <dt style={{ color: colors.accent }}>Pause</dt>
              <dd style={{ margin: 0 }}>Esc, or Start on a pad</dd>
            </dl>
            <Options />
            <button style={secondaryButton} onClick={() => setPage("menu")}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * What has happened across every run on this machine, and a box to walk a
 * dungeon again by its seed.
 *
 * Nothing here changes what a run is - it is a record, not a progression
 * system. A demo with no personal best is a demo nobody comes back to.
 */
function Records({
  seed,
  setSeed,
  onBack,
}: {
  seed: string;
  setSeed: (v: string) => void;
  onBack: () => void;
}) {
  const records = useRecords();
  const startRun = useRun((s) => s.startRun);
  const typed = Number.parseInt(seed, 10);
  const usable = Number.isFinite(typed) && typed >= 0;

  const rows: [string, string][] = [
    ["Runs", String(records.runs)],
    ["Escaped", `${records.escapes} of ${records.runs}`],
    ["Best haul", records.bestHaul > 0 ? `${records.bestHaul} gems` : "-"],
    ["Deepest floor", records.deepestFloor > 0 ? String(records.deepestFloor) : "-"],
    ["Fastest escape", records.fastestEscape > 0 ? clock(records.fastestEscape) : "-"],
    ["Gems ever found", String(records.gemsEverFound)],
  ];

  return (
    <>
      <dl
        style={{
          ...body,
          textAlign: "left",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "4px 18px",
          marginBottom: 18,
        }}
      >
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <dt style={{ color: colors.dim }}>{label}</dt>
            <dd style={{ margin: 0, textAlign: "right" }}>{value}</dd>
          </Fragment>
        ))}
      </dl>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={seed}
          onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
          placeholder={records.bestSeed !== null ? `best was ${records.bestSeed}` : "seed"}
          data-testid="records-seed"
          style={{
            flex: 1,
            padding: "12px 14px",
            fontFamily: FONT,
            fontSize: text.body,
            color: colors.ink,
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${colors.line}`,
            borderRadius: 4,
          }}
        />
        <button
          style={{ ...button, width: "auto", margin: 0, opacity: usable ? 1 : 0.4 }}
          disabled={!usable}
          data-testid="records-run-seed"
          onClick={() => startRun(typed)}
        >
          Run it
        </button>
      </div>
      <button style={secondaryButton} data-testid="records-clear" onClick={records.clear}>
        Forget everything
      </button>
      <button style={secondaryButton} onClick={onBack}>
        Back
      </button>
    </>
  );
}
