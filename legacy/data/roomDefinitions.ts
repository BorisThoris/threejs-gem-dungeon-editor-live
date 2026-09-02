import React from "react";

// Import all room components
import StartRoom from "../components/primitives/game-rooms/StartRoom";
import MeditationBiome from "../components/primitives/game-rooms/MeditationBiome";
import GymBiome from "../components/primitives/game-rooms/GymBiome";
import LibraryBiome from "../components/primitives/game-rooms/LibraryBiome";
import ShopBiome from "../components/primitives/game-rooms/ShopBiome";
import TreasureBiome from "../components/primitives/game-rooms/TreasureBiome";
import PuzzleBiome from "../components/primitives/game-rooms/PuzzleBiome";
import BossBiome from "../components/primitives/game-rooms/BossBiome";
import CoffeeBiome from "../components/primitives/game-rooms/CoffeeBiome";
import ChallengeBiome from "../components/primitives/game-rooms/ChallengeBiome";
import LibraryUpgradeBiome from "../components/primitives/game-rooms/LibraryUpgradeBiome";
import PortalBiome from "../components/primitives/game-rooms/PortalBiome";
import ArenaBiome from "../components/primitives/game-rooms/ArenaBiome";
import EndBiome from "../components/primitives/game-rooms/EndBiome";
import SpecialBiome from "../components/primitives/game-rooms/SpecialBiome";

// Room configuration
export interface RoomConfig {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  doors: string[]; // IDs of rooms this room connects to
  spawnPosition: [number, number, number]; // Where player spawns in this room
}

// Define all available rooms
export const ROOM_DEFINITIONS: Record<string, RoomConfig> = {
  start: {
    id: "start",
    name: "Start Room",
    component: StartRoom,
    doors: ["meditation", "shop", "treasure"],
    spawnPosition: [0, 1.5, 0],
  },
  meditation: {
    id: "meditation",
    name: "Meditation Room",
    component: MeditationBiome,
    doors: ["start", "library"],
    spawnPosition: [0, 1.5, 0],
  },
  shop: {
    id: "shop",
    name: "Shop",
    component: ShopBiome,
    doors: ["start", "treasure"],
    spawnPosition: [0, 1.5, 0],
  },
  treasure: {
    id: "treasure",
    name: "Treasure Room",
    component: TreasureBiome,
    doors: ["start", "shop", "puzzle"],
    spawnPosition: [0, 1.5, 0],
  },
  library: {
    id: "library",
    name: "Library",
    component: LibraryBiome,
    doors: ["meditation", "gym", "library-upgrade"],
    spawnPosition: [0, 1.5, 0],
  },
  gym: {
    id: "gym",
    name: "Gym",
    component: GymBiome,
    doors: ["library", "challenge"],
    spawnPosition: [0, 1.5, 0],
  },
  puzzle: {
    id: "puzzle",
    name: "Puzzle Room",
    component: PuzzleBiome,
    doors: ["treasure", "boss"],
    spawnPosition: [0, 1.5, 0],
  },
  boss: {
    id: "boss",
    name: "Boss Room",
    component: BossBiome,
    doors: ["puzzle", "arena"],
    spawnPosition: [0, 1.5, 0],
  },
  coffee: {
    id: "coffee",
    name: "Coffee Shop",
    component: CoffeeBiome,
    doors: ["start"],
    spawnPosition: [0, 1.5, 0],
  },
  challenge: {
    id: "challenge",
    name: "Challenge Room",
    component: ChallengeBiome,
    doors: ["gym", "arena"],
    spawnPosition: [0, 1.5, 0],
  },
  "library-upgrade": {
    id: "library-upgrade",
    name: "Library Upgrade",
    component: LibraryUpgradeBiome,
    doors: ["library", "portal"],
    spawnPosition: [0, 1.5, 0],
  },
  portal: {
    id: "portal",
    name: "Portal Room",
    component: PortalBiome,
    doors: ["library-upgrade", "special"],
    spawnPosition: [0, 1.5, 0],
  },
  arena: {
    id: "arena",
    name: "Arena",
    component: ArenaBiome,
    doors: ["boss", "end"],
    spawnPosition: [0, 1.5, 0],
  },
  end: {
    id: "end",
    name: "End Room",
    component: EndBiome,
    doors: ["arena"],
    spawnPosition: [0, 1.5, 0],
  },
  special: {
    id: "special",
    name: "Special Room",
    component: SpecialBiome,
    doors: ["portal"],
    spawnPosition: [0, 1.5, 0],
  },
};
