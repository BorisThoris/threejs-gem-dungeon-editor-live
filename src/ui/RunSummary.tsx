import { useRef } from "react";

import { DELVERS } from "../game/delvers/catalog";
import { useRecords } from "../game/state/records";
import { runSeconds, useRun } from "../game/state/run";
import { FLOORS } from "../game/world";
import { body, button, clock, colors, fullscreen, panel, secondaryButton, text, title } from "./overlay";
import { usePadMenu } from "./padMenu";

/**
 * The end of a run: what happened, what it beat, and the two ways out.
 *
 * The seed is on it because a run worth telling someone about is a run they
 * should be able to walk themselves, and because the one you just lost is
 * often the one you want another go at.
 */
export function RunSummary() {
  const phase = useRun((s) => s.phase);
  const gemsTotal = useRun((s) => s.gemsTotal);
  const carried = useRun((s) => s.gems);
  const relics = useRun((s) => s.relics.length);
  const known = useRun((s) => s.identified.length);
  const roomsSeen = useRun((s) => s.roomsSeen);
  const floor = useRun((s) => s.floor);
  // The run's seed, not this floor's: they part company on the way down.
  const seed = useRun((s) => s.runSeed);
  // Who was carrying it. Twenty-two gems means two different things
  // depending on which of these got out with them, and the summary is the
  // one screen that has room to say so.
  const delver = useRun((s) => DELVERS[s.delver]);
  // `runSeconds`, not a second copy of the arithmetic: the number on this
  // screen and the number folded into the records are the same question.
  const seconds = useRun(runSeconds);
  const startRun = useRun((s) => s.startRun);
  const quitToMenu = useRun((s) => s.quitToMenu);
  const bests = useRecords((s) => s.lastBests);
  const won = phase === "won";
  // B leaves for the menu. There is nothing to back out to from the end of
  // a run, and quitting is the less destructive of the two ways on.
  const panelRef = useRef<HTMLDivElement>(null);
  usePadMenu({ container: panelRef, onBack: quitToMenu });

  return (
    <div style={{ ...fullscreen, background: "rgba(5, 6, 8, 0.8)" }}>
      <div style={panel} ref={panelRef}>
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
        {/* It is a demo, and the screen a player reaches after winning is
            the one place to say so without it being an advertisement in
            the middle of a game. Only on a win: telling somebody who just
            died on floor two that there is more of this is not the moment. */}
        {won && (
          <p
            style={{ ...body, fontSize: text.small, color: colors.dim, marginBottom: 10 }}
            data-testid="summary-demo"
          >
            That is the demo: three floors of it. The full dungeon goes deeper, and
            what is down there does not stay on its own floor.
          </p>
        )}
        {bests && (bests.haul || bests.depth || bests.speed) && (
          <p style={{ ...body, marginBottom: 8, color: colors.gold }}>
            {[
              bests.haul && "Best haul yet",
              bests.depth && "Deepest yet",
              bests.speed && "Fastest escape yet",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {/* Four counts and a clock. The rooms were the one count without a
            plural, so a run that ended in the room it started in read "1
            rooms", and the first number was the one with no noun on it -
            "9 found" beside "you got out with 9 gems" reads as the same
            nine, and it is not: one is what the floor gave up and the
            other is what came back out. */}
        <p style={body}>
          {gemsTotal} gem{gemsTotal === 1 ? "" : "s"} found · {relics} relic
          {relics === 1 ? "" : "s"} · {known} item{known === 1 ? "" : "s"} named ·{" "}
          {roomsSeen} room{roomsSeen === 1 ? "" : "s"} · {clock(seconds)}
        </p>
        <p style={{ ...body, fontSize: text.small, marginBottom: 18 }}>
          <span style={{ color: colors.dim }}>AS </span>
          {delver.name}
          <span style={{ color: colors.dim }}> · SEED </span>
          {seed}
        </p>
        <button style={button} data-testid="summary-again" onClick={() => startRun()}>
          Run again
        </button>
        <button
          style={secondaryButton}
          data-testid="summary-same-seed"
          onClick={() => startRun(seed)}
        >
          Same dungeon again
        </button>
        <button style={secondaryButton} onClick={quitToMenu}>
          Main menu
        </button>
      </div>
    </div>
  );
}
