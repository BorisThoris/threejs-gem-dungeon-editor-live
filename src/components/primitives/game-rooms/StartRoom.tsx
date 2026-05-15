import React from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { BreakableTile, BreakableWall } from "../elements";

interface StartRoomProps {
  onJourneyBegin?: () => void;
}

const StartRoom: React.FC<StartRoomProps> = ({ onJourneyBegin }) => {
  return (
    <group>
      {/* Start Platform */}
      <BreakableTile
        position={[0, 0.1, 0]}
        size={6}
        height={0.2}
        color="#66BB6A"
        material="marble"
        pattern="polished"
        isCollidable={true}
        enabled={false}
      />

      {/* Start Symbol */}
      <BreakableTile
        position={[0, 1.5, 0]}
        size={1}
        height={0.2}
        color="#FFD700"
        material="metal"
        pattern="polished"
        isCollidable={false}
        enabled={false}
      />

      {/* Welcome Text */}
      <Text
        position={[0, 3, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🚀 START ROOM 🚀
      </Text>

      {/* Instructions */}
      <Text
        position={[0, 2.2, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        Begin your adventure here!
      </Text>
    </group>
  );
};

export default StartRoom;
