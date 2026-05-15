import React from "react";

interface ColosseumRoomProps {
  size?: number;
}

const ColosseumRoom: React.FC<ColosseumRoomProps> = ({ size = 10 }) => {
  const ringRadius = size * 0.42;
  const pillarCount = 24;

  return (
    <group>
      {/* Hidden square floor collider to match size grid */}
      <mesh position={[0, -0.5, 0]} visible={false}>
        <boxGeometry args={[size, 1, size]} />
        <meshBasicMaterial />
      </mesh>

      {/* Central sand arena */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry
          args={[ringRadius * 0.95, ringRadius * 0.95, 0.2, 48]}
        />
        <meshStandardMaterial color="#d8b48a" />
      </mesh>

      {/* Ring wall */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <torusGeometry args={[ringRadius, 0.35, 16, 96]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Seating pillars */}
      {Array.from({ length: pillarCount }).map((_, i) => {
        const angle = (i / pillarCount) * Math.PI * 2;
        const x = Math.cos(angle) * (ringRadius + 1.3);
        const z = Math.sin(angle) * (ringRadius + 1.3);
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, -angle, 0]}>
            <mesh position={[0, 1, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.2, 2, 12]} />
              <meshStandardMaterial color="#a57c4f" />
            </mesh>
            <mesh position={[0, 2.1, 0]} castShadow>
              <boxGeometry args={[0.8, 0.2, 0.4]} />
              <meshStandardMaterial color="#7a5230" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

export default ColosseumRoom;
