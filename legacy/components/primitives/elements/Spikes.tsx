import React from "react";
import { RigidBody } from "@react-three/rapier";

export interface SpikesProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  count?: number;
  height?: number;
  damage?: number;
  onTrigger?: () => void;
}

const Spikes: React.FC<SpikesProps> = ({
  position = [0, 0, 0],
  color = "#C0C0C0",
  scale = 1,
  count = 9,
  height = 0.5,
  damage = 15,
  onTrigger,
}) => {
  const rows = Math.ceil(Math.sqrt(count));
  const spacing = 0.5;

  return (
    <RigidBody position={position} scale={scale} type="fixed" colliders="hull">
      <group>
        {/* Base platform */}
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[rows * spacing, 0.1, rows * spacing]} />
          <meshLambertMaterial color="#2C2C2C" />
        </mesh>

        {/* Spikes */}
        {Array.from({ length: count }, (_, i) => {
          const row = Math.floor(i / rows);
          const col = i % rows;
          const x = (col - (rows - 1) / 2) * spacing;
          const z = (row - (rows - 1) / 2) * spacing;

          return (
            <mesh key={i} position={[x, height / 2, z]}>
              <coneGeometry args={[0.08, height, 6]} />
              <meshLambertMaterial color={color} />
            </mesh>
          );
        })}
      </group>
    </RigidBody>
  );
};

export default Spikes;
