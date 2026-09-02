import React from "react";
import Floor from "./Floor";
import type { FloorMaterial, FloorPattern, FloorShape } from "./Floor";
import type { Room } from "../../../types/map";

interface RoomFloorProps {
  room: Room;
  position?: [number, number, number];
  isCollidable?: boolean;
}

/**
 * Smart floor component that automatically chooses the right floor
 * based on room type, shape, and theme
 */
const RoomFloor: React.FC<RoomFloorProps> = ({
  room,
  position = [0, -0.5, 0],
  isCollidable = true,
}) => {
  // Get floor configuration based on room type
  const getFloorConfig = (room: Room) => {
    const baseSize = room.size || 10;
    const shape = (room.shape as FloorShape) || "square";

    // Room type specific configurations
    const configs: Record<
      string,
      {
        material: FloorMaterial;
        pattern: FloorPattern;
        color: string;
        emissive?: string;
        emissiveIntensity?: number;
      }
    > = {
      start: {
        material: "marble",
        pattern: "polished",
        color: "#4CAF50",
        emissive: "#66BB6A",
        emissiveIntensity: 0.1,
      },
      end: {
        material: "crystal",
        pattern: "mystical",
        color: "#F44336",
        emissive: "#FF6B6B",
        emissiveIntensity: 0.2,
      },
      treasure: {
        material: "stone",
        pattern: "tiled",
        color: "#2F4F4F",
      },
      library: {
        material: "wood",
        pattern: "smooth",
        color: "#8B4513",
      },
      shop: {
        material: "wood",
        pattern: "polished",
        color: "#8B4513",
      },
      coffee: {
        material: "wood",
        pattern: "smooth",
        color: "#8B4513",
      },
      meditation: {
        material: "marble",
        pattern: "smooth",
        color: "#2F4F4F",
        emissive: "#87CEEB",
        emissiveIntensity: 0.05,
      },
      "bench-press": {
        material: "metal",
        pattern: "rough",
        color: "#303030",
      },
      "library-upgrade": {
        material: "crystal",
        pattern: "polished",
        color: "#2F4F4F",
        emissive: "#9370DB",
        emissiveIntensity: 0.1,
      },
      portal: {
        material: "mystical",
        pattern: "mystical",
        color: "#1a0033",
        emissive: "#9370DB",
        emissiveIntensity: 0.3,
      },
      arena: {
        material: "stone",
        pattern: "rough",
        color: "#2a2a2a",
      },
      colosseum: {
        material: "stone",
        pattern: "cracked",
        color: "#2a2a2a",
      },
      boss: {
        material: "stone",
        pattern: "cracked",
        color: "#1a1a1a",
        emissive: "#8B0000",
        emissiveIntensity: 0.1,
      },
      puzzle: {
        material: "tile",
        pattern: "checkerboard",
        color: "#2F4F4F",
      },
      challenge: {
        material: "metal",
        pattern: "rough",
        color: "#2F2F2F",
      },
      enemy: {
        material: "dirt",
        pattern: "rough",
        color: "#FF5722",
      },
      corridor: {
        material: "stone",
        pattern: "smooth",
        color: "#4a4a4a",
      },
      secret: {
        material: "stone",
        pattern: "cracked",
        color: "#2F4F4F",
      },
      trap: {
        material: "stone",
        pattern: "cracked",
        color: "#8B0000",
      },
      normal: {
        material: "stone",
        pattern: "smooth",
        color: "#4a4a4a",
      },
    };

    // Get base config for room type
    const baseConfig = configs[room.type] || configs.normal;

    // Apply theme modifications
    let finalConfig = { ...baseConfig };

    if (room.theme) {
      switch (room.theme) {
        case "mystical":
          finalConfig.material = "mystical";
          finalConfig.pattern = "mystical";
          finalConfig.emissive = "#9370DB";
          finalConfig.emissiveIntensity = 0.2;
          break;
        case "sanctuary":
          finalConfig.material = "marble";
          finalConfig.pattern = "polished";
          finalConfig.color = "#f5f5f5";
          break;
        case "dungeon":
          finalConfig.material = "stone";
          finalConfig.pattern = "cracked";
          finalConfig.color = "#2a2a2a";
          break;
        case "forge":
          finalConfig.material = "metal";
          finalConfig.pattern = "rough";
          finalConfig.color = "#8B4513";
          break;
      }
    }

    // Apply lighting modifications
    if (room.lighting) {
      switch (room.lighting) {
        case "bright":
          finalConfig.emissiveIntensity =
            (finalConfig.emissiveIntensity || 0) + 0.1;
          break;
        case "dim":
          finalConfig.emissiveIntensity =
            (finalConfig.emissiveIntensity || 0) + 0.05;
          break;
        case "dark":
          finalConfig.color = adjustColorBrightness(finalConfig.color, -0.3);
          break;
        case "mystical":
          finalConfig.material = "mystical";
          finalConfig.pattern = "mystical";
          finalConfig.emissive = "#9370DB";
          finalConfig.emissiveIntensity = 0.3;
          break;
      }
    }

    return {
      ...finalConfig,
      size: baseSize,
      shape,
    };
  };

  // Helper function to adjust color brightness
  const adjustColorBrightness = (color: string, factor: number): string => {
    const hex = color.replace("#", "");
    const r = Math.max(
      0,
      Math.min(255, parseInt(hex.substr(0, 2), 16) + factor * 255)
    );
    const g = Math.max(
      0,
      Math.min(255, parseInt(hex.substr(2, 2), 16) + factor * 255)
    );
    const b = Math.max(
      0,
      Math.min(255, parseInt(hex.substr(4, 2), 16) + factor * 255)
    );
    return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g)
      .toString(16)
      .padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
  };

  const config = getFloorConfig(room);

  return (
    <Floor
      position={position}
      size={config.size}
      shape={config.shape}
      color={config.color}
      material={config.material}
      pattern={config.pattern}
      isCollidable={isCollidable}
      emissive={config.emissive}
      emissiveIntensity={config.emissiveIntensity}
      receiveShadow={true}
      castShadow={false}
    />
  );
};

export default RoomFloor;
