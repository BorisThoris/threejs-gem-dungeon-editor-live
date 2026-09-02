import React, { useRef, useState } from "react";
import { RigidBody } from "@react-three/rapier";
import { Text } from "../../GameText";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { MovableTreasure } from "../elements";

export interface EnhancedPressurePlateProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  onPress?: () => void;
  onRelease?: () => void;
  onItemGrabbed?: () => void;
  label?: string;
  hasAward?: boolean;
  awardType?: "bag" | "coin" | "gem" | "scroll";
  canGrabAward?: boolean;
  showAward?: boolean;
}

/** How far the plate sinks when something is resting on it. */
const PLATE_TRAVEL = 0.06;
/** Seconds for the plate to travel its full depth. */
const PLATE_TRAVEL_TIME = 0.25;

/**
 * A plate that knows whether anything is actually standing on it.
 *
 * It previously listened only to `onCollisionEnter`, and decided between
 * "something arrived" and "everything left" by testing
 * `other.rigidBodyObject` - a field that is always set on a collision *enter*
 * with a real body. So the release branch could never run: `onRelease` was
 * unreachable, and the plate crept up by 2% per collision event and stayed
 * there. Reaching 100% - the condition the puzzle's trap was hung on - needed
 * fifty separate collisions and no way back down.
 *
 * Enter and exit are now both handled, and the occupant count is what decides.
 * The travel itself is animated on the mesh through a ref: the old version
 * called setState from inside a physics callback, re-rendering the whole plate
 * and its treasure for every contact event.
 */
const EnhancedPressurePlate: React.FC<EnhancedPressurePlateProps> = ({
  position = [0, 0, 0],
  color = "#8B4513",
  scale = 1,
  onPress,
  onRelease,
  onItemGrabbed,
  label = "Pressure Plate",
  hasAward = false,
  awardType = "bag",
  canGrabAward = true,
  showAward = true,
}) => {
  const [isGrabbing, setIsGrabbing] = useState(false);
  // Pressed is the one piece of genuine UI state: it changes when the player
  // acts, not sixty times a second.
  const [isPressed, setIsPressed] = useState(false);

  const plateRef = useRef<THREE.Group>(null);
  // How many bodies are resting on the plate. Counted rather than flagged,
  // because two candles on one plate must both come off before it releases.
  const occupants = useRef(0);
  // Current travel, 0 = at rest, 1 = fully depressed.
  const depression = useRef(0);

  const handleEnter = () => {
    occupants.current += 1;
    if (occupants.current === 1) {
      setIsPressed(true);
      onPress?.();
    }
  };

  const handleExit = () => {
    // Exit events can outnumber enters if a body is removed mid-contact, so
    // the count is floored rather than trusted.
    occupants.current = Math.max(0, occupants.current - 1);
    if (occupants.current === 0) {
      setIsPressed(false);
      onRelease?.();
    }
  };

  const handleTreasureGrabbed = () => {
    if (!canGrabAward || !hasAward) return;
    setIsGrabbing(true);
    onItemGrabbed?.();
    setTimeout(() => setIsGrabbing(false), 1000);
  };

  useFrame((_state, delta) => {
    const target = occupants.current > 0 ? 1 : 0;
    const step = delta / PLATE_TRAVEL_TIME;
    depression.current =
      target > depression.current
        ? Math.min(target, depression.current + step)
        : Math.max(target, depression.current - step);

    if (plateRef.current) {
      plateRef.current.position.y = -depression.current * PLATE_TRAVEL;
    }
  });

  return (
    <group position={position} scale={scale}>
      {/* Fixed Base - Bottom segment */}
      <RigidBody
        type="fixed"
        colliders="hull"
        onCollisionEnter={handleEnter}
        onCollisionExit={handleExit}
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

        {/* Pressure indicator - green once the plate is actually holding
            something, which is the state the puzzle asks the player for. */}
        <mesh position={[0, 0.085, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.02, 12]} />
          <meshLambertMaterial
            color={isPressed ? "#00FF00" : "#FF0000"}
            emissive={isPressed ? "#00FF00" : "#FF0000"}
            emissiveIntensity={0.35}
          />
        </mesh>
      </group>

      {/* Physical Treasure */}
      {hasAward && showAward && (
        <MovableTreasure
          position={[0, 0.2, 0]}
          awardType={awardType}
          weight={1.5}
          canGrab={canGrabAward}
          showTreasure={showAward}
          onGrabbed={handleTreasureGrabbed}
        />
      )}

      <Text
        position={[0, 0.8, 0]}
        fontSize={0.15}
        color={isPressed ? "#8BC34A" : "#FFFFFF"}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {isPressed ? `${label} - held down` : `${label} - empty`}
      </Text>

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
          Treasure taken!
        </Text>
      )}
    </group>
  );
};

export default EnhancedPressurePlate;
