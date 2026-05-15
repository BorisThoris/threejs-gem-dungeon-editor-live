import React from "react";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

interface ThreeDLoadingIndicatorProps {
  visible: boolean;
  progress?: number;
}

const ThreeDLoadingIndicator: React.FC<ThreeDLoadingIndicatorProps> = ({
  visible,
  progress = 0,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!visible || !groupRef.current || !ringRef.current) return;

    // Rotate the loading ring
    ringRef.current.rotation.z += 0.02;

    // Scale based on progress
    const scale = 0.5 + progress * 0.5;
    groupRef.current.scale.setScalar(scale);
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[0, 2, 0]}>
      {/* Loading ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1, 0.1, 8, 16]} />
        <meshBasicMaterial color="#ff6b6b" />
      </mesh>

      {/* Progress text (simplified as geometry) */}
      <mesh position={[0, -1.5, 0]}>
        <planeGeometry args={[2, 0.5]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>

      {/* Progress bar background */}
      <mesh position={[0, -2.2, 0]}>
        <planeGeometry args={[2, 0.2]} />
        <meshBasicMaterial color="#333333" />
      </mesh>

      {/* Progress bar fill */}
      <mesh position={[0, -2.2, 0.01]}>
        <planeGeometry args={[progress * 2, 0.15]} />
        <meshBasicMaterial color="#ff6b6b" />
      </mesh>
    </group>
  );
};

export default ThreeDLoadingIndicator;
