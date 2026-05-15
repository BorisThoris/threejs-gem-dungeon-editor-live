import React, { useState, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export interface EnhancedRoomTransitionProps {
  isTransitioning: boolean;
  fromRoomId?: string;
  toRoomId?: string;
  progress: number;
  direction?: "north" | "south" | "east" | "west";
  onComplete?: () => void;
  style?: "fade" | "slide" | "wipe" | "zoom";
}

const EnhancedRoomTransition: React.FC<EnhancedRoomTransitionProps> = ({
  isTransitioning,
  fromRoomId,
  toRoomId,
  progress,
  direction = "south",
  onComplete,
  style = "fade",
}) => {
  const [transitionState, setTransitionState] = useState({
    overlayOpacity: 0,
    textOpacity: 0,
    textScale: 1,
    particleOpacity: 0,
  });

  const particleRefs = useRef<THREE.Group[]>([]);

  // Create particle system
  const createParticles = () => {
    const particles = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      const group = new THREE.Group();

      // Random position
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      group.position.set(x, y, z);

      // Random rotation
      group.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      // Random scale
      const scale = Math.random() * 0.5 + 0.5;
      group.scale.setScalar(scale);

      particles.push(group);
    }

    return particles;
  };

  // Initialize particles
  useEffect(() => {
    particleRefs.current = createParticles();
  }, []);

  // Animate transition
  useEffect(() => {
    if (!isTransitioning) {
      // Fade out
      const fadeOut = () => {
        setTransitionState((prev) => {
          const newOpacity = Math.max(0, prev.overlayOpacity - 0.05);
          const newTextOpacity = Math.max(0, prev.textOpacity - 0.1);
          const newParticleOpacity = Math.max(0, prev.particleOpacity - 0.05);

          if (
            newOpacity <= 0 &&
            newTextOpacity <= 0 &&
            newParticleOpacity <= 0
          ) {
            onComplete?.();
            return prev;
          }

          return {
            ...prev,
            overlayOpacity: newOpacity,
            textOpacity: newTextOpacity,
            particleOpacity: newParticleOpacity,
          };
        });

        if (newOpacity > 0 || newTextOpacity > 0 || newParticleOpacity > 0) {
          setTimeout(fadeOut, 16); // ~60fps
        }
      };

      fadeOut();
    } else {
      // Fade in
      const fadeIn = () => {
        setTransitionState((prev) => {
          const newOverlayOpacity = Math.min(0.9, prev.overlayOpacity + 0.05);
          const newTextOpacity = Math.min(1, prev.textOpacity + 0.1);
          const newParticleOpacity = Math.min(0.8, prev.particleOpacity + 0.05);
          const newTextScale = Math.min(1.2, prev.textScale + 0.02);

          return {
            ...prev,
            overlayOpacity: newOverlayOpacity,
            textOpacity: newTextOpacity,
            particleOpacity: newParticleOpacity,
            textScale: newTextScale,
          };
        });

        if (newOverlayOpacity < 0.9 || newTextOpacity < 1) {
          setTimeout(fadeIn, 16); // ~60fps
        }
      };

      fadeIn();
    }

    return () => {
      // Cleanup handled by component unmount
    };
  }, [isTransitioning, onComplete]);

  // Animate particles
  useFrame((state) => {
    particleRefs.current.forEach((particle, index) => {
      if (transitionState.particleOpacity > 0) {
        // Rotate particles
        particle.rotation.x += 0.01;
        particle.rotation.y += 0.02;
        particle.rotation.z += 0.005;

        // Move particles based on direction
        switch (direction) {
          case "north":
            particle.position.z += 0.1;
            break;
          case "south":
            particle.position.z -= 0.1;
            break;
          case "east":
            particle.position.x -= 0.1;
            break;
          case "west":
            particle.position.x += 0.1;
            break;
        }

        // Reset position if out of bounds
        if (
          Math.abs(particle.position.x) > 15 ||
          Math.abs(particle.position.y) > 15 ||
          Math.abs(particle.position.z) > 15
        ) {
          particle.position.set(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
          );
        }
      }
    });
  });

  if (!isTransitioning && transitionState.overlayOpacity === 0) {
    return null;
  }

  const getTransitionText = () => {
    if (fromRoomId && toRoomId) {
      const fromName = fromRoomId.replace("room_", "Room ").replace("_", " ");
      const toName = toRoomId.replace("room_", "Room ").replace("_", " ");
      return `Entering ${toName}...`;
    }
    return "Loading Room...";
  };

  const getDirectionArrow = () => {
    switch (direction) {
      case "north":
        return "↑";
      case "south":
        return "↓";
      case "east":
        return "→";
      case "west":
        return "←";
      default:
        return "→";
    }
  };

  return (
    <group>
      {/* Overlay based on style */}
      {style === "fade" && (
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={transitionState.overlayOpacity}
          />
        </mesh>
      )}

      {style === "wipe" && (
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={transitionState.overlayOpacity}
          />
        </mesh>
      )}

      {style === "zoom" && (
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[100 * (1 + progress), 100 * (1 + progress)]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={transitionState.overlayOpacity}
          />
        </mesh>
      )}

      {/* Transition text */}
      {isTransitioning && (
        <group position={[0, 0, 1]}>
          <Text
            position={[0, 2, 0]}
            fontSize={0.8}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
            opacity={transitionState.textOpacity}
            scale={[transitionState.textScale, transitionState.textScale, 1]}
          >
            {getTransitionText()}
          </Text>

          {/* Direction arrow */}
          <Text
            position={[0, 1, 0]}
            fontSize={1.5}
            color="#00FFFF"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
            opacity={transitionState.textOpacity}
          >
            {getDirectionArrow()}
          </Text>

          {/* Progress bar */}
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[6, 0.3]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
            <mesh position={[-3 + progress * 3, 0, 0.02]}>
              <planeGeometry args={[progress * 6, 0.25]} />
              <meshBasicMaterial color="#00FFFF" />
            </mesh>
          </group>

          {/* Loading spinner */}
          <mesh position={[0, -1, 0]} rotation={[0, 0, progress * Math.PI * 4]}>
            <cylinderGeometry args={[0.15, 0.15, 0.1, 8]} />
            <meshBasicMaterial
              color="#00FFFF"
              transparent
              opacity={transitionState.textOpacity}
            />
          </mesh>
        </group>
      )}

      {/* Particle effects */}
      {transitionState.particleOpacity > 0 && (
        <group>
          {particleRefs.current.map((particle, index) => (
            <primitive key={index} object={particle}>
              <mesh>
                <octahedronGeometry args={[0.1]} />
                <meshBasicMaterial
                  color="#00FFFF"
                  transparent
                  opacity={transitionState.particleOpacity * 0.5}
                />
              </mesh>
            </primitive>
          ))}
        </group>
      )}

      {/* Room name display */}
      {toRoomId && (
        <group position={[0, -2.5, 0]}>
          <Text
            position={[0, 0, 0.5]}
            fontSize={0.4}
            color="#FFFF00"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#000000"
            opacity={transitionState.textOpacity * 0.8}
          >
            {toRoomId.replace("room_", "Room ").replace("_", " ")}
          </Text>
        </group>
      )}
    </group>
  );
};

export default EnhancedRoomTransition;
