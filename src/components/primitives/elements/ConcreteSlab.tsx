import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box } from "@react-three/drei";
import * as THREE from "three";
// import withOptionalBreaking from "../../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../utils/textureUtils";

export interface ConcreteSlabProps {
  position: [number, number, number];
  width?: number;
  length?: number;
  thickness?: number;
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
  breakingOptions?: Record<string, unknown>;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}

const ConcreteSlab: React.FC<ConcreteSlabProps> = ({
  position,
  width = 6,
  length = 8,
  thickness = 0.3,
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
  // Load concrete texture
  const [concreteTexture, setConcreteTexture] = useState<THREE.Texture | null>(
    null
  );

  useEffect(() => {
    const loadTexture = async () => {
      try {
        const loadedTexture = await loadTextureFromImage("cobblestone"); // Using cobblestone as concrete-like texture
        setConcreteTexture(loadedTexture);
      } catch (error) {
        console.error("Failed to load concrete texture:", error);
      }
    };

    loadTexture();
  }, []);

  // Generate concrete block positions
  const concreteBlocks = useMemo(() => {
    const blockWidth = 0.4; // Concrete block width
    const blockLength = 0.6; // Concrete block length
    const blockThickness = thickness;
    const jointThickness = 0.01; // Joint between blocks

    const blocks = [];
    const blocksPerRow = Math.floor(width / (blockWidth + jointThickness));
    const blocksPerColumn = Math.floor(length / (blockLength + jointThickness));

    for (let row = 0; row < blocksPerRow; row++) {
      for (let col = 0; col < blocksPerColumn; col++) {
        const x =
          row * (blockWidth + jointThickness) - width / 2 + blockWidth / 2;
        const z =
          col * (blockLength + jointThickness) - length / 2 + blockLength / 2;
        const y = blockThickness / 2;

        // Add slight random variations for realism
        const sizeVariation = 0.95 + Math.random() * 0.1;
        const positionVariation = (Math.random() - 0.5) * 0.02;

        blocks.push({
          position: [x + positionVariation, y, z + positionVariation] as [
            number,
            number,
            number
          ],
          size: [
            blockWidth * sizeVariation,
            blockThickness,
            blockLength * sizeVariation,
          ] as [number, number, number],
          id: `concrete-${row}-${col}`,
        });
      }
    }

    return blocks;
  }, [width, length, thickness]);

  // Material color configurations
  const getMaterialColor = () => {
    if (color) return color;
    return "#C0C0C0"; // Default concrete color
  };

  const getMaterialProps = () => ({
    color: getMaterialColor(),
    map: concreteTexture,
    roughness: 0.9,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
  });

  const slabContent = (
    <group position={position} rotation={rotation}>
      {concreteTexture ? (
        <group>
          {concreteBlocks.map((block) => (
            <Box key={block.id} args={block.size} position={block.position}>
              <meshStandardMaterial {...getMaterialProps()} />
            </Box>
          ))}

          {/* Joint lines between blocks */}
          {concreteBlocks.map((block) => (
            <Box
              key={`joint-${block.id}`}
              args={[block.size[0] + 0.01, 0.01, block.size[2]]}
              position={[
                block.position[0],
                block.position[1] + block.size[1] / 2,
                block.position[2],
              ]}
            >
              <meshStandardMaterial
                color="#A0A0A0"
                roughness={0.9}
                metalness={0.0}
              />
            </Box>
          ))}
        </group>
      ) : (
        /* Fallback solid slab while texture loads */
        <Box args={[width, thickness, length]}>
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
          {slabContent}
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
      {slabContent}
    </mesh>
  );
};

export default ConcreteSlab;
