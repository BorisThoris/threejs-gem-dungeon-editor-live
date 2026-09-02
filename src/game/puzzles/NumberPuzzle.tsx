import { useEffect, useMemo, useRef, useState } from "react";

import { createRng } from "../rng";
import { colors, FONT } from "../../ui/overlay";

export interface NumberPuzzleProps {
  difficulty: "easy" | "medium" | "hard";
  /** Seeds the sequence, so a room's puzzle is the same one every visit. */
  seed: string;
  onComplete: () => void;
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
 */
export function NumberPuzzle({ difficulty, seed, onComplete, onExit }: NumberPuzzleProps) {
  const rules = RULES[difficulty];
  const sequence = useMemo(() => {
    const rng = createRng(`${seed}:numbers`);
    return Array.from({ length: rules.length }, () => 1 + Math.floor(rng() * rules.range));
  }, [seed, rules.length, rules.range]);

  const [phase, setPhase] = useState<"showing" | "typing" | "solved" | "failed">("showing");
  const [entries, setEntries] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(rules.timeLimit);
  const [shake, setShake] = useState(false);
  const startedAt = useRef(performance.now());

  // Show, then hide.
  useEffect(() => {
    const t = window.setTimeout(() => setPhase((p) => (p === "showing" ? "typing" : p)), rules.showFor * 1000);
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
      const t = window.setTimeout(onExit, 1400);
      return () => window.clearTimeout(t);
    }
  }, [phase, onComplete, onExit]);

  // Typing. Attached to the window so no input element needs focus.
  useEffect(() => {
    if (phase !== "typing") return;
    const commit = () => {
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
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onExit();
        return;
      }
      if (event.key >= "0" && event.key <= "9") {
        if (current.length < 2) setCurrent(current + event.key);
        event.preventDefault();
      } else if (event.key === "Enter" || event.key === " ") {
        commit();
        event.preventDefault();
      } else if (event.key === "Backspace") {
        if (current) setCurrent(current.slice(0, -1));
        else if (entries.length) setEntries(entries.slice(0, -1));
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, current, entries, sequence, misses, rules.misses, onExit]);

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
    <div style={{ fontFamily: FONT, textAlign: "center", color: colors.ink }}>
      <div style={{ fontSize: 12, letterSpacing: "0.06em", marginBottom: 6 }}>THE TOME OF NUMBERS</div>
      <div style={{ fontSize: 10, color: colors.dim, marginBottom: 22 }}>
        {phase === "showing" && "Remember these."}
        {phase === "typing" && "Type them back. Space commits a number."}
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
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: colors.dim }}>
        <span>
          Misses {misses}/{rules.misses}
        </span>
        <span style={{ color: timeLeft < 10 ? colors.danger : colors.dim }}>{Math.ceil(timeLeft)}s</span>
        <span>Esc leaves</span>
      </div>
    </div>
  );
}
