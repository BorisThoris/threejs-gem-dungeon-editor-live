import React from "react";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

export type FloorMaterial =
  | "stone"
  | "wood"
  | "marble"
  | "metal"
  | "carpet"
  | "dirt"
  | "crystal"
  | "mystical"
  | "brick"
  | "tile";

export type FloorPattern =
  | "smooth"
  | "rough"
  | "polished"
  | "tiled"
  | "cracked"
  | "mystical"
  | "checkerboard"
  | "spiral"
  | "radial";

export type FloorShape =
  | "square"
  | "circle"
  | "hexagon"
  | "octagon"
  | "triangle"
  | "diamond";

interface FloorProps {
  position?: [number, number, number];
  size: number;
  height?: number;
  shape?: FloorShape;
  color?: string;
  material?: FloorMaterial;
  pattern?: FloorPattern;
  isCollidable?: boolean;
  receiveShadow?: boolean;
  castShadow?: boolean;
  opacity?: number;
  texture?: string;
  // Advanced properties
  segments?: number; // For circular floors
  innerRadius?: number; // For donut-shaped floors
  rotation?: number; // Rotation in radians
  // Visual effects
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
}

const Floor: React.FC<FloorProps> = ({
  position = [0, -0.5, 0],
  size,
  height = 1,
  shape = "square",
  color = "#4a4a4a",
  material = "stone",
  pattern = "smooth",
  isCollidable = true,
  receiveShadow = true,
  castShadow = false,
  opacity = 1,
  texture,
  segments = 32,
  innerRadius = 0,
  rotation = 0,
  emissive,
  emissiveIntensity = 0,
  roughness = 0.8,
  metalness = 0.1,
}) => {
  // Get material properties based on material type
  const getMaterialProperties = (material: FloorMaterial) => {
    const properties = {
      stone: { color: "#4a4a4a", roughness: 0.9, metalness: 0.1 },
      wood: { color: "#8B4513", roughness: 0.7, metalness: 0.0 },
      marble: { color: "#f5f5f5", roughness: 0.1, metalness: 0.0 },
      metal: { color: "#c0c0c0", roughness: 0.2, metalness: 0.8 },
      carpet: { color: "#654321", roughness: 0.9, metalness: 0.0 },
      dirt: { color: "#8B4513", roughness: 0.95, metalness: 0.0 },
      crystal: { color: "#87CEEB", roughness: 0.1, metalness: 0.0 },
      mystical: { color: "#9370DB", roughness: 0.3, metalness: 0.2 },
      brick: { color: "#B22222", roughness: 0.8, metalness: 0.0 },
      tile: { color: "#2F4F4F", roughness: 0.6, metalness: 0.0 },
    };
    return properties[material] || properties.stone;
  };

  // Get pattern-specific properties
  const getPatternProperties = (pattern: FloorPattern) => {
    const patterns = {
      smooth: { roughness: 0.1, metalness: 0.0 },
      rough: { roughness: 0.9, metalness: 0.0 },
      polished: { roughness: 0.0, metalness: 0.1 },
      tiled: { roughness: 0.6, metalness: 0.0 },
      cracked: { roughness: 0.8, metalness: 0.0 },
      mystical: {
        roughness: 0.3,
        metalness: 0.2,
        emissive: "#9370DB",
        emissiveIntensity: 0.2,
      },
      checkerboard: { roughness: 0.6, metalness: 0.0 },
      spiral: { roughness: 0.7, metalness: 0.0 },
      radial: { roughness: 0.5, metalness: 0.0 },
    };
    return patterns[pattern] || patterns.smooth;
  };

  const materialProps = getMaterialProperties(material);
  const patternProps = getPatternProperties(pattern);

  // Create the floor material
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: color || materialProps.color,
    roughness: patternProps.roughness || materialProps.roughness || roughness,
    metalness: patternProps.metalness || materialProps.metalness || metalness,
    opacity,
    transparent: opacity < 1,
    ...(emissive && {
      emissive: emissive || patternProps.emissive || "#000000",
    }),
    ...(emissiveIntensity && {
      emissiveIntensity:
        emissiveIntensity || patternProps.emissiveIntensity || 0,
    }),
  });

  // Generate geometry based on shape
  const generateGeometry = () => {
    switch (shape) {
      case "circle":
        if (innerRadius > 0) {
          // Donut shape
          return new THREE.RingGeometry(innerRadius, size / 2, segments);
        }
        return new THREE.CircleGeometry(size / 2, segments);

      case "hexagon":
        return new THREE.CylinderGeometry(size / 2, size / 2, height, 6);

      case "octagon":
        return new THREE.CylinderGeometry(size / 2, size / 2, height, 8);

      case "triangle":
        return new THREE.CylinderGeometry(size / 2, size / 2, height, 3);

      case "diamond":
        // Diamond is a rotated square
        return new THREE.BoxGeometry(size, height, size);

      case "square":
      default:
        return new THREE.BoxGeometry(size, height, size);
    }
  };

  const geometry = generateGeometry();

  // Apply pattern-specific modifications
  const applyPattern = (geometry: THREE.BufferGeometry) => {
    if (pattern === "checkerboard" && shape === "square") {
      // Add checkerboard pattern via vertex colors
      const colors = [];
      const position = geometry.attributes.position;

      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        const checker = Math.floor(x / (size / 8)) + Math.floor(z / (size / 8));
        const isEven = checker % 2 === 0;
        colors.push(isEven ? 1 : 0.5, isEven ? 1 : 0.5, isEven ? 1 : 0.5);
      }

      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );
      floorMaterial.vertexColors = true;
    }
  };

  applyPattern(geometry);

  // Create collision geometry (always use box for stability)
  const collisionGeometry = new THREE.BoxGeometry(size, height, size);

  const floorMesh = (
    <mesh
      position={position}
      rotation={[0, rotation, 0]}
      geometry={geometry}
      material={floorMaterial}
      receiveShadow={receiveShadow}
      castShadow={castShadow}
    />
  );

  if (isCollidable) {
    return (
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          position={position}
          rotation={[0, rotation, 0]}
          geometry={collisionGeometry}
          visible={false}
        >
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        {floorMesh}
      </RigidBody>
    );
  }

  return floorMesh;
};

export default Floor;
