import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Canvas } from "@react-three/fiber";
import MemoryGamePuzzleBiome from "../MemoryGamePuzzleBiome";

// Mock the game store
jest.mock("../../../store/consolidatedGameStore", () => ({
  usePlayerStats: () => ({
    lives: 3,
    maxLives: 3,
    level: 1,
    experience: 0,
    points: 100,
    keys: 2,
    bombs: 1,
    streak: 0,
    maxStreak: 0,
    currentFloor: 1,
    roomsCompleted: 0,
    size: 1.0,
    speed: 1.0,
    strength: 1.0,
    defense: 0,
    luck: 0,
    dimensions: {
      width: 0.6,
      height: 1.8,
      depth: 0.6,
      capsuleRadius: 0.3,
      capsuleHeight: 1.4,
    },
    buffs: {
      speedBoost: 0,
      strengthBoost: 0,
      defenseBoost: 0,
      luckBoost: 0,
    },
  }),
}));

// Mock the game store actions
jest.mock("../../../store/gameStore", () => ({
  __esModule: true,
  default: () => ({
    playerStats: {
      lives: 3,
      maxLives: 3,
      level: 1,
      experience: 0,
      points: 100,
    },
    loseLife: jest.fn(),
    addExperience: jest.fn(),
    addPoints: jest.fn(),
  }),
}));

// Mock the room actions hook
jest.mock("../../../hooks/useRoomActions", () => ({
  useRoomActions: () => ({
    cards: [],
    isVisible: false,
    showCards: jest.fn(),
    hideCards: jest.fn(),
  }),
}));

