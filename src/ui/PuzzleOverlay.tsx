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
  /**
   * Which run, which floor, which room - "over" once the run has ended.
   * This cannot change while a puzzle is up: the puzzle holds the input
   * lock, so the player is standing at the lectern and going nowhere.
   */
  const where = useRun((s) => (s.phase === "playing" ? `${s.runSeed}:${s.floor}:${s.currentRoomId}` : "over"));

  useEffect(() => bus.on("puzzleOpen", setRequest), []);

  /**
   * The puzzle does not outlive the run it belongs to.
   *
   * Its openness was held here and nowhere else, and nothing that ends a
   * run knew to say so: dying, climbing out, quitting to the menu and
   * starting a fresh run all left the tome on screen, on top of the
   * summary the player was meant to read, still counting down, still
   * holding the input lock. Three of the eight screens in the tour came
   * out of the shooting with a tome over them. When its clock finally ran
   * out it recorded a failure against a room in a dungeon that no longer
   * existed.
   *
   * So the run closes it, by moving on: the run ending, a fresh run being
   * started, or - belt and braces - the player somehow ending up in
   * another room. Not through `finish`, because there is no outcome to
   * report to a run that is over, and `failRoom` against the room the
   * player has just died in is worse than reporting nothing.
   */
  useEffect(() => {
    setRequest(null);
  }, [where]);

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
