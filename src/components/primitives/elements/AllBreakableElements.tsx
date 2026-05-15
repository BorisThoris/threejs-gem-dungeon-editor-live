import React from "react";
import { createBreakableComponent } from "../../UniversalBreakableWrapper";
import {
  Torch,
  Candle,
  Barrel,
  Chest,
  Table,
  Chair,
  Bookshelf,
  PotionBottle,
  Crystal,
  Skull,
  FloatingText,
} from "./RoomElements";
import Tile from "./Tile";
import Wall from "./Wall";
import Ceiling from "./Ceiling";
import Plank from "./Plank";
import Stair from "./Stair";
import Handrail from "./Handrail";
import DestructibleWall from "../objects/DestructibleWall";
import SimpleDoor from "../../SimpleDoor";
import ItemSprite from "../objects/ItemSprite";

// Create breakable versions of all RoomElements components
// Small objects (decorative items)
export const BreakableTorch = createBreakableComponent(Torch, "small");
export const BreakableCandle = createBreakableComponent(Candle, "small");
export const BreakablePotionBottle = createBreakableComponent(
  PotionBottle,
  "small"
);
export const BreakableCrystal = createBreakableComponent(Crystal, "small");
export const BreakableSkull = createBreakableComponent(Skull, "small");

// Medium objects (furniture)
export const BreakableBarrel = createBreakableComponent(Barrel, "medium");
export const BreakableChest = createBreakableComponent(Chest, "medium");
export const BreakableTable = createBreakableComponent(Table, "medium");
export const BreakableChair = createBreakableComponent(Chair, "medium");
export const BreakableBookshelf = createBreakableComponent(Bookshelf, "medium");

// Text doesn't need breaking (it's just text)
export { FloatingText as BreakableFloatingText };

// Structural components
export const BreakableTile = createBreakableComponent(Tile, "large");
export const BreakableWall = createBreakableComponent(Wall, "large");
export const BreakableCeiling = createBreakableComponent(Ceiling, "large");
export const BreakablePlank = createBreakableComponent(Plank, "medium");
export const BreakableStair = createBreakableComponent(Stair, "medium");
export const BreakableHandrail = createBreakableComponent(Handrail, "small");

// Interactive components
export const BreakableDestructibleWall = createBreakableComponent(
  DestructibleWall,
  "large"
);
export const BreakableDoor = createBreakableComponent(SimpleDoor, "medium");
export const BreakableItemSprite = createBreakableComponent(
  ItemSprite,
  "small"
);

// Export all breakable components with consistent interface
export interface AllBreakableElementsProps {
  // All original props from the component
  [key: string]: any;
  // Breaking-specific props (from UniversalBreakableWrapper)
  enabled?: boolean;
  breakingOptions?: any;
  onBreak?: (impactPoint: any) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}
