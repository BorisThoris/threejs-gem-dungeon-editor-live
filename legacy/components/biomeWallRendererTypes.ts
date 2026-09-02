import * as THREE from "three";
import { type BiomeWallConfig } from "../types/biomeWalls";

export type BiomeWallRendererProps = {
  biomeConfig: BiomeWallConfig;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  onWallBreak?: (wallId: string, impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
};

// Runtime export for compatibility
export const BiomeWallRendererProps = {} as BiomeWallRendererProps;
