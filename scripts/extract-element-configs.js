const fs = require('fs');
const path = require('path');

// Read the AutoThreeDEditor file
const filePath = path.join(__dirname, '..', 'src', 'components', 'AutoThreeDEditor.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Find the start and end of ELEMENT_CONFIGS
const startMarker = 'const ELEMENT_CONFIGS: RoomConfig[] = [';
const endMarker = '];';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex) + endMarker.length;

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find ELEMENT_CONFIGS section');
  process.exit(1);
}

// Extract the ELEMENT_CONFIGS section
const elementConfigsContent = content.substring(startIndex, endIndex);

// Create the element configs file content
const elementConfigsFile = `import React from "react";
import Tile from "../components/primitives/elements/Tile";
import Wall from "../components/primitives/elements/Wall";
import Ceiling from "../components/primitives/elements/Ceiling";
import Plank from "../components/primitives/elements/Plank";
import Stair from "../components/primitives/elements/Stair";
import Handrail from "../components/primitives/elements/Handrail";

// Import dungeon elements
import {
  Torch,
  Barrel,
  Chest,
  SpikeTrap,
  Pillar,
  Chain,
  Brazier,
  Spikes,
  Web,
} from "../components/primitives/elements";

// Import material elements
import {
  CrackedBrick,
  Stone,
  WoodPlank,
  MetalBar,
  Glass,
} from "../components/primitives/elements";

// Import complex primitives
import {
  StoneWall,
  WoodenFence,
  WoodenBridge,
  DungeonCell,
  DungeonAltar,
  DungeonThrone,
  DungeonGate,
} from "../components/primitives/elements";

export interface RoomConfig {
  type: string;
  component: React.ComponentType<any>;
  title: string;
  emoji: string;
  description: string;
  props?: any;
  editableProps?: any[];
  category: "rooms" | "biome" | "object" | "element";
  subcategory?: string;
}

${elementConfigsContent}`;

// Write the element configs file
const outputPath = path.join(__dirname, '..', 'src', 'configs', 'elementConfigs.ts');
fs.writeFileSync(outputPath, elementConfigsFile);

console.log('Element configs extracted successfully!');
console.log(`Output file: ${outputPath}`);
