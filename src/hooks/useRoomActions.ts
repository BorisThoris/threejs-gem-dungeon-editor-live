import { useState, useCallback, useMemo, useRef } from "react";
import useGameStore from "../store/gameStore";
import type { ActionCard } from "../components/RoomActionCards";

export type RoomType = 
  // True Rooms - Complete rooms with walls/shells
  | "start"
  | "corridor"
  | "colosseum"
  | "stairs"
  | "middle-stairs"
  
  // Biomes - Environmental segments/areas placed inside rooms
  | "meditation" 
  | "benchpress" 
  | "library" 
  | "shop" 
  | "puzzle" 
  | "treasure" 
  | "challenge" 
  | "arena" 
  | "boss"
  | "end"
  | "normal"
  | "enemy"
  | "secret"
  | "memory-chamber"
  | "trap"
  | "cursed-room"
  | "devil-room"
  | "angel-room"
  | "coffee"
  | "library-upgrade"
  | "portal"
  | "laboratory"
  | "observatory"
  | "vault"
  | "shrine";

interface UseRoomActionsProps {
  roomType: RoomType;
  onPuzzleStart?: () => void;
  onShopOpen?: () => void;
  onChallengeStart?: () => void;
  onTreasureOpen?: () => void;
  onArenaFight?: () => void;
  onBossFight?: () => void;
}

