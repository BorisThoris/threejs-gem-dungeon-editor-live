import React, { useState, useEffect } from "react";
import useGameStore from "../../store/gameStore";

interface MemoryTile {
  id: string;
  shape: string;
  pairId: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryPuzzleProps {
  onComplete: () => void;
  difficulty: "easy" | "medium" | "hard";
}

const MemoryPuzzle: React.FC<MemoryPuzzleProps> = ({
  onComplete,
  difficulty,
}) => {
  const { addPoints, addExperience } = useGameStore();
  const [tiles, setTiles] = useState<MemoryTile[]>([]);
  const [flippedTiles, setFlippedTiles] = useState<string[]>([]);
  const [matchedTiles, setMatchedTiles] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  // Generate puzzle based on difficulty
  useEffect(() => {
    const shapes = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠", "🔶", "🔷", "🔸", "🔹"];
    const tileCount =
      difficulty === "easy" ? 8 : difficulty === "medium" ? 12 : 16;
    const shapeCount = tileCount / 2;

    const selectedShapes = shapes.slice(0, shapeCount);
    const tilePairs = [...selectedShapes, ...selectedShapes];

    // Shuffle the tiles
    const shuffledTiles = tilePairs
      .map((shape, index) => ({
        id: `tile_${index}`,
        shape,
        pairId: `tile_${
          index + (index < shapeCount ? shapeCount : -shapeCount)
        }`,
        isFlipped: false,
        isMatched: false,
      }))
      .sort(() => Math.random() - 0.5);

    setTiles(shuffledTiles);
  }, [difficulty]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !gameComplete) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !gameComplete) {
      // Time's up - reset puzzle
      setTiles((prev) =>
        prev.map((tile) => ({ ...tile, isFlipped: false, isMatched: false }))
      );
      setFlippedTiles([]);
      setMatchedTiles([]);
      setMoves(0);
      setTimeLeft(60);
    }
  }, [timeLeft, gameComplete]);

  // Check for completion
  useEffect(() => {
    if (matchedTiles.length === tiles.length && tiles.length > 0) {
      setGameComplete(true);
      const points = Math.max(100, 200 - moves * 5 + timeLeft * 2);
      addPoints(points);
      addExperience(50);

      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  }, [
    matchedTiles.length,
    tiles.length,
    moves,
    timeLeft,
    addPoints,
    addExperience,
    onComplete,
  ]);

  const handleTileClick = (tileId: string) => {
    if (isPreviewMode || flippedTiles.length >= 2) return;

    const tile = tiles.find((t) => t.id === tileId);
    if (!tile || tile.isMatched || tile.isFlipped) return;

    const newFlippedTiles = [...flippedTiles, tileId];
    setFlippedTiles(newFlippedTiles);
    setMoves((prev) => prev + 1);

    if (newFlippedTiles.length === 2) {
      const [firstId, secondId] = newFlippedTiles;
      const firstTile = tiles.find((t) => t.id === firstId);
      const secondTile = tiles.find((t) => t.id === secondId);

      if (firstTile?.pairId === secondId) {
        // Match found
        setMatchedTiles((prev) => [...prev, firstId, secondId]);
        setFlippedTiles([]);
      } else {
        // No match, flip back after delay
        setTimeout(() => {
          setFlippedTiles([]);
        }, 1000);
      }
    }
  };

  const startPreview = () => {
    if (isPreviewMode) return;
    setIsPreviewMode(true);
    setTimeout(() => {
      setIsPreviewMode(false);
    }, 2000);
  };

  const getTileState = (tile: MemoryTile) => {
    if (tile.isMatched) return "matched";
    if (flippedTiles.includes(tile.id)) return "flipped";
    if (isPreviewMode) return "preview";
    return "hidden";
  };

  const getTileColor = (state: string) => {
    switch (state) {
      case "hidden":
        return "#444444";
      case "flipped":
        return "#666666";
      case "matched":
        return "#00ff00";
      case "preview":
        return "#ffff00";
      default:
        return "#444444";
    }
  };

  const gridSize = Math.sqrt(tiles.length);
  const tileSize = 80;
  const spacing = 10;

  return (
    <div style={{ width: "100%", maxWidth: "600px" }}>
      {/* Game Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "2rem",
          padding: "1rem",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          borderRadius: "8px",
          border: "1px solid #333",
        }}
      >
        <div
          style={{
            color: timeLeft < 10 ? "#ff0000" : "#00ff00",
            fontSize: "1.2rem",
          }}
        >
          Time: {timeLeft}s
        </div>
        <div style={{ color: "#fff", fontSize: "1.2rem" }}>Moves: {moves}</div>
        <div style={{ color: "#00ff00", fontSize: "1.2rem" }}>
          Matched: {matchedTiles.length / 2}/{tiles.length / 2}
        </div>
      </div>

      {/* Preview Button */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <button
          onClick={startPreview}
          disabled={isPreviewMode}
          style={{
            background: isPreviewMode ? "#666" : "#4CAF50",
            border: "2px solid #4CAF50",
            color: "#fff",
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            cursor: isPreviewMode ? "not-allowed" : "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
            fontFamily: "inherit",
          }}
        >
          {isPreviewMode ? "Previewing..." : "Preview (2s)"}
        </button>
      </div>

      {/* Game Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gap: `${spacing}px`,
          maxWidth: `${gridSize * (tileSize + spacing)}px`,
          margin: "0 auto",
        }}
      >
        {tiles.map((tile) => {
          const state = getTileState(tile);
          const color = getTileColor(state);

          return (
            <div
              key={tile.id}
              onClick={() => handleTileClick(tile.id)}
              style={{
                width: `${tileSize}px`,
                height: `${tileSize}px`,
                backgroundColor: color,
                border: "2px solid #333",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "2rem",
                transition: "all 0.3s ease",
                boxShadow: state === "matched" ? "0 0 20px #00ff00" : "none",
                transform: state === "flipped" ? "scale(0.95)" : "scale(1)",
              }}
              onMouseOver={(e) => {
                if (state === "hidden") {
                  e.currentTarget.style.backgroundColor = "#555";
                  e.currentTarget.style.transform = "scale(1.05)";
                }
              }}
              onMouseOut={(e) => {
                if (state === "hidden") {
                  e.currentTarget.style.backgroundColor = color;
                  e.currentTarget.style.transform = "scale(1)";
                }
              }}
            >
              {state !== "hidden" && (
                <span style={{ fontSize: "2rem" }}>{tile.shape}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion Message */}
      {gameComplete && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0, 255, 0, 0.1)",
            border: "2px solid #00ff00",
            borderRadius: "15px",
            padding: "2rem",
            textAlign: "center",
            zIndex: 1002,
            animation: "pulse 1s infinite",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
          <div
            style={{ fontSize: "2rem", color: "#00ff00", fontWeight: "bold" }}
          >
            PUZZLE COMPLETE!
          </div>
          <div
            style={{ fontSize: "1.2rem", color: "#fff", marginTop: "0.5rem" }}
          >
            +{Math.max(100, 200 - moves * 5 + timeLeft * 2)} points!
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

export default MemoryPuzzle;
