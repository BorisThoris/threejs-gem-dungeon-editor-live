import React, { useRef } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface AdvancedMinecraftSignProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  lines: string[];
  textColor?: string;
  signColor?: string;
  fontSize?: number;
  scale?: [number, number, number];
  onHover?: () => void;
  onUnhover?: () => void;
  glowEffect?: boolean;
}

const AdvancedMinecraftSign: React.FC<AdvancedMinecraftSignProps> = ({
  position,
  rotation = [0, 0, 0],
  lines,
  textColor = "#000000",
  signColor = "#8B4513", // Minecraft oak wood color
  fontSize = 0.25,
  scale = [1, 1, 1],
  onHover,
  onUnhover,
  glowEffect = false,
}) => {
  const signRef = useRef<THREE.Group>(null);

  // Calculate sign height based on number of lines
  const signHeight = Math.max(1.2, lines.length * 0.3 + 0.6);
  const textStartY = signHeight * 0.3;

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
      <mesh position={[0, -signHeight * 0.4, 0]}>
        <cylinderGeometry args={[0.05, 0.05, signHeight * 0.8]} />
        <meshLambertMaterial color="#654321" />
      </mesh>

      {/* Sign Board - Main sign surface */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2, signHeight, 0.1]} />
        <meshLambertMaterial
          color={signColor}
          emissive={glowEffect ? "#444422" : "#000000"}
          emissiveIntensity={glowEffect ? 0.1 : 0}
        />
      </mesh>

      {/* Sign Border - Darker wood frame */}
      <mesh position={[0, 0.1, 0.06]}>
        <boxGeometry args={[2.1, signHeight + 0.1, 0.05]} />
        <meshLambertMaterial color="#654321" />
      </mesh>

      {/* Corner decorations */}
      <mesh position={[-0.8, 0.1, 0.05]}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
        <meshLambertMaterial color="#654321" />
      </mesh>
      <mesh position={[0.8, 0.1, 0.05]}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
        <meshLambertMaterial color="#654321" />
      </mesh>
      <mesh position={[-0.8, signHeight * 0.7, 0.05]}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
        <meshLambertMaterial color="#654321" />
      </mesh>
      <mesh position={[0.8, signHeight * 0.7, 0.05]}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
        <meshLambertMaterial color="#654321" />
      </mesh>

      {/* Text Lines */}
      {lines.map((line, index) => (
        <Text
          key={index}
          position={[0, textStartY - index * fontSize * 1.2, 0.08]}
          fontSize={fontSize}
          color={textColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.015}
          outlineColor="#FFFFFF"
          maxWidth={1.8}
          textAlign="center"
        >
          {line}
        </Text>
      ))}

      {/* Optional glow effect */}
      {glowEffect && (
        <mesh position={[0, 0.1, 0.02]}>
          <boxGeometry args={[2.2, signHeight + 0.2, 0.02]} />
          <meshBasicMaterial color="#FFFF00" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
};

export default AdvancedMinecraftSign;
