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
        color="#7d9179"
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
        color="#c8a34a"
        material="metal"
        pattern="polished"
        isCollidable={false}
        enabled={false}
      />

      {/* One sign, not four.
          This room used to carry a 0.8-high "START ROOM" banner and an
          instruction line, while SafeSpawnArea - mounted globally at the
          origin - drew "Safe Spawn Area" and "WASD to move, Mouse to look"
          across the same few metres of air. Four lines of text overlapping at
          head height, in the first thing a player sees. */}
      <Text
        position={[0, 3.3, 0]}
        fontSize={0.34}
        color="#f2e6c8"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
        maxWidth={9}
        textAlign="center"
      >
        WASD to move  ·  hold right mouse to look
      </Text>

      <Text
        position={[0, 2.8, 0]}
        fontSize={0.34}
        color="#7fe3ff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
        maxWidth={9}
        textAlign="center"
      >
        Walk to a door and press E
      </Text>
    </group>
  );
};

export default StartRoom;
