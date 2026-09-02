import React, { useState } from "react";
import { RigidBody } from "@react-three/rapier";
import Torch from "../elements/Torch";
import SpikeTrap from "../elements/SpikeTrap";
import Lever from "../objects/Lever";
import Door from "../../Door";

export interface TrapBiomeProps {
  size?: number;
  onRoomComplete?: () => void;
}

const TrapBiome: React.FC<TrapBiomeProps> = ({ size = 10, onRoomComplete }) => {
  const [trapsActive, setTrapsActive] = useState(true);
  const [doorOpen, setDoorOpen] = useState(false);

  const handleLeverToggle = (activated: boolean) => {
    setTrapsActive(!activated);
    if (activated) {
      setDoorOpen(true);
      if (onRoomComplete) onRoomComplete();
    }
  };

  return (
    <group>
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh>
          <boxGeometry args={[size, 1, size]} />
          <meshLambertMaterial color="#2C2C2C" />
        </mesh>
      </RigidBody>

      {/* Lighting */}
      <Torch position={[-size / 3, 0, -size / 3]} color="#ff6b35" />
      <Torch position={[size / 3, 0, -size / 3]} color="#ff6b35" />
      <Torch position={[-size / 3, 0, size / 3]} color="#ff6b35" />
      <Torch position={[size / 3, 0, size / 3]} color="#ff6b35" />

      {/* Spike traps */}
      <SpikeTrap
        position={[-2, 0, -2]}
        isActive={trapsActive}
        damage={15}
        onTrigger={() => console.log("Spike trap triggered!")}
      />
      <SpikeTrap
        position={[2, 0, -2]}
        isActive={trapsActive}
        damage={15}
        onTrigger={() => console.log("Spike trap triggered!")}
      />
      <SpikeTrap
        position={[-2, 0, 2]}
        isActive={trapsActive}
        damage={15}
        onTrigger={() => console.log("Spike trap triggered!")}
      />
      <SpikeTrap
        position={[2, 0, 2]}
        isActive={trapsActive}
        damage={15}
        onTrigger={() => console.log("Spike trap triggered!")}
      />
      <SpikeTrap
        position={[0, 0, 0]}
        isActive={trapsActive}
        damage={20}
        onTrigger={() => console.log("Central spike trap triggered!")}
      />

      {/* Control lever */}
      <Lever
        position={[0, 0, -size / 2 + 1]}
        isActivated={!trapsActive}
        onToggle={handleLeverToggle}
        label="Disable Traps"
      />

      {/* Exit door - Handled by UnifiedRoomManager to prevent duplication */}

      {/* Warning signs */}
      <mesh position={[-3, 1, -3]}>
        <boxGeometry args={[0.1, 0.8, 0.1]} />
        <meshLambertMaterial color="#FF0000" />
      </mesh>
      <mesh position={[3, 1, -3]}>
        <boxGeometry args={[0.1, 0.8, 0.1]} />
        <meshLambertMaterial color="#FF0000" />
      </mesh>
      <mesh position={[-3, 1, 3]}>
        <boxGeometry args={[0.1, 0.8, 0.1]} />
        <meshLambertMaterial color="#FF0000" />
      </mesh>
      <mesh position={[3, 1, 3]}>
        <boxGeometry args={[0.1, 0.8, 0.1]} />
        <meshLambertMaterial color="#FF0000" />
      </mesh>
    </group>
  );
};

export default TrapBiome;
