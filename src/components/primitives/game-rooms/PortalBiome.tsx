import React, { useState, useRef } from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";

interface PortalBiomeProps {
  size?: number;
  onRewardClaim?: () => void;
  portalDestination?: string;
}

const PortalBiome: React.FC<PortalBiomeProps> = ({
  onRewardClaim,
  portalDestination,
  size = 10,
}) => {
  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;
  const { addPoints, addExperience } = useGameStore();
  const [isActivated, setIsActivated] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Refs for animated elements
  const portalCoreRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);

  const handlePortalActivation = () => {
    if (isActivated) return;

    setIsAnimating(true);
    setIsActivated(true);

    // Portal rewards
    addPoints(50);
    addExperience(40);

    onRewardClaim?.();

    setTimeout(() => setIsAnimating(false), 3000);
  };

  // Animation frame for glowing effects
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Rotate portal rings
    if (outerRingRef.current) {
      outerRingRef.current.rotation.y = time * 0.5;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.y = -time * 0.8;
    }

    // Pulsing glow effect
    if (portalCoreRef.current) {
      const pulseIntensity = Math.sin(time * 3) * 0.3 + 0.7;
      portalCoreRef.current.material.emissiveIntensity = pulseIntensity;
    }
  });

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[biomeSize, 1, biomeSize]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>
      </RigidBody>

      {/* Portal Ring */}
      <group position={[0, 1, 0]}>
        {/* Outer Ring */}
        <mesh ref={outerRingRef} position={[0, 0, 0]} castShadow>
          <torusGeometry args={[2.5, 0.3, 16, 100]} />
          <meshStandardMaterial
            color={isActivated ? "#00ffff" : "#6600cc"}
            emissive={isActivated ? "#00ffff" : "#330066"}
            emissiveIntensity={isActivated ? 1.2 : 0.5}
          />
        </mesh>

        {/* Inner Ring */}
        <mesh ref={innerRingRef} position={[0, 0, 0]} castShadow>
          <torusGeometry args={[1.8, 0.2, 16, 100]} />
          <meshStandardMaterial
            color={isActivated ? "#ff00ff" : "#9900ff"}
            emissive={isActivated ? "#ff00ff" : "#6600cc"}
            emissiveIntensity={isActivated ? 1.5 : 0.7}
          />
        </mesh>

        {/* Portal Core */}
        <mesh
          ref={portalCoreRef}
          position={[0, 0, 0]}
          onClick={handlePortalActivation}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = isActivated
              ? "not-allowed"
              : "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        >
          <cylinderGeometry args={[1.5, 1.5, 0.1, 32]} />
          <meshStandardMaterial
            color={isActivated ? "#ffffff" : "#cc00ff"}
            transparent
            opacity={isActivated ? 0.9 : 0.7}
            emissive={isActivated ? "#ffffff" : "#ff00ff"}
            emissiveIntensity={isActivated ? 1.2 : 0.6}
          />
        </mesh>

        {/* Portal Energy */}
        {isActivated && (
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[1.2, 32, 32]} />
            <meshStandardMaterial
              color="#ffffff"
              transparent
              opacity={0.3}
              emissive="#ffffff"
              emissiveIntensity={1.5}
            />
          </mesh>
        )}
      </group>

      {/* Portal Pillars */}
      {[-3, 3].map((x, index) => (
        <group key={index} position={[x, 0, 0]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 3, 8]} />
            <meshStandardMaterial
              color="#330066"
              emissive="#6600cc"
              emissiveIntensity={0.4}
            />
          </mesh>
          <mesh position={[0, 2.8, 0]} castShadow>
            <sphereGeometry args={[0.4]} />
            <meshStandardMaterial
              color="#ff00ff"
              emissive="#ff00ff"
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      ))}

      {/* Portal Title */}
      <Text
        position={[0, 4, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🌌 PORTAL ROOM 🌌
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
        {isActivated ? "Portal Activated!" : "Click to activate portal!"}
      </Text>

      {/* Destination Info */}
      <Text
        position={[0, 2.8, 0]}
        fontSize={0.3}
        color="#00ffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {isActivated
          ? `Leads to: ${portalDestination || "Unknown"}`
          : "Fast travel to distant rooms!"}
      </Text>

      {/* Animation Effect */}
      {isAnimating && (
        <group position={[0, 3.5, 0]}>
          <Text
            position={[0, 0, 0]}
            fontSize={0.6}
            color="#ff00ff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            🌌 ACTIVATING... 🌌
          </Text>
        </group>
      )}

      {/* Floating Energy Particles */}
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 4 + Math.sin(Date.now() * 0.001 + i) * 0.5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(Date.now() * 0.002 + i) * 0.5 + 2;

        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry
              args={[0.06 + Math.sin(Date.now() * 0.003 + i) * 0.02]}
            />
            <meshStandardMaterial
              color={isActivated ? "#00ffff" : "#6600cc"}
              emissive={isActivated ? "#00ffff" : "#9900ff"}
              emissiveIntensity={isActivated ? 1.0 : 0.4}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}

      {/* Portal Runes */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 3.5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const glowIntensity = Math.sin(Date.now() * 0.002 + i) * 0.3 + 0.7;

        return (
          <group key={i} position={[x, 0.1, z]}>
            <mesh>
              <boxGeometry args={[0.2, 0.1, 0.2]} />
              <meshStandardMaterial
                color="#6600cc"
                emissive="#9900ff"
                emissiveIntensity={glowIntensity}
              />
            </mesh>
            {/* Glow aura */}
            <mesh>
              <boxGeometry args={[0.3, 0.15, 0.3]} />
              <meshStandardMaterial
                color="#9900ff"
                transparent
                opacity={0.2}
                emissive="#9900ff"
                emissiveIntensity={glowIntensity * 0.5}
              />
            </mesh>
          </group>
        );
      })}

      {/* Portal Energy Beams */}
      {isActivated && (
        <>
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i / 6) * Math.PI * 2;
            const radius = 4;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            return (
              <mesh key={i} position={[x, 2, z]}>
                <cylinderGeometry args={[0.05, 0.05, 4, 8]} />
                <meshStandardMaterial
                  color="#00ffff"
                  emissive="#00ffff"
                  emissiveIntensity={1.0}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
};

export default PortalBiome;
