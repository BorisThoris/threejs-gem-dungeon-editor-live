import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box, Cylinder } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../utils/textureUtils";

export interface WoodenFenceProps {
  position: [number, number, number];
  length?: number;
  height?: number;
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
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

const WoodenFence: React.FC<WoodenFenceProps> = ({
  position,
  length = 8,
  height = 2,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
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
        // Failed to load wood texture
      }
    };

    loadTexture();
  }, []);

  // Generate fence components
  const fenceComponents = useMemo(() => {
    const postSpacing = 1.5; // Distance between posts
    const postRadius = 0.05; // Post radius
    const postHeight = height;
    const plankWidth = 0.15; // Plank width
    const plankHeight = 0.05; // Plank thickness
    const plankLength = postSpacing - 0.1; // Plank length (slightly shorter than post spacing)

    const components = [];

    // Calculate number of posts needed
    const numPosts = Math.floor(length / postSpacing) + 1;

    // Generate posts
    for (let i = 0; i < numPosts; i++) {
      const x = i * postSpacing - length / 2;
      components.push({
        type: "post",
        position: [x, postHeight / 2, 0] as [number, number, number],
        size: [postRadius, postHeight, postRadius] as [number, number, number],
        id: `post-${i}`,
      });
    }

    // Generate horizontal planks
    const numPlanks = Math.floor(height / 0.3); // Planks every 0.3 units vertically
    for (let row = 0; row < numPlanks; row++) {
      const y = row * 0.3 + 0.15;
      for (let i = 0; i < numPosts - 1; i++) {
        const x = i * postSpacing - length / 2 + postSpacing / 2;
        components.push({
          type: "plank",
          position: [x, y, 0] as [number, number, number],
          size: [plankLength, plankHeight, plankWidth] as [
            number,
            number,
            number
          ],
          id: `plank-${row}-${i}`,
        });
      }
    }

    // Generate vertical planks for decorative effect
    for (let i = 0; i < numPosts - 1; i++) {
      const x = i * postSpacing - length / 2 + postSpacing / 2;
      const numVerticalPlanks = Math.floor(height / 0.4);
      for (let j = 0; j < numVerticalPlanks; j++) {
        const y = j * 0.4 + 0.2;
        components.push({
          type: "vertical-plank",
          position: [x, y, 0] as [number, number, number],
          size: [plankHeight, 0.3, plankWidth] as [number, number, number],
          id: `vertical-plank-${i}-${j}`,
        });
      }
    }

    return components;
  }, [length, height]);

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

  const fenceContent = (
    <group position={position} rotation={rotation}>
      {woodTexture ? (
        <group>
          {fenceComponents.map((component) => {
            if (component.type === "post") {
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
        /* Fallback solid fence while texture loads */
        <Box args={[length, height, 0.1]}>
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
          {fenceContent}
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
      {fenceContent}
    </mesh>
  );
};

// Create breakable version using HOC
const BreakableWoodenFence = withOptionalBreaking(WoodenFence, {
  breakingOptions: {
    fragmentCount: 5,
    fractureImpulse: 0.6,
    minSizeForFracture: 0.3,
    maxSizeForFracture: 0.8,
  },
});

export default BreakableWoodenFence;
