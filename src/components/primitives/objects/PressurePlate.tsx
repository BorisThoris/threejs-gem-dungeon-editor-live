import React, { useState } from "react";
import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";

export interface PressurePlateProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  isPressed?: boolean;
  onPress?: () => void;
  onRelease?: () => void;
  label?: string;
  weight?: number;
}

const PressurePlate: React.FC<PressurePlateProps> = ({
  position = [0, 0, 0],
  color = "#8B4513",
  scale = 1,
  isPressed = false,
  onPress,
  onRelease,
  label = "Pressure Plate",
  weight = 1,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleCollision = (other: any) => {
    if (other.rigidBodyObject?.userData?.weight >= weight) {
      if (!isPressed && onPress) {
        onPress();
      }
    } else {
      if (isPressed && onRelease) {
        onRelease();
      }
    }
  };

  return (
    <RigidBody
      position={position}
      scale={scale}
      type="fixed"
      colliders="hull"
      onCollisionEnter={handleCollision}
    >
      <group
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        {/* Plate base */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 0.1, 12]} />
          <meshLambertMaterial color="#654321" />
        </mesh>

        {/* Plate top */}
        <mesh position={[0, isPressed ? 0.02 : 0.08, 0]}>
          <cylinderGeometry args={[0.75, 0.75, 0.05, 12]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Pressure indicator */}
        <mesh position={[0, isPressed ? 0.025 : 0.085, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.02, 12]} />
          <meshLambertMaterial
            color={isPressed ? "#00FF00" : "#FF0000"}
            emissive={isPressed ? "#00FF00" : "#FF0000"}
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* Hover text */}
        {isHovered && (
          <Text
            position={[0, 0.3, 0]}
            fontSize={0.15}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {label} - {isPressed ? "PRESSED" : "NOT PRESSED"}
          </Text>
        )}
      </group>
    </RigidBody>
  );
};

export default PressurePlate;
