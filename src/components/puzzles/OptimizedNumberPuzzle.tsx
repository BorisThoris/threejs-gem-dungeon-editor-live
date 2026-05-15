import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import useGameStore from "../../store/gameStore";

interface OptimizedNumberPuzzleProps {
  onComplete: () => void;
  difficulty: "easy" | "medium" | "hard";
}

const OptimizedNumberPuzzle: React.FC<OptimizedNumberPuzzleProps> = ({
  onComplete,
  difficulty,
}) => {
  const { addPoints, addExperience } = useGameStore();
  const [numbers, setNumbers] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<string>("");
  const [gameComplete, setGameComplete] = useState(false);
  const [moves, setMoves] = useState(0);
  const [showNumbers, setShowNumbers] = useState(true);

  const sequenceLength =
    difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;
  const numberRange =
    difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : 50;

  // Local timer state
  const [timeLeft, setTimeLeft] = useState(45);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = useCallback(() => {
    clearTimer();
    setIsComplete(false);
    setIsRunning(true);
    setTimeLeft(45);
    startTimeRef.current = performance.now();
    intervalRef.current = window.setInterval(() => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, 45 - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setIsRunning(false);
        setIsComplete(true);
        clearTimer();
        // Time's up - reset puzzle state after a short moment
        setPlayerInput("");
        setMoves(0);
        setShowNumbers(true);
        setNumbers(generateNewNumbers());
      }
    }, 100);
  }, [generateNewNumbers]);

  const resetTimer = useCallback(() => {
    clearTimer();
    setIsComplete(false);
    setIsRunning(false);
    setTimeLeft(45);
  }, []);

  // Generate new numbers
  const generateNewNumbers = useCallback(() => {
    return Array.from(
      { length: sequenceLength },
      () => Math.floor(Math.random() * numberRange) + 1
    );
  }, [sequenceLength, numberRange]);

  // Initialize puzzle
  useEffect(() => {
    const newNumbers = generateNewNumbers();
    setNumbers(newNumbers);
    setShowNumbers(true);
    setPlayerInput("");
    setMoves(0);
    setGameComplete(false);

    // Start timer after a short delay
    const t = setTimeout(() => {
      start();
    }, 1000);
    return () => clearTimeout(t);
  }, [difficulty, start, generateNewNumbers]);

  // Hide numbers after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNumbers(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [numbers]);

  // Check for completion
  useEffect(() => {
    if (playerInput.length === sequenceLength) {
      const inputNumbers = playerInput.split("").map(Number);
      const isCorrect = numbers.every(
        (num, index) => num === inputNumbers[index]
      );

      if (isCorrect) {
        setGameComplete(true);
        const points = Math.max(200, 400 - moves * 15 + timeLeft * 4);
        addPoints(points);
        addExperience(points * 0.5);

        const t = setTimeout(() => {
          onComplete();
        }, 2000);
        return () => clearTimeout(t);
      } else {
        setPlayerInput("");
        setMoves((prev) => prev + 1);
      }
    }
  }, [
    playerInput,
    numbers,
    sequenceLength,
    moves,
    timeLeft,
    addPoints,
    addExperience,
    onComplete,
  ]);

  // Memoize the number display to prevent unnecessary re-renders
  const numberDisplay = useMemo(() => {
    if (showNumbers) {
      return (
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          {numbers.map((num, index) => (
            <div
              key={index}
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: "#4CAF50",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "5px",
                fontSize: "18px",
                fontWeight: "bold",
              }}
            >
              {num}
            </div>
          ))}
        </div>
      );
    }
    return (
      <div
        style={{
          textAlign: "center",
          marginBottom: "20px",
          fontSize: "18px",
          color: "#666",
        }}
      >
        Numbers hidden! Enter the sequence:
      </div>
    );
  }, [showNumbers, numbers]);

  // Memoize the input display
  const inputDisplay = useMemo(() => {
    return (
      <div
        style={{
          display: "flex",
          gap: "5px",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        {Array.from({ length: sequenceLength }, (_, index) => (
          <input
            key={index}
            type="text"
            value={playerInput[index] || ""}
            onChange={(e) => {
              const newInput = playerInput.split("");
              newInput[index] = e.target.value;
              setPlayerInput(newInput.join(""));
            }}
            style={{
              width: "30px",
              height: "30px",
              textAlign: "center",
              fontSize: "16px",
              border: "2px solid #ddd",
              borderRadius: "3px",
            }}
            maxLength={1}
            disabled={gameComplete}
          />
        ))}
      </div>
    );
  }, [playerInput, sequenceLength, gameComplete]);

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        color: "white",
        padding: "30px",
        borderRadius: "10px",
        textAlign: "center",
        zIndex: 1000,
        minWidth: "400px",
        border: "2px solid #4CAF50",
      }}
    >
      <h2 style={{ marginBottom: "20px", color: "#4CAF50" }}>
        Number Sequence Puzzle ({difficulty.toUpperCase()})
      </h2>

      {numberDisplay}

      {!showNumbers && !gameComplete && (
        <>
          {inputDisplay}

          <div style={{ marginBottom: "20px" }}>
            <div style={{ marginBottom: "10px" }}>
              <span style={{ color: timeLeft < 10 ? "#ff0000" : "#00ff00" }}>
                Time: {Math.ceil(timeLeft)}s
              </span>
              <span style={{ margin: "0 20px" }}>Moves: {moves}</span>
            </div>
          </div>
        </>
      )}

      {gameComplete && (
        <div style={{ color: "#4CAF50", fontSize: "18px", marginTop: "20px" }}>
          🎉 Puzzle Complete! 🎉
          <br />+{Math.max(200, 400 - moves * 15 + timeLeft * 4)} points!
        </div>
      )}

      {isComplete && !gameComplete && (
        <div style={{ color: "#ff0000", fontSize: "18px", marginTop: "20px" }}>
          ⏰ Time's up! Try again!
        </div>
      )}
    </div>
  );
};

export default OptimizedNumberPuzzle;
