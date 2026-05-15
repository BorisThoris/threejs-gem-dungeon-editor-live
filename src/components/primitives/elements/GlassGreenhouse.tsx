import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box, Cylinder } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../../utils/textureUtils";

export interface GlassGreenhouseProps {
  position: [number, number, number];
  width?: number;
  length?: number;
  height?: number;
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasDoors?: boolean;
  doorCount?: number;
  hasVents?: boolean;
  ventCount?: number;
  hasShelving?: boolean;
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

const GlassGreenhouse: React.FC<GlassGreenhouseProps> = ({
  position,
  width = 8,
  length = 10,
  height = 4,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasDoors = true,
  doorCount = 2,
  hasVents = true,
  ventCount = 4,
  hasShelving = true,
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

  // Generate greenhouse components
  const greenhouseComponents = useMemo(() => {
    const components = [];
    const frameThickness = 0.05;
    const glassThickness = 0.02;
    const panelWidth = 1.0;
    const panelHeight = 1.5;

    // Frame structure
    components.push(
      ...generateFrameStructure(width, length, height, frameThickness)
    );

    // Glass panels
    components.push(
      ...generateGlassPanels(
        width,
        length,
        height,
        panelWidth,
        panelHeight,
        glassThickness
      )
    );

    // Roof panels
    components.push(
      ...generateRoofPanels(width, length, height, panelWidth, glassThickness)
    );

    // Doors
    if (hasDoors) {
      components.push(
        ...generateDoors(width, length, height, doorCount, frameThickness)
      );
    }

    // Vents
    if (hasVents) {
      components.push(
        ...generateVents(width, length, height, ventCount, frameThickness)
      );
    }

    // Shelving
    if (hasShelving) {
      components.push(...generateShelving(width, length, height));
    }

    return components;
  }, [
    width,
    length,
    height,
    hasDoors,
    doorCount,
    hasVents,
    ventCount,
    hasShelving,
  ]);

  // Generate frame structure
  const generateFrameStructure = (
    greenhouseWidth: number,
    greenhouseLength: number,
    greenhouseHeight: number,
    frameThickness: number
  ) => {
    const components = [];

    // Vertical corner posts
    const cornerPosts = [
      [-greenhouseWidth / 2, greenhouseHeight / 2, -greenhouseLength / 2],
      [greenhouseWidth / 2, greenhouseHeight / 2, -greenhouseLength / 2],
      [greenhouseWidth / 2, greenhouseHeight / 2, greenhouseLength / 2],
      [-greenhouseWidth / 2, greenhouseHeight / 2, greenhouseLength / 2],
    ];

    cornerPosts.forEach((post, index) => {
      components.push({
        type: "corner-post",
        position: post as [number, number, number],
        size: [frameThickness, greenhouseHeight, frameThickness] as [
          number,
          number,
          number
        ],
        id: `corner-post-${index}`,
      });
    });

    // Horizontal beams
    // Bottom beams
    components.push({
      type: "bottom-beam",
      position: [0, 0, -greenhouseLength / 2] as [number, number, number],
      size: [greenhouseWidth, frameThickness, frameThickness] as [
        number,
        number,
        number
      ],
      id: "bottom-beam-front",
    });
    components.push({
      type: "bottom-beam",
      position: [0, 0, greenhouseLength / 2] as [number, number, number],
      size: [greenhouseWidth, frameThickness, frameThickness] as [
        number,
        number,
        number
      ],
      id: "bottom-beam-back",
    });
    components.push({
      type: "bottom-beam",
      position: [-greenhouseWidth / 2, 0, 0] as [number, number, number],
      size: [frameThickness, frameThickness, greenhouseLength] as [
        number,
        number,
        number
      ],
      id: "bottom-beam-left",
    });
    components.push({
      type: "bottom-beam",
      position: [greenhouseWidth / 2, 0, 0] as [number, number, number],
      size: [frameThickness, frameThickness, greenhouseLength] as [
        number,
        number,
        number
      ],
      id: "bottom-beam-right",
    });

    // Top beams
    components.push({
      type: "top-beam",
      position: [0, greenhouseHeight, -greenhouseLength / 2] as [
        number,
        number,
        number
      ],
      size: [greenhouseWidth, frameThickness, frameThickness] as [
        number,
        number,
        number
      ],
      id: "top-beam-front",
    });
    components.push({
      type: "top-beam",
      position: [0, greenhouseHeight, greenhouseLength / 2] as [
        number,
        number,
        number
      ],
      size: [greenhouseWidth, frameThickness, frameThickness] as [
        number,
        number,
        number
      ],
      id: "top-beam-back",
    });
    components.push({
      type: "top-beam",
      position: [-greenhouseWidth / 2, greenhouseHeight, 0] as [
        number,
        number,
        number
      ],
      size: [frameThickness, frameThickness, greenhouseLength] as [
        number,
        number,
        number
      ],
      id: "top-beam-left",
    });
    components.push({
      type: "top-beam",
      position: [greenhouseWidth / 2, greenhouseHeight, 0] as [
        number,
        number,
        number
      ],
      size: [frameThickness, frameThickness, greenhouseLength] as [
        number,
        number,
        number
      ],
      id: "top-beam-right",
    });

    // Vertical supports
    const verticalSupports = Math.floor(greenhouseWidth / 2);
    for (let i = 0; i < verticalSupports; i++) {
      const x = i * 2 - greenhouseWidth / 2 + 1;
      components.push({
        type: "vertical-support",
        position: [x, greenhouseHeight / 2, -greenhouseLength / 2] as [
          number,
          number,
          number
        ],
        size: [frameThickness, greenhouseHeight, frameThickness] as [
          number,
          number,
          number
        ],
        id: `vertical-support-front-${i}`,
      });
      components.push({
        type: "vertical-support",
        position: [x, greenhouseHeight / 2, greenhouseLength / 2] as [
          number,
          number,
          number
        ],
        size: [frameThickness, greenhouseHeight, frameThickness] as [
          number,
          number,
          number
        ],
        id: `vertical-support-back-${i}`,
      });
    }

    return components;
  };

  // Generate glass panels
  const generateGlassPanels = (
    greenhouseWidth: number,
    greenhouseLength: number,
    greenhouseHeight: number,
    panelWidth: number,
    panelHeight: number,
    glassThickness: number
  ) => {
    const components = [];

    // Front and back walls
    const frontBackPanels = Math.floor(greenhouseWidth / panelWidth);
    const frontBackRows = Math.floor(greenhouseHeight / panelHeight);

    for (let row = 0; row < frontBackRows; row++) {
      for (let col = 0; col < frontBackPanels; col++) {
        const x = col * panelWidth - greenhouseWidth / 2 + panelWidth / 2;
        const y = row * panelHeight + panelHeight / 2;

        // Front wall
        components.push({
          type: "glass-panel",
          position: [x, y, -greenhouseLength / 2 + glassThickness / 2] as [
            number,
            number,
            number
          ],
          size: [panelWidth, panelHeight, glassThickness] as [
            number,
            number,
            number
          ],
          id: `glass-panel-front-${row}-${col}`,
        });

        // Back wall
        components.push({
          type: "glass-panel",
          position: [x, y, greenhouseLength / 2 - glassThickness / 2] as [
            number,
            number,
            number
          ],
          size: [panelWidth, panelHeight, glassThickness] as [
            number,
            number,
            number
          ],
          id: `glass-panel-back-${row}-${col}`,
        });
      }
    }

    // Left and right walls
    const leftRightPanels = Math.floor(greenhouseLength / panelWidth);
    const leftRightRows = Math.floor(greenhouseHeight / panelHeight);

    for (let row = 0; row < leftRightRows; row++) {
      for (let col = 0; col < leftRightPanels; col++) {
        const z = col * panelWidth - greenhouseLength / 2 + panelWidth / 2;
        const y = row * panelHeight + panelHeight / 2;

        // Left wall
        components.push({
          type: "glass-panel",
          position: [-greenhouseWidth / 2 + glassThickness / 2, y, z] as [
            number,
            number,
            number
          ],
          size: [glassThickness, panelHeight, panelWidth] as [
            number,
            number,
            number
          ],
          id: `glass-panel-left-${row}-${col}`,
        });

        // Right wall
        components.push({
          type: "glass-panel",
          position: [greenhouseWidth / 2 - glassThickness / 2, y, z] as [
            number,
            number,
            number
          ],
          size: [glassThickness, panelHeight, panelWidth] as [
            number,
            number,
            number
          ],
          id: `glass-panel-right-${row}-${col}`,
        });
      }
    }

    return components;
  };

  // Generate roof panels
  const generateRoofPanels = (
    greenhouseWidth: number,
    greenhouseLength: number,
    greenhouseHeight: number,
    panelWidth: number,
    glassThickness: number
  ) => {
    const components = [];
    const roofAngle = Math.PI / 6; // 30 degrees
    const roofHeight = (greenhouseWidth * Math.tan(roofAngle)) / 2;

    // Roof panels
    const roofPanels = Math.floor(greenhouseLength / panelWidth);
    const roofWidth = Math.sqrt(
      greenhouseWidth * greenhouseWidth + roofHeight * roofHeight
    );

    for (let i = 0; i < roofPanels; i++) {
      const z = i * panelWidth - greenhouseLength / 2 + panelWidth / 2;

      // Left roof panel
      components.push({
        type: "roof-panel",
        position: [0, greenhouseHeight + roofHeight / 2, z] as [
          number,
          number,
          number
        ],
        size: [roofWidth, glassThickness, panelWidth] as [
          number,
          number,
          number
        ],
        id: `roof-panel-left-${i}`,
        rotation: [0, 0, roofAngle] as [number, number, number],
      });

      // Right roof panel
      components.push({
        type: "roof-panel",
        position: [0, greenhouseHeight + roofHeight / 2, z] as [
          number,
          number,
          number
        ],
        size: [roofWidth, glassThickness, panelWidth] as [
          number,
          number,
          number
        ],
        id: `roof-panel-right-${i}`,
        rotation: [0, 0, -roofAngle] as [number, number, number],
      });
    }

    return components;
  };

  // Generate doors
  const generateDoors = (
    greenhouseWidth: number,
    greenhouseLength: number,
    greenhouseHeight: number,
    doorCount: number,
    frameThickness: number
  ) => {
    const components = [];
    const doorWidth = 1.5;
    const doorHeight = greenhouseHeight * 0.8;
    const doorSpacing = greenhouseLength / (doorCount + 1);

    for (let i = 0; i < doorCount; i++) {
      const z = (i + 1) * doorSpacing - greenhouseLength / 2;

      // Door frame
      components.push({
        type: "door-frame",
        position: [0, doorHeight / 2, z] as [number, number, number],
        size: [doorWidth + 0.1, doorHeight, frameThickness] as [
          number,
          number,
          number
        ],
        id: `door-frame-${i}`,
      });

      // Door
      components.push({
        type: "door",
        position: [0, doorHeight / 2, z + frameThickness / 2] as [
          number,
          number,
          number
        ],
        size: [doorWidth, doorHeight, 0.05] as [number, number, number],
        id: `door-${i}`,
      });
    }

    return components;
  };

  // Generate vents
  const generateVents = (
    greenhouseWidth: number,
    greenhouseLength: number,
    greenhouseHeight: number,
    ventCount: number,
    frameThickness: number
  ) => {
    const components = [];
    const ventWidth = 0.8;
    const ventHeight = 0.4;
    const ventSpacing = greenhouseLength / (ventCount + 1);

    for (let i = 0; i < ventCount; i++) {
      const z = (i + 1) * ventSpacing - greenhouseLength / 2;

      // Vent frame
      components.push({
        type: "vent-frame",
        position: [0, greenhouseHeight * 0.7, z] as [number, number, number],
        size: [ventWidth, ventHeight, frameThickness] as [
          number,
          number,
          number
        ],
        id: `vent-frame-${i}`,
      });

      // Vent cover
      components.push({
        type: "vent-cover",
        position: [0, greenhouseHeight * 0.7, z + frameThickness / 2] as [
          number,
          number,
          number
        ],
        size: [ventWidth, ventHeight, 0.02] as [number, number, number],
        id: `vent-cover-${i}`,
      });
    }

    return components;
  };

  // Generate shelving
  const generateShelving = (
    greenhouseWidth: number,
    greenhouseLength: number,
    greenhouseHeight: number
  ) => {
    const components = [];
    const shelfHeight = 0.05;
    const shelfSpacing = 0.8;
    const shelfWidth = greenhouseWidth * 0.8;
    const shelfLength = greenhouseLength * 0.8;

    const numShelves = Math.floor((greenhouseHeight - 1) / shelfSpacing);

    for (let i = 0; i < numShelves; i++) {
      const y = i * shelfSpacing + 0.5;

      // Main shelf
      components.push({
        type: "shelf",
        position: [0, y, 0] as [number, number, number],
        size: [shelfWidth, shelfHeight, shelfLength] as [
          number,
          number,
          number
        ],
        id: `shelf-${i}`,
      });

      // Shelf supports
      const supportSpacing = 2;
      const numSupports = Math.floor(shelfWidth / supportSpacing);
      for (let j = 0; j < numSupports; j++) {
        const x = j * supportSpacing - shelfWidth / 2 + supportSpacing / 2;
        components.push({
          type: "shelf-support",
          position: [x, y - shelfSpacing / 2, 0] as [number, number, number],
          size: [0.05, shelfSpacing, 0.05] as [number, number, number],
          id: `shelf-support-${i}-${j}`,
        });
      }
    }

    return components;
  };

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

  const getDoorMaterialProps = () => ({
    color: "#8B4513", // Wood door color
    roughness: 0.8,
    metalness: 0.0,
    transparent: false,
  });

  const getShelfMaterialProps = () => ({
    color: "#8B4513", // Wood shelf color
    roughness: 0.8,
    metalness: 0.0,
    transparent: false,
  });

  const greenhouseContent = (
    <group position={position} rotation={rotation}>
      <group>
        {greenhouseComponents.map((component) => {
          let materialProps = getGlassMaterialProps();

          if (
            component.type.includes("frame") ||
            component.type.includes("post") ||
            component.type.includes("beam") ||
            component.type.includes("support")
          ) {
            materialProps = getFrameMaterialProps();
          } else if (component.type.includes("door")) {
            materialProps = getDoorMaterialProps();
          } else if (component.type.includes("shelf")) {
            materialProps = getShelfMaterialProps();
          }

          return (
            <Box
              key={component.id}
              args={component.size}
              position={component.position}
              rotation={component.rotation || [0, 0, 0]}
            >
              <meshStandardMaterial {...materialProps} />
            </Box>
          );
        })}
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
          {greenhouseContent}
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
      {greenhouseContent}
    </mesh>
  );
};

const GlassGreenhouseWithBreaking = withOptionalBreaking(GlassGreenhouse);
export default GlassGreenhouseWithBreaking;
