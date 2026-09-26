import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createRng } from "../rng";
import { colors, FONT, text } from "../../ui/overlay";
import { Keypad } from "../../ui/Keypad";
import { usePadMenu } from "../../ui/padMenu";
import { runClock, useRun } from "../state/run";
import { afterRunSeconds } from "../state/runTimer";

export interface NumberPuzzleProps {
  difficulty: "easy" | "medium" | "hard";
  /** Seeds the sequence, so a room's puzzle is the same one every visit. */
  seed: string;
  onComplete: () => void;
  /** Out of misses or out of clock: the book is lost. */
  onFail: () => void;
  /** Escape: the player closed it and can come back. */
  onExit: () => void;
}

/**
 * Every number is one digit. The difficulty is how many, not how big.
 *
 * Medium and hard asked for numbers up to twenty and fifty, so a slot was
 * a digit, a digit and a commit - and the commit was Space, which nobody
 * is told. "Hard to input" was exactly that. With every number under ten
 * a slot is one keypress and the sequence is typed the way it is read.
 */
const softKey = {
  fontFamily: FONT,
  fontSize: text.small,
  color: colors.ink,
  background: "rgba(255,255,255,0.06)",
  border: `1px solid ${colors.line}`,
  borderRadius: 6,
  padding: "6px 12px",
  cursor: "pointer",
} as const;

const RULES = {
  easy: { length: 4, range: 9, showFor: 5, timeLimit: 45, misses: 3 },
  medium: { length: 5, range: 9, showFor: 6, timeLimit: 45, misses: 3 },
  hard: { length: 6, range: 9, showFor: 7, timeLimit: 40, misses: 2 },
} as const;

/**
 * Remember a sequence of numbers, then type it back.
 *
 * Each press fills one slot; Backspace steps back. Miss the allowed number
 * of times or run out the answering clock and the tome closes on you.
 *
 * The keys are also on screen, because for as long as this room has existed
 * there was no way to answer it without a keyboard: a controller could open
 * the tome and read the sequence and then do nothing at all, in a demo
 * aimed at the Steam Deck. The handlers below are what both a key
 * press and a pressed key call, so there is one description of what a digit
 * does.
 */
