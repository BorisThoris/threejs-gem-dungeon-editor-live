import React from "react";
import { Text } from "@react-three/drei";

// Example of a custom room component
// This shows how easy it is to create new room types
interface CustomRoomExampleProps {
  customData?: any;
  onCustomAction?: () => void;
}

const CustomRoomExample: React.FC<CustomRoomExampleProps> = ({
  customData,
  onCustomAction,
}) => {
  return (
    <group>
      {/* Custom room content */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[2, 1, 2]} />
        <meshLambertMaterial color="#FF6B6B" />
      </mesh>

      <Text
        position={[0, 2, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        CUSTOM ROOM
      </Text>

      {/* Custom interactive elements */}
      <mesh
        position={[0, 0.5, 0]}
        onClick={onCustomAction}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <boxGeometry args={[1, 0.5, 1]} />
        <meshLambertMaterial color="#4ECDC4" />
      </mesh>
    </group>
  );
};

export default CustomRoomExample;