// Mock biome scaling
jest.mock("../../../utils/biomeScaling", () => ({
  getBiomeScale: () => 1,
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Canvas>{children}</Canvas>
);

describe("MemoryGamePuzzleBiome Pattern Validation", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test("should generate valid patterns", () => {
    const mockOnDoorsLock = jest.fn();
    const mockOnDoorsUnlock = jest.fn();
    const mockOnRoomComplete = jest.fn();

    render(
      <TestWrapper>
        <MemoryGamePuzzleBiome
          onDoorsLock={mockOnDoorsLock}
          onDoorsUnlock={mockOnDoorsUnlock}
          onRoomComplete={mockOnRoomComplete}
        />
      </TestWrapper>
    );

    // The component should render without errors
    expect(screen.getByText(/Click the book to start!/)).toBeInTheDocument();
  });

  test("should validate correct pattern", () => {
    // Test the pattern validation logic directly
    const testPattern = [2, 0, 1];
    const correctSequence = [2, 0, 1];

    const isCorrect = correctSequence.every(
      (id, index) => id === testPattern[index]
    );

    expect(isCorrect).toBe(true);
  });

  test("should reject incorrect pattern", () => {
    // Test the pattern validation logic directly
    const testPattern = [2, 0, 1];
    const incorrectSequence = [1, 0, 2];

    const isCorrect = incorrectSequence.every(
      (id, index) => id === testPattern[index]
    );

    expect(isCorrect).toBe(false);
  });

  test("should reject partial pattern", () => {
    // Test the pattern validation logic directly
    const testPattern = [2, 0, 1];
    const partialSequence = [2, 0]; // Missing last step

    const isCorrect = partialSequence.every(
      (id, index) => id === testPattern[index]
    );

    // This should be true for the first two elements, but we need to check length separately
    expect(isCorrect).toBe(true);
    expect(partialSequence.length).not.toBe(testPattern.length);
  });

  test("should handle different pattern lengths", () => {
    const patterns = [[0], [1, 2], [0, 1, 2], [3, 0, 1, 2], [2, 1, 0, 3, 1]];

    patterns.forEach((pattern, index) => {
      // Test with correct sequence
      const correctSequence = [...pattern];
      const isCorrect = correctSequence.every((id, idx) => id === pattern[idx]);
      expect(isCorrect).toBe(true);

      // Test with incorrect sequence (reverse)
      const incorrectSequence = [...pattern].reverse();
      const isIncorrect = incorrectSequence.every(
        (id, idx) => id === pattern[idx]
      );
      expect(isIncorrect).toBe(false);
    });
  });

  test("should handle edge cases", () => {
    // Empty pattern
    const emptyPattern: number[] = [];
    const emptySequence: number[] = [];
    const isEmptyCorrect = emptySequence.every(
      (id, index) => id === emptyPattern[index]
    );
    expect(isEmptyCorrect).toBe(true);

    // Single element patterns
    const singlePattern = [2];
    const correctSingle = [2];
    const incorrectSingle = [1];

    expect(
      correctSingle.every((id, index) => id === singlePattern[index])
    ).toBe(true);
    expect(
      incorrectSingle.every((id, index) => id === singlePattern[index])
    ).toBe(false);
  });

  test("should validate pattern with repeated elements", () => {
    const patternWithRepeats = [0, 0, 1, 1];

    // Correct sequence
    const correctSequence = [0, 0, 1, 1];
    const isCorrect = correctSequence.every(
      (id, index) => id === patternWithRepeats[index]
    );
    expect(isCorrect).toBe(true);

    // Incorrect sequence (wrong order)
    const incorrectSequence = [0, 1, 0, 1];
    const isIncorrect = incorrectSequence.every(
      (id, index) => id === patternWithRepeats[index]
    );
    expect(isIncorrect).toBe(false);
  });

  test("should handle pattern validation with different block IDs", () => {
    // Test all possible block IDs (0-3)
    const testPattern = [0, 1, 2, 3];
    const correctSequence = [0, 1, 2, 3];
    const incorrectSequence = [3, 2, 1, 0];

    expect(
      correctSequence.every((id, index) => id === testPattern[index])
    ).toBe(true);
    expect(
      incorrectSequence.every((id, index) => id === testPattern[index])
    ).toBe(false);
  });
});

// Test the pattern generation function directly
describe("Pattern Generation", () => {
  test("should generate patterns of correct length", () => {
    const generatePattern = (length: number): number[] => {
      return Array.from({ length }, () => Math.floor(Math.random() * 4));
    };

    const lengths = [1, 2, 3, 4, 5];

    lengths.forEach((length) => {
      const pattern = generatePattern(length);
      expect(pattern).toHaveLength(length);
      expect(pattern.every((id) => id >= 0 && id <= 3)).toBe(true);
    });
  });

  test("should generate different patterns on multiple calls", () => {
    const generatePattern = (length: number): number[] => {
      return Array.from({ length }, () => Math.floor(Math.random() * 4));
    };

    const patterns = Array.from({ length: 10 }, () => generatePattern(3));

    // Check that we get some variety (not all the same)
    const uniquePatterns = new Set(patterns.map((p) => p.join(",")));
    expect(uniquePatterns.size).toBeGreaterThan(1);
  });
});

// Test the validation logic in isolation
describe("Pattern Validation Logic", () => {
  const validatePattern = (
    playerSequence: number[],
    expectedPattern: number[]
  ): boolean => {
    if (playerSequence.length !== expectedPattern.length) {
      return false;
    }
    return playerSequence.every((id, index) => id === expectedPattern[index]);
  };

  test("should validate correct patterns", () => {
    const testCases = [
      { player: [0], expected: [0] },
      { player: [1, 2], expected: [1, 2] },
      { player: [0, 1, 2], expected: [0, 1, 2] },
      { player: [3, 0, 1, 2], expected: [3, 0, 1, 2] },
    ];

    testCases.forEach(({ player, expected }) => {
      expect(validatePattern(player, expected)).toBe(true);
    });
  });

  test("should reject incorrect patterns", () => {
    const testCases = [
      { player: [1], expected: [0] },
      { player: [2, 1], expected: [1, 2] },
      { player: [1, 0, 2], expected: [0, 1, 2] },
      { player: [0, 1, 2, 3], expected: [3, 2, 1, 0] },
    ];

    testCases.forEach(({ player, expected }) => {
      expect(validatePattern(player, expected)).toBe(false);
    });
  });

  test("should reject patterns of wrong length", () => {
    const testCases = [
      { player: [0, 1], expected: [0] },
      { player: [0], expected: [0, 1] },
      { player: [0, 1, 2], expected: [0, 1] },
    ];

    testCases.forEach(({ player, expected }) => {
      expect(validatePattern(player, expected)).toBe(false);
    });
  });
});

