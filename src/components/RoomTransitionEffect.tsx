import React, { useState, useEffect } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface RoomTransitionEffectProps {
  isTransitioning: boolean;
  fromRoomId?: string;
  toRoomId?: string;
  progress: number;
  onComplete?: () => void;
}

const RoomTransitionEffect: React.FC<RoomTransitionEffectProps> = ({
  isTransitioning,
  fromRoomId,
  toRoomId,
  progress,
  onComplete,
}) => {
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [textOpacity, setTextOpacity] = useState(0);

  useEffect(() => {
    if (isTransitioning) {
      // Fade in effect
      const fadeInDuration = 300;
      const textDelay = 200;

      // Start fade in
      const fadeInInterval = setInterval(() => {
        setFadeOpacity((prev) => {
          const newOpacity = Math.min(1, prev + 0.05);
          if (newOpacity >= 1) {
            clearInterval(fadeInInterval);
            // Start text fade in after delay
            setTimeout(() => {
              const textInterval = setInterval(() => {
                setTextOpacity((prev) => {
                  const newTextOpacity = Math.min(1, prev + 0.1);
                  if (newTextOpacity >= 1) {
                    clearInterval(textInterval);
                  }
                  return newTextOpacity;
                });
              }, 50);
            }, textDelay);
          }
          return newOpacity;
        });
      }, 20);

      return () => {
        clearInterval(fadeInInterval);
      };
    } else {
      // Fade out effect
      const fadeOutInterval = setInterval(() => {
        setTextOpacity((prev) => {
          const newTextOpacity = Math.max(0, prev - 0.1);
          if (newTextOpacity <= 0) {
            clearInterval(fadeOutInterval);
            // Start fade out after text is gone
            setTimeout(() => {
              const fadeOutInterval2 = setInterval(() => {
                setFadeOpacity((prev) => {
                  const newOpacity = Math.max(0, prev - 0.05);
                  if (newOpacity <= 0) {
                    clearInterval(fadeOutInterval2);
                    onComplete?.();
                  }
                  return newOpacity;
                });
              }, 20);
            }, 100);
          }
          return newTextOpacity;
        });
      }, 50);
    }
  }, [isTransitioning, onComplete]);

  if (!isTransitioning && fadeOpacity === 0) {
    return null;
  }

  return (
    <group>
      {/* Fade overlay */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={fadeOpacity * 0.8}
        />
      </mesh>

      {/* Transition text */}
      {isTransitioning && (
        <group position={[0, 0, 1]}>
          <Text
            position={[0, 1, 0]}
            fontSize={0.8}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
            opacity={textOpacity}
          >
            {fromRoomId && toRoomId
              ? `Entering ${toRoomId.replace("room_", "Room ")}...`
              : "Loading Room..."}
          </Text>

          {/* Progress bar */}
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[4, 0.2]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
            <mesh position={[-2 + progress * 2, 0, 0.02]}>
              <planeGeometry args={[progress * 4, 0.15]} />
              <meshBasicMaterial color="#00FFFF" />
            </mesh>
          </group>

          {/* Loading spinner */}
          <mesh position={[0, -1, 0]} rotation={[0, 0, progress * Math.PI * 4]}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 8]} />
            <meshBasicMaterial color="#00FFFF" />
          </mesh>
        </group>
      )}
    </group>
  );
};

export default RoomTransitionEffect;
