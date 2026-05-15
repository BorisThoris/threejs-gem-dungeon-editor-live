import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

export interface WebProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  size?: number;
  sticky?: boolean;
  onStick?: () => void;
}

const Web: React.FC<WebProps> = ({
  position = [0, 0, 0],
  color = "#F5F5DC",
  scale = 1,
  size = 2,
  sticky = true,
  onStick,
}) => {
  const webRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (webRef.current) {
      // Gentle swaying motion
      const sway = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      webRef.current.rotation.z = sway;
    }
  });

  return (
    <RigidBody position={position} scale={scale} type="fixed" colliders="hull">
      <group ref={webRef}>
        {/* Web center */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Web spokes */}
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const x = (Math.cos(angle) * size) / 2;
          const z = (Math.sin(angle) * size) / 2;

          return (
            <mesh key={i} position={[x / 2, 0, z / 2]} rotation={[0, angle, 0]}>
              <cylinderGeometry args={[0.01, 0.01, size / 2, 4]} />
              <meshLambertMaterial color={color} />
            </mesh>
          );
        })}

        {/* Web rings */}
        {Array.from({ length: 3 }, (_, ring) => {
          const radius = ((ring + 1) * size) / 4;
          return (
            <mesh key={ring} position={[0, 0, 0]}>
              <torusGeometry args={[radius, 0.02, 4, 16]} />
              <meshLambertMaterial color={color} transparent opacity={0.7} />
            </mesh>
          );
        })}

        {/* Web strands */}
        {Array.from({ length: 16 }, (_, i) => {
          const angle1 = (i / 16) * Math.PI * 2;
          const angle2 = ((i + 1) / 16) * Math.PI * 2;
          const x1 = (Math.cos(angle1) * size) / 2;
          const z1 = (Math.sin(angle1) * size) / 2;
          const x2 = (Math.cos(angle2) * size) / 2;
          const z2 = (Math.sin(angle2) * size) / 2;

          return (
            <mesh
              key={i}
              position={[(x1 + x2) / 2, 0, (z1 + z2) / 2]}
              rotation={[0, Math.atan2(z2 - z1, x2 - x1), 0]}
            >
              <cylinderGeometry
                args={[
                  0.005,
                  0.005,
                  Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2),
                  4,
                ]}
              />
              <meshLambertMaterial color={color} transparent opacity={0.5} />
            </mesh>
          );
        })}
      </group>
    </RigidBody>
  );
};

export default Web;
