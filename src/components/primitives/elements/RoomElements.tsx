import React, { useState, useRef } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Torch Component
export const Torch: React.FC<{
  position: [number, number, number];
  prototypeId?: string;
  onPrototypeAction?: (action: string, data?: any) => void;
}> = ({ position, prototypeId, onPrototypeAction }) => {
  const [isLit, setIsLit] = useState(true);
  const lightRef = useRef<THREE.PointLight>(null);

  // Flickering animation
  useFrame((state) => {
    if (isLit && lightRef.current) {
      const flickerIntensity =
        1.5 +
        Math.sin(state.clock.elapsedTime * 15) * 0.3 +
        Math.sin(state.clock.elapsedTime * 23) * 0.2;
      lightRef.current.intensity = Math.max(0.5, flickerIntensity);
    }
  });

  return (
    <group position={position}>
      {/* Torch Pole */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Torch Head */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <sphereGeometry args={[0.15]} />
        <meshStandardMaterial
          color="#8B4513"
          emissive={isLit ? "#ff4500" : "#000000"}
          emissiveIntensity={isLit ? 0.2 : 0}
        />
      </mesh>

      {/* Flame */}
      {isLit && (
        <>
          {/* Inner flame */}
          <mesh position={[0, 1.3, 0]}>
            <coneGeometry args={[0.08, 0.25, 6]} />
            <meshStandardMaterial
              color="#ffaa00"
              emissive="#ffaa00"
              emissiveIntensity={0.8}
              transparent
              opacity={0.9}
            />
          </mesh>

          {/* Outer flame */}
          <mesh position={[0, 1.35, 0]}>
            <coneGeometry args={[0.12, 0.3, 6]} />
            <meshStandardMaterial
              color="#ff4500"
              emissive="#ff4500"
              emissiveIntensity={0.4}
              transparent
              opacity={0.6}
            />
          </mesh>

          {/* Flame glow effect */}
          <mesh position={[0, 1.4, 0]}>
            <coneGeometry args={[0.15, 0.4, 6]} />
            <meshStandardMaterial color="#ff6600" transparent opacity={0.3} />
          </mesh>
        </>
      )}

      {/* Point Light for illumination */}
      {isLit && (
        <pointLight
          ref={lightRef}
          position={[0, 1.2, 0]}
          color="#ffaa00"
          intensity={1.5}
          distance={6}
          decay={2}
          castShadow
        />
      )}

      {/* Click to toggle */}
      <mesh
        position={[0, 1, 0]}
        onClick={() => setIsLit(!isLit)}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial transparent opacity={0.1} />
      </mesh>
    </group>
  );
};

// Candle Component
export const Candle: React.FC<{
  position: [number, number, number];
  prototypeId?: string;
  onPrototypeAction?: (action: string, data?: any) => void;
  meshRef?: React.RefObject<THREE.Group>;
}> = ({ position, prototypeId, onPrototypeAction, meshRef }) => {
  const [isLit, setIsLit] = useState(true);
  const lightRef = useRef<THREE.PointLight>(null);

  // Flickering animation
  useFrame((state) => {
    if (isLit && lightRef.current) {
      const flickerIntensity =
        0.8 +
        Math.sin(state.clock.elapsedTime * 12) * 0.2 +
        Math.sin(state.clock.elapsedTime * 18) * 0.15;
      lightRef.current.intensity = Math.max(0.3, flickerIntensity);
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Candle Base */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.2]} />
        <meshStandardMaterial
          color="#F5F5DC"
          emissive={isLit ? "#ffaa00" : "#000000"}
          emissiveIntensity={isLit ? 0.1 : 0}
        />
      </mesh>

      {/* Candle Wick */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.05]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Flame */}
      {isLit && (
        <>
          {/* Inner flame */}
          <mesh position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.025]} />
            <meshStandardMaterial
              color="#ffaa00"
              emissive="#ffaa00"
              emissiveIntensity={0.9}
              transparent
              opacity={0.95}
            />
          </mesh>

          {/* Outer flame */}
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.035]} />
            <meshStandardMaterial
              color="#ff6600"
              emissive="#ff6600"
              emissiveIntensity={0.5}
              transparent
              opacity={0.7}
            />
          </mesh>

          {/* Flame glow effect */}
          <mesh position={[0, 0.38, 0]}>
            <sphereGeometry args={[0.045]} />
            <meshStandardMaterial color="#ff4400" transparent opacity={0.4} />
          </mesh>
        </>
      )}

      {/* Point Light for illumination */}
      {isLit && (
        <pointLight
          ref={lightRef}
          position={[0, 0.3, 0]}
          color="#ffaa00"
          intensity={0.8}
          distance={4}
          decay={2}
          castShadow
        />
      )}

      {/* Click to toggle */}
      <mesh
        position={[0, 0.2, 0]}
        onClick={() => setIsLit(!isLit)}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial transparent opacity={0.1} />
      </mesh>
    </group>
  );
};

// Barrel Component
export const Barrel: React.FC<{ position: [number, number, number] }> = ({
  position,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <group position={position}>
      {/* Barrel Body */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.6]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Barrel Bands */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.05]} />
        <meshStandardMaterial color="#C0C0C0" />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.05]} />
        <meshStandardMaterial color="#C0C0C0" />
      </mesh>

      {/* Barrel Lid */}
      {isOpen && (
        <mesh position={[0, 0.65, 0]} rotation={[Math.PI / 4, 0, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.05]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      )}

      {/* Click to open/close */}
      <mesh
        position={[0, 0.3, 0]}
        onClick={() => setIsOpen(!isOpen)}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial transparent opacity={0.1} />
      </mesh>
    </group>
  );
};

