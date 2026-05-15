import React, { useState, useEffect } from "react";
import * as THREE from "three";

interface RoomTransitionProps {
  isTransitioning: boolean;
  onTransitionComplete: () => void;
  duration?: number;
}

const RoomTransition: React.FC<RoomTransitionProps> = ({
  isTransitioning,
  onTransitionComplete,
  duration = 1000,
}) => {
  const [fadeOpacity, setFadeOpacity] = useState(0);

  useEffect(() => {
    if (isTransitioning) {
      // RoomTransition: Starting transition

      // Immediate fade in
      setFadeOpacity(1);

      // Complete transition after duration
      const timer = setTimeout(() => {
        // RoomTransition: Transition completed
        setFadeOpacity(0);
        // Small delay before calling completion to ensure fade out is visible
        setTimeout(() => {
          onTransitionComplete();
        }, 100);
      }, duration);

      return () => {
        clearTimeout(timer);
      };
    } else {
      // Reset opacity when not transitioning
      setFadeOpacity(0);
    }
  }, [isTransitioning, duration, onTransitionComplete]);

  if (!isTransitioning && fadeOpacity === 0) {
    return null;
  }

  return (
    <group>
      {/* Full-screen black overlay for transition */}
      <mesh position={[0, 0, -0.5]} renderOrder={1000}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={fadeOpacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

export default RoomTransition;
