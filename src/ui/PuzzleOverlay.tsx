import { useEffect, useState } from "react";

import { bus, type PuzzleRequest } from "../game/events";
import { NumberPuzzle } from "../game/puzzles/NumberPuzzle";
import { useRun } from "../game/state/run";
import { fullscreen, panel } from "./overlay";

/**
 * The one place a puzzle is drawn.
 *
 * Puzzles are full-screen DOM, and a room lives inside the R3F canvas where
 * a <div> is not a valid object. Rooms ask over the bus; this answers, holds
 * the controls while the puzzle is up so nobody walks into a wall behind a
 * modal, and reports the outcome back. A solved puzzle clears its room and
 * pays out a gem.
 */
export function PuzzleOverlay() {
  const [request, setRequest] = useState<PuzzleRequest | null>(null);
  const seed = useRun((s) => s.dungeon?.seed ?? 0);

  useEffect(() => bus.on("puzzleOpen", setRequest), []);

  useEffect(() => {
    if (!request) return;
    const run = useRun.getState();
    run.lockInput();
    return () => useRun.getState().unlockInput();
  }, [request]);

  if (!request) return null;

  /**
   * Three ways out, not two.
   *
   * Solving pays; losing the puzzle has to be remembered, or the room can
   * be walked out of and back into for another go at the same gem; and
   * closing it with Escape is neither - the player looked and thought
   * better of it. Failing and leaving used to be the same callback, so the
   * run recorded neither and a burned book could be read again. The memory
   * trial and the challenge room had always recorded their own failures;
   * this was the third place and it had been missed.
   */
  const finish = (outcome: "solved" | "failed" | "left") => {
    const { roomId } = request;
    setRequest(null);
    const run = useRun.getState();
    if (outcome === "solved") {
      run.clearRoom(roomId);
      run.collectGem(`${roomId}:puzzle`);
    } else if (outcome === "failed") {
      run.failRoom(roomId);
    }
    if (outcome !== "left") bus.emit("puzzleResult", { roomId, completed: outcome === "solved" });
  };

  return (
    <div style={{ ...fullscreen, background: "rgba(5, 6, 8, 0.82)", zIndex: 1100 }}>
      <div style={{ ...panel, minWidth: 420 }}>
        {request.kind === "number" && (
          <NumberPuzzle
            difficulty={request.difficulty}
            seed={`${seed}:${request.roomId}`}
            onComplete={() => finish("solved")}
            onFail={() => finish("failed")}
            onExit={() => finish("left")}
          />
        )}
      </div>
    </div>
  );
}
