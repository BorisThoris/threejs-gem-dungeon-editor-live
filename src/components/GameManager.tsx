import React, { useState, useEffect, useCallback } from "react";
import useGameStore from "../store/gameStore";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { EffectManager } from "./VisualEffects";

interface GameManagerProps {
  playerPosition: [number, number, number];
}

const GameManager: React.FC<GameManagerProps> = ({ playerPosition }) => {
  const { playerStats, updateStats } = useGameStore();

  const { playSound } = useSoundEffects();
  const [effects, setEffects] = useState<
    Array<{
      id: string;
      type: "damage" | "heal" | "score" | "levelup" | "combo" | "custom";
      value?: number;
      text?: string;
      position: [number, number, number];
      color?: string;
      duration?: number;
    }>
  >([]);

  // Add visual effect
  const addEffect = useCallback(
    (
      type: "damage" | "heal" | "score" | "levelup" | "combo" | "custom",
      value: number,
      position: [number, number, number],
      text?: string,
      color?: string,
      duration?: number
    ) => {
      const id = `${type}_${Date.now()}_${Math.random()}`;
      setEffects((prev) => [
        ...prev,
        {
          id,
          type,
          value,
          text,
          position,
          color,
          duration,
        },
      ]);
    },
    []
  );

  // Remove effect
  const removeEffect = useCallback((id: string) => {
    setEffects((prev) => prev.filter((effect) => effect.id !== id));
  }, []);

  // Game event handlers (available for use by other components)
  // const handlePlayerHeal = useCallback(...)
  // const handleItemPickup = useCallback(...)
  // const handlePuzzleComplete = useCallback(...)
  // const handleChestOpen = useCallback(...)
  // const handleSecretDiscover = useCallback(...)
  // const handleBossDefeat = useCallback(...)

  // Handle level up
  const handleLevelUp = useCallback(() => {
    addEffect("levelup", 0, [
      playerPosition[0],
      playerPosition[1] + 2,
      playerPosition[2],
    ]);
    playSound("levelUp");
  }, [playerPosition, addEffect, playSound]);

  // Check for level up
  useEffect(() => {
    const newLevel = Math.floor(playerStats.experience / 100) + 1;
    if (newLevel > playerStats.level) {
      updateStats({ level: newLevel });
      handleLevelUp();
    }
  }, [playerStats.experience, playerStats.level, updateStats, handleLevelUp]);

  return (
    <group>
      <EffectManager effects={effects} onEffectComplete={removeEffect} />
    </group>
  );
};

export default GameManager;
