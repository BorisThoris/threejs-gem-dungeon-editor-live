import React, { useRef } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface MinecraftSignProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  text: string;
  textColor?: string;
  signColor?: string;
  fontSize?: number;
  scale?: [number, number, number];
  onHover?: () => void;
  onUnhover?: () => void;
}

const MinecraftSign: React.FC<MinecraftSignProps> = ({
  position,
  rotation = [0, 0, 0],
  text,
  textColor = "#000000",
  signColor = "#8B4513", // Minecraft oak wood color
  fontSize = 0.3,
  scale = [1, 1, 1],
  onHover,
  onUnhover,
}) => {
  const signRef = useRef<THREE.Group>(null);

  return (
    <group
      ref={signRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerOver={onHover}
      onPointerOut={onUnhover}
    >
      {/* Sign Post - Vertical pole */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1]} />
        <meshLambertMaterial color="#654321" />
      </mesh>

      {/* Sign Board - Main sign surface */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[2, 1.2, 0.1]} />
        <meshLambertMaterial color={signColor} />
      </mesh>

      {/* Sign Border - Darker wood frame */}
      <mesh position={[0, 0.2, 0.06]}>
        <boxGeometry args={[2.1, 1.3, 0.05]} />
        <meshLambertMaterial color="#654321" />
      </mesh>

      {/* Text on Sign */}
      <Text
        position={[0, 0.2, 0.08]}
        fontSize={fontSize}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#FFFFFF"
        maxWidth={1.8}
        textAlign="center"
      >
        {text}
      </Text>

      {/* Optional: Small decorative elements */}
      <mesh position={[-0.8, 0.2, 0.05]}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
        <meshLambertMaterial color="#654321" />
      </mesh>
      <mesh position={[0.8, 0.2, 0.05]}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
        <meshLambertMaterial color="#654321" />
      </mesh>
    </group>
  );
};

export default MinecraftSign;
