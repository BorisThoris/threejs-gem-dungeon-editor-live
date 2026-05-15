import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../../utils/textureUtils";

export interface ConcreteFoundationProps {
  position: [number, number, number];
  width?: number;
  length?: number;
  height?: number;
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  foundationType?: "slab" | "strip" | "pad" | "pier";
  hasReinforcement?: boolean;
  hasInsulation?: boolean;
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

const ConcreteFoundation: React.FC<ConcreteFoundationProps> = ({
  position,
  width = 10,
  length = 12,
  height = 1,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  foundationType = "slab",
  hasReinforcement = true,
  hasInsulation = false,
  opacity = 1,
  onClick,
  onPointerOver,
  onPointerOut,
  prototypeId: _prototypeId,
  onPrototypeAction: _onPrototypeAction,
}) => {
  // Load concrete texture
  const [concreteTexture, setConcreteTexture] = useState(null);

  useEffect(() => {
    const loadTexture = async () => {
      try {
        const loadedTexture = await loadTextureFromImage("cobblestone");
        setConcreteTexture(loadedTexture);
      } catch (error) {
        console.error("Failed to load concrete texture:", error);
      }
    };

    loadTexture();
  }, []);

  // Generate foundation components based on type
  const foundationComponents = useMemo(() => {
    const components = [];

    switch (foundationType) {
      case "slab":
        components.push(...generateSlabFoundation(width, length, height));
        break;
      case "strip":
        components.push(...generateStripFoundation(width, length, height));
        break;
      case "pad":
        components.push(...generatePadFoundation(width, length, height));
        break;
      case "pier":
        components.push(...generatePierFoundation(width, length, height));
        break;
    }

    // Add reinforcement
    if (hasReinforcement) {
      components.push(...generateReinforcement(width, length, height));
    }

    // Add insulation
    if (hasInsulation) {
      components.push(...generateInsulation(width, length, height));
    }

    return components;
  }, [width, length, height, foundationType, hasReinforcement, hasInsulation]);

  // Generate slab foundation
  const generateSlabFoundation = (
    foundationWidth: number,
    foundationLength: number,
    foundationHeight: number
  ) => {
    const components = [];
    const blockWidth = 0.4;
    const blockLength = 0.6;
    const blockHeight = 0.2;
    const jointThickness = 0.01;

    const blocksPerRow = Math.floor(
      foundationWidth / (blockWidth + jointThickness)
    );
    const blocksPerColumn = Math.floor(
      foundationLength / (blockLength + jointThickness)
    );
    const blocksPerHeight = Math.floor(
      foundationHeight / (blockHeight + jointThickness)
    );

    for (let h = 0; h < blocksPerHeight; h++) {
      for (let row = 0; row < blocksPerRow; row++) {
        for (let col = 0; col < blocksPerColumn; col++) {
          const x =
            row * (blockWidth + jointThickness) -
            foundationWidth / 2 +
            blockWidth / 2;
          const z =
            col * (blockLength + jointThickness) -
            foundationLength / 2 +
            blockLength / 2;
          const y = h * (blockHeight + jointThickness) + blockHeight / 2;

          const sizeVariation = 0.95 + Math.random() * 0.1;
          components.push({
            type: "concrete-block",
            position: [x, y, z] as [number, number, number],
            size: [
              blockWidth * sizeVariation,
              blockHeight * sizeVariation,
              blockLength * sizeVariation,
            ] as [number, number, number],
            id: `slab-block-${h}-${row}-${col}`,
          });
        }
      }
    }

    return components;
  };

  // Generate strip foundation
  const generateStripFoundation = (
    foundationWidth: number,
    foundationLength: number,
    foundationHeight: number
  ) => {
    const components = [];
    const stripWidth = 0.8;
    const blockHeight = 0.2;
    const jointThickness = 0.01;

    // Perimeter strips
    const strips = [
      { x: 0, z: 0, width: foundationWidth, length: stripWidth }, // Front
      { x: 0, z: 0, width: foundationWidth, length: stripWidth }, // Back
      { x: 0, z: 0, width: stripWidth, length: foundationLength }, // Left
      { x: 0, z: 0, width: stripWidth, length: foundationLength }, // Right
    ];

    strips[0].z = foundationLength / 2 - stripWidth / 2; // Front
    strips[1].z = -foundationLength / 2 + stripWidth / 2; // Back
    strips[2].x = -foundationWidth / 2 + stripWidth / 2; // Left
    strips[3].x = foundationWidth / 2 - stripWidth / 2; // Right

    strips.forEach((strip, stripIndex) => {
      const blocksPerWidth = Math.floor(strip.width / (0.4 + jointThickness));
      const blocksPerLength = Math.floor(strip.length / (0.6 + jointThickness));
      const blocksPerHeight = Math.floor(
        foundationHeight / (blockHeight + jointThickness)
      );

      for (let h = 0; h < blocksPerHeight; h++) {
        for (let row = 0; row < blocksPerWidth; row++) {
          for (let col = 0; col < blocksPerLength; col++) {
            const x = strip.x + row * 0.4 - strip.width / 2 + 0.2;
            const z = strip.z + col * 0.6 - strip.length / 2 + 0.3;
            const y = h * (blockHeight + jointThickness) + blockHeight / 2;

            components.push({
              type: "concrete-block",
              position: [x, y, z] as [number, number, number],
              size: [0.4, blockHeight, 0.6] as [number, number, number],
              id: `strip-block-${stripIndex}-${h}-${row}-${col}`,
            });
          }
        }
      }
    });

    return components;
  };

  // Generate pad foundation
  const generatePadFoundation = (
    foundationWidth: number,
    foundationLength: number,
    foundationHeight: number
  ) => {
    const components = [];
    const padSize = 2;
    const padSpacing = 4;
    const blockHeight = 0.2;

    const padsX = Math.floor(foundationWidth / padSpacing);
    const padsZ = Math.floor(foundationLength / padSpacing);

    for (let x = 0; x < padsX; x++) {
      for (let z = 0; z < padsZ; z++) {
        const padX = x * padSpacing - foundationWidth / 2 + padSpacing / 2;
        const padZ = z * padSpacing - foundationLength / 2 + padSpacing / 2;

        // Generate blocks for this pad
        const blocksPerPad = Math.floor(padSize / 0.4);
        const blocksPerHeight = Math.floor(
          foundationHeight / (blockHeight + 0.01)
        );

        for (let h = 0; h < blocksPerHeight; h++) {
          for (let row = 0; row < blocksPerPad; row++) {
            for (let col = 0; col < blocksPerPad; col++) {
              const blockX = padX + row * 0.4 - padSize / 2 + 0.2;
              const blockZ = padZ + col * 0.4 - padSize / 2 + 0.2;
              const blockY = h * (blockHeight + 0.01) + blockHeight / 2;

              components.push({
                type: "concrete-block",
                position: [blockX, blockY, blockZ] as [number, number, number],
                size: [0.4, blockHeight, 0.4] as [number, number, number],
                id: `pad-block-${x}-${z}-${h}-${row}-${col}`,
              });
            }
          }
        }
      }
    }

    return components;
  };

  // Generate pier foundation
  const generatePierFoundation = (
    foundationWidth: number,
    foundationLength: number,
    foundationHeight: number
  ) => {
    const components = [];
    const pierSize = 0.8;
    const pierSpacing = 3;
    const blockHeight = 0.2;

    const piersX = Math.floor(foundationWidth / pierSpacing) + 1;
    const piersZ = Math.floor(foundationLength / pierSpacing) + 1;

    for (let x = 0; x < piersX; x++) {
      for (let z = 0; z < piersZ; z++) {
        const pierX = x * pierSpacing - foundationWidth / 2;
        const pierZ = z * pierSpacing - foundationLength / 2;

        // Generate blocks for this pier
        const blocksPerPier = Math.floor(pierSize / 0.4);
        const blocksPerHeight = Math.floor(
          foundationHeight / (blockHeight + 0.01)
        );

        for (let h = 0; h < blocksPerHeight; h++) {
          for (let row = 0; row < blocksPerPier; row++) {
            for (let col = 0; col < blocksPerPier; col++) {
              const blockX = pierX + row * 0.4 - pierSize / 2 + 0.2;
              const blockZ = pierZ + col * 0.4 - pierSize / 2 + 0.2;
              const blockY = h * (blockHeight + 0.01) + blockHeight / 2;

              components.push({
                type: "concrete-block",
                position: [blockX, blockY, blockZ] as [number, number, number],
                size: [0.4, blockHeight, 0.4] as [number, number, number],
                id: `pier-block-${x}-${z}-${h}-${row}-${col}`,
              });
            }
          }
        }
      }
    }

    return components;
  };

  // Generate reinforcement bars
  const generateReinforcement = (
    foundationWidth: number,
    foundationLength: number,
    foundationHeight: number
  ) => {
    const components = [];
    const rebarSpacing = 0.3;
    const rebarThickness = 0.02;

    // Horizontal reinforcement
    for (let h = 0; h < Math.floor(foundationHeight / rebarSpacing); h++) {
      const y = h * rebarSpacing + rebarSpacing / 2;

      // X-direction bars
      for (let x = 0; x < Math.floor(foundationWidth / rebarSpacing); x++) {
        const barX = x * rebarSpacing - foundationWidth / 2 + rebarSpacing / 2;
        components.push({
          type: "rebar-x",
          position: [barX, y, 0] as [number, number, number],
          size: [rebarSpacing * 0.8, rebarThickness, rebarThickness] as [
            number,
            number,
            number
          ],
          id: `rebar-x-${h}-${x}`,
        });
      }

      // Z-direction bars
      for (let z = 0; z < Math.floor(foundationLength / rebarSpacing); z++) {
        const barZ = z * rebarSpacing - foundationLength / 2 + rebarSpacing / 2;
        components.push({
          type: "rebar-z",
          position: [0, y, barZ] as [number, number, number],
          size: [rebarThickness, rebarThickness, rebarSpacing * 0.8] as [
            number,
            number,
            number
          ],
          id: `rebar-z-${h}-${z}`,
        });
      }
    }

    return components;
  };

  // Generate insulation
  const generateInsulation = (
    foundationWidth: number,
    foundationLength: number,
    foundationHeight: number
  ) => {
    const components = [];
    const insulationThickness = 0.1;

    // Bottom insulation
    components.push({
      type: "insulation-bottom",
      position: [0, -insulationThickness / 2, 0] as [number, number, number],
      size: [foundationWidth, insulationThickness, foundationLength] as [
        number,
        number,
        number
      ],
      id: "insulation-bottom",
    });

    // Side insulation
    components.push({
      type: "insulation-side",
      position: [0, foundationHeight / 2, 0] as [number, number, number],
      size: [
        foundationWidth + insulationThickness * 2,
        foundationHeight,
        insulationThickness,
      ] as [number, number, number],
      id: "insulation-side",
    });

    return components;
  };

  // Material color configurations
  const getMaterialColor = () => {
    if (color) return color;
    return "#C0C0C0"; // Default concrete color
  };

  const getConcreteMaterialProps = () => ({
    color: getMaterialColor(),
    map: concreteTexture,
    roughness: 0.9,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
  });

  const getRebarMaterialProps = () => ({
    color: "#8B4513", // Steel color
    roughness: 0.3,
    metalness: 0.8,
    transparent: false,
  });

  const getInsulationMaterialProps = () => ({
    color: "#FFD700", // Yellow insulation color
    roughness: 0.8,
    metalness: 0.0,
    transparent: false,
  });

  const foundationContent = (
    <group position={position} rotation={rotation}>
      {concreteTexture ? (
        <group>
          {foundationComponents.map((component) => {
            let materialProps = getConcreteMaterialProps();

            if (component.type.includes("rebar")) {
              materialProps = getRebarMaterialProps();
            } else if (component.type.includes("insulation")) {
              materialProps = getInsulationMaterialProps();
            }

            return (
              <Box
                key={component.id}
                args={component.size}
                position={component.position}
              >
                <meshStandardMaterial {...materialProps} />
              </Box>
            );
          })}
        </group>
      ) : (
        /* Fallback solid foundation while texture loads */
        <Box args={[width, height, length]}>
          <meshStandardMaterial {...getConcreteMaterialProps()} />
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
          {foundationContent}
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
      {foundationContent}
    </mesh>
  );
};

const ConcreteFoundationWithBreaking = withOptionalBreaking(ConcreteFoundation);
export default ConcreteFoundationWithBreaking;
