import React, { useState, useEffect } from "react";
import useGameStore from "../../store/gameStore";

interface NumberPuzzleProps {
  onComplete: () => void;
  difficulty: "easy" | "medium" | "hard";
}

const NumberPuzzle: React.FC<NumberPuzzleProps> = ({
  onComplete,
  difficulty,
}) => {
  const { addPoints, addExperience } = useGameStore();
  const [numbers, setNumbers] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<string>("");
  const [gameComplete, setGameComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [moves, setMoves] = useState(0);
  const [showNumbers, setShowNumbers] = useState(true);

  const sequenceLength =
    difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;
  const numberRange =
    difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : 50;

  // Generate number sequence
  useEffect(() => {
    const newNumbers = Array.from(
      { length: sequenceLength },
      () => Math.floor(Math.random() * numberRange) + 1
    );
    setNumbers(newNumbers);
  }, [sequenceLength, numberRange]);

  // Hide numbers after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNumbers(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !gameComplete) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !gameComplete) {
      // Time's up - reset puzzle
      setPlayerInput("");
      setMoves(0);
      setTimeLeft(45);
      setShowNumbers(true);
    }
  }, [timeLeft, gameComplete]);

  // Check for completion
  useEffect(() => {
    if (playerInput.length === numbers.length && numbers.length > 0) {
      const inputNumbers = playerInput.split("").map(Number);
      const isCorrect = inputNumbers.every(
        (num, index) => num === numbers[index]
      );

      if (isCorrect) {
        setGameComplete(true);
        const points = Math.max(200, 400 - moves * 15 + timeLeft * 4);
        addPoints(points);
        addExperience(100);

        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        // Wrong sequence - reset
        setPlayerInput("");
        setMoves((prev) => prev + 1);
      }
    }
  }, [
    playerInput,
    numbers,
    moves,
    timeLeft,
    addPoints,
    addExperience,
    onComplete,
  ]);

  const handleNumberClick = (num: number) => {
    if (gameComplete || showNumbers) return;

    setPlayerInput((prev) => prev + num.toString());
    setMoves((prev) => prev + 1);
  };

  const handleBackspace = () => {
    if (gameComplete || showNumbers) return;
    setPlayerInput((prev) => prev.slice(0, -1));
  };

  const resetPuzzle = () => {
    setPlayerInput("");
    setMoves(0);
    setTimeLeft(45);
    setShowNumbers(true);
  };

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
          Input: {playerInput.length}/{numbers.length}
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "2rem",
          padding: "1rem",
          backgroundColor: showNumbers
            ? "rgba(255, 165, 0, 0.1)"
            : "rgba(0, 100, 255, 0.1)",
          borderRadius: "8px",
          border: `1px solid ${showNumbers ? "#ffa500" : "#0066ff"}`,
        }}
      >
        <h3
          style={{
            color: showNumbers ? "#ffa500" : "#0066ff",
            margin: "0 0 0.5rem 0",
          }}
        >
          {showNumbers
            ? "Memorize the numbers!"
            : "Enter the numbers in order!"}
        </h3>
        <p style={{ color: "#ccc", margin: 0 }}>
          {showNumbers
            ? `Numbers will disappear in ${Math.max(
                0,
                5 - Math.floor((5000 - (Date.now() % 5000)) / 1000)
              )} seconds`
            : "Click the numbers in the same order you saw them"}
        </p>
      </div>

      {/* Number Display */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginBottom: "2rem",
          minHeight: "100px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {numbers.map((num, index) => (
          <div
            key={index}
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              fontWeight: "bold",
              backgroundColor: showNumbers ? "#ffff00" : "#333",
              color: showNumbers ? "#000" : "#fff",
              border: "3px solid #666",
              opacity: showNumbers ? 1 : 0.3,
              transition: "all 0.3s ease",
              boxShadow: showNumbers ? "0 0 20px #ffff00" : "none",
            }}
          >
            {showNumbers ? num : "?"}
          </div>
        ))}
      </div>

      {/* Player Input Display */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "2rem",
          minHeight: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: "2rem",
            color: "#00ff00",
            fontFamily: "monospace",
            letterSpacing: "0.5rem",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            padding: "1rem 2rem",
            borderRadius: "8px",
            border: "2px solid #333",
          }}
        >
          {playerInput || "Enter numbers..."}
        </div>
      </div>

      {/* Number Pad */}
      {!showNumbers && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "1rem",
              marginBottom: "2rem",
              maxWidth: "400px",
              margin: "0 auto 2rem auto",
            }}
          >
            {Array.from({ length: 10 }, (_, i) => i).map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                disabled={gameComplete}
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "8px",
                  border: "2px solid #666",
                  background: "#333",
                  color: "#fff",
                  cursor: gameComplete ? "not-allowed" : "pointer",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
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
                {num}
              </button>
            ))}
          </div>

          {/* Control Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <button
              onClick={handleBackspace}
              disabled={gameComplete || playerInput.length === 0}
              style={{
                background: "rgba(255, 165, 0, 0.2)",
                border: "2px solid #ffa500",
                color: "#ffa500",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                cursor:
                  gameComplete || playerInput.length === 0
                    ? "not-allowed"
                    : "pointer",
                fontSize: "1rem",
                fontWeight: "bold",
                fontFamily: "inherit",
                opacity: gameComplete || playerInput.length === 0 ? 0.5 : 1,
              }}
            >
              Backspace
            </button>
            <button
              onClick={resetPuzzle}
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
              Reset
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
            NUMBERS COMPLETE!
          </div>
          <div
            style={{ fontSize: "1.2rem", color: "#fff", marginTop: "0.5rem" }}
          >
            +{Math.max(200, 400 - moves * 15 + timeLeft * 4)} points!
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

export default NumberPuzzle;