export const useRoomActions = ({
  roomType,
  onPuzzleStart,
  onShopOpen,
  onChallengeStart,
  onTreasureOpen,
  onArenaFight,
  onBossFight,
}: UseRoomActionsProps) => {
  const { playerStats, addPoints, addExperience, upgradeDefense, upgradeStrength, addBuff } = useGameStore();
  const [isVisible, setIsVisible] = useState(false);
  const lastUpdateTime = useRef(0);

  // Throttle state updates to prevent excessive re-renders
  const throttledSetVisible = useCallback((visible: boolean) => {
    const now = Date.now();
    if (now - lastUpdateTime.current < 50) return; // Throttle to 20fps max
    lastUpdateTime.current = now;
    setIsVisible(visible);
  }, []);

  const getRoomCards = useCallback((): ActionCard[] => {
    const baseCards: ActionCard[] = [];

    switch (roomType) {
      case "meditation":
        return [
          {
            id: "meditate",
            title: "Meditate",
            description: "Focus your mind and gain defense boost",
            icon: "🧘",
            action: () => {
              onPuzzleStart?.();
            },
            cost: 0,
          },
          {
            id: "deep_meditation",
            title: "Deep Meditation",
            description: "Advanced meditation for greater benefits",
            icon: "🕉️",
            action: () => {
              upgradeDefense(0.25);
              addBuff("defenseBoost", 120);
              addPoints(80);
              addExperience(60);
            },
            cost: 50,
          },
        ];

      case "benchpress":
        return [
          {
            id: "lift",
            title: "Bench Press",
            description: "Build physical and mental strength",
            icon: "💪",
            action: () => {
              onPuzzleStart?.();
            },
            cost: 0,
          },
          {
            id: "heavy_lift",
            title: "Heavy Lift",
            description: "Maximum strength training",
            icon: "🏋️",
            action: () => {
              upgradeStrength(0.3);
              addBuff("strengthBoost", 90);
              addPoints(100);
              addExperience(80);
            },
            cost: 75,
          },
        ];

      case "library":
        return [
          {
            id: "study",
            title: "Study",
            description: "Gain knowledge through memory training",
            icon: "📚",
            action: () => {
              onPuzzleStart?.();
            },
            cost: 0,
          },
          {
            id: "research",
            title: "Research",
            description: "Deep study for maximum knowledge",
            icon: "🔬",
            action: () => {
              addPoints(150);
              addExperience(100);
              // Could add luck or other stats
            },
            cost: 100,
          },
        ];

      case "shop":
        return [
          {
            id: "browse",
            title: "Browse Items",
            description: "Look at available items for purchase",
            icon: "🛒",
            action: () => {
              onShopOpen?.();
            },
            cost: 0,
          },
          {
            id: "sell",
            title: "Sell Items",
            description: "Sell your items for points",
            icon: "💰",
            action: () => {
              // This would open a sell interface
              addPoints(25); // Placeholder
            },
            cost: 0,
          },
        ];

      case "puzzle":
        return [
          {
            id: "solve_puzzle",
            title: "Solve Puzzle",
            description: "Challenge your mind with puzzles",
            icon: "🧩",
            action: () => {
              onPuzzleStart?.();
            },
            cost: 0,
          },
          {
            id: "hint",
            title: "Get Hint",
            description: "Get a hint for the current puzzle",
            icon: "💡",
            action: () => {
              // This would provide a hint
              addPoints(-20); // Cost for hint
            },
            cost: 20,
          },
        ];

      case "treasure":
        return [
          {
            id: "open_chest",
            title: "Open Chest",
            description: "Open the treasure chest",
            icon: "📦",
            action: () => {
              onTreasureOpen?.();
            },
            cost: 0,
          },
          {
            id: "inspect",
            title: "Inspect",
            description: "Carefully examine the treasure",
            icon: "🔍",
            action: () => {
              addPoints(30);
              addExperience(20);
            },
            cost: 0,
          },
        ];

      case "challenge":
        return [
          {
            id: "accept_challenge",
            title: "Accept Challenge",
            description: "Take on the room's challenge",
            icon: "⚔️",
            action: () => {
              onChallengeStart?.();
            },
            cost: 0,
          },
          {
            id: "skip",
            title: "Skip Challenge",
            description: "Skip this challenge (costs points)",
            icon: "🏃",
            action: () => {
              addPoints(-50);
            },
            cost: 50,
          },
        ];

      case "arena":
        return [
          {
            id: "fight",
            title: "Enter Arena",
            description: "Fight in the combat arena",
            icon: "⚔️",
            action: () => {
              onArenaFight?.();
            },
            cost: 0,
          },
          {
            id: "spectate",
            title: "Spectate",
            description: "Watch other fights for experience",
            icon: "👁️",
            action: () => {
              addExperience(25);
            },
            cost: 0,
          },
        ];

      case "boss":
        return [
          {
            id: "boss_fight",
            title: "Boss Fight",
            description: "Challenge the room boss",
            icon: "👹",
            action: () => {
              onBossFight?.();
            },
            cost: 0,
          },
          {
            id: "prepare",
            title: "Prepare",
            description: "Prepare for battle (temporary buffs)",
            icon: "🛡️",
            action: () => {
              addBuff("defenseBoost", 60);
              addBuff("strengthBoost", 60);
              addPoints(-30);
            },
            cost: 30,
          },
        ];

      case "start":
        return [
          {
            id: "begin_journey",
            title: "Begin Journey",
            description: "Start your adventure",
            icon: "🚀",
            action: () => {
              addPoints(50);
              addExperience(25);
            },
            cost: 0,
          },
          {
            id: "check_equipment",
            title: "Check Equipment",
            description: "Review your starting gear",
            icon: "🎒",
            action: () => {
              addPoints(25);
            },
            cost: 0,
          },
        ];

      case "end":
        return [
          {
            id: "victory_celebration",
            title: "Victory Celebration",
            description: "Celebrate your success",
            icon: "🎉",
            action: () => {
              addPoints(500);
              addExperience(200);
            },
            cost: 0,
          },
          {
            id: "final_stats",
            title: "Final Stats",
            description: "View your final statistics",
            icon: "📊",
            action: () => {
              addPoints(100);
            },
            cost: 0,
          },
        ];

      case "normal":
        return [
          {
            id: "rest",
            title: "Rest",
            description: "Take a moment to rest and recover",
            icon: "😴",
            action: () => {
              addPoints(20);
              addExperience(10);
            },
            cost: 0,
          },
          {
            id: "explore",
            title: "Explore",
            description: "Look around for hidden items",
            icon: "🔍",
            action: () => {
              addPoints(15);
              addExperience(5);
            },
            cost: 0,
          },
        ];

      case "enemy":
        return [
          {
            id: "fight",
            title: "Fight",
            description: "Engage in combat",
            icon: "⚔️",
            action: () => {
              onArenaFight?.();
            },
            cost: 0,
          },
          {
            id: "sneak_past",
            title: "Sneak Past",
            description: "Try to avoid combat (requires luck)",
            icon: "🥷",
            action: () => {
              if (Math.random() > 0.5) {
                addPoints(30);
                addExperience(15);
              } else {
                addPoints(-10);
              }
            },
            cost: 0,
          },
        ];

      case "secret":
        return [
          {
            id: "discover_secret",
            title: "Discover Secret",
            description: "Uncover the room's hidden secret",
            icon: "🔐",
            action: () => {
              addPoints(100);
              addExperience(50);
            },
            cost: 0,
          },
          {
            id: "investigate",
            title: "Investigate",
            description: "Look for clues and hidden passages",
            icon: "🔍",
            action: () => {
              addPoints(40);
              addExperience(20);
            },
            cost: 0,
          },
        ];

      case "memory-chamber":
        return [
          {
            id: "memory_training",
            title: "Memory Training",
            description: "Practice your memory skills",
            icon: "🧠",
            action: () => {
              onPuzzleStart?.();
            },
            cost: 0,
          },
          {
            id: "focus_meditation",
            title: "Focus Meditation",
            description: "Meditate to improve concentration",
            icon: "🧘",
            action: () => {
              addBuff("defenseBoost", 30);
              addPoints(30);
              addExperience(20);
            },
            cost: 0,
          },
        ];

      case "trap":
        return [
          {
            id: "disarm_trap",
            title: "Disarm Trap",
            description: "Carefully disarm the trap",
            icon: "🛠️",
            action: () => {
              if (Math.random() > 0.3) {
                addPoints(60);
                addExperience(30);
              } else {
                addPoints(-20);
              }
            },
            cost: 0,
          },
          {
            id: "avoid_trap",
            title: "Avoid Trap",
            description: "Try to avoid the trap entirely",
            icon: "🏃",
            action: () => {
              if (Math.random() > 0.4) {
                addPoints(40);
                addExperience(20);
              } else {
                addPoints(-30);
              }
            },
            cost: 0,
          },
        ];

      case "cursed-room":
        return [
          {
            id: "break_curse",
            title: "Break Curse",
            description: "Attempt to break the room's curse",
            icon: "✨",
            action: () => {
              if (Math.random() > 0.6) {
                addPoints(80);
                addExperience(40);
              } else {
                addPoints(-40);
              }
            },
            cost: 0,
          },
          {
            id: "accept_curse",
            title: "Accept Curse",
            description: "Accept the curse for power",
            icon: "💀",
            action: () => {
              addPoints(120);
              addExperience(60);
              // Could add negative effects here
            },
            cost: 0,
          },
        ];

      case "devil-room":
        return [
          {
            id: "make_deal",
            title: "Make Deal",
            description: "Strike a deal with the devil",
            icon: "😈",
            action: () => {
              addPoints(200);
              addExperience(100);
              // Could add negative long-term effects
            },
            cost: 0,
          },
          {
            id: "resist_temptation",
            title: "Resist Temptation",
            description: "Resist the devil's offers",
            icon: "🙏",
            action: () => {
              addPoints(50);
              addExperience(25);
            },
            cost: 0,
          },
        ];

      case "angel-room":
        return [
          {
            id: "seek_blessing",
            title: "Seek Blessing",
            description: "Ask for divine blessing",
            icon: "👼",
            action: () => {
              addBuff("defenseBoost", 120);
              addPoints(100);
              addExperience(50);
            },
            cost: 0,
          },
          {
            id: "pray",
            title: "Pray",
            description: "Spend time in prayer",
            icon: "🙏",
            action: () => {
              addPoints(60);
              addExperience(30);
            },
            cost: 0,
          },
        ];

      case "coffee":
        return [
          {
            id: "drink_coffee",
            title: "Drink Coffee",
            description: "Boost your energy and speed",
            icon: "☕",
            action: () => {
              addBuff("speedBoost", 60);
              addPoints(30);
              addExperience(15);
            },
            cost: 0,
          },
          {
            id: "coffee_break",
            title: "Coffee Break",
            description: "Take a relaxing coffee break",
            icon: "😌",
            action: () => {
              addPoints(20);
              addExperience(10);
            },
            cost: 0,
          },
        ];

      case "library-upgrade":
        return [
          {
            id: "advanced_study",
            title: "Advanced Study",
            description: "Study advanced topics for knowledge",
            icon: "📚",
            action: () => {
              addPoints(80);
              addExperience(40);
            },
            cost: 0,
          },
          {
            id: "research",
            title: "Research",
            description: "Conduct research for better understanding",
            icon: "🔬",
            action: () => {
              addPoints(120);
              addExperience(60);
            },
            cost: 50,
          },
        ];

      case "portal":
        return [
          {
            id: "activate_portal",
            title: "Activate Portal",
            description: "Activate the portal to travel",
            icon: "🌀",
            action: () => {
              addPoints(100);
              addExperience(50);
            },
            cost: 0,
          },
          {
            id: "study_portal",
            title: "Study Portal",
            description: "Study the portal's magical properties",
            icon: "🔮",
            action: () => {
              addPoints(60);
              addExperience(30);
            },
            cost: 0,
          },
        ];

      case "laboratory":
        return [
          {
            id: "conduct_experiment",
            title: "Conduct Experiment",
            description: "Perform a scientific experiment",
            icon: "🧪",
            action: () => {
              addPoints(90);
              addExperience(45);
            },
            cost: 0,
          },
          {
            id: "analyze_data",
            title: "Analyze Data",
            description: "Analyze experimental data",
            icon: "📊",
            action: () => {
              addPoints(70);
              addExperience(35);
            },
            cost: 0,
          },
        ];

      case "observatory":
        return [
          {
            id: "observe_stars",
            title: "Observe Stars",
            description: "Study the stars and constellations",
            icon: "⭐",
            action: () => {
              addPoints(80);
              addExperience(40);
            },
            cost: 0,
          },
          {
            id: "calculate_orbits",
            title: "Calculate Orbits",
            description: "Calculate planetary orbits",
            icon: "🪐",
            action: () => {
              addPoints(100);
              addExperience(50);
            },
            cost: 0,
          },
        ];

      case "vault":
        return [
          {
            id: "crack_vault",
            title: "Crack Vault",
            description: "Attempt to open the vault",
            icon: "🔓",
            action: () => {
              if (Math.random() > 0.5) {
                addPoints(150);
                addExperience(75);
              } else {
                addPoints(-20);
              }
            },
            cost: 0,
          },
          {
            id: "examine_vault",
            title: "Examine Vault",
            description: "Carefully examine the vault's mechanisms",
            icon: "🔍",
            action: () => {
              addPoints(60);
              addExperience(30);
            },
            cost: 0,
          },
        ];

      case "shrine":
        return [
          {
            id: "make_offering",
            title: "Make Offering",
            description: "Make an offering to the shrine",
            icon: "🕯️",
            action: () => {
              addPoints(70);
              addExperience(35);
            },
            cost: 20,
          },
          {
            id: "seek_guidance",
            title: "Seek Guidance",
            description: "Seek guidance from the shrine",
            icon: "🙏",
            action: () => {
              addPoints(50);
              addExperience(25);
            },
            cost: 0,
          },
        ];

      default:
        return [];
    }
  }, [
    roomType,
    onPuzzleStart,
    onShopOpen,
    onChallengeStart,
    onTreasureOpen,
    onArenaFight,
    onBossFight,
    upgradeDefense,
    upgradeStrength,
    addBuff,
    addPoints,
    addExperience,
  ]);

  // Memoize cards to prevent unnecessary recalculations
  const cards = useMemo(() => getRoomCards(), [getRoomCards]);

  const showCards = useCallback(() => {
    throttledSetVisible(true);
  }, [throttledSetVisible]);

  const hideCards = useCallback(() => {
    throttledSetVisible(false);
  }, [throttledSetVisible]);

  const toggleCards = useCallback(() => {
    throttledSetVisible(!isVisible);
  }, [throttledSetVisible, isVisible]);

  return {
    cards,
    isVisible,
    showCards,
    hideCards,
    toggleCards,
  };
};

export default useRoomActions;
