import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

export interface ChainProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  length?: number;
  links?: number;
  swing?: boolean;
  swingSpeed?: number;
}

const Chain: React.FC<ChainProps> = ({
  position = [0, 0, 0],
  color = "#C0C0C0",
  scale = 1,
  length = 3,
  links = 8,
  swing = true,
  swingSpeed = 1,
}) => {
  const chainRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (swing && chainRef.current) {
      const swingAmount = Math.sin(state.clock.elapsedTime * swingSpeed) * 0.3;
      chainRef.current.rotation.z = swingAmount;
    }
  });

  const linkHeight = length / links;

  return (
    <RigidBody
      position={position}
      scale={scale}
      type="dynamic"
      colliders="hull"
    >
      <group ref={chainRef}>
        {Array.from({ length: links }, (_, i) => (
          <mesh
            key={i}
            position={[0, -i * linkHeight, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.1, 0.05, 8, 16]} />
            <meshLambertMaterial color={color} />
          </mesh>
        ))}

        {/* Chain hook at top */}
        <mesh position={[0, 0.1, 0]}>
          <coneGeometry args={[0.1, 0.3, 6]} />
          <meshLambertMaterial color={color} />
        </mesh>
      </group>
    </RigidBody>
  );
};

export default Chain;
