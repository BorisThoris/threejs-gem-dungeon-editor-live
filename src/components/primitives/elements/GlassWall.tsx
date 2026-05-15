import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box } from "@react-three/drei";
import * as THREE from "three";
// import withOptionalBreaking from "../../../withOptionalBreaking";
// import { loadTextureFromImage } from "../../../../utils/textureUtils";

export interface GlassWallProps {
  position: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
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

const GlassWall: React.FC<GlassWallProps> = ({
  position,
  width = 6,
  height = 3,
  depth = 0.1,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  opacity = 0.3,
  onClick,
  onPointerOver,
  onPointerOut,
  prototypeId: _prototypeId,  
  onPrototypeAction: _onPrototypeAction,  
}) => {
  // Load glass texture
  const [glassTexture, setGlassTexture] = useState(null);

  useEffect(() => {
    const loadTexture = async () => {
      try {
        // Don't use texture for glass - it should be clean and transparent
        setGlassTexture(null);
      } catch (error) {
        console.error("Failed to load glass texture:", error);
      }
    };

    loadTexture();
  }, []);

  // Generate glass panel positions
  const glassPanels = useMemo(() => {
    const panelWidth = 1.0; // Individual glass panel width
    const panelHeight = 1.5; // Individual glass panel height
    const frameThickness = 0.05; // Frame thickness
    const panelSpacing = 0.02; // Spacing between panels

    const panels = [];
    const panelsPerRow = Math.floor(width / (panelWidth + panelSpacing));
    const rows = Math.floor(height / (panelHeight + panelSpacing));

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < panelsPerRow; col++) {
        const x =
          col * (panelWidth + panelSpacing) - width / 2 + panelWidth / 2;
        const y = row * (panelHeight + panelSpacing) + panelHeight / 2;
        const z = 0;

        panels.push({
          position: [x, y, z] as [number, number, number],
          size: [panelWidth, panelHeight, depth] as [number, number, number],
          id: `glass-panel-${row}-${col}`,
        });
      }
    }

    return panels;
  }, [width, height, depth]);

  // Generate frame components
  const frameComponents = useMemo(() => {
    const frameThickness = 0.05;
    const components = [];

    // Vertical frames
    const numVerticalFrames = Math.floor(width / 1.0) + 1;
    for (let i = 0; i < numVerticalFrames; i++) {
      const x = i * 1.0 - width / 2;
      components.push({
        type: "vertical-frame",
        position: [x, height / 2, 0] as [number, number, number],
        size: [frameThickness, height, frameThickness] as [
          number,
          number,
          number
        ],
        id: `vertical-frame-${i}`,
      });
    }

    // Horizontal frames
    const numHorizontalFrames = Math.floor(height / 1.5) + 1;
    for (let i = 0; i < numHorizontalFrames; i++) {
      const y = i * 1.5 - height / 2 + 1.5 / 2;
      components.push({
        type: "horizontal-frame",
        position: [0, y, 0] as [number, number, number],
        size: [width, frameThickness, frameThickness] as [
          number,
          number,
          number
        ],
        id: `horizontal-frame-${i}`,
      });
    }

    return components;
  }, [width, height]);

  // Material color configurations
  const getMaterialColor = () => {
    if (color) return color;
    return "#E6F3FF"; // Default glass color
  };

  const getGlassMaterialProps = () => ({
    color: getMaterialColor(),
    roughness: 0.0,
    metalness: 0.0,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide,
  });

  const getFrameMaterialProps = () => ({
    color: "#2C3E50", // Dark frame color
    roughness: 0.8,
    metalness: 0.2,
    transparent: false,
  });

  const wallContent = (
    <group position={position} rotation={rotation}>
      {glassTexture ? (
        <group>
          {/* Glass panels */}
          {glassPanels.map((panel) => (
            <Box key={panel.id} args={panel.size} position={panel.position}>
              <meshStandardMaterial {...getGlassMaterialProps()} />
            </Box>
          ))}

          {/* Frame components */}
          {frameComponents.map((frame) => (
            <Box key={frame.id} args={frame.size} position={frame.position}>
              <meshStandardMaterial {...getFrameMaterialProps()} />
            </Box>
          ))}
        </group>
      ) : (
        /* Fallback solid wall while texture loads */
        <Box args={[width, height, depth]}>
          <meshStandardMaterial {...getGlassMaterialProps()} />
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
          {wallContent}
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
      {wallContent}
    </mesh>
  );
};

export default GlassWall;
