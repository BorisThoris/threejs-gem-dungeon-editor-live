import React, { useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export interface StatueProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  type?: "warrior" | "mage" | "guardian" | "deity";
  isAnimated?: boolean;
  onInteract?: () => void;
}

const Statue: React.FC<StatueProps> = ({
  position = [0, 0, 0],
  color = "#C0C0C0",
  scale = 1,
  type = "warrior",
  isAnimated = false,
  onInteract,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const statueRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (isAnimated && statueRef.current) {
      // Gentle breathing animation
      const breathe = Math.sin(state.clock.elapsedTime * 2) * 0.02 + 1;
      statueRef.current.scale.setScalar(breathe);
    }
  });

  const getStatueDetails = () => {
    switch (type) {
      case "warrior":
        return {
          emoji: "⚔️",
          name: "Warrior Statue",
          description: "A mighty warrior statue",
        };
      case "mage":
        return {
          emoji: "🧙",
          name: "Mage Statue",
          description: "A wise mage statue",
        };
      case "guardian":
        return {
          emoji: "🛡️",
          name: "Guardian Statue",
          description: "A protective guardian statue",
        };
      case "deity":
        return {
          emoji: "👑",
          name: "Deity Statue",
          description: "A divine deity statue",
        };
      default:
        return {
          emoji: "🗿",
          name: "Statue",
          description: "A mysterious statue",
        };
    }
  };

  const details = getStatueDetails();

  return (
    <RigidBody position={position} scale={scale} type="fixed" colliders="hull">
      <group
        ref={statueRef}
        onClick={onInteract}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        {/* Statue base */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.6, 0.8, 0.4, 12]} />
          <meshLambertMaterial color="#654321" />
        </mesh>

        {/* Statue body */}
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.3, 0.4, 1.6, 12]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Statue head */}
        <mesh position={[0, 2.2, 0]}>
          <sphereGeometry args={[0.25, 8, 6]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Arms */}
        <mesh position={[-0.4, 1.8, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <mesh position={[0.4, 1.8, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Legs */}
        <mesh position={[-0.15, 0.4, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <mesh position={[0.15, 0.4, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Type-specific details */}
        {type === "warrior" && (
          <>
            {/* Sword */}
            <mesh position={[-0.6, 1.8, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.05, 0.8, 0.05]} />
              <meshLambertMaterial color="#C0C0C0" />
            </mesh>
            {/* Shield */}
            <mesh position={[0.6, 1.8, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.05, 8]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
          </>
        )}

        {type === "mage" && (
          <>
            {/* Staff */}
            <mesh position={[-0.7, 1.5, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
            {/* Orb */}
            <mesh position={[-0.7, 2.1, 0]}>
              <sphereGeometry args={[0.08, 8, 6]} />
              <meshLambertMaterial
                color="#8A2BE2"
                emissive="#8A2BE2"
                emissiveIntensity={0.3}
              />
            </mesh>
          </>
        )}

        {type === "guardian" && (
          <>
            {/* Shield */}
            <mesh position={[0, 1.8, 0.3]}>
              <boxGeometry args={[0.3, 0.4, 0.05]} />
              <meshLambertMaterial color="#C0C0C0" />
            </mesh>
            {/* Helmet */}
            <mesh position={[0, 2.3, 0]}>
              <sphereGeometry args={[0.28, 8, 6]} />
              <meshLambertMaterial color="#C0C0C0" />
            </mesh>
          </>
        )}

        {type === "deity" && (
          <>
            {/* Crown */}
            <mesh position={[0, 2.4, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 0.1, 8]} />
              <meshLambertMaterial color="#FFD700" />
            </mesh>
            {/* Glow effect */}
            <mesh position={[0, 2.2, 0]}>
              <sphereGeometry args={[0.3, 8, 6]} />
              <meshLambertMaterial
                color="#FFD700"
                emissive="#FFD700"
                emissiveIntensity={0.2}
                transparent
                opacity={0.3}
              />
            </mesh>
          </>
        )}

        {/* Hover text */}
        {isHovered && (
          <Text
            position={[0, 3, 0]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {details.name}
          </Text>
        )}
      </group>
    </RigidBody>
  );
};

export default Statue;
