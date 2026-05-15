import React, { useEffect, useMemo } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import DraggableObject from "../../DraggableObject";

export interface MovableTreasureProps {
  position?: [number, number, number];
  awardType?: "bag" | "coin" | "gem" | "scroll";
  onMove?: (newPosition: [number, number, number]) => void;
  onGrabbed?: () => void;
  weight?: number;
  canGrab?: boolean;
  showTreasure?: boolean;
}

const MovableTreasure: React.FC<MovableTreasureProps> = ({
  position = [0, 0, 0],
  awardType = "bag",
  onMove,
  onGrabbed,
  weight = 1.5,
  canGrab = true,
  showTreasure = true,
}) => {
  // Debug when component mounts
  useEffect(() => {
    console.log("💎 MovableTreasure: Component mounted");
    console.log("💎 MovableTreasure: Position:", position);
    console.log("💎 MovableTreasure: Award Type:", awardType);
    console.log("💎 MovableTreasure: Weight:", weight);
    console.log("💎 MovableTreasure: Can Grab:", canGrab);
  }, [position, awardType, weight, canGrab]);

  // Generate award bag texture
  const awardTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    // Background - dark leather bag color
    ctx.fillStyle = "#2D1810";
    ctx.fillRect(0, 0, 64, 64);

    // Add leather texture pattern
    ctx.fillStyle = "#3D2415";
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 64;
      const size = Math.random() * 4 + 1;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add stitching lines
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(5, 10);
    ctx.lineTo(59, 10);
    ctx.moveTo(5, 54);
    ctx.lineTo(59, 54);
    ctx.moveTo(10, 5);
    ctx.lineTo(10, 59);
    ctx.moveTo(54, 5);
    ctx.lineTo(54, 59);
    ctx.stroke();

    // Add magical glow effect
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 215, 0, 0.3)");
    gradient.addColorStop(0.7, "rgba(255, 215, 0, 0.1)");
    gradient.addColorStop(1, "rgba(255, 215, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    // Add magical sparkles
    ctx.fillStyle = "#FFD700";
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 64;
      const size = Math.random() * 1.5 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add bag opening
    ctx.fillStyle = "#1A0F08";
    ctx.beginPath();
    ctx.ellipse(32, 15, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);

  const handleClick = (event: any) => {
    console.log("💎 MovableTreasure: Click handler called");
    event.stopPropagation();
    if (canGrab) {
      console.log("💎 MovableTreasure: Treasure grabbed!");
      onGrabbed?.();
    }
  };

  const renderTreasure = () => {
    if (!showTreasure) return null;

    switch (awardType) {
      case "bag":
        return (
          <group>
            <mesh>
              <boxGeometry args={[0.6, 0.45, 0.3]} />
              <meshStandardMaterial map={awardTexture} />
            </mesh>
            {/* Magical glow around bag */}
            <mesh>
              <boxGeometry args={[0.75, 0.6, 0.45]} />
              <meshStandardMaterial
                color="#FFD700"
                transparent
                opacity={0.2}
                emissive="#FFD700"
                emissiveIntensity={0.3}
              />
            </mesh>
          </group>
        );
      case "coin":
        return (
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.08, 12]} />
            <meshStandardMaterial
              color="#FFD700"
              emissive="#FFD700"
              emissiveIntensity={0.5}
            />
          </mesh>
        );
      case "gem":
        return (
          <mesh>
            <octahedronGeometry args={[0.3]} />
            <meshStandardMaterial
              color="#FF6B6B"
              emissive="#FF6B6B"
              emissiveIntensity={0.4}
            />
          </mesh>
        );
      case "scroll":
        return (
          <mesh>
            <boxGeometry args={[0.45, 0.6, 0.08]} />
            <meshStandardMaterial color="#F5F5DC" />
          </mesh>
        );
      default:
        return null;
    }
  };

  return (
    <DraggableObject
      position={position}
      type="dynamic"
      colliders={true}
      colliderArgs={[0.3, 0.3, 0.3]}
      userData={{ weight, isTreasure: true }}
      onMove={onMove}
      onGrab={onGrabbed}
    >
      <group
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (canGrab) {
            document.body.style.cursor = "grab";
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        {renderTreasure()}
      </group>
    </DraggableObject>
  );
};

export default MovableTreasure;
