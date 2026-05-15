import React, { useState, useRef } from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";

interface LaboratoryBiomeProps {
  size?: number;
  onExperimentComplete?: () => void;
}

const LaboratoryBiome: React.FC<LaboratoryBiomeProps> = ({
  onExperimentComplete,
  size = 10,
}) => {
  const [experimenting, setExperimenting] = useState(false);
  const [experimentComplete, setExperimentComplete] = useState(false);

  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;

  // Refs for animated elements
  const vialRef = useRef<THREE.Mesh>(null);
  const equipmentRefs = useRef<THREE.Mesh[]>([]);

  const { cards, isVisible, showCards, hideCards } = useRoomActions({
    roomType: "laboratory",
    onExperimentComplete: () => {
      setExperimentComplete(true);
      onExperimentComplete?.();
    },
  });

  // Animation frame for glowing effects
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Animate experiment vial bubbling
    if (vialRef.current && experimenting) {
      const bubbleIntensity = Math.sin(time * 4) * 0.2 + 0.8;
      vialRef.current.material.emissiveIntensity = bubbleIntensity;

      // Slight rotation for bubbling effect
      vialRef.current.rotation.y = Math.sin(time * 2) * 0.1;
    }

    // Animate equipment glowing
    equipmentRefs.current.forEach((equipmentRef, index) => {
      if (equipmentRef && experimenting) {
        const glowIntensity = Math.sin(time * 3 + index) * 0.3 + 0.7;
        equipmentRef.material.emissiveIntensity = glowIntensity;
      }
    });
  });

  return (
    <group>
      {/* Laboratory Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[10, 1, 10]} />
          <meshStandardMaterial color="#E0E0E0" />
        </mesh>
      </RigidBody>

      {/* Workbench */}
      <RigidBody type="fixed" position={[0, 0.4, 0]}>
        <mesh castShadow>
          <boxGeometry args={[8, 0.8, 2]} />
          <meshStandardMaterial color="#90A4AE" />
        </mesh>
      </RigidBody>

      {/* Lab Equipment */}
      {Array.from({ length: 4 }).map((_, i) => {
        const angle = (i / 4) * Math.PI * 2;
        const radius = 2.5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <group key={i} position={[x, 0.5, z]}>
            {/* Equipment Base */}
            <mesh castShadow>
              <cylinderGeometry args={[0.3, 0.3, 0.2]} />
              <meshStandardMaterial color="#607D8B" />
            </mesh>

            {/* Equipment Top */}
            <mesh
              ref={(el) => {
                if (el) equipmentRefs.current[i] = el;
              }}
              position={[0, 0.3, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.2, 0.2, 0.4]} />
              <meshStandardMaterial
                color="#455A64"
                emissive="#00E676"
                emissiveIntensity={experimenting ? 0.5 : 0.1}
              />
            </mesh>

            {/* Glowing Effect */}
            {experimenting && (
              <pointLight
                position={[0, 0.5, 0]}
                color="#00E676"
                intensity={0.8}
                distance={3}
              />
            )}

            {/* Chemical bubbles */}
            {experimenting &&
              Array.from({ length: 5 }).map((_, j) => (
                <mesh
                  key={j}
                  position={[
                    (Math.random() - 0.5) * 0.3,
                    Math.random() * 0.4 + 0.2,
                    (Math.random() - 0.5) * 0.3,
                  ]}
                >
                  <sphereGeometry args={[0.02]} />
                  <meshStandardMaterial
                    color="#00E676"
                    emissive="#00E676"
                    emissiveIntensity={0.8}
                    transparent
                    opacity={0.7}
                  />
                </mesh>
              ))}
          </group>
        );
      })}

      {/* Central Experiment Station */}
      <group position={[0, 0.8, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.1]} />
          <meshStandardMaterial color="#37474F" />
        </mesh>

        {/* Experiment Vial */}
        {experimenting && (
          <mesh ref={vialRef} position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.3]} />
            <meshStandardMaterial
              color="#00E676"
              emissive="#00E676"
              emissiveIntensity={0.8}
            />
          </mesh>
        )}

        {/* Vial glow aura */}
        {experimenting && (
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.35]} />
            <meshStandardMaterial
              color="#00E676"
              transparent
              opacity={0.2}
              emissive="#00E676"
              emissiveIntensity={0.3}
            />
          </mesh>
        )}

        {/* Chemical reaction particles */}
        {experimenting &&
          Array.from({ length: 8 }).map((_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * 0.6,
                Math.random() * 0.5 + 0.1,
                (Math.random() - 0.5) * 0.6,
              ]}
            >
              <sphereGeometry args={[0.03]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#00E676" : "#FF6B35"}
                emissive={i % 2 === 0 ? "#00E676" : "#FF6B35"}
                emissiveIntensity={0.9}
                transparent
                opacity={0.8}
              />
            </mesh>
          ))}
      </group>

      {/* Chemical Storage */}
      <RigidBody type="fixed" position={[0, 1.5, -3]}>
        <mesh castShadow>
          <boxGeometry args={[3, 3, 1]} />
          <meshStandardMaterial color="#FFC107" />
        </mesh>
      </RigidBody>

      {/* Lab Shelves */}
      <RigidBody type="fixed" position={[0, 2, 3]}>
        <mesh castShadow>
          <boxGeometry args={[6, 0.2, 1]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      </RigidBody>

      {/* Lab Equipment on Shelves */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-2 + i * 0.8, 2.2, 3]} castShadow>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#78909C" />
        </mesh>
      ))}

      {/* Laboratory Title */}
      <Text
        position={[0, 4, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🧪 LABORATORY BIOME 🧪
      </Text>

      {/* Instructions */}
      <Text
        position={[0, 3.2, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {experimentComplete
          ? "Experiment successful!"
          : "Conduct scientific experiments!"}
      </Text>

      {/* Action Cards */}
      <RoomActionCards
        cards={cards}
        isVisible={isVisible}
        onCardClick={(card) => {
          if (card.id === "start_experiment") {
            setExperimenting(true);
            hideCards();
          }
        }}
      />
    </group>
  );
};

export default LaboratoryBiome;
