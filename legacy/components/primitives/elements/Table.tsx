import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TableProps {
  position?: [number, number, number];
  size?: [number, number, number]; // [width, height, depth]
  color?: string;
  legColor?: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
  meshRef?: React.RefObject<THREE.Group>;
}

const Table: React.FC<TableProps> = ({
  position = [0, 0, 0],
  size = [2, 0.1, 1.5],
  color = "#8B4513",
  legColor = "#654321",
  castShadow = true,
  receiveShadow = false,
  meshRef,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Use provided ref or create our own
  const ref = meshRef || groupRef;

  return (
    <group ref={ref} position={position}>
      {/* Table Top */}
      <mesh
        position={[0, size[1] / 2, 0]}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Table Legs */}
      {[
        [-size[0] * 0.4, -size[2] * 0.4],
        [size[0] * 0.4, -size[2] * 0.4],
        [-size[0] * 0.4, size[2] * 0.4],
        [size[0] * 0.4, size[2] * 0.4],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, size[1] / 2, z]} castShadow={castShadow}>
          <cylinderGeometry args={[0.05, 0.05, size[1] * 2]} />
          <meshStandardMaterial color={legColor} />
        </mesh>
      ))}
    </group>
  );
};

export default Table;

