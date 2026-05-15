import React, { useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import { type BiomeWallConfig, type WallDefinition } from "../types/biomeWalls";
import { globalTextureManager } from "../utils/globalTextureManager";
import { useThreeDisposal } from "../hooks/useThreeDisposal";
import withOptionalBreaking from "./withOptionalBreaking";
import { type BiomeWallRendererProps } from "./biomeWallRendererTypes";

const BiomeWallRenderer: React.FC<BiomeWallRendererProps> = ({
  biomeConfig,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  onWallBreak,
  onFragmentClick,
}) => {
  const [textures, setTextures] = useState<Record<string, THREE.Texture>>({});
  const { addDisposable } = useThreeDisposal();

  // Load textures for all materials used in this biome
  useEffect(() => {
    const loadTextures = async () => {
      const texturePromises: Array<{
        material: string;
        promise: Promise<THREE.Texture>;
      }> = [];

      // Collect unique materials from walls
      const materials = new Set<string>();
      biomeConfig.walls.forEach((wall) => {
        if (wall.texture) {
          materials.add(wall.texture);
        }
      });

      // Collect materials from floor and ceiling
      if (biomeConfig.floor?.texture) {
        materials.add(biomeConfig.floor.texture);
      }
      if (biomeConfig.ceiling?.texture) {
        materials.add(biomeConfig.ceiling.texture);
      }

      // Load textures using global manager
      materials.forEach((material) => {
        texturePromises.push({
          material,
          promise: globalTextureManager.getTexture(material),
        });
      });

      try {
        const loadedTextures = await Promise.all(
          texturePromises.map((tp) => tp.promise)
        );

        const textureMap: Record<string, THREE.Texture> = {};
        texturePromises.forEach((tp, index) => {
          textureMap[tp.material] = loadedTextures[index];
        });

        setTextures(textureMap);

        // Register textures for disposal
        Object.values(textureMap).forEach((texture) => {
          addDisposable({ texture });
        });
      } catch (error) {
        console.error(
          "Failed to load textures for biome:",
          biomeConfig.id,
          error
        );
      }
    };

    loadTextures();
  }, [biomeConfig, addDisposable]);

  const getMaterialProps = (wall: WallDefinition) => {
    const baseProps = {
      color: wall.color || "#8B4513",
      roughness: 0.8,
      metalness: 0.0,
      transparent: wall.opacity !== undefined,
      opacity: wall.opacity || 1,
    };

    if (wall.texture && textures[wall.texture]) {
      return {
        ...baseProps,
        map: textures[wall.texture],
      };
    }

    return baseProps;
  };

  const renderWall = (wall: WallDefinition, index: number) => {
    const wallId = `${biomeConfig.id}-wall-${index}`;
    const materialProps = getMaterialProps(wall);

    const wallElement = (
      <Box
        key={wallId}
        args={wall.size}
        position={wall.position}
        rotation={wall.rotation}
      >
        <meshStandardMaterial {...materialProps} />
      </Box>
    );

    // Wrap with RigidBody if collidable
    return (
      <RigidBody key={wallId} type="fixed" position={[0, 0, 0]}>
        {wallElement}
      </RigidBody>
    );
  };

  const renderFloor = () => {
    if (!biomeConfig.floor) return null;

    const floor = biomeConfig.floor;
    const materialProps = {
      color: floor.color || "#666666",
      roughness: 0.8,
      metalness: 0.0,
      ...(floor.texture && textures[floor.texture]
        ? { map: textures[floor.texture] }
        : {}),
    };

    return (
      <RigidBody type="fixed" position={[0, 0, 0]}>
        <Box args={floor.size} position={floor.position}>
          <meshStandardMaterial {...materialProps} />
        </Box>
      </RigidBody>
    );
  };

  const renderCeiling = () => {
    if (!biomeConfig.ceiling) return null;

    const ceiling = biomeConfig.ceiling;
    const materialProps = {
      color: ceiling.color || "#8B4513",
      roughness: 0.8,
      metalness: 0.0,
      ...(ceiling.texture && textures[ceiling.texture]
        ? { map: textures[ceiling.texture] }
        : {}),
    };

    return (
      <RigidBody type="fixed" position={[0, 0, 0]}>
        <Box args={ceiling.size} position={ceiling.position}>
          <meshStandardMaterial {...materialProps} />
        </Box>
      </RigidBody>
    );
  };

  const renderDecorations = () => {
    if (!biomeConfig.decorations) return null;

    return biomeConfig.decorations.map((decoration, index) => {
      const decorationId = `${biomeConfig.id}-decoration-${index}`;
      const materialProps = {
        color: decoration.color || "#8B4513",
        roughness: 0.8,
        metalness: 0.0,
      };

      return (
        <Box
          key={decorationId}
          args={decoration.size}
          position={decoration.position}
          rotation={decoration.rotation || [0, 0, 0]}
        >
          <meshStandardMaterial {...materialProps} />
        </Box>
      );
    });
  };

  const renderLighting = () => {
    if (!biomeConfig.lighting) return null;

    const { lighting } = biomeConfig;

    switch (lighting.type) {
      case "ambient":
        return (
          <ambientLight intensity={lighting.intensity} color={lighting.color} />
        );
      case "directional":
        return (
          <directionalLight
            position={lighting.position || [10, 10, 5]}
            intensity={lighting.intensity}
            color={lighting.color}
            castShadow
          />
        );
      case "point":
        return (
          <pointLight
            position={lighting.position || [0, 3, 0]}
            intensity={lighting.intensity}
            color={lighting.color}
          />
        );
      case "spot":
        return (
          <spotLight
            position={lighting.position || [0, 3, 0]}
            intensity={lighting.intensity}
            color={lighting.color}
            angle={Math.PI / 6}
            penumbra={0.1}
          />
        );
      default:
        return null;
    }
  };

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Lighting */}
      {renderLighting()}

      {/* Floor */}
      {renderFloor()}

      {/* Ceiling */}
      {renderCeiling()}

      {/* Walls */}
      {biomeConfig.walls.map((wall, index) => renderWall(wall, index))}

      {/* Decorations */}
      {renderDecorations()}
    </group>
  );
};

const BiomeWallRendererWithBreaking = withOptionalBreaking(BiomeWallRenderer);
export default BiomeWallRendererWithBreaking;
