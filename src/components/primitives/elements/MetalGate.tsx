import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box, Cylinder } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";
// import { loadTextureFromImage } from "../../../../utils/textureUtils";

export interface MetalGateProps {
  position: [number, number, number];
  width?: number;
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

const MetalGate: React.FC<MetalGateProps> = ({
  position,
  width = 4,
  height = 3,
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
  // Load metal texture
  // const [metalTexture, setMetalTexture] = useState(null);

  // useEffect(() => {
  //   const loadTexture = async () => {
  //     try {
  //       const loadedTexture = await loadTextureFromImage("pixel_checkerboard");
  //       setMetalTexture(loadedTexture);
  //     } catch (error) {
  //       console.error("Failed to load metal texture:", error);
  //     }
  //   };

  //   loadTexture();
  // }, []);

  // Generate gate components
  const gateComponents = useMemo(() => {
    const barThickness = 0.05; // Thickness of metal bars
    const barSpacing = 0.3; // Spacing between vertical bars
    const horizontalBarSpacing = 0.5; // Spacing between horizontal bars
    const frameThickness = 0.1; // Frame thickness

    const components = [];

    // Vertical bars
    const numVerticalBars = Math.floor(width / barSpacing);
    for (let i = 0; i < numVerticalBars; i++) {
      const x = i * barSpacing - width / 2 + barSpacing / 2;
      components.push({
        type: "vertical-bar",
        position: [x, height / 2, 0] as [number, number, number],
        size: [barThickness, height - 0.2, barThickness] as [
          number,
          number,
          number
        ],
        id: `vertical-bar-${i}`,
      });
    }

    // Horizontal bars
    const numHorizontalBars = Math.floor(height / horizontalBarSpacing);
    for (let i = 0; i < numHorizontalBars; i++) {
      const y = i * horizontalBarSpacing + 0.1;
      components.push({
        type: "horizontal-bar",
        position: [0, y, 0] as [number, number, number],
        size: [width - 0.2, barThickness, barThickness] as [
          number,
          number,
          number
        ],
        id: `horizontal-bar-${i}`,
      });
    }

    // Frame posts
    components.push({
      type: "frame-post",
      position: [-width / 2, height / 2, 0] as [number, number, number],
      size: [frameThickness, height, frameThickness] as [
        number,
        number,
        number
      ],
      id: "left-post",
    });
    components.push({
      type: "frame-post",
      position: [width / 2, height / 2, 0] as [number, number, number],
      size: [frameThickness, height, frameThickness] as [
        number,
        number,
        number
      ],
      id: "right-post",
    });

    // Top and bottom frame
    components.push({
      type: "frame-horizontal",
      position: [0, height - 0.05, 0] as [number, number, number],
      size: [width, frameThickness, frameThickness] as [number, number, number],
      id: "top-frame",
    });
    components.push({
      type: "frame-horizontal",
      position: [0, 0.05, 0] as [number, number, number],
      size: [width, frameThickness, frameThickness] as [number, number, number],
      id: "bottom-frame",
    });

    // Decorative elements
    for (let i = 0; i < 3; i++) {
      const x = (Math.random() - 0.5) * width * 0.8;
      const y = (Math.random() - 0.5) * height * 0.8;
      components.push({
        type: "decorative",
        position: [x, y, 0] as [number, number, number],
        size: [0.1, 0.1, 0.1] as [number, number, number],
        id: `decorative-${i}`,
      });
    }

    return components;
  }, [width, height]);

  // Material color configurations
  const getMaterialColor = () => {
    if (color) return color;
    return "#C0C0C0"; // Default metal color
  };

  const getMaterialProps = () => ({
    color: getMaterialColor(),
    // map: metalTexture,
    roughness: 0.3,
    metalness: 0.8,
    transparent: opacity < 1,
    opacity,
  });

  const gateContent = (
    <group position={position} rotation={rotation}>
      <group>
        {gateComponents.map((component) => (
          <Box
            key={component.id}
            args={component.size}
            position={component.position}
          >
            <meshStandardMaterial {...getMaterialProps()} />
          </Box>
        ))}
      </group>
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
          {gateContent}
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
      {gateContent}
    </mesh>
  );
};

const MetalGateWithBreaking = withOptionalBreaking(MetalGate);
export default MetalGateWithBreaking;
