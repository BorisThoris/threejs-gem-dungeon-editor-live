import React from "react";
import { Text } from "../../GameText";
import { RigidBody } from "@react-three/rapier";
import { BreakableTile, BreakableWall } from "../elements";
import { GROUND_Y } from "../../../configs/worldGeometry";

interface StartRoomProps {
  onJourneyBegin?: () => void;
}

const StartRoom: React.FC<StartRoomProps> = ({ onJourneyBegin }) => {
  return (
    <group>
      {/* Start Platform - an inlay in the floor, not a step on top of it.
          This was a 6x6 collidable tile standing 0.2 above the ground, so the
          very first room put a ledge across the player's path that a capsule
          cannot walk up: you would slide along the edge of it, in the room
          that is meant to teach you the controls. It is now flush and
          decorative. */}
      <BreakableTile
        position={[0, GROUND_Y + 0.01, 0]}
        size={6}
        height={0.02}
        color="#66BB6A"
        material="marble"
        pattern="polished"
        isCollidable={false}
        enabled={false}
      />

      {/* Start Symbol */}
      <BreakableTile
        position={[0, GROUND_Y + 1.5, 0]}
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
        WASD to move  ·  E at a door to open it
      </Text>
    </group>
  );
};

export default StartRoom;
