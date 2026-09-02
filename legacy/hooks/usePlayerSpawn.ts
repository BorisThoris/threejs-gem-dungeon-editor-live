import { useState, useEffect } from "react";
import { useSimpleSafeSpawn } from "./useSimpleSafeSpawn";
import { PLAYER_SPAWN_Y } from "../configs/worldGeometry";

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
    // Spawn at the height the player actually rests at. The old fixed 1.5 was
    // guessed against a floor "typically at Y=-0.5", which stopped being true
    // once every room shared one ground plane.
    const safeSpawnPosition: [number, number, number] = [
      initialSpawnPosition[0],
      PLAYER_SPAWN_Y,
      initialSpawnPosition[2],
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
    }
  }, [initialSpawnPosition, showDebugInfo]);

  return {
    spawnPosition,
    isSpawned,
    spawnInfo,
    setSpawnPosition,
  };
};
