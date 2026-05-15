import React from "react";
import CoffeeBiome from "../components/primitives/game-rooms/CoffeeBiome";
import MeditationBiome from "../components/primitives/game-rooms/MeditationBiome";
import LibraryBiome from "../components/primitives/game-rooms/LibraryBiome";
import ShopBiome from "../components/primitives/game-rooms/ShopBiome";
import TreasureBiome from "../components/primitives/game-rooms/TreasureBiome";
import PuzzleBiome from "../components/primitives/game-rooms/PuzzleBiome";
import BossBiome from "../components/primitives/game-rooms/BossBiome";
import ArenaBiome from "../components/primitives/game-rooms/ArenaBiome";
import EndBiome from "../components/primitives/game-rooms/EndBiome";
import PortalBiome from "../components/primitives/game-rooms/PortalBiome";
import SpecialBiome from "../components/primitives/game-rooms/SpecialBiome";
import ChallengeBiome from "../components/primitives/game-rooms/ChallengeBiome";
import LibraryUpgradeBiome from "../components/primitives/game-rooms/LibraryUpgradeBiome";
import ColosseumRoom from "../components/primitives/game-rooms/ColosseumRoom";
import StartRoom from "../components/primitives/game-rooms/StartRoom";
import TrapBiome from "../components/primitives/game-rooms/TrapBiome";
import CryptBiome from "../components/primitives/game-rooms/CryptBiome";
import GymBiome from "../components/primitives/game-rooms/GymBiome";
import StairsRoom from "../components/primitives/game-rooms/StairsRoom";
import MiddleStairsRoom from "../components/primitives/game-rooms/MiddleStairsRoom";
import GardenBiome from "../components/primitives/game-rooms/GardenBiome";
import KitchenBiome from "../components/primitives/game-rooms/KitchenBiome";
import BedroomBiome from "../components/primitives/game-rooms/BedroomBiome";
import LaboratoryBiome from "../components/primitives/game-rooms/LaboratoryBiome";
import ObservatoryBiome from "../components/primitives/game-rooms/ObservatoryBiome";
import WorkshopBiome from "../components/primitives/game-rooms/WorkshopBiome";
import ArchBiome from "../components/primitives/game-rooms/ArchBiome";
import PillarBiome from "../components/primitives/game-rooms/PillarBiome";
import BarrierBiome from "../components/primitives/game-rooms/BarrierBiome";
import MazeBiome from "../components/primitives/game-rooms/MazeBiome";
import BridgeBiome from "../components/primitives/game-rooms/BridgeBiome";
import StatueBiome from "../components/primitives/game-rooms/StatueBiome";
import MemoryGamePuzzleBiome from "../components/primitives/game-rooms/MemoryGamePuzzleBiome";
import PressurePlatePuzzleBiome from "../components/primitives/game-rooms/PressurePlatePuzzleBiome";

export interface RoomConfig {
  type: string;
  component: React.ComponentType<any>;
  title: string;
  emoji: string;
  description: string;
  props?: any;
  availableActions?: any[];
  editableProps?: any[];
  category: "rooms" | "biome" | "object" | "element";
  subcategory?: string;
}

