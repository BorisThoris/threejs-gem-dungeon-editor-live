import React from "react";
import ItemSprite from "../components/primitives/objects/ItemSprite";
import DestructibleWall from "../components/primitives/objects/DestructibleWall";
import CrackedDestructibleWall from "../components/primitives/objects/CrackedDestructibleWall";
import ParticleSystem from "../components/primitives/objects/ParticleSystem";
import MosaicCreator from "../components/primitives/objects/MosaicCreator";
import {
  Lever,
  Altar,
  Skeleton,
  PressurePlate,
  Statue,
  Switch,
} from "../components/primitives/objects";

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

export const OBJECT_CONFIGS: RoomConfig[] = [
  {
    type: "item-sprite",
    component: ItemSprite,
    title: "Item Sprite",
    emoji: "💎",
    description: "Interactive item sprites",
    props: {
      position: [0, 0, 0],
      item: {
        id: "test-gem",
        name: "Test Gem",
        type: "gem",
        value: 100,
        rarity: "common",
      },
      scale: 1,
    },
    category: "object",
    editableProps: [
      {
        key: "scale",
        label: "Scale",
        type: "number",
        min: 0.1,
        max: 5,
        step: 0.1,
      },
    ],
  },
  {
    type: "destructible-wall",
    component: DestructibleWall,
    title: "Destructible Wall",
    emoji: "🧱",
    description: "Walls that can be destroyed",
    props: {
      position: [0, 0, 0],
      width: 2,
      height: 3,
      depth: 0.2,
      health: 3,
    },
    category: "object",
    editableProps: [
      {
        key: "width",
        label: "Width",
        type: "number",
        min: 0.1,
        max: 10,
        step: 0.1,
      },
      {
        key: "height",
        label: "Height",
        type: "number",
        min: 0.1,
        max: 10,
        step: 0.1,
      },
      {
        key: "depth",
        label: "Depth",
        type: "number",
        min: 0.01,
        max: 2,
        step: 0.01,
      },
      {
        key: "health",
        label: "Health",
        type: "number",
        min: 1,
        max: 10,
        step: 1,
      },
    ],
  },
  {
    type: "cracked-destructible-wall",
    component: CrackedDestructibleWall,
    title: "Cracked Destructible Wall",
    emoji: "🧱💥",
    description:
      "Destructible wall made of cracked bricks with breakable system",
    props: {
      position: [0, 1.5, 0],
      health: 3,
      bombRequired: false,
      enabled: true,
    },
    category: "object",
    editableProps: [
      {
        key: "health",
        label: "Health",
        type: "number",
        min: 1,
        max: 10,
        step: 1,
      },
      {
        key: "bombRequired",
        label: "Bomb Required",
        type: "boolean",
      },
      {
        key: "enabled",
        label: "Breaking Enabled",
        type: "boolean",
      },
    ],
  },
  {
    type: "particle-system",
    component: ParticleSystem,
    title: "Particle System",
    emoji: "✨",
    description: "Dynamic particle effects",
    props: {
      particles: [
        {
          position: [0, 0, 0] as [number, number, number],
          velocity: [0, 1, 0] as [number, number, number],
          life: 1.0,
          maxLife: 1.0,
          size: 0.1,
          color: "#ff6b6b",
        },
        {
          position: [1, 0, 0] as [number, number, number],
          velocity: [0, 1, 0] as [number, number, number],
          life: 1.0,
          maxLife: 1.0,
          size: 0.1,
          color: "#4ecdc4",
        },
        {
          position: [-1, 0, 0] as [number, number, number],
          velocity: [0, 1, 0] as [number, number, number],
          life: 1.0,
          maxLife: 1.0,
          size: 0.1,
          color: "#45b7d1",
        },
        {
          position: [0, 0, 1] as [number, number, number],
          velocity: [0, 1, 0] as [number, number, number],
          life: 1.0,
          maxLife: 1.0,
          size: 0.1,
          color: "#96ceb4",
        },
        {
          position: [0, 0, -1] as [number, number, number],
          velocity: [0, 1, 0] as [number, number, number],
          life: 1.0,
          maxLife: 1.0,
          size: 0.1,
          color: "#ffeaa7",
        },
      ],
    },
    category: "object",
    editableProps: [
      {
        key: "particles",
        label: "Particle Count",
        type: "number",
        min: 1,
        max: 50,
        step: 1,
      },
    ],
  },
  {
    type: "mosaic-creator",
    component: MosaicCreator,
    title: "3D Mosaic Creator",
    emoji: "🧩",
    description: "Create 3D mosaic patterns",
    props: {
      position: [0, 0, 0],
      size: 5,
    },
    category: "object",
    editableProps: [
      {
        key: "size",
        label: "Size",
        type: "number",
        min: 1,
        max: 20,
        step: 0.1,
      },
    ],
  },
  // Dungeon Objects
  {
    type: "lever",
    component: Lever,
    title: "Lever",
    emoji: "🎛️",
    description: "Interactive control lever",
    props: {
      position: [0, 0, 0],
      color: "#8B4513",
      scale: 1,
      isActivated: false,
      label: "Lever",
    },
    category: "object",
    editableProps: [
      {
        key: "color",
        label: "Color",
        type: "color",
      },
      {
        key: "label",
        label: "Label",
        type: "text",
      },
    ],
  },
  {
    type: "altar",
    component: Altar,
    title: "Altar",
    emoji: "⛩️",
    description: "Mystical altar for offerings",
    props: {
      position: [0, 0, 0],
      color: "#2C2C2C",
      scale: 1,
      isActivated: false,
      offering: "Soul",
      glowColor: "#8A2BE2",
    },
    category: "object",
    editableProps: [
      {
        key: "color",
        label: "Color",
        type: "color",
      },
      {
        key: "offering",
        label: "Offering Type",
        type: "text",
      },
      {
        key: "glowColor",
        label: "Glow Color",
        type: "color",
      },
    ],
  },
  {
    type: "skeleton",
    component: Skeleton,
    title: "Skeleton",
    emoji: "💀",
    description: "Animated skeleton enemy",
    props: {
      position: [0, 0, 0],
      color: "#F5F5DC",
      scale: 1,
      isAnimated: true,
      health: 50,
    },
    category: "object",
    editableProps: [
      {
        key: "color",
        label: "Color",
        type: "color",
      },
      {
        key: "isAnimated",
        label: "Animated",
        type: "boolean",
      },
      {
        key: "health",
        label: "Health",
        type: "number",
        min: 1,
        max: 100,
        step: 1,
      },
    ],
  },
  // Additional Dungeon Objects
  {
    type: "pressure-plate",
    component: PressurePlate,
    title: "Pressure Plate",
    emoji: "⚖️",
    description: "Interactive pressure plate",
    props: {
      position: [0, 0, 0],
      color: "#8B4513",
      scale: 1,
      isPressed: false,
      label: "Pressure Plate",
      weight: 1,
    },
    category: "object",
    editableProps: [
      {
        key: "color",
        label: "Color",
        type: "color",
      },
      {
        key: "label",
        label: "Label",
        type: "text",
      },
      {
        key: "weight",
        label: "Weight Required",
        type: "number",
        min: 1,
        max: 10,
        step: 1,
      },
    ],
  },
  {
    type: "statue",
    component: Statue,
    title: "Statue",
    emoji: "🗿",
    description: "Decorative statue",
    props: {
      position: [0, 0, 0],
      color: "#C0C0C0",
      scale: 1,
      type: "warrior",
      isAnimated: false,
    },
    category: "object",
    editableProps: [
      {
        key: "color",
        label: "Color",
        type: "color",
      },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [
          { value: "warrior", label: "Warrior" },
          { value: "mage", label: "Mage" },
          { value: "guardian", label: "Guardian" },
          { value: "deity", label: "Deity" },
        ],
      },
      {
        key: "isAnimated",
        label: "Animated",
        type: "boolean",
      },
    ],
  },
  {
    type: "switch",
    component: Switch,
    title: "Switch",
    emoji: "🔘",
    description: "Interactive switch",
    props: {
      position: [0, 0, 0],
      color: "#8B4513",
      scale: 1,
      isOn: false,
      label: "Switch",
      switchType: "toggle",
    },
    category: "object",
    editableProps: [
      {
        key: "color",
        label: "Color",
        type: "color",
      },
      {
        key: "label",
        label: "Label",
        type: "text",
      },
      {
        key: "switchType",
        label: "Switch Type",
        type: "select",
        options: [
          { value: "toggle", label: "Toggle" },
          { value: "momentary", label: "Momentary" },
          { value: "rotary", label: "Rotary" },
        ],
      },
    ],
  },
];
