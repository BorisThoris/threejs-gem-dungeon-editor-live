import React, { useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

export interface SpikeTrapProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  isActive?: boolean;
  damage?: number;
  onTrigger?: () => void;
  onDamage?: (damage: number) => void;
}

const SpikeTrap: React.FC<SpikeTrapProps> = ({
  position = [0, 0, 0],
  color = "#C0C0C0",
  scale = 1,
  isActive = false,
  damage = 10,
  onTrigger,
  onDamage,
}) => {
  const [triggered, setTriggered] = useState(false);
  const spikeRef = useRef<THREE.Group>(null);
  const trapRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (spikeRef.current && isActive) {
      // Animate spikes up and down
      const spikeHeight = Math.sin(state.clock.elapsedTime * 3) * 0.3 + 0.1;
      spikeRef.current.position.y = spikeHeight;
    }
  });

  const handleCollision = (other: any) => {
    if (isActive && !triggered && other.rigidBodyObject?.userData?.isPlayer) {
      setTriggered(true);
      if (onTrigger) onTrigger();
      if (onDamage) onDamage(damage);

      // Reset after 2 seconds
      setTimeout(() => setTriggered(false), 2000);
    }
  };

  return (
    <RigidBody
      ref={trapRef}
      position={position}
      scale={scale}
      type="fixed"
      colliders="hull"
      onCollisionEnter={handleCollision}
    >
      <group>
        {/* Trap base */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[1, 0.1, 1]} />
          <meshLambertMaterial color="#2C2C2C" />
        </mesh>

        {/* Spikes */}
        <group ref={spikeRef}>
          {/* Center spike */}
          <mesh position={[0, 0.1, 0]}>
            <coneGeometry args={[0.1, 0.4, 6]} />
            <meshLambertMaterial color={triggered ? "#FF0000" : color} />
          </mesh>

          {/* Corner spikes */}
          <mesh position={[-0.3, 0.1, -0.3]}>
            <coneGeometry args={[0.08, 0.3, 6]} />
            <meshLambertMaterial color={triggered ? "#FF0000" : color} />
          </mesh>
          <mesh position={[0.3, 0.1, -0.3]}>
            <coneGeometry args={[0.08, 0.3, 6]} />
            <meshLambertMaterial color={triggered ? "#FF0000" : color} />
          </mesh>
          <mesh position={[-0.3, 0.1, 0.3]}>
            <coneGeometry args={[0.08, 0.3, 6]} />
            <meshLambertMaterial color={triggered ? "#FF0000" : color} />
          </mesh>
          <mesh position={[0.3, 0.1, 0.3]}>
            <coneGeometry args={[0.08, 0.3, 6]} />
            <meshLambertMaterial color={triggered ? "#FF0000" : color} />
          </mesh>

          {/* Side spikes */}
          <mesh position={[0, 0.1, -0.3]}>
            <coneGeometry args={[0.08, 0.3, 6]} />
            <meshLambertMaterial color={triggered ? "#FF0000" : color} />
          </mesh>
          <mesh position={[0, 0.1, 0.3]}>
            <coneGeometry args={[0.08, 0.3, 6]} />
            <meshLambertMaterial color={triggered ? "#FF0000" : color} />
          </mesh>
          <mesh position={[-0.3, 0.1, 0]}>
            <coneGeometry args={[0.08, 0.3, 6]} />
            <meshLambertMaterial color={triggered ? "#FF0000" : color} />
          </mesh>
          <mesh position={[0.3, 0.1, 0]}>
            <coneGeometry args={[0.08, 0.3, 6]} />
            <meshLambertMaterial color={triggered ? "#FF0000" : color} />
          </mesh>
        </group>

        {/* Warning glow when active */}
        {isActive && (
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[1.1, 0.05, 1.1]} />
            <meshLambertMaterial
              color="#FF0000"
              emissive="#FF0000"
              emissiveIntensity={0.3}
              transparent
              opacity={0.5}
            />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
};

export default SpikeTrap;
