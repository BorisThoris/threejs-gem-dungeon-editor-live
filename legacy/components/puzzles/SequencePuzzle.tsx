import React, { useState, useEffect, useMemo } from "react";
import useGameStore from "../../store/gameStore";

interface SequencePuzzleProps {
  onComplete: () => void;
  difficulty: "easy" | "medium" | "hard";
}

const SequencePuzzle: React.FC<SequencePuzzleProps> = ({
  onComplete,
  difficulty,
}) => {
  const { addPoints, addExperience } = useGameStore();
  const [sequence, setSequence] = useState<string[]>([]);
  const [playerSequence, setPlayerSequence] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isShowing, setIsShowing] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [moves, setMoves] = useState(0);

  const colors = useMemo(() => ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠"], []);
  const sequenceLength =
    difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;

  // Generate sequence
  useEffect(() => {
    const newSequence = Array.from(
      { length: sequenceLength },
      () => colors[Math.floor(Math.random() * colors.length)]
    );
    setSequence(newSequence);
  }, [sequenceLength, colors]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !gameComplete) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !gameComplete) {
      // Time's up - reset puzzle
      setPlayerSequence([]);
      setCurrentStep(0);
      setMoves(0);
      setTimeLeft(30);
    }
  }, [timeLeft, gameComplete, isShowing]);

  // Show sequence
  useEffect(() => {
    if (sequence.length > 0 && !isShowing) {
      setIsShowing(true);
      let step = 0;
      const interval = setInterval(() => {
        if (step < sequence.length) {
          setCurrentStep(step);
          step++;
        } else {
          clearInterval(interval);
          setIsShowing(false);
          setCurrentStep(-1);
        }
      }, 800);
    }
  }, [sequence, isShowing]);

  // Check for completion
  useEffect(() => {
    if (playerSequence.length === sequence.length && sequence.length > 0) {
      const isCorrect = playerSequence.every(
        (color, index) => color === sequence[index]
      );
      if (isCorrect) {
        setGameComplete(true);
        const points = Math.max(150, 300 - moves * 10 + timeLeft * 3);
        addPoints(points);
        addExperience(75);

        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        // Wrong sequence - reset
        setPlayerSequence([]);
        setCurrentStep(0);
        setMoves((prev) => prev + 1);
      }
    }
  }, [
    playerSequence,
    sequence,
    moves,
    timeLeft,
    addPoints,
    addExperience,
    onComplete,
  ]);

  const handleColorClick = (color: string) => {
    if (isShowing || gameComplete) return;

    setPlayerSequence((prev) => [...prev, color]);
    setMoves((prev) => prev + 1);
  };

  const resetSequence = () => {
    setPlayerSequence([]);
    setCurrentStep(0);
    setMoves(0);
  };

  return (
    <div style={{ width: "100%", maxWidth: "500px" }}>
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
          Step: {playerSequence.length}/{sequence.length}
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "2rem",
          padding: "1rem",
          backgroundColor: "rgba(0, 100, 255, 0.1)",
          borderRadius: "8px",
          border: "1px solid #0066ff",
        }}
      >
        <h3 style={{ color: "#0066ff", margin: "0 0 0.5rem 0" }}>
          {isShowing ? "Watch the sequence!" : "Repeat the sequence!"}
        </h3>
        <p style={{ color: "#ccc", margin: 0 }}>
          {isShowing
            ? "Memorize the order of colors"
            : "Click the colors in the same order you saw them"}
        </p>
      </div>

      {/* Sequence Display */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginBottom: "2rem",
          minHeight: "100px",
          alignItems: "center",
        }}
      >
        {sequence.map((color, index) => (
          <div
            key={index}
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              backgroundColor:
                isShowing && currentStep === index ? "#ffff00" : "#333",
              border: "3px solid #666",
              opacity: isShowing && currentStep >= index ? 1 : 0.3,
              transition: "all 0.3s ease",
              boxShadow:
                isShowing && currentStep === index
                  ? "0 0 20px #ffff00"
                  : "none",
            }}
          >
            {color}
          </div>
        ))}
      </div>

      {/* Player Input */}
      {!isShowing && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "1rem",
              marginBottom: "2rem",
              flexWrap: "wrap",
            }}
          >
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => handleColorClick(color)}
                disabled={gameComplete}
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  border: "3px solid #666",
                  background: "#333",
                  cursor: gameComplete ? "not-allowed" : "pointer",
                  fontSize: "2rem",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  if (!gameComplete) {
                    e.currentTarget.style.backgroundColor = "#555";
                    e.currentTarget.style.transform = "scale(1.1)";
                  }
                }}
                onMouseOut={(e) => {
                  if (!gameComplete) {
                    e.currentTarget.style.backgroundColor = "#333";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                {color}
              </button>
            ))}
          </div>

          {/* Player Sequence Display */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
              minHeight: "60px",
              alignItems: "center",
            }}
          >
            {playerSequence.map((color, index) => (
              <div
                key={index}
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  backgroundColor: "#444",
                  border: "2px solid #666",
                }}
              >
                {color}
              </div>
            ))}
          </div>

          {/* Reset Button */}
          <div style={{ textAlign: "center" }}>
            <button
              onClick={resetSequence}
              style={{
                background: "rgba(255, 0, 0, 0.2)",
                border: "2px solid #ff0000",
                color: "#ff0000",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "bold",
                fontFamily: "inherit",
              }}
            >
              Reset Sequence
            </button>
          </div>
        </div>
      )}

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
            SEQUENCE COMPLETE!
          </div>
          <div
            style={{ fontSize: "1.2rem", color: "#fff", marginTop: "0.5rem" }}
          >
            +{Math.max(150, 300 - moves * 10 + timeLeft * 3)} points!
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

export default SequencePuzzle;
