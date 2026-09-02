import React from "react";
import AllBreakableDemo from "../components/primitives/demo-rooms/AllBreakableDemo";
import CorridorRoom from "../components/primitives/game-rooms/CorridorRoom";
import MultiBiomeRoom from "../components/primitives/game-rooms/MultiBiomeRoom";

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

export const ROOM_CONFIGS: RoomConfig[] = [
  {
    type: "all-breakable",
    component: AllBreakableDemo,
    title: "All Breakable Demo",
    emoji: "💥",
    description: "A demo of all breakable objects",
    props: { size: 10 },
    category: "rooms",
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
    type: "corridor",
    component: CorridorRoom,
    title: "Corridor Room",
    emoji: "🚪",
    description: "A connecting corridor between rooms",
    props: { size: 10 },
    category: "rooms",
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
    type: "multi-biome",
    component: MultiBiomeRoom,
    title: "Multi-Biome Room",
    emoji: "🏗️",
    description: "A room built from multiple biomes",
    props: {
      roomSize: 20,
      biomes: [
        { type: "bedroom", position: [-6, 0, -6], size: 8 },
        { type: "kitchen", position: [6, 0, -6], size: 8 },
        { type: "library", position: [-6, 0, 6], size: 8 },
        { type: "garden", position: [6, 0, 6], size: 8 },
      ],
    },
    category: "rooms",
    editableProps: [
      {
        key: "roomSize",
        label: "Room Size",
        type: "number",
        min: 10,
        max: 40,
        step: 5,
      },
    ],
  },
];
