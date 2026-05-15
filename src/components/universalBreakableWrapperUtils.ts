import React from "react";
import withOptionalBreaking from "./withOptionalBreaking";
import type { BreakingOptions } from "../hooks/useBreaking";

// Default breaking options for different object types
const defaultBreakingOptions: BreakingOptions = {
  fragmentCount: 4,
  fractureImpulse: 0.8,
  minSizeForFracture: 0.1,
  maxSizeForFracture: 0.3,
};

// Small objects (decorative items, small furniture)
const smallObjectBreakingOptions: BreakingOptions = {
  ...defaultBreakingOptions,
  fragmentCount: 3,
  fractureImpulse: 0.4,
};

// Medium objects (doors, windows, medium furniture)
const mediumObjectBreakingOptions: BreakingOptions = {
  ...defaultBreakingOptions,
  fragmentCount: 6,
  fractureImpulse: 0.8,
};

// Large objects (walls, large furniture, structures)
const largeObjectBreakingOptions: BreakingOptions = {
  ...defaultBreakingOptions,
  fragmentCount: 8,
  fractureImpulse: 1.2,
};

// Breaking size categories
export type BreakingSize = "small" | "medium" | "large";

// Universal wrapper function that makes any component optionally breakable
export function makeBreakable<T extends object>(
  Component: React.ComponentType<T>,
  size: BreakingSize = "medium"
) {
  const breakingOptions =
    size === "small"
      ? smallObjectBreakingOptions
      : size === "large"
      ? largeObjectBreakingOptions
      : mediumObjectBreakingOptions;

  return withOptionalBreaking(Component, {
    breakingOptions,
  });
}

// Pre-configured breakable components for common object types
export const BreakableSmall = makeBreakable;
export const BreakableMedium = makeBreakable;
export const BreakableLarge = makeBreakable;
