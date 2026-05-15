import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box, Cylinder } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../utils/textureUtils";

export interface WoodenBridgeProps {
  position: [number, number, number];
  length?: number;
  width?: number;
  height?: number;
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasRails?: boolean;
  hasSupportPillars?: boolean;
  opacity?: number;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  // Prototype props
  prototypeId?: string;
  onPrototypeAction?: (action: string, data?: unknown) => void;
  // Breaking props
  enabled?: boolean;
  breakingOptions?: any;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}

const WoodenBridge: React.FC<WoodenBridgeProps> = ({
  position,
  length = 12,
  width = 3,
  height = 2,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasRails = true,
  hasSupportPillars = true,
  opacity = 1,
  onClick,
  onPointerOver,
  onPointerOut,
  prototypeId: _prototypeId,  
  onPrototypeAction: _onPrototypeAction,  
}) => {
  // Load wood texture
  const [woodTexture, setWoodTexture] = useState(null);

  useEffect(() => {
    const loadTexture = async () => {
      try {
        const loadedTexture = await loadTextureFromImage("wood");
        setWoodTexture(loadedTexture);
      } catch (error) {
        console.error("Failed to load wood texture:", error);
      }
    };

    loadTexture();
  }, []);

  // Generate bridge components
  const bridgeComponents = useMemo(() => {
    const plankWidth = 0.2; // Individual plank width
    const plankHeight = 0.05; // Plank thickness
    const plankLength = 0.8; // Plank length
    const supportSpacing = 2; // Distance between support pillars
    const railHeight = 0.8; // Height of railings
    const railThickness = 0.05;

    const components = [];

    // Main deck planks
    const numPlanks = Math.floor(length / plankLength);
    for (let i = 0; i < numPlanks; i++) {
      const x = i * plankLength - length / 2 + plankLength / 2;
      components.push({
        type: "deck-plank",
        position: [x, height / 2, 0] as [number, number, number],
        size: [plankLength, plankHeight, width] as [number, number, number],
        id: `deck-plank-${i}`,
      });
    }

    // Support beams (running lengthwise)
    const numBeams = Math.floor(length / 1.5);
    for (let i = 0; i < numBeams; i++) {
      const x = i * 1.5 - length / 2 + 0.75;
      components.push({
        type: "support-beam",
        position: [x, height / 2 - 0.1, 0] as [number, number, number],
        size: [1.5, 0.1, 0.1] as [number, number, number],
        id: `support-beam-${i}`,
      });
    }

    // Support pillars
    if (hasSupportPillars) {
      const numPillars = Math.floor(length / supportSpacing) + 1;
      for (let i = 0; i < numPillars; i++) {
        const x = i * supportSpacing - length / 2;
        const pillarHeight = height + 1; // Pillars go below the bridge

        // Main pillar
        components.push({
          type: "pillar",
          position: [x, pillarHeight / 2 - 0.5, 0] as [number, number, number],
          size: [0.15, pillarHeight, 0.15] as [number, number, number],
          id: `pillar-${i}`,
        });

        // Cross braces
        components.push({
          type: "cross-brace",
          position: [x, height / 2, -width / 4] as [number, number, number],
          size: [0.1, 0.05, width / 2] as [number, number, number],
          id: `cross-brace-${i}`,
        });
      }
    }

    // Railings
    if (hasRails) {
      // Left railing
      const numRailPosts = Math.floor(length / 0.5);
      for (let i = 0; i < numRailPosts; i++) {
        const x = i * 0.5 - length / 2 + 0.25;

        // Rail post
        components.push({
          type: "rail-post",
          position: [x, height / 2 + railHeight / 2, -width / 2] as [
            number,
            number,
            number
          ],
          size: [0.05, railHeight, 0.05] as [number, number, number],
          id: `rail-post-left-${i}`,
        });

        // Top rail
        components.push({
          type: "top-rail",
          position: [x, height / 2 + railHeight, -width / 2] as [
            number,
            number,
            number
          ],
          size: [0.4, 0.05, 0.05] as [number, number, number],
          id: `top-rail-left-${i}`,
        });

        // Bottom rail
        components.push({
          type: "bottom-rail",
          position: [x, height / 2 + railHeight / 3, -width / 2] as [
            number,
            number,
            number
          ],
          size: [0.4, 0.05, 0.05] as [number, number, number],
          id: `bottom-rail-left-${i}`,
        });
      }

      // Right railing
      for (let i = 0; i < numRailPosts; i++) {
        const x = i * 0.5 - length / 2 + 0.25;

        // Rail post
        components.push({
          type: "rail-post",
          position: [x, height / 2 + railHeight / 2, width / 2] as [
            number,
            number,
            number
          ],
          size: [0.05, railHeight, 0.05] as [number, number, number],
          id: `rail-post-right-${i}`,
        });

        // Top rail
        components.push({
          type: "top-rail",
          position: [x, height / 2 + railHeight, width / 2] as [
            number,
            number,
            number
          ],
          size: [0.4, 0.05, 0.05] as [number, number, number],
          id: `top-rail-right-${i}`,
        });

        // Bottom rail
        components.push({
          type: "bottom-rail",
          position: [x, height / 2 + railHeight / 3, width / 2] as [
            number,
            number,
            number
          ],
          size: [0.4, 0.05, 0.05] as [number, number, number],
          id: `bottom-rail-right-${i}`,
        });
      }
    }

    return components;
  }, [length, width, height, hasRails, hasSupportPillars]);

  // Material color configurations
  const getMaterialColor = () => {
    if (color) return color;
    return "#8B4513"; // Default wood color
  };

  const getMaterialProps = () => ({
    color: getMaterialColor(),
    map: woodTexture,
    roughness: 0.8,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
  });

  const bridgeContent = (
    <group position={position} rotation={rotation}>
      {woodTexture ? (
        <group>
          {bridgeComponents.map((component) => {
            if (component.type === "pillar" || component.type === "rail-post") {
              return (
                <Cylinder
                  key={component.id}
                  args={[
                    component.size[0],
                    component.size[0],
                    component.size[1],
                  ]}
                  position={component.position}
                >
                  <meshStandardMaterial {...getMaterialProps()} />
                </Cylinder>
              );
            } else {
              return (
                <Box
                  key={component.id}
                  args={component.size}
                  position={component.position}
                >
                  <meshStandardMaterial {...getMaterialProps()} />
                </Box>
              );
            }
          })}
        </group>
      ) : (
        /* Fallback solid bridge while texture loads */
        <Box args={[length, height, width]}>
          <meshStandardMaterial {...getMaterialProps()} />
        </Box>
      )}
    </group>
  );

  if (isCollidable) {
    return (
      <RigidBody type="fixed" position={position}>
        <mesh
          rotation={rotation}
          onClick={onClick}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        >
          {bridgeContent}
        </mesh>
      </RigidBody>
    );
  }

  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {bridgeContent}
    </mesh>
  );
};

// Create breakable version using HOC
const BreakableWoodenBridge = withOptionalBreaking(WoodenBridge, {
  breakingOptions: {
    fragmentCount: 6,
    fractureImpulse: 0.8,
    minSizeForFracture: 0.4,
    maxSizeForFracture: 1.0,
  },
});

export default BreakableWoodenBridge;
