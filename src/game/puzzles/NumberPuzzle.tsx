import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createRng } from "../rng";
import { colors, FONT } from "../../ui/overlay";
import { Keypad } from "../../ui/Keypad";
import { usePadMenu } from "../../ui/padMenu";

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

const RULES = {
  easy: { length: 4, range: 9, showFor: 5, timeLimit: 45, misses: 3 },
  medium: { length: 5, range: 20, showFor: 6, timeLimit: 45, misses: 3 },
  hard: { length: 6, range: 50, showFor: 7, timeLimit: 40, misses: 2 },
} as const;

/**
 * Remember a sequence of numbers, then type it back.
 *
 * Each slot takes a whole number: the old version split the typed string
 * into characters and compared them one by one, which made every sequence
 * containing a two-digit number - all of medium and hard - impossible to
 * solve. Digits fill the current slot, Space or Enter commits it, Backspace
 * steps back. Miss the allowed number of times or run out the clock and the
 * tome closes on you.
 *
 * The keys are also on screen, because for as long as this room has existed
 * there was no way to answer it without a keyboard: a controller could open
 * the tome and read the sequence and then do nothing at all, in a demo
 * aimed at the Steam Deck. The three handlers below are what both a key
 * press and a pressed key call, so there is one description of what a digit
 * does.
 */
export function NumberPuzzle({ difficulty, seed, onComplete, onFail, onExit }: NumberPuzzleProps) {
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
  const [current, setCurrent] = useState("");
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
  const startedAt = useRef(performance.now());

  // Show, then hide, and start the clock at the moment they go.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setPhase((p) => {
        if (p !== "showing") return p;
        startedAt.current = performance.now();
        return "typing";
      });
    }, rules.showFor * 1000);
    return () => window.clearTimeout(t);
  }, [rules.showFor]);

  // The clock.
  useEffect(() => {
    if (phase === "solved" || phase === "failed") return;
    const tick = window.setInterval(() => {
      const left = Math.max(0, rules.timeLimit - (performance.now() - startedAt.current) / 1000);
      setTimeLeft(left);
      if (left <= 0) setPhase("failed");
    }, 100);
    return () => window.clearInterval(tick);
  }, [phase, rules.timeLimit]);

  // Outcome.
  useEffect(() => {
    if (phase === "solved") {
      const t = window.setTimeout(onComplete, 1400);
      return () => window.clearTimeout(t);
    }
    if (phase === "failed") {
      // onFail, not onExit: running out of misses or out of clock is losing
      // the book, and walking away from it is not. They were the same
      // callback, so the run could not tell them apart and treated both as
      // "left" - which meant a burned book could be read again and again.
      const t = window.setTimeout(onFail, 1400);
      return () => window.clearTimeout(t);
    }
  }, [phase, onComplete, onFail]);

  // What a digit, a commit and a backspace do. One description each, so a
  // key on the keyboard and a key on the screen cannot come to disagree.
  const digit = useCallback((d: string) => {
    setCurrent((c) => (c.length < 2 ? c + d : c));
  }, []);

  const commit = useCallback(() => {
    if (!current) return;
    const next = [...entries, current];
    setCurrent("");
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
  }, [current, entries, sequence, misses, rules.misses]);

  const backspace = useCallback(() => {
    if (current) setCurrent(current.slice(0, -1));
    else if (entries.length) setEntries(entries.slice(0, -1));
  }, [current, entries]);

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
      if (event.key !== "Escape") return;
      event.preventDefault();
      onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onExit]);

  // The pad's way out while there are no keys to press yet. The keypad
  // carries B once it is drawn, and takes the pad from this when it mounts.
  const sheet = useRef<HTMLDivElement>(null);
  usePadMenu({ container: sheet, onBack: onExit, active: phase === "showing" });

  // Typing. Attached to the window so no input element needs focus.
  useEffect(() => {
    if (phase !== "typing") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key >= "0" && event.key <= "9") {
        digit(event.key);
        event.preventDefault();
      } else if (event.key === "Enter" || event.key === " ") {
        commit();
        event.preventDefault();
      } else if (event.key === "Backspace") {
        backspace();
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, digit, commit, backspace]);

  const slot = (text: string, state: "shown" | "done" | "active" | "empty", i: number) => (
    <div
      key={i}
      style={{
        width: 52,
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        borderRadius: 6,
        border: `2px solid ${state === "active" ? colors.accent : state === "done" ? colors.gold : colors.line}`,
        background: state === "shown" ? "rgba(127,227,255,0.12)" : "rgba(255,255,255,0.04)",
        color: state === "empty" ? colors.line : colors.ink,
      }}
    >
      {text}
    </div>
  );

  return (
    <div ref={sheet} style={{ fontFamily: FONT, textAlign: "center", color: colors.ink }}>
      <div style={{ fontSize: 12, letterSpacing: "0.06em", marginBottom: 6 }}>THE TOME OF NUMBERS</div>
      <div style={{ fontSize: 10, color: colors.dim, marginBottom: 22 }}>
        {phase === "showing" && "Remember these."}
        {phase === "typing" && "Type them back, or use the keys. Space or OK commits a number."}
        {phase === "solved" && <span style={{ color: colors.gold }}>Correct. The tome yields a gem.</span>}
        {phase === "failed" && <span style={{ color: colors.danger }}>The tome closes.</span>}
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "center",
          marginBottom: 22,
          transform: shake ? "translateX(6px)" : "none",
          transition: "transform 80ms",
        }}
      >
        {sequence.map((n, i) => {
          if (phase === "showing" || phase === "solved") return slot(String(n), "shown", i);
          if (i < entries.length) return slot(entries[i], "done", i);
          if (i === entries.length) return slot(current || "_", "active", i);
          return slot("", "empty", i);
        })}
      </div>
      {phase === "typing" && (
        <div style={{ marginBottom: 18 }}>
          <Keypad
            onDigit={digit}
            onBackspace={backspace}
            action={{ label: "OK", onPress: commit, disabled: !current }}
            onBack={onExit}
          />
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: colors.dim }}>
        <span>
          Misses {misses}/{rules.misses}
        </span>
        <span style={{ color: timeLeft < 10 ? colors.danger : colors.dim }}>{Math.ceil(timeLeft)}s</span>
        <span>Esc or B leaves</span>
      </div>
    </div>
  );
}
