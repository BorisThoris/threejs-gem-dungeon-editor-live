import React, { useState, useRef } from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";

interface ObservatoryBiomeProps {
  size?: number;
  onObservationComplete?: () => void;
}

const ObservatoryBiome: React.FC<ObservatoryBiomeProps> = ({
  onObservationComplete,
  size = 10,
}) => {
  const [observing, setObserving] = useState(false);
  const [discoveryMade, setDiscoveryMade] = useState(false);

  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;

  // Refs for animated elements
  const telescopeRef = useRef<THREE.Mesh>(null);
  const starRefs = useRef<THREE.Mesh[]>([]);

  const { cards, isVisible, showCards, hideCards } = useRoomActions({
    roomType: "observatory",
    onObservationComplete: () => {
      setDiscoveryMade(true);
      onObservationComplete?.();
    },
  });

  // Animation frame for cosmic effects
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Animate telescope lens glow
    if (telescopeRef.current && observing) {
      const glowIntensity = Math.sin(time * 2) * 0.3 + 0.7;
      telescopeRef.current.material.emissiveIntensity = glowIntensity;
    }

    // Animate stars twinkling
    starRefs.current.forEach((starRef, index) => {
      if (starRef) {
        const twinkleIntensity = Math.sin(time * 3 + index) * 0.4 + 0.6;
        starRef.material.emissiveIntensity = twinkleIntensity;

        // Slight position variation for twinkling
        const twinkleOffset = Math.sin(time * 4 + index) * 0.01;
        starRef.position.y += twinkleOffset * 0.1;
      }
    });
  });

  return (
    <group>
      {/* Observatory Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[10, 1, 10]} />
          <meshStandardMaterial color="#263238" />
        </mesh>
      </RigidBody>

      {/* Telescope */}
      <group position={[0, 0, 0]}>
        <RigidBody type="fixed" position={[0, 0.3, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.6]} />
            <meshStandardMaterial color="#37474F" />
          </mesh>
        </RigidBody>

        {/* Telescope Tube */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.2, 1.5]} />
          <meshStandardMaterial color="#455A64" />
        </mesh>

        {/* Telescope Lens */}
        <mesh ref={telescopeRef} position={[0, 2, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.4, 0.1]} />
          <meshStandardMaterial
            color="#E0E0E0"
            emissive="#E3F2FD"
            emissiveIntensity={observing ? 0.8 : 0.2}
          />
        </mesh>

        {/* Lens glow aura */}
        {observing && (
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.15]} />
            <meshStandardMaterial
              color="#E3F2FD"
              transparent
              opacity={0.3}
              emissive="#E3F2FD"
              emissiveIntensity={0.4}
            />
          </mesh>
        )}

        {/* Star Light */}
        {observing && (
          <pointLight
            position={[0, 2, 0]}
            color="#E3F2FD"
            intensity={1}
            distance={8}
          />
        )}
      </group>

      {/* Star Charts */}
      <RigidBody type="fixed" position={[-3, 1.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2, 3, 0.1]} />
          <meshStandardMaterial color="#FFF8E1" />
        </mesh>
      </RigidBody>

      {/* Astronomical Instruments */}
      {Array.from({ length: 3 }).map((_, i) => {
        const angle = (i / 3) * Math.PI * 2;
        const radius = 3;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <group key={i} position={[x, 0.5, z]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.2, 0.2, 0.4]} />
              <meshStandardMaterial color="#607D8B" />
            </mesh>

            <mesh position={[0, 0.3, 0]} castShadow>
              <sphereGeometry args={[0.15]} />
              <meshStandardMaterial color="#90A4AE" />
            </mesh>
          </group>
        );
      })}

      {/* Celestial Globe */}
      <group position={[3, 0.8, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#37474F" />
        </mesh>

        {/* Globe Stand */}
        <mesh position={[0, -0.3, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.6]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      </group>

      {/* Star Field Effect */}
      {observing && (
        <>
          {Array.from({ length: 30 }).map((_, i) => {
            const angle = (i / 30) * Math.PI * 2;
            const radius = 8 + Math.sin(i) * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = 3 + Math.random() * 2;

            return (
              <mesh
                key={i}
                ref={(el) => {
                  if (el) starRefs.current[i] = el;
                }}
                position={[x, y, z]}
              >
                <sphereGeometry args={[0.03 + Math.random() * 0.02]} />
                <meshStandardMaterial
                  color="#E3F2FD"
                  emissive="#E3F2FD"
                  emissiveIntensity={0.8}
                />
              </mesh>
            );
          })}

          {/* Constellation lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const startAngle = (i / 5) * Math.PI * 2;
            const endAngle = ((i + 1) / 5) * Math.PI * 2;
            const radius = 8;

            return (
              <mesh key={`line-${i}`} position={[0, 4, 0]}>
                <cylinderGeometry args={[0.01, 0.01, radius]} />
                <meshStandardMaterial
                  color="#E3F2FD"
                  emissive="#E3F2FD"
                  emissiveIntensity={0.3}
                  transparent
                  opacity={0.6}
                />
              </mesh>
            );
          })}
        </>
      )}

      {/* Observatory Title */}
      <Text
        position={[0, 4, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🔭 OBSERVATORY BIOME 🔭
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
        {discoveryMade
          ? "New celestial discovery made!"
          : "Observe the stars and make discoveries!"}
      </Text>

      {/* Action Cards */}
      <RoomActionCards
        cards={cards}
        isVisible={isVisible}
        onCardClick={(card) => {
          if (card.id === "observe_stars") {
            setObserving(true);
            hideCards();
          }
        }}
      />
    </group>
  );
};

export default ObservatoryBiome;
