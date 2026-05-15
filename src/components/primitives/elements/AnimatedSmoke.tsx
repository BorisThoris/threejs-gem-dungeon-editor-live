import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface AnimatedSmokeProps {
  position?: [number, number, number];
  scale?: number;
  isLit?: boolean;
  animationSpeed?: number;
  opacity?: number;
}

const AnimatedSmoke: React.FC<AnimatedSmokeProps> = ({
  position = [0, 0, 0],
  scale = 1,
  isLit = true,
  animationSpeed = 1.0,
  opacity = 0.6,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create smoke texture spritesheet (4 frames)
  const smokeTexture = useMemo(() => {
    // Create a 256x64 texture for 4 frames of 64x64 each
    const canvas = document.createElement("canvas");
    canvas.width = 256; // 4 frames * 64px
    canvas.height = 64; // 1 frame height
    const ctx = canvas.getContext("2d")!;

    // Generate 4 smoke frames programmatically
    for (let frame = 0; frame < 4; frame++) {
      const frameX = frame * 64;

      // Clear this frame area
      ctx.clearRect(frameX, 0, 64, 64);

      // Create smoke pattern for this frame
      ctx.fillStyle = `rgba(170, 170, 170, ${0.1 + frame * 0.1})`; // Light gray with increasing opacity

      // Draw organic smoke shape
      const centerX = 32;
      const centerY = 32;
      const radius = 8 + frame * 3; // Growing radius

      // Create wavy smoke pattern
      ctx.beginPath();
      for (let i = 0; i < 32; i++) {
        const angle = (i / 32) * Math.PI * 2;
        const waveOffset = Math.sin(angle * 2 + frame * 0.5) * 2; // Wavy pattern
        const r = radius + waveOffset;

        const x = frameX + centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();

      // Add some random dots for texture
      for (let i = 0; i < 15; i++) {
        const dotX = frameX + centerX + (Math.random() - 0.5) * radius * 1.5;
        const dotY = centerY + (Math.random() - 0.5) * radius * 1.5;
        const dotSize = Math.random() * 3 + 1;

        ctx.beginPath();
        ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

    return texture;
  }, []);

  // Animation frame counter
  const frameRef = useRef(0);

  useFrame((state) => {
    if (!isLit || !meshRef.current) return;

    // Update frame based on time
    const frame = Math.floor(
      (state.clock.elapsedTime * animationSpeed * 4) % 4
    );

    if (frame !== frameRef.current) {
      frameRef.current = frame;

      // Update UV offset to show the correct frame
      const frameWidth = 1 / 4; // 4 frames
      const offsetX = frame * frameWidth;

      meshRef.current.material.map.offset.x = offsetX;
      meshRef.current.material.map.needsUpdate = true;
    }

    // Gentle floating animation
    meshRef.current.position.y =
      position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;

    // Gentle rotation
    meshRef.current.rotation.z =
      Math.sin(state.clock.elapsedTime * 0.5) * 0.1 - Math.PI / 2;
  });

  if (!isLit) return null;

  return (
    <mesh ref={meshRef} position={position} scale={scale} rotation={[0, 0, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={smokeTexture}
        transparent
        opacity={opacity}
        alphaTest={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default AnimatedSmoke;
