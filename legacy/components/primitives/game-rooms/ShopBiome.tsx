import React, { useState } from "react";
import { Text } from "../../GameText";
import { RigidBody } from "@react-three/rapier";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";
import InteractTrigger from "../../InteractTrigger";
import { useConsolidatedGameStore } from "../../../store/consolidatedGameStore";
import { GEMS_PER_LIFE } from "../../../configs/runRules";

interface ShopBiomeProps {
  size?: number;
  onShopOpen?: () => void;
}

const ShopBiome: React.FC<ShopBiomeProps> = ({ onShopOpen, size = 10 }) => {
  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;
  const [bought, setBought] = useState(0);

  // The shop is where the run's two currencies meet. Gems were only ever spent
  // at the exit and lives could only ever be lost, so the shopkeeper stood in a
  // room with nothing to sell and no way to be spoken to: the only way in was
  // an action-card overlay that renders nothing at all.
  const gems = useConsolidatedGameStore((state) => state.playerStats.gems);
  const lives = useConsolidatedGameStore((state) => state.playerStats.lives);
  const maxLives = useConsolidatedGameStore((state) => state.playerStats.maxLives);
  const spendGems = useConsolidatedGameStore((state) => state.spendGems);
  const gainLife = useConsolidatedGameStore((state) => state.gainLife);

  const canAfford = gems >= GEMS_PER_LIFE;
  const needsLife = lives < maxLives;

  const buyLife = () => {
    if (!needsLife || !spendGems(GEMS_PER_LIFE)) return;
    gainLife();
    setBought((n) => n + 1);
    onShopOpen?.();
  };

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[biomeSize, 1, biomeSize]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>
      </RigidBody>

      {/* Shop Counter */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[4, 1, 2]} />
          <meshStandardMaterial color="#654321" />
        </mesh>

        {/* Shop Counter */}
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[3.5, 0.2, 1.5]} />
          <meshStandardMaterial
            color="#8B4513"
            emissive="#8B4513"
            emissiveIntensity={0.1}
          />
        </mesh>
      </group>

      {/* Shopkeeper */}
      <group position={[0, 1.5, -0.5]}>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 1]} />
          <meshStandardMaterial color="#FFD700" />
        </mesh>
        <mesh position={[0, 0.8, 0]} castShadow>
          <sphereGeometry args={[0.2]} />
          <meshStandardMaterial color="#FFD700" />
        </mesh>
      </group>

      {/* Shop Items Display */}
      {[-2, 0, 2].map((x, index) => (
        <group key={index} position={[x, 1, 2]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
        </group>
      ))}

      {/* Room Title */}
      <Text
        position={[0, 3, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🛒 SHOP ROOM 🛒
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
        {needsLife
          ? `${GEMS_PER_LIFE} gem restores a life`
          : "You are at full health"}
      </Text>

      {/* Shop Info */}
      <Text
        position={[0, 1.8, 0]}
        fontSize={0.3}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {bought > 0
          ? `Thank you. ${bought} life${bought > 1 ? "s" : ""} restored.`
          : `You carry ${gems} gem${gems === 1 ? "" : "s"}`}
      </Text>

      {/* Step up to the counter and press E, the same verb as every door. */}
      <InteractTrigger
        position={[0, 0, 2]}
        label={`Buy a life (${GEMS_PER_LIFE} gem)`}
        onInteract={buyLife}
        enabled={canAfford && needsLife}
        blockedReason={
          !needsLife
            ? "Already at full health"
            : `Needs ${GEMS_PER_LIFE} gem (${gems}/${GEMS_PER_LIFE})`
        }
      />
    </group>
  );
};

export default ShopBiome;
