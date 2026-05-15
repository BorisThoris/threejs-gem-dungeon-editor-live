import React, { useRef, useEffect } from "react";
import { Text } from "@react-three/drei";
import { refBasedPlayerState } from "../../../utils/refBasedPlayerState";
import { refBasedGameState } from "../../../utils/refBasedGameState";
import { coffeeRoomUI } from "../../../utils/coffeeRoomUI";
import {
  BreakableCandle,
  BreakableTable,
  BreakableChair,
  BreakablePotionBottle,
} from "../elements";

interface CoffeeBiomeProps {
  onRewardClaim?: () => void;
}

const CoffeeBiome: React.FC<CoffeeBiomeProps> = ({ onRewardClaim }) => {
  // Use refs instead of React state to prevent re-renders
  const coffeesDrunk = useRef(0);
  const isAnimating = useRef(false);

  const maxCoffees = 3; // Maximum coffees per room visit

  // Initialize ref-based UI
  useEffect(() => {
    coffeeRoomUI.init();
    return () => {
      coffeeRoomUI.destroy();
    };
  }, []);

  const handleDrinkCoffee = () => {
    if (coffeesDrunk.current >= maxCoffees) return;

    isAnimating.current = true;
    coffeesDrunk.current += 1;

    // Update ref-based UI
    coffeeRoomUI.setCoffeesDrunk(coffeesDrunk.current);
    coffeeRoomUI.setAnimating(true);

    // Apply speed boost using ref-based system (30 seconds per coffee)
    refBasedGameState.addBuff("speedBoost", "speed", 0.2, 30000); // 30 seconds in milliseconds
    refBasedPlayerState.addPoints(20); // Reward points
    refBasedPlayerState.addExperience(15); // Reward experience

    // Call reward callback
    onRewardClaim?.();

    // Stop animation after 1 second
    setTimeout(() => {
      isAnimating.current = false;
      coffeeRoomUI.setAnimating(false);
    }, 1000);
  };

  return (
    <group>
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[8, 1, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Coffee Shop Counter */}
      <group position={[0, 0, -2]}>
        {/* Counter */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[6, 1, 1]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>

        {/* Coffee Machine */}
        <mesh position={[-1, 1.2, 0]} castShadow>
          <boxGeometry args={[0.8, 1.4, 0.6]} />
          <meshStandardMaterial color="#C0C0C0" />
        </mesh>

        {/* Coffee Cups */}
        {[0, 1, 2].map((i) => (
          <group key={i} position={[i * 0.8 - 0.8, 1.1, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.15, 0.15, 0.3]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[0, 0.2, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 0.1]} />
              <meshStandardMaterial color="#4A2C2A" />
            </mesh>
          </group>
        ))}

        {/* Clickable Coffee Area */}
        <mesh
          position={[0, 0.5, 0]}
          onClick={handleDrinkCoffee}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor =
              coffeesDrunk.current >= maxCoffees ? "not-allowed" : "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        >
          <boxGeometry args={[6.2, 1.2, 1.2]} />
          <meshStandardMaterial
            color={coffeesDrunk.current >= maxCoffees ? "#666666" : "#4a4a4a"}
            transparent
            opacity={0.3}
          />
        </mesh>
      </group>

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
        ☕ COFFEE ROOM ☕
      </Text>

      {/* UI is now handled by ref-based system - no React re-renders! */}

      {/* Decorative Elements */}
      {/* Tables and Chairs */}
      <BreakableTable position={[-2, 0, 1]} enabled={false} />
      <BreakableChair position={[-2.6, 0, 1.4]} enabled={false} />
      <BreakableChair position={[-1.4, 0, 1.4]} enabled={false} />

      <BreakableTable position={[2, 0, 1]} enabled={false} />
      <BreakableChair position={[1.4, 0, 1.4]} enabled={false} />
      <BreakableChair position={[2.6, 0, 1.4]} enabled={false} />

      {/* Coffee Beans */}
      <group position={[0, 0.1, 2]}>
        {Array.from({ length: 20 }).map((_, i) => (
          <mesh
            key={i}
            position={[(Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 2]}
            rotation={[0, Math.random() * Math.PI, 0]}
          >
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial color="#4A2C2A" />
          </mesh>
        ))}
      </group>

      {/* Additional coffee shop elements */}
      <BreakableCandle position={[-1, 0.4, 0]} enabled={false} />
      <BreakableCandle position={[1, 0.4, 0]} enabled={false} />
      <BreakableCandle position={[0, 0.4, 2]} enabled={false} />

      {/* Coffee potions */}
      <BreakablePotionBottle
        position={[-0.5, 0.4, 1]}
        color="#4A2C2A"
        enabled={false}
      />
      <BreakablePotionBottle
        position={[0.5, 0.4, 1]}
        color="#4A2C2A"
        enabled={false}
      />
      <BreakablePotionBottle
        position={[0, 0.4, 1.5]}
        color="#8B4513"
        enabled={false}
      />
    </group>
  );
};

export default CoffeeBiome;
