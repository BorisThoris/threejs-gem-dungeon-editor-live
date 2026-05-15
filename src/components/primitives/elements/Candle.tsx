import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import AnimatedSmoke from "./AnimatedSmoke";
import DraggableObject from "../../DraggableObject";

export interface CandleProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  isLit?: boolean;
  flameColor?: string;
  intensity?: number;
  smokeEnabled?: boolean;
  smokeAnimationSpeed?: number;
  smokeOpacity?: number;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  // Draggable functionality
  draggable?: boolean;
  weight?: number;
  onMove?: (newPosition: [number, number, number]) => void;
  onLight?: () => void;
  onExtinguish?: () => void;
}

const Candle: React.FC<CandleProps> = ({
  position = [0, 0, 0],
  color = "#8B4513",
  scale = 1,
  isLit = true,
  flameColor = "#ff6b35",
  intensity = 1.5,
  smokeEnabled = true,
  smokeAnimationSpeed = 1.0,
  smokeOpacity = 0.6,
  onClick,
  onPointerOver,
  onPointerOut,
  // Draggable functionality
  draggable = true,
  weight = 0.5,
  onMove,
  onLight,
  onExtinguish,
}) => {
  const flameRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const candleRef = useRef<THREE.Group>(null);

  // Handle candle lighting/extinguishing
  const handleCandleClick = (event: any) => {
    event.stopPropagation();
    if (isLit) {
      onExtinguish?.();
    } else {
      onLight?.();
    }
    onClick?.();
  };

  // Fade animation state
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isFadingIn, setIsFadingIn] = useState(false);
  const [fadeProgress, setFadeProgress] = useState(isLit ? 1 : 0);
  const [showFlame, setShowFlame] = useState(isLit);
  const [showSmoke, setShowSmoke] = useState(isLit);

  // Handle fade animations when candle is turned on/off
  useEffect(() => {
    if (isLit) {
      // Candle should be lit - start fade-in if not already lit
      if (!showFlame) {
        setShowFlame(true);
        setShowSmoke(true);
        setIsFadingIn(true);
        setIsFadingOut(false);
        setFadeProgress(0);
      }
    } else {
      // Candle should be off - start fade-out if currently lit
      if (showFlame) {
        setIsFadingOut(true);
        setIsFadingIn(false);
        setFadeProgress(1);
      }
    }
  }, [isLit, showFlame]);

  useFrame((state) => {
    if (showFlame && flameRef.current) {
      // Flickering flame animation (only when fully lit or fading)
      const flicker = Math.sin(state.clock.elapsedTime * 8) * 0.1 + 0.9;
      const finalScale = flicker * fadeProgress;
      flameRef.current.scale.setScalar(finalScale);

      // Swaying motion (reduced during fade-in for more realistic effect)
      const swayIntensity = isFadingIn ? fadeProgress : 1;
      const sway = Math.sin(state.clock.elapsedTime * 3) * 0.05 * swayIntensity;
      flameRef.current.rotation.z = sway;

      // Apply fade opacity to flame materials
      flameRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              if (mat instanceof THREE.MeshLambertMaterial) {
                mat.opacity = fadeProgress;
                mat.transparent = true;
              }
            });
          } else if (child.material instanceof THREE.MeshLambertMaterial) {
            child.material.opacity = fadeProgress;
            child.material.transparent = true;
          }
        }
      });
    }

    if (showFlame && lightRef.current) {
      // More realistic flickering light intensity with fade
      const flickerIntensity =
        intensity +
        Math.sin(state.clock.elapsedTime * 12) * 0.3 +
        Math.sin(state.clock.elapsedTime * 19) * 0.2 +
        Math.sin(state.clock.elapsedTime * 6) * 0.1;

      // During fade-in, start with minimal intensity and build up
      const finalIntensity = isFadingIn
        ? Math.max(0.1, flickerIntensity * fadeProgress * fadeProgress) // Quadratic fade-in for more realistic lighting
        : Math.max(0.1, flickerIntensity * fadeProgress);

      lightRef.current.intensity = finalIntensity;
    }

    // Handle fade animations
    if (isFadingIn) {
      setFadeProgress((prev) => {
        const newProgress = prev + 0.02; // Fade in over ~50 frames
        if (newProgress >= 1) {
          setIsFadingIn(false);
          return 1;
        }
        return newProgress;
      });
    } else if (isFadingOut) {
      setFadeProgress((prev) => {
        const newProgress = prev - 0.02; // Fade out over ~50 frames
        if (newProgress <= 0) {
          setShowFlame(false);
          setShowSmoke(false);
          setIsFadingOut(false);
          return 0;
        }
        return newProgress;
      });
    }
  });

  // Render candle content
  const renderCandleContent = () => (
    <group
      ref={candleRef}
      position={draggable ? [0, 0, 0] : position}
      scale={scale}
    >
      {/* Candle base */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.4, 12]} />
        <meshLambertMaterial color={color} />
      </mesh>

      {/* Candle wax */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.3, 12]} />
        <meshLambertMaterial color="#F5F5DC" />
      </mesh>

      {/* Wick */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.1, 8]} />
        <meshLambertMaterial color="#2C2C2C" />
      </mesh>

      {/* Multi-layer flame for better glow */}
      {showFlame && (
        <group ref={flameRef} position={[0, 0.8, 0]}>
          {/* Inner flame */}
          <mesh>
            <sphereGeometry args={[0.08, 8, 6]} />
            <meshLambertMaterial
              color="#ffaa00"
              emissive="#ffaa00"
              emissiveIntensity={0.9}
              transparent
              opacity={0.95}
            />
          </mesh>

          {/* Middle flame */}
          <mesh position={[0, 0.1, 0]}>
            <coneGeometry args={[0.06, 0.2, 6]} />
            <meshLambertMaterial
              color={flameColor}
              emissive={flameColor}
              emissiveIntensity={0.6}
              transparent
              opacity={0.8}
            />
          </mesh>

          {/* Outer flame */}
          <mesh position={[0, 0.15, 0]}>
            <coneGeometry args={[0.08, 0.25, 6]} />
            <meshLambertMaterial
              color="#ff6600"
              emissive="#ff6600"
              emissiveIntensity={0.4}
              transparent
              opacity={0.6}
            />
          </mesh>

          {/* Flame glow effect */}
          <mesh position={[0, 0.2, 0]}>
            <coneGeometry args={[0.1, 0.3, 6]} />
            <meshLambertMaterial color="#ff4400" transparent opacity={0.3} />
          </mesh>
        </group>
      )}

      {/* Point light for illumination */}
      {showFlame && (
        <pointLight
          ref={lightRef}
          position={[0, 0.8, 0]}
          color={flameColor}
          intensity={intensity}
          distance={6}
          decay={2}
          castShadow
        />
      )}

      {/* Animated smoke sprite */}
      {showSmoke && smokeEnabled && (
        <AnimatedSmoke
          position={[0, 1.5, 0]}
          scale={0.6}
          isLit={showSmoke}
          animationSpeed={smokeAnimationSpeed}
          opacity={smokeOpacity * fadeProgress}
        />
      )}

      {/* Clickable area */}
      <mesh
        position={[0, 0.5, 0]}
        onClick={handleCandleClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <cylinderGeometry args={[0.2, 0.2, 0.8, 12]} />
        <meshLambertMaterial transparent opacity={0} />
      </mesh>
    </group>
  );

  // Return draggable or static candle
  if (draggable) {
    return (
      <DraggableObject
        position={position}
        type="dynamic"
        colliders={true}
        colliderArgs={[0.1, 0.3, 0.1]}
        userData={{ weight }}
        onMove={onMove}
      >
        <group
          onClick={handleCandleClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "grab";
            onPointerOver?.();
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
            onPointerOut?.();
          }}
        >
          {renderCandleContent()}
        </group>
      </DraggableObject>
    );
  }

  return renderCandleContent();
};

export default Candle;
