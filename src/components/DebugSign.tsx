import React from "react";
import { Text } from "@react-three/drei";

interface DebugSignProps {
  position: [number, number, number];
  text: string;
  color?: string;
}

const DebugSign: React.FC<DebugSignProps> = ({
  position,
  text,
  color = "#00FF00",
}) => {
  return (
    <group position={position}>
      {/* Sign post */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.1, 2, 0.1]} />
        <meshLambertMaterial color="#8B4513" />
      </mesh>

      {/* Sign board */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1, 0.5, 0.05]} />
        <meshLambertMaterial color="#FFFFFF" />
      </mesh>

      {/* Text */}
      <Text
        position={[0, 1, 0.03]}
        fontSize={0.2}
        color={color}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.9}
      >
        {text}
      </Text>
    </group>
  );
};

export default DebugSign;
