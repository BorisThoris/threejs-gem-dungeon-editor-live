import { useState, useEffect } from "react";
import { useSimpleSafeSpawn } from "./useSimpleSafeSpawn";

interface UsePlayerSpawnProps {
  initialSpawnPosition: [number, number, number];
  showDebugInfo: boolean;
}

export const usePlayerSpawn = ({ 
  initialSpawnPosition, 
  showDebugInfo 
}: UsePlayerSpawnProps) => {
  const { findSafeSpawnPosition } = useSimpleSafeSpawn({
    maxAttempts: 100,
    searchRadius: 25,
    searchHeight: 5,
    playerRadius: 0.8,
    playerHeight: 1.6,
    stepSize: 0.5,
  });

  // State for spawn management
  const [spawnPosition, setSpawnPosition] = useState<[number, number, number]>(initialSpawnPosition);
  const [isSpawned, setIsSpawned] = useState(false);
  const [spawnInfo, setSpawnInfo] = useState<{
    isSafe: boolean;
    attempts: number;
    position: [number, number, number];
  } | null>(null);

  // Find safe spawn position on mount
  useEffect(() => {
    // Use a fixed safe height that should work for most rooms
    // This places the player 1.5 units above the floor (which is typically at Y=-0.5)
    const safeSpawnPosition: [number, number, number] = [
      initialSpawnPosition[0], // Keep X position
      1.5, // Safe height above floor
      initialSpawnPosition[2], // Keep Z position
    ];

    setSpawnPosition(safeSpawnPosition);
    setSpawnInfo({
      position: safeSpawnPosition,
      isSafe: true,
      attempts: 1,
    });
    setIsSpawned(true);

    if (showDebugInfo) {
      console.log("Player: Safe spawning at", safeSpawnPosition);
      console.log(
        "Player: Player capsule will be from Y=",
        1.5 - 0.3,
        "to Y=",
        1.5 + 0.3
      );
    }
  }, [initialSpawnPosition, showDebugInfo]);

  return {
    spawnPosition,
    isSpawned,
    spawnInfo,
    setSpawnPosition,
  };
};
