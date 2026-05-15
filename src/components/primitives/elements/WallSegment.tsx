import React, { useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import type { WallSegment as WallSegmentType } from "../../../utils/segmentUtils";
import { loadTextureFromImage } from "../../../utils/textureUtils";
import * as THREE from "three";

interface WallSegmentProps {
  segment: WallSegmentType;
  onSegmentClick?: (segmentId: string) => void;
  onSegmentHover?: (segmentId: string) => void;
  onSegmentUnhover?: (segmentId: string) => void;
}

const WallSegment: React.FC<WallSegmentProps> = ({
  segment,
  onSegmentClick,
  onSegmentHover,
  onSegmentUnhover,
}) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loadTexture = async () => {
      try {
        const loadedTexture = await loadTextureFromImage(segment.material);
        loadedTexture.wrapS = loadedTexture.wrapT = THREE.RepeatWrapping;
        loadedTexture.repeat.set(2, 2);
        setTexture(loadedTexture);
      } catch (error) {
        console.warn(
          `Failed to load texture for segment ${segment.id}:`,
          error
        );
      }
    };

    loadTexture();
  }, [segment.material, segment.id]);

  if (!segment.isVisible) {
    return null;
  }

  return (
    <RigidBody
      type="fixed"
      colliders={segment.isCollidable ? "trimesh" : false}
    >
      <mesh
        position={segment.position}
        rotation={segment.rotation}
        onClick={() => onSegmentClick?.(segment.id)}
        onPointerOver={() => onSegmentHover?.(segment.id)}
        onPointerOut={() => onSegmentUnhover?.(segment.id)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={segment.size} />
        <meshLambertMaterial
          color={segment.color}
          map={texture}
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>
    </RigidBody>
  );
};

export default WallSegment;
