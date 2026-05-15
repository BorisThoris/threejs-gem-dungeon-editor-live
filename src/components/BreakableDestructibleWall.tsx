import React from "react";
import withOptionalBreaking from "./withOptionalBreaking";
import type { BreakingOptions } from "../hooks/useBreaking";
import * as THREE from "three";
import DestructibleWall from "./DestructibleWall";

// Structural breaking options (more durable)
const structuralBreakingOptions: BreakingOptions = {
  fragmentCount: 8,
  fractureImpulse: 1.2,
  minSizeForFracture: 0.5,
  maxSizeForFracture: 1.0,
};

export interface BreakableDestructibleWallProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  health?: number;
  bombRequired?: boolean;
  onDestroy?: () => void;
  onDamage?: (damage: number) => void;
  // Breaking props
  enabled?: boolean;
  breakingOptions?: BreakingOptions;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}

const BreakableDestructibleWall = withOptionalBreaking(DestructibleWall, {
  breakingOptions: structuralBreakingOptions,
});

export default BreakableDestructibleWall;
