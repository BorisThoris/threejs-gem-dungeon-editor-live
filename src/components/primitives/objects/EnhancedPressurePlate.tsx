import React, { useState, useRef, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { MovableTreasure } from "../elements";

export interface EnhancedPressurePlateProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  isPressed?: boolean;
  onPress?: () => void;
  onRelease?: () => void;
  onItemGrabbed?: () => void;
  onPlateFullyRaised?: () => void; // New callback for when plate reaches 100%
  label?: string;
  weight?: number;
  hasAward?: boolean;
  awardType?: "bag" | "coin" | "gem" | "scroll";
  canGrabAward?: boolean;
  showAward?: boolean;
}

const EnhancedPressurePlate: React.FC<EnhancedPressurePlateProps> = ({
  position = [0, 0, 0],
  color = "#8B4513",
  scale = 1,
  isPressed = false,
  onPress,
  onRelease,
  onItemGrabbed,
  onPlateFullyRaised,
  label = "Pressure Plate",
  weight = 1,
  hasAward = false,
  awardType = "bag",
  canGrabAward = true,
  showAward = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [plateHeight, setPlateHeight] = useState(0); // 0 = fully down, 1 = fully up
  const [hasTriggeredFullyRaised, setHasTriggeredFullyRaised] = useState(false);
  const plateRef = useRef<THREE.Group>(null);

  const handleCollision = (other: any) => {
    // Any object triggers the pressure plate, regardless of weight
    if (other.rigidBodyObject) {
      if (!isPressed && onPress) {
        onPress();
      }
      // Gradually raise the plate when something is on it
      setPlateHeight((prev) => {
        const newHeight = Math.min(prev + 0.02, 1); // Gradually raise to max 1
        if (newHeight >= 1 && !hasTriggeredFullyRaised) {
          setHasTriggeredFullyRaised(true);
          onPlateFullyRaised?.();
        }
        return newHeight;
      });
    } else {
      if (isPressed && onRelease) {
        onRelease();
      }
      // Gradually lower the plate when nothing is on it
      setPlateHeight((prev) => {
        const newHeight = Math.max(prev - 0.02, 0); // Gradually lower to min 0
        if (newHeight <= 0) {
          setHasTriggeredFullyRaised(false); // Reset trigger when plate is down
        }
        return newHeight;
      });
    }
  };

  const handleTreasureGrabbed = () => {
    if (!canGrabAward || !hasAward) return;

    setIsGrabbing(true);
    onItemGrabbed?.();

    // Reset grabbing state after animation
    setTimeout(() => {
      setIsGrabbing(false);
    }, 1000);
  };

  // Animate plate movement
  useFrame((state) => {
    // Update plate position based on height
    if (plateRef.current) {
      const maxPlateHeight = 0.15; // Maximum height the plate can raise
      const currentPlateY = plateHeight * maxPlateHeight;
      plateRef.current.position.y = currentPlateY;
    }
  });

  return (
    <group position={position} scale={scale}>
      {/* Fixed Base - Bottom segment */}
      <RigidBody
        type="fixed"
        colliders="hull"
        onCollisionEnter={handleCollision}
      >
        <group>
          {/* Plate base */}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.8, 0.8, 0.1, 12]} />
            <meshLambertMaterial color="#654321" />
          </mesh>
        </group>
      </RigidBody>

      {/* Moving Plate - Top segment */}
      <group ref={plateRef}>
        {/* Plate top */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.75, 0.75, 0.05, 12]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Pressure indicator */}
        <mesh position={[0, 0.085, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.02, 12]} />
          <meshLambertMaterial
            color={plateHeight > 0.5 ? "#00FF00" : "#FF0000"}
            emissive={plateHeight > 0.5 ? "#00FF00" : "#FF0000"}
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* Plate height indicator */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.01, 12]} />
          <meshLambertMaterial
            color={plateHeight >= 1 ? "#FF0000" : "#FFFF00"}
            emissive={plateHeight >= 1 ? "#FF0000" : "#FFFF00"}
            emissiveIntensity={plateHeight >= 1 ? 0.8 : 0.3}
          />
        </mesh>
      </group>

      {/* Physical Treasure */}
      {hasAward && showAward && (
        <MovableTreasure
          position={[0, 0.2 + plateHeight * 0.15, 0]}
          awardType={awardType}
          weight={1.5}
          canGrab={canGrabAward}
          showTreasure={showAward}
          onGrabbed={handleTreasureGrabbed}
        />
      )}

      {/* Hover text */}
      {isHovered && (
        <Text
          position={[0, 0.8, 0]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {`${label} - Plate: ${Math.round(plateHeight * 100)}%`}
        </Text>
      )}

      {/* Plate fully raised warning */}
      {plateHeight >= 1 && (
        <Text
          position={[0, 1.2, 0]}
          fontSize={0.2}
          color="#FF0000"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          ⚠️ PLATE FULLY RAISED - DANGER! ⚠️
        </Text>
      )}

      {/* Grabbing animation */}
      {isGrabbing && (
        <Text
          position={[0, 1.5, 0]}
          fontSize={0.2}
          color="#FF6B6B"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          ⚠️ TREASURE GRABBED! ⚠️
        </Text>
      )}
    </group>
  );
};

export default EnhancedPressurePlate;
