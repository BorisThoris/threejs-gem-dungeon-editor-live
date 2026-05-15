import React, { useState } from "react";
import PuzzleOverlay from "./PuzzleOverlay";
import MemoryPuzzle from "./puzzles/MemoryPuzzle";
import SequencePuzzle from "./puzzles/SequencePuzzle";
import NumberPuzzle from "./puzzles/NumberPuzzle";

export type PuzzleType = "memory" | "sequence" | "number";

interface PuzzleRouterProps {
  isVisible: boolean;
  onClose: () => void;
  puzzleType: PuzzleType;
  difficulty: "easy" | "medium" | "hard";
  roomTitle?: string;
  roomSubtitle?: string;
  onComplete?: () => void;
}

const PuzzleRouter: React.FC<PuzzleRouterProps> = ({
  isVisible,
  onClose,
  puzzleType,
  difficulty,
  roomTitle,
  roomSubtitle,
  onComplete,
}) => {
  const [isCompleted, setIsCompleted] = useState(false);

  const handlePuzzleComplete = () => {
    setIsCompleted(true);
    // Call the onComplete callback if provided
    if (onComplete) {
      onComplete();
    }
    // Auto-close after 2 seconds
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const getPuzzleComponent = () => {
    switch (puzzleType) {
      case "memory":
        return (
          <MemoryPuzzle
            onComplete={handlePuzzleComplete}
            difficulty={difficulty}
          />
        );
      case "sequence":
        return (
          <SequencePuzzle
            onComplete={handlePuzzleComplete}
            difficulty={difficulty}
          />
        );
      case "number":
        return (
          <NumberPuzzle
            onComplete={handlePuzzleComplete}
            difficulty={difficulty}
          />
        );
      default:
        return (
          <div style={{ textAlign: "center", color: "#ff0000" }}>
            Unknown puzzle type: {puzzleType}
          </div>
        );
    }
  };

  const getPuzzleTitle = () => {
    switch (puzzleType) {
      case "memory":
        return roomTitle || "🧠 Memory Challenge";
      case "sequence":
        return roomTitle || "🔢 Sequence Memory";
      case "number":
        return roomTitle || "🔢 Number Memory";
      default:
        return "Puzzle Room";
    }
  };

  const getPuzzleSubtitle = () => {
    switch (puzzleType) {
      case "memory":
        return roomSubtitle || "Find matching pairs to clear the room!";
      case "sequence":
        return roomSubtitle || "Repeat the color sequence in order!";
      case "number":
        return roomSubtitle || "Memorize and enter the number sequence!";
      default:
        return "Complete the puzzle to proceed!";
    }
  };

  return (
    <PuzzleOverlay
      isVisible={isVisible}
      onClose={onClose}
      title={getPuzzleTitle()}
      subtitle={getPuzzleSubtitle()}
    >
      {getPuzzleComponent()}
    </PuzzleOverlay>
  );
};

export default PuzzleRouter;
