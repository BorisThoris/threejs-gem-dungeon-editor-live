import React, { useState } from "react";

// Simple test component to isolate the pattern validation issue
const PatternValidationTest: React.FC = () => {
  const [currentPattern, setCurrentPattern] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [gamePhase, setGamePhase] = useState<
    "waiting" | "showing" | "playing" | "completed"
  >("waiting");

  // Generate a test pattern
  const generatePattern = (length: number): number[] => {
    const pattern = Array.from({ length }, () => Math.floor(Math.random() * 4));
    console.log("TEST: Generated pattern:", pattern);
    return pattern;
  };

  // Start test
  const startTest = () => {
    const newPattern = generatePattern(3);
    setCurrentPattern(newPattern);
    setPlayerSequence([]);
    setGamePhase("playing");
    console.log("TEST: Started with pattern:", newPattern);
  };

  // Handle block click
  const handleBlockClick = (blockId: number) => {
    if (gamePhase !== "playing") return;

    const newSequence = [...playerSequence, blockId];
    setPlayerSequence(newSequence);

    console.log("TEST: Player clicked block", blockId);
    console.log("TEST: Current pattern:", currentPattern);
    console.log("TEST: Player sequence:", newSequence);
    console.log("TEST: Pattern length:", currentPattern.length);
    console.log("TEST: Sequence length:", newSequence.length);

    // Check if this completes the pattern
    if (newSequence.length === currentPattern.length) {
      console.log("TEST: Pattern length matches, validating...");

      // Check if pattern is correct
      const isCorrect = newSequence.every(
        (id, index) => id === currentPattern[index]
      );

      console.log("TEST: Pattern complete! Is correct?", isCorrect);
      console.log("TEST: Expected:", currentPattern);
      console.log("TEST: Player entered:", newSequence);

      // Detailed validation check
      for (let i = 0; i < newSequence.length; i++) {
        const playerValue = newSequence[i];
        const expectedValue = currentPattern[i];
        const isMatch = playerValue === expectedValue;
        console.log(
          `TEST: Step ${
            i + 1
          }: Player=${playerValue}, Expected=${expectedValue}, Match=${isMatch}`
        );
      }

      if (isCorrect) {
        console.log("TEST: ✅ Pattern is CORRECT!");
        setGamePhase("completed");
      } else {
        console.log("TEST: ❌ Pattern is INCORRECT!");
        setGamePhase("completed");
      }
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h2>Pattern Validation Test</h2>

      <div style={{ marginBottom: "20px" }}>
        <button onClick={startTest} disabled={gamePhase === "playing"}>
          Start Test
        </button>
        <button
          onClick={() => {
            setCurrentPattern([]);
            setPlayerSequence([]);
            setGamePhase("waiting");
          }}
        >
          Reset
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <strong>Current Pattern:</strong> [{currentPattern.join(", ")}]
      </div>

      <div style={{ marginBottom: "20px" }}>
        <strong>Player Sequence:</strong> [{playerSequence.join(", ")}]
      </div>

      <div style={{ marginBottom: "20px" }}>
        <strong>Game Phase:</strong> {gamePhase}
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3>Click Blocks (0-3):</h3>
        {[0, 1, 2, 3].map((blockId) => (
          <button
            key={blockId}
            onClick={() => handleBlockClick(blockId)}
            disabled={gamePhase !== "playing"}
            style={{
              margin: "5px",
              padding: "10px",
              fontSize: "16px",
              backgroundColor: gamePhase === "playing" ? "#4CAF50" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: gamePhase === "playing" ? "pointer" : "not-allowed",
            }}
          >
            Block {blockId}
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          backgroundColor: "#f0f0f0",
        }}
      >
        <h3>Instructions:</h3>
        <ol>
          <li>Click "Start Test" to generate a random pattern</li>
          <li>Remember the pattern that was generated</li>
          <li>Click the blocks in the same order as the pattern</li>
          <li>Check the console for detailed validation logs</li>
          <li>Try both correct and incorrect patterns</li>
        </ol>
      </div>
    </div>
  );
};

export default PatternValidationTest;

