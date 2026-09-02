import React from "react";
import withOptionalBreaking from "./withOptionalBreaking";
import type { BreakingOptions } from "../hooks/useBreaking";
import * as THREE from "three";
import {
  type BreakingSize,
  makeBreakable,
  BreakableSmall,
  BreakableMedium,
  BreakableLarge,
} from "./universalBreakableWrapperUtils";

// Interface for all breakable components
export interface UniversalBreakableProps {
  // Breaking props (from withOptionalBreaking HOC)
  enabled?: boolean;
  breakingOptions?: BreakingOptions;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}

// Utility function to create breakable versions of existing components
export function createBreakableComponent<T extends object>(
  Component: React.ComponentType<T>,
  size: BreakingSize = "medium"
) {
  return makeBreakable(Component, size);
}