export const BIOME_CONFIGS: RoomConfig[] = [
  {
    type: "coffee",
    component: CoffeeBiome,
    title: "Coffee Biome",
    emoji: "☕",
    description: "Coffee environment biome for rooms",
    props: { size: 10 },
    category: "biome",
    subcategory: "buff",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "meditation",
    component: MeditationBiome,
    title: "Meditation Biome",
    emoji: "🧘",
    description: "Meditation environment biome for rooms",
    props: { size: 10 },
    category: "biome",
    subcategory: "buff",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "library",
    component: LibraryBiome,
    title: "Library Biome",
    emoji: "📚",
    description: "Library environment biome for rooms",
    props: { size: 10 },
    category: "biome",
    subcategory: "resource",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "shop",
    component: ShopBiome,
    title: "Shop Biome",
    emoji: "🛒",
    description: "Shop environment biome for rooms",
    props: { size: 10, onShopOpen: () => console.log("Shop opened!") },
    category: "biome",
    subcategory: "resource",
    editableProps: [
      {
        key: "size",
        label: "Biome Size",
        type: "number",
        min: 5,
        max: 30,
        step: 5,
      },
    ],
  },
  {
    type: "treasure",
    component: TreasureBiome,
    title: "Treasure Biome",
    emoji: "💰",
    description: "Treasure environment biome for rooms",
    props: { size: 10, onTreasureOpen: () => console.log("Treasure opened!") },
    category: "biome",
    subcategory: "resource",
    editableProps: [
      {
        key: "size",
        label: "Biome Size",
        type: "number",
        min: 5,
        max: 30,
        step: 5,
      },
    ],
  },
  {
    type: "puzzle",
    component: PuzzleBiome,
    title: "Puzzle Biome",
    emoji: "🧩",
    description: "Puzzle environment biome for rooms",
    props: { size: 10 },
    category: "biome",
    subcategory: "puzzle",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "memory-puzzle",
    component: MemoryGamePuzzleBiome,
    title: "Memory Puzzle Biome",
    emoji: "🧠",
    description: "Memory game puzzle biome with floating blocks",
    props: { size: 10 },
    category: "biome",
    subcategory: "puzzle",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "pressure-plate-puzzle",
    component: PressurePlatePuzzleBiome,
    title: "Pressure Plate Puzzle Biome",
    emoji: "⚖️",
    description: "Pressure plate puzzle with movable candles and treasure",
    props: { size: 10 },
    category: "biome",
    subcategory: "puzzle",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "boss",
    component: BossBiome,
    title: "Boss Biome",
    emoji: "👹",
    description: "Boss environment biome for rooms",
    props: { size: 10 },
    category: "biome",
    subcategory: "special",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "arena",
    component: ArenaBiome,
    title: "Arena Biome",
    emoji: "⚔️",
    description: "Arena environment biome for rooms",
    props: { size: 10 },
    category: "biome",
    subcategory: "special",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "end",
    component: EndBiome,
    title: "End Biome",
    emoji: "🏁",
    description: "End environment biome for rooms",
    props: { onVictory: () => console.log("Victory!") },
    category: "biome",
    subcategory: "special",
    editableProps: [],
  },
  {
    type: "portal",
    component: PortalBiome,
    title: "Portal Biome",
    emoji: "🌀",
    description: "Portal environment biome for rooms",
    props: { size: 10 },
    category: "biome",
    subcategory: "transport",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "special",
    component: SpecialBiome,
    title: "Special Biome",
    emoji: "✨",
    description: "Special environment biome for rooms",
    props: {
      roomType: "secret" as const,
      items: [],
    },
    category: "biome",
    subcategory: "special",
    editableProps: [
      {
        key: "roomType",
        label: "Room Type",
        type: "select",
        options: [
          { value: "devil-room", label: "Devil Room" },
          { value: "angel-room", label: "Angel Room" },
          { value: "cursed-room", label: "Cursed Room" },
          { value: "secret", label: "Secret" },
        ],
      },
    ],
  },
  {
    type: "challenge",
    component: ChallengeBiome,
    title: "Challenge Biome",
    emoji: "🎯",
    description: "Challenge environment biome for rooms",
    props: { size: 10 },
    category: "biome",
    subcategory: "special",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "library-upgrade",
    component: LibraryUpgradeBiome,
    title: "Library Upgrade Biome",
    emoji: "📖",
    description: "Library upgrade environment biome for rooms",
    props: { size: 10 },
    category: "biome",
    subcategory: "resource",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "colosseum",
    component: ColosseumRoom,
    title: "Colosseum Biome",
    emoji: "🏛️",
    description: "A grand colosseum environment biome for epic battles",
    props: { size: 10 },
    category: "biome",
    subcategory: "special",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "start",
    component: StartRoom,
    title: "Start Biome",
    emoji: "🚀",
    description: "The beginning environment biome of your adventure",
    props: { size: 10 },
    category: "biome",
    subcategory: "special",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "trap",
    component: TrapBiome,
    title: "Trap Biome",
    emoji: "⚠️",
    description: "Trap environment biome for rooms",
    props: { size: 10 },
    category: "biome",
    subcategory: "special",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "crypt",
    component: CryptBiome,
    title: "Crypt Biome",
    emoji: "⚰️",
    description: "Crypt environment biome for rooms",
    props: { size: 10 },
    category: "biome",
    subcategory: "special",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "gym",
    component: GymBiome,
    title: "Gym Biome",
    emoji: "💪",
    description: "Gym environment biome for rooms",
    props: { size: 10 },
    category: "biome",
    subcategory: "buff",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "bench-press",
    component: GymBiome,
    title: "Bench Press Biome",
    emoji: "🏋️",
    description: "Bench press environment biome for rooms",
    props: { size: 10 },
    category: "biome",
    subcategory: "buff",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "stairs",
    component: StairsRoom,
    title: "Stairs Biome",
    emoji: "🪜",
    description: "Stairs environment biome for rooms",
    props: { direction: "up", roomWidth: 8, roomHeight: 6 },
    category: "biome",
    subcategory: "transport",
    editableProps: [
      {
        key: "direction",
        label: "Direction",
        type: "select",
        options: [
          { value: "up", label: "Up" },
          { value: "down", label: "Down" },
        ],
      },
      {
        key: "roomWidth",
        label: "Room Width",
        type: "number",
        min: 4,
        max: 16,
        step: 1,
      },
      {
        key: "roomHeight",
        label: "Room Height",
        type: "number",
        min: 3,
        max: 12,
        step: 1,
      },
    ],
  },
  {
    type: "middle-stairs",
    component: MiddleStairsRoom,
    title: "Middle Stairs Biome",
    emoji: "🪜",
    description: "Middle stairs environment biome for rooms",
    props: { position: "middle", roomWidth: 8, roomHeight: 6 },
    category: "biome",
    subcategory: "transport",
    editableProps: [
      {
        key: "position",
        label: "Position",
        type: "select",
        options: [
          { value: "top", label: "Top" },
          { value: "middle", label: "Middle" },
          { value: "bottom", label: "Bottom" },
        ],
      },
      {
        key: "roomWidth",
        label: "Room Width",
        type: "number",
        min: 4,
        max: 16,
        step: 1,
      },
      {
        key: "roomHeight",
        label: "Room Height",
        type: "number",
        min: 3,
        max: 12,
        step: 1,
      },
    ],
  },
  {
    type: "garden",
    component: GardenBiome,
    title: "Garden Biome",
    emoji: "🌿",
    description: "Garden environment biome for rooms",
    props: {
      size: 10,
      onGardenComplete: () => console.log("Garden complete!"),
    },
    category: "biome",
    subcategory: "buff",
    editableProps: [
      {
        key: "size",
        label: "Biome Size",
        type: "number",
        min: 5,
        max: 30,
        step: 5,
      },
    ],
  },
  {
    type: "kitchen",
    component: KitchenBiome,
    title: "Kitchen Biome",
    emoji: "🍳",
    description: "Kitchen environment biome for rooms",
    props: {
      size: 10,
      onCookingComplete: () => console.log("Cooking complete!"),
    },
    category: "biome",
    subcategory: "utility",
    editableProps: [
      {
        key: "size",
        label: "Biome Size",
        type: "number",
        min: 5,
        max: 30,
        step: 5,
      },
    ],
  },
  {
    type: "bedroom",
    component: BedroomBiome,
    title: "Bedroom Biome",
    emoji: "🛏️",
    description: "Bedroom environment biome for rooms",
    props: { size: 10, onRestComplete: () => console.log("Rest complete!") },
    category: "biome",
    subcategory: "buff",
    editableProps: [
      {
        key: "size",
        label: "Biome Size",
        type: "number",
        min: 5,
        max: 30,
        step: 5,
      },
    ],
  },
  {
    type: "laboratory",
    component: LaboratoryBiome,
    title: "Laboratory Biome",
    emoji: "🧪",
    description: "Laboratory environment biome for rooms",
    props: {
      size: 10,
      onExperimentComplete: () => console.log("Experiment complete!"),
    },
    category: "biome",
    subcategory: "resource",
    editableProps: [
      {
        key: "size",
        label: "Biome Size",
        type: "number",
        min: 5,
        max: 30,
        step: 5,
      },
    ],
  },
  {
    type: "observatory",
    component: ObservatoryBiome,
    title: "Observatory Biome",
    emoji: "🔭",
    description: "Observatory environment biome for rooms",
    props: {
      size: 10,
      onObservationComplete: () => console.log("Observation complete!"),
    },
    category: "biome",
    subcategory: "puzzle",
    editableProps: [
      {
        key: "size",
        label: "Biome Size",
        type: "number",
        min: 5,
        max: 30,
        step: 5,
      },
    ],
  },
  {
    type: "workshop",
    component: WorkshopBiome,
    title: "Workshop Biome",
    emoji: "🔨",
    description: "Workshop environment biome for rooms",
    props: { size: 10, onCraftComplete: () => console.log("Craft complete!") },
    category: "biome",
    subcategory: "resource",
    editableProps: [
      {
        key: "size",
        label: "Biome Size",
        type: "number",
        min: 5,
        max: 30,
        step: 5,
      },
    ],
  },
  {
    type: "arch",
    component: ArchBiome,
    title: "Arch Biome",
    emoji: "🏛️",
    description: "Architectural arch structure biome",
    props: {
      size: 10,
      onPassThrough: () => console.log("Passed through arch!"),
    },
    category: "biome",
    subcategory: "obstacle",
    editableProps: [
      {
        key: "size",
        label: "Biome Size",
        type: "number",
        min: 5,
        max: 20,
        step: 5,
      },
    ],
  },
  {
    type: "pillar",
    component: PillarBiome,
    title: "Pillar Biome",
    emoji: "🏛️",
    description: "Pillar structure biome with navigation challenges",
    props: {
      size: 10,
      onNavigate: () => console.log("Navigated around pillars!"),
    },
    category: "biome",
    subcategory: "obstacle",
    editableProps: [
      {
        key: "size",
        label: "Biome Size",
        type: "number",
        min: 5,
        max: 20,
        step: 5,
      },
    ],
  },
  {
    type: "barrier",
    component: BarrierBiome,
    title: "Barrier Biome",
    emoji: "🚧",
    description: "Barrier obstacle biome with spikes and warnings",
    props: { size: 10, onOvercome: () => console.log("Overcame barrier!") },
    category: "biome",
    subcategory: "obstacle",
    editableProps: [
      {
        key: "size",
        label: "Biome Size",
        type: "number",
        min: 5,
        max: 20,
        step: 5,
      },
    ],
  },
  {
    type: "maze",
    component: MazeBiome,
    title: "Maze Biome",
    emoji: "🌀",
    description: "Maze navigation biome with start and end markers",
    props: { size: 15, onNavigate: () => console.log("Navigated maze!") },
    category: "biome",
    subcategory: "puzzle",
    editableProps: [
      {
        key: "size",
        label: "Maze Size",
        type: "number",
        min: 10,
        max: 40,
        step: 5,
      },
    ],
  },
  {
    type: "bridge",
    component: BridgeBiome,
    title: "Bridge Biome",
    emoji: "🌉",
    description: "Bridge crossing biome over water or gap",
    props: { size: 30, onCross: () => console.log("Crossed bridge!") },
    category: "biome",
    subcategory: "transport",
    editableProps: [
      {
        key: "size",
        label: "Bridge Length",
        type: "number",
        min: 10,
        max: 50,
        step: 5,
      },
    ],
  },
  {
    type: "statue",
    component: StatueBiome,
    title: "Statue Biome",
    emoji: "🗿",
    description: "Monumental statue biome with surrounding pillars",
    props: {
      size: 10,
      onInteract: () => console.log("Interacted with statue!"),
    },
    category: "biome",
    subcategory: "obstacle",
    editableProps: [
      {
        key: "size",
        label: "Biome Size",
        type: "number",
        min: 5,
        max: 20,
        step: 5,
      },
    ],
  },
];