export function NumberPuzzle({ difficulty, seed, onComplete, onFail, onExit }: NumberPuzzleProps) {
  const paused = useRun((s) => s.paused);
  const rules = RULES[difficulty];
  const sequence = useMemo(() => {
    const rng = createRng(`${seed}:numbers`);
    return Array.from({ length: rules.length }, () => 1 + Math.floor(rng() * rules.range));
  }, [seed, rules.length, rules.range]);

  if (import.meta.env.DEV) {
    // For the browser probes, which cannot read numbers off a screen that
    // has already hidden them. The memory trial exposes its pattern the
    // same way and for the same reason.
    (window as unknown as Record<string, unknown>).__numberSequence = sequence;
  }

  const [phase, setPhase] = useState<"showing" | "typing" | "solved" | "failed">("showing");
  const [entries, setEntries] = useState<string[]>([]);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(rules.timeLimit);
  const [shake, setShake] = useState(false);
  /**
   * The clock starts when the answering does, not when the tome opens.
   *
   * It used to run from the moment it was opened, so five to seven seconds
   * of the limit were spent looking at numbers that could not yet be typed
   * back - and the countdown in the corner ticked down while the player
   * could do nothing about it. That was merely ungenerous while the only
   * way to answer was a keyboard. With keys on screen it is worse than
   * that: entering a number with a d-pad is several presses where typing
   * is one, so the fixed head start came out of the slower input's time
   * and not the faster one's. What the limit is for is how long you can
   * hold five numbers in your head while you enter them.
   */
  const startedAt = useRef(runClock(useRun.getState()));

  /**
   * Show, then hide, and start the clock at the moment they go - or the
   * moment the player says they have them. "Slow to start" was five to
   * seven seconds of looking at numbers you already had, with no way to
   * say so.
   */
  const ready = useCallback(() => {
    if (useRun.getState().paused) return;
    setPhase((p) => {
      if (p !== "showing") return p;
      startedAt.current = runClock(useRun.getState());
      return "typing";
    });
  }, []);
  useEffect(() => {
    if (phase !== "showing") return;
    return afterRunSeconds(rules.showFor, ready);
  }, [phase, rules.showFor, ready]);

  // The clock.
  useEffect(() => {
    if (phase !== "typing") return;
    const tick = window.setInterval(() => {
      const run = useRun.getState();
      if (run.paused) return;
      const left = Math.max(0, rules.timeLimit - (runClock(run) - startedAt.current));
      setTimeLeft(left);
      if (left <= 0) setPhase("failed");
    }, 100);
    return () => window.clearInterval(tick);
  }, [phase, rules.timeLimit]);

  // Keep the deadline when a parent rerenders (including pause/resume),
  // while delivering the result through its current callbacks.
  const outcome = useRef({ onComplete, onFail });
  useEffect(() => { outcome.current = { onComplete, onFail }; }, [onComplete, onFail]);
  useEffect(() => {
    if (phase === "solved") {
      return afterRunSeconds(1.4, () => outcome.current.onComplete());
    }
    if (phase === "failed") {
      // onFail, not onExit: running out of misses or out of clock is losing
      // the book, and walking away from it is not. They were the same
      // callback, so the run could not tell them apart and treated both as
      // "left" - which meant a burned book could be read again and again.
      return afterRunSeconds(1.4, () => outcome.current.onFail());
    }
  }, [phase]);

  // What a digit and a backspace do. One description each, so a
  // key on the keyboard and a key on the screen cannot come to disagree.
  const settle = useCallback(
    (value: string) => {
      if (useRun.getState().paused) return;
      const next = [...entries, value];
      if (next.length < sequence.length) {
        setEntries(next);
        return;
      }
      const correct = next.every((v, i) => Number(v) === sequence[i]);
      if (correct) {
        setEntries(next);
        setPhase("solved");
        return;
      }
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
      setEntries([]);
      const m = misses + 1;
      setMisses(m);
      if (m >= rules.misses) setPhase("failed");
    },
    [entries, sequence, misses, rules.misses]
  );

  // One keypress, one slot, for both the keyboard and the on-screen keys.
  const digit = useCallback((d: string) => settle(d), [settle]);

  const backspace = useCallback(() => {
    if (useRun.getState().paused) return;
    setEntries((previous) => previous.slice(0, -1));
  }, []);

  /**
   * The way out, for as long as the footer promises one.
   *
   * "Esc or B leaves" is on screen from the first frame, and for the five
   * to seven seconds the numbers are being shown it was not true: the exit
   * lived inside the typing handler, and B is on the keypad, which is not
   * drawn yet. Meanwhile the tome holds the input lock, so a player who
   * pressed E at the lectern by accident stood frozen in a lit room with
   * the Warden walking towards them and no key that did anything. Every
   * check we had waited out the showing phase before touching the
   * keyboard, because that is what a solver does, so none of them ever
   * asked to leave while it was the only thing you could want.
   *
   * It is its own listener now, alive whenever the puzzle is still open.
   * Not once it is over: solving and failing already have their outcome
   * scheduled, and an Escape in the last second and a half would report a
   * second, different one.
   */
  const open = phase === "showing" || phase === "typing";
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (useRun.getState().paused || event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      // Escape, or Q: the first Escape under a pointer lock that has not
      // yet let go is eaten by the browser before the page sees it, which
      // is what "can't exit the book" was. Q is never eaten.
      if (event.key === "Escape" || event.code === "KeyQ") {
        event.preventDefault();
        onExit();
        return;
      }
      if (phase === "showing" && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        ready();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onExit, phase, ready]);

  // The pad's way out while there are no keys to press yet. The keypad
  // carries B once it is drawn, and takes the pad from this when it mounts.
  const sheet = useRef<HTMLDivElement>(null);
  usePadMenu({ container: sheet, onBack: onExit, active: phase === "showing" && !paused });

  // Typing. Attached to the window so no input element needs focus.
  useEffect(() => {
    if (phase !== "typing") return;
    const onKey = (event: KeyboardEvent) => {
      if (useRun.getState().paused || event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key >= "0" && event.key <= "9") {
        digit(event.key);
        event.preventDefault();
      } else if (event.key === "Enter" || event.key === " ") {
        // Do not re-click a focused keypad key when using the keyboard.
        event.preventDefault();
      } else if (event.key === "Backspace") {
        backspace();
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, digit, backspace]);

  const slot = (value: string, state: "shown" | "done" | "active" | "empty", i: number) => (
    <div
      key={i}
      style={{
        minWidth: 0,
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: text.title,
        borderRadius: 6,
        border: `2px solid ${state === "active" ? colors.accent : state === "done" ? colors.gold : colors.line}`,
        background: state === "shown" ? "rgba(127,227,255,0.12)" : "rgba(255,255,255,0.04)",
        color: state === "empty" ? colors.line : colors.ink,
      }}
    >
      {value}
    </div>
  );

  return (
    <div ref={sheet} inert={paused} style={{ fontFamily: FONT, textAlign: "center", color: colors.ink }}>
      <div style={{ fontSize: text.body, letterSpacing: "0.06em", lineHeight: 1.6, marginBottom: 6 }}>THE TOME OF NUMBERS</div>
      <div style={{ fontSize: text.small, lineHeight: 1.6, color: colors.dim, marginBottom: 22 }}>
        {phase === "showing" && "Remember these. Enter when you have them."}
        {phase === "typing" && "Type or tap one digit per slot. Backspace corrects the last digit."}
        {phase === "solved" && <span style={{ color: colors.gold }}>Correct. The tome yields a gem.</span>}
        {phase === "failed" && <span style={{ color: colors.danger }}>The tome closes.</span>}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${sequence.length}, minmax(0, 1fr))`,
          gap: "clamp(4px, 1.5vw, 10px)",
          marginBottom: 22,
          transform: shake ? "translateX(6px)" : "none",
          transition: "transform 80ms",
        }}
      >
        {sequence.map((n, i) => {
          if (phase === "showing" || phase === "solved") return slot(String(n), "shown", i);
          if (i < entries.length) return slot(entries[i], "done", i);
          if (i === entries.length) return slot("_", "active", i);
          return slot("", "empty", i);
        })}
      </div>
      {phase === "showing" && (
        <div style={{ marginBottom: 18 }}>
          <button style={softKey} data-testid="tome-ready" onClick={ready}>
            I have them
          </button>
        </div>
      )}
      {phase === "typing" && (
        <div style={{ marginBottom: 18 }}>
          <Keypad
            onDigit={digit}
            onBackspace={backspace}
            onBack={onExit}
            ownsPad={!paused}
          />
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center", fontSize: text.small, color: colors.dim }}>
        <span>
          Misses {misses}/{rules.misses}
        </span>
        <span style={{ color: timeLeft < 10 ? colors.danger : colors.dim }}>{Math.ceil(timeLeft)}s</span>
        {/* A key that leaves, on screen, under any pointer state. Esc and B
            still work; this is the one that always does. */}
        {open ? (
          <button style={softKey} data-testid="tome-leave" onClick={onExit}>
            Leave (Q)
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
