import React from "react";
import withOptionalBreaking from "./withOptionalBreaking";
import type { BreakingOptions } from "../hooks/useBreaking";
import * as THREE from "three";
import ItemSprite from "./ItemSprite";
import type { Item } from "../types/map";

// Small object breaking options (fewer fragments)
const smallObjectBreakingOptions: BreakingOptions = {
  fragmentCount: 3,
  fractureImpulse: 0.4,
  minSizeForFracture: 0.1,
  maxSizeForFracture: 0.2,
};

export interface BreakableItemSpriteProps {
  item: Item;
  position: [number, number, number];
  scale?: number;
  onClick?: () => void;
  isHovered?: boolean;
  // Breaking props
  enabled?: boolean;
  breakingOptions?: BreakingOptions;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}

const BreakableItemSprite = withOptionalBreaking(ItemSprite, {
  breakingOptions: smallObjectBreakingOptions,
});

export default BreakableItemSprite;
