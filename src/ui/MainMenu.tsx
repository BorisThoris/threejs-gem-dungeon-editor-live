import { Fragment, useCallback, useRef, useState } from "react";

import { DELVERS, DELVER_IDS, DEFAULT_DELVER, type DelverId } from "../game/delvers/catalog";
import { useRecords } from "../game/state/records";
import { useRun } from "../game/state/run";
import { FLOORS, tollForFloor } from "../game/world";
import { Options } from "./PauseMenu";
import { FONT, body, button, clock, colors, fullscreen, panel, secondaryButton, text, title } from "./overlay";
import { Keypad } from "./Keypad";
import { usePadMenu } from "./padMenu";

const isElectron = () =>
  typeof navigator !== "undefined" && /electron/i.test(navigator.userAgent);

export function MainMenu() {
  const [page, setPage] = useState<"menu" | "controls" | "records" | "delvers">("menu");
  const [seed, setSeed] = useState("");
  const startRun = useRun((s) => s.startRun);
  // The one last taken down, so a player who has settled on a delver is
  // not asked again every time. Read once: this is a starting value for a
  // choice, not a thing the screen has to stay in step with.
  const [delver, setDelver] = useState<DelverId>(
    () => (DELVER_IDS as readonly string[]).includes(useRecords.getState().lastDelver ?? "")
      ? (useRecords.getState().lastDelver as DelverId)
      : DEFAULT_DELVER
  );
  const chosen = DELVERS[delver];
  // B goes back to the title, and does nothing when already there rather
  // than quitting the game by accident.
  const panelRef = useRef<HTMLDivElement>(null);
  const back = useCallback(() => setPage("menu"), []);
  usePadMenu({ container: panelRef, onBack: back });

  return (
    <div style={{ ...fullscreen, background: "#050608" }}>
      <div style={panel} ref={panelRef}>
        <h1 style={title}>GEM DUNGEON</h1>
        {page === "menu" ? (
          <>
            <p style={body}>
              {FLOORS} floors down. Each door out costs gems, and costs more the deeper you
              are: {Array.from({ length: FLOORS }, (_, i) => tollForFloor(i + 1)).join(", ")}. Whatever you
              still carry when you climb out is what you got away with.
              <br />
              <br />
              Every gem you take wakes the thing that walks the floor. You cannot fight it,
              and you cannot outrun it quietly: it hears a sprint.
              You have {chosen.lives} lives. Each floor down is larger, more closely
              watched, and wakes sooner than the one above it.
            </p>
            <button style={button} data-testid="menu-start" onClick={() => startRun(undefined, delver)}>
              Start as the {chosen.name}
            </button>
            <button
              style={secondaryButton}
              data-testid="menu-delvers"
              onClick={() => setPage("delvers")}
            >
              Choose a delver
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
        ) : page === "delvers" ? (
          <Delvers chosen={delver} onChoose={setDelver} onBack={() => setPage("menu")} />
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
              <dd style={{ margin: 0 }}>1 to 4 drinks or reads that slot, or X, Y and the shoulders on a pad</dd>
              <dt style={{ color: colors.accent }}>Run</dt>
              <dd style={{ margin: 0 }}>
                Hold Shift, or L3. The Warden is slower than you are - but running is
                loud, and while it can hear you it walks straight for you.
              </dd>
              <dt style={{ color: colors.accent }}>Lantern</dt>
              <dd style={{ margin: 0 }}>
                F, or click the right stick. Up, you see the room and everything down
                here sees you; down, you have a hand's worth of glow and nothing knows
                where you are. It only burns oil while it is up, and braziers fill it.
              </dd>
              <dt style={{ color: colors.accent }}>Bar a door</dt>
              <dd style={{ margin: 0 }}>
                B at a doorway, or d-pad down. It goes off the Warden's map for
                forty-five seconds and it walks round - and hammering it up is the
                loudest thing you can do down here.
              </dd>
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
 * Who to go down as.
 *
 * Every card says both halves of its trade in the player's own order -
 * what it brings, then what it costs - because a list of only the good
 * halves is a list of upgrades, and these are not upgrades. The Vagrant is
 * first and is the plain game; nothing here is strictly better than it.
 *
 * A delver that has got out alive at least once is marked, which is the
 * only progression in the game and is deliberately a record rather than an
 * unlock: everything is available from the first run.
 */
function Delvers({
  chosen,
  onChoose,
  onBack,
}: {
  chosen: DelverId;
  onChoose: (id: DelverId) => void;
  onBack: () => void;
}) {
  const escapedAs = useRecords((s) => s.escapedAs);
  return (
    <>
      <p style={{ ...body, marginBottom: 14 }}>
        Who goes down. Each of these trades one thing the run needs for another,
        and none of them is the easy one.
      </p>
      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        {DELVER_IDS.map((id) => {
          const d = DELVERS[id];
          const picked = id === chosen;
          return (
            <button
              key={id}
              data-testid={`delver-${id}`}
              onClick={() => onChoose(id)}
              style={{
                ...secondaryButton,
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                borderColor: picked ? colors.gold : colors.line,
                background: picked ? "rgba(224,183,74,0.08)" : undefined,
              }}
            >
              <div style={{ color: picked ? colors.gold : colors.ink, fontSize: text.body }}>
                {d.name}
                {escapedAs.includes(id) && (
                  <span style={{ color: colors.dim, fontSize: text.small }}> · escaped</span>
                )}
              </div>
              <div style={{ color: colors.dim, fontSize: text.small, lineHeight: 1.5 }}>
                {d.blurb}
              </div>
              <div style={{ fontSize: text.small, lineHeight: 1.6, marginTop: 4 }}>
                <span style={{ color: colors.accent }}>+ </span>
                {d.brings}
                <br />
                <span style={{ color: colors.danger }}>− </span>
                {d.costs}
              </div>
            </button>
          );
        })}
      </div>
      <button style={button} data-testid="delvers-back" onClick={onBack}>
        Take the {DELVERS[chosen].name} down
      </button>
    </>
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
      {/*
        Box, keys, then the button, in that order down the page.
        `Run it` sat beside the box, which is where a mouse looks for it and
        nowhere a d-pad pressing down will ever arrive: the page reads as a
        sequence now, so holding one direction walks all of it.
      */}
      <input
        value={seed}
        onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
        placeholder={records.bestSeed !== null ? `best was ${records.bestSeed}` : "seed"}
        data-testid="records-seed"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px 14px",
          marginBottom: 10,
          textAlign: "center",
          fontFamily: FONT,
          fontSize: text.body,
          color: colors.ink,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${colors.line}`,
          borderRadius: 4,
        }}
      />
      {/*
        The same keys the tome uses, because a seed is a number and a Deck
        has no keyboard. This was the last screen in the game a controller
        could not use: the box could be focused with a d-pad and then there
        was no way to put anything in it. It does not read the pad itself -
        the whole panel is one menu, and the keys are part of it.
      */}
      <div style={{ marginBottom: 12 }}>
        <Keypad
          ownsPad={false}
          onDigit={(d) => setSeed((seed + d).slice(0, 10))}
          onBackspace={() => setSeed(seed.slice(0, -1))}
        />
      </div>
      <button
        style={{ ...button, opacity: usable ? 1 : 0.4 }}
        disabled={!usable}
        data-testid="records-run-seed"
        onClick={() => startRun(typed)}
      >
        Run it
      </button>
      <button style={secondaryButton} data-testid="records-clear" onClick={records.clear}>
        Forget everything
      </button>
      <button style={secondaryButton} onClick={onBack}>
        Back
      </button>
    </>
  );
}
