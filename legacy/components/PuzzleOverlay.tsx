import { useEffect, useState } from "react";

import OptimizedPuzzleRouter from "./OptimizedPuzzleRouter";
import { uiEvents, UI_EVENTS } from "../utils/uiEvents";
import { useConsolidatedGameStore } from "../store/consolidatedGameStore";

interface PuzzleRequest {
  puzzleType?: "memory" | "sequence" | "number";
  difficulty?: "easy" | "medium" | "hard";
}

/**
 * The one place a puzzle is allowed to be drawn.
 *
 * Puzzles are full-screen DOM, and every room that wanted one rendered it from
 * inside the R3F canvas, where React tries to reconcile <div> and <span> as
 * three.js objects. That threw on sight - but nobody ever saw it, because the
 * only way to open a puzzle was an action-card overlay that returned null
 * unconditionally. Making the library's lectern usable was what finally ran
 * the code.
 *
 * Rooms now ask through UI_EVENTS.PUZZLE_OPEN and hear the outcome back on
 * UI_EVENTS.PUZZLE_RESULT, so a room never has to know where the DOM lives.
 */
export function PuzzleOverlay() {
  const [request, setRequest] = useState<PuzzleRequest | null>(null);
  const enableMovement = useConsolidatedGameStore((s) => s.enableMovement);
  const disableMovement = useConsolidatedGameStore((s) => s.disableMovement);

  useEffect(() => {
    return uiEvents.on(UI_EVENTS.PUZZLE_OPEN, (next: PuzzleRequest | null) => {
      setRequest(next);
    });
  }, []);

  // A puzzle takes the screen, so it takes the controls with it: walking around
  // behind a modal you cannot see past is how players end up in a wall.
  useEffect(() => {
    if (request) disableMovement();
    else enableMovement();
    return () => enableMovement();
  }, [request, enableMovement, disableMovement]);

  if (!request) return null;

  const finish = (completed: boolean) => {
    setRequest(null);
    uiEvents.emit(UI_EVENTS.PUZZLE_RESULT, { completed });
  };

  return (
    <OptimizedPuzzleRouter
      isVisible
      onComplete={() => finish(true)}
      onExit={() => finish(false)}
      puzzleType={request.puzzleType ?? "number"}
      difficulty={request.difficulty ?? "medium"}
    />
  );
}

export default PuzzleOverlay;
