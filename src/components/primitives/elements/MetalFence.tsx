import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box, Cylinder } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../../utils/textureUtils";

export interface MetalFenceProps {
  position: [number, number, number];
  length?: number;
  height?: number;
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  fenceType?: "chain-link" | "wrought-iron" | "industrial";
  hasGates?: boolean;
  gateCount?: number;
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

const MetalFence: React.FC<MetalFenceProps> = ({
  position,
  length = 10,
  height = 2.5,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  fenceType = "wrought-iron",
  hasGates = true,
  gateCount = 1,
  opacity = 1,
  onClick,
  onPointerOver,
  onPointerOut,
  prototypeId: _prototypeId,
  onPrototypeAction: _onPrototypeAction,
}) => {
  // Load metal texture
  const [metalTexture, setMetalTexture] = useState(null);

  useEffect(() => {
    const loadTexture = async () => {
      try {
        const loadedTexture = await loadTextureFromImage("pixel_checkerboard");
        setMetalTexture(loadedTexture);
      } catch (error) {
        console.error("Failed to load metal texture:", error);
      }
    };

    loadTexture();
  }, []);

  // Generate fence components based on type
  const fenceComponents = useMemo(() => {
    const components = [];

    switch (fenceType) {
      case "chain-link":
        components.push(...generateChainLinkFence(length, height));
        break;
      case "wrought-iron":
        components.push(...generateWroughtIronFence(length, height));
        break;
      case "industrial":
        components.push(...generateIndustrialFence(length, height));
        break;
    }

    // Add gates
    if (hasGates && gateCount > 0) {
      components.push(...generateGates(length, height, gateCount));
    }

    return components;
  }, [length, height, fenceType, hasGates, gateCount]);

  // Generate chain-link fence
  const generateChainLinkFence = (fenceLength: number, fenceHeight: number) => {
    const components = [];
    const postSpacing = 2;
    const postRadius = 0.05;
    const postHeight = fenceHeight;
    const meshHeight = fenceHeight - 0.5;
    const meshSpacing = 0.1;

    const numPosts = Math.floor(fenceLength / postSpacing) + 1;

    // Posts
    for (let i = 0; i < numPosts; i++) {
      const x = i * postSpacing - fenceLength / 2;
      components.push({
        type: "post",
        position: [x, postHeight / 2, 0] as [number, number, number],
        size: [postRadius, postHeight, postRadius] as [number, number, number],
        id: `post-${i}`,
      });
    }

    // Chain-link mesh
    for (let i = 0; i < numPosts - 1; i++) {
      const startX = i * postSpacing - fenceLength / 2;
      const endX = (i + 1) * postSpacing - fenceLength / 2;
      const segmentLength = endX - startX;
      const meshSegments = Math.floor(segmentLength / meshSpacing);

      for (let j = 0; j < meshSegments; j++) {
        const x = startX + j * meshSpacing;
        const y = meshHeight / 2 + 0.25;

        // Vertical wires
        components.push({
          type: "vertical-wire",
          position: [x, y, 0] as [number, number, number],
          size: [0.01, meshHeight, 0.01] as [number, number, number],
          id: `vertical-wire-${i}-${j}`,
        });

        // Horizontal wires
        for (let k = 0; k < Math.floor(meshHeight / 0.2); k++) {
          const wireY = k * 0.2 + 0.1;
          components.push({
            type: "horizontal-wire",
            position: [x, wireY, 0] as [number, number, number],
            size: [meshSpacing, 0.01, 0.01] as [number, number, number],
            id: `horizontal-wire-${i}-${j}-${k}`,
          });
        }
      }
    }

    return components;
  };

  // Generate wrought-iron fence
  const generateWroughtIronFence = (
    fenceLength: number,
    fenceHeight: number
  ) => {
    const components = [];
    const postSpacing = 1.5;
    const postRadius = 0.08;
    const postHeight = fenceHeight;
    const barThickness = 0.03;
    const barSpacing = 0.3;

    const numPosts = Math.floor(fenceLength / postSpacing) + 1;

    // Posts
    for (let i = 0; i < numPosts; i++) {
      const x = i * postSpacing - fenceLength / 2;
      components.push({
        type: "post",
        position: [x, postHeight / 2, 0] as [number, number, number],
        size: [postRadius, postHeight, postRadius] as [number, number, number],
        id: `post-${i}`,
      });
    }

    // Horizontal bars
    for (let i = 0; i < numPosts - 1; i++) {
      const x = i * postSpacing - fenceLength / 2 + postSpacing / 2;

      // Top bar
      components.push({
        type: "top-bar",
        position: [x, fenceHeight - 0.1, 0] as [number, number, number],
        size: [postSpacing - 0.1, barThickness, barThickness] as [
          number,
          number,
          number
        ],
        id: `top-bar-${i}`,
      });

      // Bottom bar
      components.push({
        type: "bottom-bar",
        position: [x, 0.1, 0] as [number, number, number],
        size: [postSpacing - 0.1, barThickness, barThickness] as [
          number,
          number,
          number
        ],
        id: `bottom-bar-${i}`,
      });

      // Vertical bars
      const numVerticalBars = Math.floor((fenceHeight - 0.4) / barSpacing);
      for (let j = 0; j < numVerticalBars; j++) {
        const y = j * barSpacing + 0.2;
        components.push({
          type: "vertical-bar",
          position: [x, y, 0] as [number, number, number],
          size: [barThickness, barSpacing * 0.8, barThickness] as [
            number,
            number,
            number
          ],
          id: `vertical-bar-${i}-${j}`,
        });
      }

      // Decorative elements
      for (let k = 0; k < 3; k++) {
        const decorX = x + (Math.random() - 0.5) * (postSpacing - 0.2);
        const decorY = 0.5 + Math.random() * (fenceHeight - 1);
        components.push({
          type: "decorative",
          position: [decorX, decorY, 0] as [number, number, number],
          size: [0.05, 0.05, 0.05] as [number, number, number],
          id: `decorative-${i}-${k}`,
        });
      }
    }

    return components;
  };

  // Generate industrial fence
  const generateIndustrialFence = (
    fenceLength: number,
    fenceHeight: number
  ) => {
    const components = [];
    const postSpacing = 3;
    const postRadius = 0.1;
    const postHeight = fenceHeight;
    const panelWidth = 2;
    const barThickness = 0.05;
    const barSpacing = 0.2;

    const numPanels = Math.floor(fenceLength / panelWidth);

    // Posts
    for (let i = 0; i <= numPanels; i++) {
      const x = i * panelWidth - fenceLength / 2;
      components.push({
        type: "post",
        position: [x, postHeight / 2, 0] as [number, number, number],
        size: [postRadius, postHeight, postRadius] as [number, number, number],
        id: `post-${i}`,
      });
    }

    // Panels
    for (let i = 0; i < numPanels; i++) {
      const x = i * panelWidth - fenceLength / 2 + panelWidth / 2;

      // Frame
      components.push({
        type: "panel-frame",
        position: [x, fenceHeight / 2, 0] as [number, number, number],
        size: [panelWidth, fenceHeight, barThickness] as [
          number,
          number,
          number
        ],
        id: `panel-frame-${i}`,
      });

      // Horizontal bars
      const numHorizontalBars = Math.floor(fenceHeight / barSpacing);
      for (let j = 0; j < numHorizontalBars; j++) {
        const y = j * barSpacing + barSpacing / 2;
        components.push({
          type: "horizontal-bar",
          position: [x, y, 0] as [number, number, number],
          size: [panelWidth - 0.1, barThickness, barThickness] as [
            number,
            number,
            number
          ],
          id: `horizontal-bar-${i}-${j}`,
        });
      }

      // Vertical bars
      const numVerticalBars = Math.floor(panelWidth / barSpacing);
      for (let j = 0; j < numVerticalBars; j++) {
        const barX = j * barSpacing + barSpacing / 2 - panelWidth / 2;
        components.push({
          type: "vertical-bar",
          position: [x + barX, fenceHeight / 2, 0] as [number, number, number],
          size: [barThickness, fenceHeight - 0.1, barThickness] as [
            number,
            number,
            number
          ],
          id: `vertical-bar-${i}-${j}`,
        });
      }
    }

    return components;
  };

  // Generate gates
  const generateGates = (
    fenceLength: number,
    fenceHeight: number,
    gateCount: number
  ) => {
    const components = [];
    const gateWidth = 2;
    const gateSpacing = fenceLength / (gateCount + 1);

    for (let i = 0; i < gateCount; i++) {
      const x = (i + 1) * gateSpacing - fenceLength / 2;

      // Gate frame
      components.push({
        type: "gate-frame",
        position: [x, fenceHeight / 2, 0] as [number, number, number],
        size: [gateWidth, fenceHeight, 0.1] as [number, number, number],
        id: `gate-frame-${i}`,
      });

      // Gate bars
      const numBars = Math.floor(fenceHeight / 0.3);
      for (let j = 0; j < numBars; j++) {
        const y = j * 0.3 + 0.15;
        components.push({
          type: "gate-bar",
          position: [x, y, 0] as [number, number, number],
          size: [gateWidth - 0.1, 0.05, 0.05] as [number, number, number],
          id: `gate-bar-${i}-${j}`,
        });
      }
    }

    return components;
  };

  // Material color configurations
  const getMaterialColor = () => {
    if (color) return color;
    return "#C0C0C0"; // Default metal color
  };

  const getMaterialProps = () => ({
    color: getMaterialColor(),
    map: metalTexture,
    roughness: 0.3,
    metalness: 0.8,
    transparent: opacity < 1,
    opacity,
  });

  const fenceContent = (
    <group position={position} rotation={rotation}>
      {metalTexture ? (
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

const MetalFenceWithBreaking = withOptionalBreaking(MetalFence);
export default MetalFenceWithBreaking;
