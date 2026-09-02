import React, { useState } from "react";
import { RigidBody } from "@react-three/rapier";
import Torch from "../elements/Torch";
import Brazier from "../elements/Brazier";
import Pillar from "../elements/Pillar";
import Chain from "../elements/Chain";
import Statue from "../objects/Statue";
import Switch from "../objects/Switch";
import Door from "../../Door";

export interface BossBiomeProps {
  size?: number;
  onRoomComplete?: () => void;
}

const BossBiome: React.FC<BossBiomeProps> = ({ size = 15, onRoomComplete }) => {
  const [bossDefeated, setBossDefeated] = useState(false);
  const [doorsUnlocked, setDoorsUnlocked] = useState(false);

  const handleBossDefeat = () => {
    setBossDefeated(true);
    setDoorsUnlocked(true);
    if (onRoomComplete) onRoomComplete();
  };

  const handleSwitchToggle = (isOn: boolean) => {
    if (isOn && bossDefeated) {
      setDoorsUnlocked(true);
    }
  };

  return (
    <group>
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh>
          <boxGeometry args={[size, 1, size]} />
          <meshLambertMaterial color="#1A1A1A" />
        </mesh>
      </RigidBody>

      {/* Lighting */}
      <Brazier
        position={[-size / 3, 0, -size / 3]}
        isLit={true}
        flameColor="#8A2BE2"
      />
      <Brazier
        position={[size / 3, 0, -size / 3]}
        isLit={true}
        flameColor="#8A2BE2"
      />
      <Brazier
        position={[-size / 3, 0, size / 3]}
        isLit={true}
        flameColor="#8A2BE2"
      />
      <Brazier
        position={[size / 3, 0, size / 3]}
        isLit={true}
        flameColor="#8A2BE2"
      />

      {/* Corner torches */}
      <Torch position={[-size / 2 + 1, 0, -size / 2 + 1]} color="#8A2BE2" />
      <Torch position={[size / 2 - 1, 0, -size / 2 + 1]} color="#8A2BE2" />
      <Torch position={[-size / 2 + 1, 0, size / 2 - 1]} color="#8A2BE2" />
      <Torch position={[size / 2 - 1, 0, size / 2 - 1]} color="#8A2BE2" />

      {/* Decorative pillars */}
      <Pillar position={[-size / 3, 0, 0]} height={4} color="#8B4513" />
      <Pillar position={[size / 3, 0, 0]} height={4} color="#8B4513" />
      <Pillar position={[0, 0, -size / 3]} height={4} color="#8B4513" />
      <Pillar position={[0, 0, size / 3]} height={4} color="#8B4513" />

      {/* Hanging chains */}
      <Chain position={[-size / 4, 3, -size / 4]} length={2} swing={true} />
      <Chain position={[size / 4, 3, -size / 4]} length={2} swing={true} />
      <Chain position={[-size / 4, 3, size / 4]} length={2} swing={true} />
      <Chain position={[size / 4, 3, size / 4]} length={2} swing={true} />

      {/* Guardian statues */}
      <Statue
        position={[-size / 2 + 2, 0, -size / 2 + 2]}
        type="guardian"
        isAnimated={true}
      />
      <Statue
        position={[size / 2 - 2, 0, -size / 2 + 2]}
        type="guardian"
        isAnimated={true}
      />
      <Statue
        position={[-size / 2 + 2, 0, size / 2 - 2]}
        type="guardian"
        isAnimated={true}
      />
      <Statue
        position={[size / 2 - 2, 0, size / 2 - 2]}
        type="guardian"
        isAnimated={true}
      />

      {/* Boss area */}
      <Statue
        position={[0, 0, 0]}
        type="deity"
        isAnimated={true}
        onInteract={bossDefeated ? undefined : handleBossDefeat}
      />

      {/* Control switches */}
      <Switch
        position={[0, 0, -size / 2 + 1]}
        isOn={doorsUnlocked}
        onToggle={handleSwitchToggle}
        label="Unlock Doors"
        switchType="toggle"
      />

      {/* Exit doors - Handled by UnifiedRoomManager to prevent duplication */}

      {/* Victory platform */}
      {bossDefeated && (
        <RigidBody type="fixed" position={[0, 0.1, 0]}>
          <mesh>
            <cylinderGeometry args={[2, 2, 0.2, 12]} />
            <meshLambertMaterial
              color="#FFD700"
              emissive="#FFD700"
              emissiveIntensity={0.5}
            />
          </mesh>
        </RigidBody>
      )}

      {/* Decorative elements */}
      <mesh position={[0, size / 2, 0]}>
        <boxGeometry args={[size - 2, 0.1, size - 2]} />
        <meshLambertMaterial
          color="#8A2BE2"
          emissive="#8A2BE2"
          emissiveIntensity={0.1}
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
};

export default BossBiome;