// Chest Component
export const Chest: React.FC<{ position: [number, number, number] }> = ({
  position,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <group position={position}>
      {/* Chest Base */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.8, 0.4, 0.6]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Chest Lid */}
      <mesh
        position={[0, isOpen ? 0.6 : 0.4, 0]}
        rotation={[isOpen ? Math.PI / 6 : 0, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.8, 0.1, 0.6]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Chest Lock */}
      <mesh position={[0, 0.4, 0.3]} castShadow>
        <boxGeometry args={[0.1, 0.1, 0.05]} />
        <meshStandardMaterial color="#FFD700" />
      </mesh>

      {/* Click to open/close */}
      <mesh
        position={[0, 0.3, 0]}
        onClick={() => setIsOpen(!isOpen)}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <boxGeometry args={[0.8, 0.6, 0.6]} />
        <meshStandardMaterial transparent opacity={0.1} />
      </mesh>
    </group>
  );
};

// Table Component
export const Table: React.FC<{
  position: [number, number, number];
  prototypeId?: string;
  onPrototypeAction?: (action: string, data?: any) => void;
  meshRef?: React.RefObject<THREE.Group>;
}> = ({ position, prototypeId, onPrototypeAction, meshRef }) => {
  return (
    <group ref={meshRef} position={position}>
      {/* Table Top */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.2, 0.1, 0.8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Table Legs */}
      {[
        [-0.5, -0.3],
        [0.5, -0.3],
        [-0.5, 0.3],
        [0.5, 0.3],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.2, z]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.4]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      ))}
    </group>
  );
};

// Chair Component
export const Chair: React.FC<{
  position: [number, number, number];
  prototypeId?: string;
  onPrototypeAction?: (action: string, data?: any) => void;
  meshRef?: React.RefObject<THREE.Group>;
}> = ({ position, prototypeId, onPrototypeAction, meshRef }) => {
  return (
    <group ref={meshRef} position={position}>
      {/* Chair Seat */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.4, 0.05, 0.4]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Chair Back */}
      <mesh position={[0, 0.5, -0.15]} castShadow>
        <boxGeometry args={[0.4, 0.3, 0.05]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Chair Legs */}
      {[
        [-0.15, -0.15],
        [0.15, -0.15],
        [-0.15, 0.15],
        [0.15, 0.15],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.15, z]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.3]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      ))}
    </group>
  );
};

// Bookshelf Component
export const Bookshelf: React.FC<{
  position: [number, number, number];
  prototypeId?: string;
  onPrototypeAction?: (action: string, data?: any) => void;
}> = ({ position, prototypeId, onPrototypeAction }) => {
  return (
    <group position={position}>
      {/* Bookshelf Frame */}
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[0.2, 2, 1]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Books */}
      {Array.from({ length: 12 }).map((_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const colors = ["#8B0000", "#000080", "#006400", "#800080"];

        return (
          <mesh
            key={i}
            position={[(col - 1.5) * 0.15, (row - 1) * 0.3 + 0.5, 0.1]}
            castShadow
          >
            <boxGeometry args={[0.12, 0.25, 0.02]} />
            <meshStandardMaterial color={colors[col]} />
          </mesh>
        );
      })}
    </group>
  );
};

// Potion Bottle Component
export const PotionBottle: React.FC<{
  position: [number, number, number];
  color?: string;
}> = ({ position, color = "#00ff00" }) => {
  return (
    <group position={position}>
      {/* Bottle */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.4]} />
        <meshStandardMaterial color="#F0F0F0" transparent opacity={0.8} />
      </mesh>

      {/* Potion Liquid */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.3]} />
        <meshStandardMaterial color={color} transparent opacity={0.7} />
      </mesh>

      {/* Bottle Cork */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.1]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    </group>
  );
};

// Crystal Component
export const Crystal: React.FC<{
  position: [number, number, number];
  color?: string;
}> = ({ position, color = "#00ffff" }) => {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <octahedronGeometry args={[0.2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Crystal Base */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.2]} />
        <meshStandardMaterial color="#C0C0C0" />
      </mesh>
    </group>
  );
};

// Skull Component
export const Skull: React.FC<{ position: [number, number, number] }> = ({
  position,
}) => {
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.15]} />
        <meshStandardMaterial color="#F5F5DC" />
      </mesh>

      {/* Eye Sockets */}
      <mesh position={[-0.05, 0.25, 0.12]} castShadow>
        <sphereGeometry args={[0.02]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0.05, 0.25, 0.12]} castShadow>
        <sphereGeometry args={[0.02]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
    </group>
  );
};

// Floating Text Component
export const FloatingText: React.FC<{
  position: [number, number, number];
  text: string;
  color?: string;
}> = ({ position, text, color = "#ffffff" }) => {
  return (
    <Text
      position={position}
      fontSize={0.3}
      color={color}
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.02}
      outlineColor="#000000"
    >
      {text}
    </Text>
  );
};

// Note: Use UniversalPrototype wrapper instead of individual prototype components

// Note: Individual room element components are exported from their own files
// and re-exported from the index.ts file
