import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { RigidBody } from "@react-three/rapier";
import { Text } from "./GameText";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  type DoorState,
  type DoorType,
  type DoorBehavior,
  canTransition,
  getDoorBehavior,
} from "./doorUtils";

/**
 * Drives the door panel's swing.
 *
 * The old version took `(state, delta)` in its useFrame callback, which shadowed
 * the `state: DoorState` argument of the hook itself - so every
 * `state === "opening"` test inside the loop compared R3F's RootState object to
 * a string and was always false. The easing branches were dead code: the panel
 * snapped between 0 and 90 degrees, `isAnimating` never cleared itself, and the
 * loop called `setRotation` with an unchanged value on every single frame,
 * re-rendering the whole door for as long as it was "opening" or "closing".
 *
 * The swing now runs on the mesh directly through a ref, so it animates for
 * real and costs React nothing.
 */
const useDoorAnimation = (state: DoorState, speed: number = 1) => {
  const panelRef = useRef<THREE.Mesh>(null);
  // Degrees, mirrored on the mesh below.
  const rotationRef = useRef<number>(state === "open" ? 90 : 0);

  const applyRotation = () => {
    if (panelRef.current) {
      panelRef.current.rotation.y = (rotationRef.current * Math.PI) / 180;
    }
  };

  useEffect(() => {
    // Settled states jump straight to their resting angle; the two animating
    // states are handed to the frame loop below.
    if (state === "open") {
      rotationRef.current = 90;
      applyRotation();
    } else if (state === "closed" || state === "locked" || state === "broken") {
      rotationRef.current = 0;
      applyRotation();
    }
  }, [state]);

  useFrame((_rootState, delta) => {
    if (state !== "opening" && state !== "closing") return;

    const target = state === "opening" ? 90 : 0;
    const diff = target - rotationRef.current;

    if (Math.abs(diff) < 0.5) {
      rotationRef.current = target;
    } else {
      // Frame-rate independent easing: the old fixed 0.1 factor made the swing
      // twice as fast at 120Hz as at 60Hz.
      const t = 1 - Math.exp(-6 * speed * Math.min(delta, 0.1));
      rotationRef.current += diff * t;
    }

    applyRotation();
  });

  return { panelRef };
};

interface DoorProps {
  position: [number, number, number];
  rotation: [number, number, number];
  targetRoomId: string;
  onDoorClick: () => void;
  showLabel?: boolean;
  direction?: "north" | "south" | "east" | "west";

  // Enhanced features
  state?: DoorState;
  type?: DoorType;
  isLocked?: boolean;
  requiredKey?: string;
  animationSpeed?: number;
  glowEffect?: boolean;
  onStateChange?: (newState: DoorState) => void;
}

const Door: React.FC<DoorProps> = React.memo(
  ({
    position,
    rotation,
    targetRoomId,
    onDoorClick,
    showLabel = true,
    direction,
    state = "closed",
    type = "standard",
    isLocked = false,
    requiredKey,
    animationSpeed = 1,
    glowEffect = false,
    onStateChange,
  }) => {
    // Door state logic with proper validation
    const currentState = isLocked ? "locked" : state;
    // getDoorBehavior builds a fresh object on every call, so calling it inline
    // handed the auto-close effect below a new dependency on every render and
    // restarted its timer each time.
    const behavior = useMemo(() => getDoorBehavior(type), [type]);
    const canInteract =
      currentState !== "locked" &&
      currentState !== "broken" &&
      currentState !== "opening" &&
      currentState !== "closing";

    // Animation system
    const { panelRef } = useDoorAnimation(currentState, animationSpeed);

    // Auto-close functionality
    useEffect(() => {
      if (
        currentState === "open" &&
        behavior.canAutoClose &&
        behavior.autoCloseDelay
      ) {
        const timer = setTimeout(() => {
          if (onStateChange && canTransition("open", "closing")) {
            onStateChange("closing");
          }
        }, behavior.autoCloseDelay);

        return () => clearTimeout(timer);
      }
    }, [currentState, behavior, onStateChange]);

    // Get door colors based on state and type
    const getDoorColor = () => {
      switch (currentState) {
        case "open":
          return "#90EE90"; // Light green
        case "opening":
          return "#98FB98"; // Pale green (opening)
        case "closing":
          return "#F0E68C"; // Khaki (closing)
        case "closed":
          return "#8B4513"; // Brown
        case "locked":
          return "#B22222"; // Fire brick
        case "broken":
          return "#696969"; // Dim gray
        default:
          return "#8B4513";
      }
    };

    const getDoorMaterial = () => {
      const color = getDoorColor();
      const baseMaterial = {
        color,
        metalness: type === "secret" ? 0.9 : type === "locked" ? 0.6 : 0.3,
        roughness: type === "secret" ? 0.1 : type === "locked" ? 0.3 : 0.7,
        emissive: glowEffect
          ? new THREE.Color(color).multiplyScalar(0.2)
          : new THREE.Color(0x000000),
      };

      // Add state-based material variations
      if (currentState === "opening" || currentState === "closing") {
        baseMaterial.emissive = new THREE.Color(color).multiplyScalar(0.1);
        baseMaterial.metalness = Math.min(baseMaterial.metalness + 0.2, 1.0);
      } else if (currentState === "broken") {
        baseMaterial.roughness = 1.0;
        baseMaterial.metalness = 0.1;
      }

      return baseMaterial;
    };

    const handleClick = useCallback(
      (e: any) => {
        e.stopPropagation();

        // Only respond to left mouse button clicks (button 0)
        if (e.button !== 0) {
          return;
        }

        if (!canInteract) {
          // Handle locked/broken door interaction
          console.log(`Door is ${currentState} - cannot interact`);
          return;
        }

        // Handle door state transitions based on current state
        if (onStateChange) {
          if (currentState === "closed" && canTransition("closed", "opening")) {
            onStateChange("opening");
          } else if (
            currentState === "open" &&
            canTransition("open", "closing")
          ) {
            onStateChange("closing");
          }
        }

        // Handle door-specific interactions
        if (behavior.interactionType === "hidden") {
          console.log("Secret door clicked - checking for key");
          // Could check for required key here
        }

        onDoorClick();
      },
      [onDoorClick, canInteract, currentState, onStateChange, behavior]
    );

    const handlePointerOver = useCallback(
      (e: any) => {
        e.stopPropagation();
        document.body.style.cursor = canInteract ? "pointer" : "not-allowed";
      },
      [canInteract]
    );

    const handlePointerOut = useCallback((e: any) => {
      e.stopPropagation();
      document.body.style.cursor = "default";
    }, []);

    // Walking through a doorway unmounts the door while the pointer is still
    // over it, so onPointerOut never fires and the cursor stays stuck on
    // "pointer"/"not-allowed" for the rest of the session.
    useEffect(() => {
      return () => {
        document.body.style.cursor = "default";
      };
    }, []);

    // Generate enhanced door label with state info
    const doorLabel = showLabel
      ? (() => {
          const targetRoomName = targetRoomId
            .replace(/^room_/, "")
            .replace(/_/g, " ");

          const stateIcon =
            {
              open: "🟢",
              opening: "🟡",
              closed: "🟤",
              closing: "🟠",
              locked: "🔒",
              broken: "🔴",
            }[currentState] || "🚪";

          const typeIcon =
            {
              standard: "",
              locked: "🔐",
              puzzle: "🧩",
              one_way: "➡️",
              secret: "👻",
            }[type] || "";

          return `${stateIcon} ${typeIcon} ${targetRoomName}`.trim();
        })()
      : "";

    return (
      <group position={position} rotation={rotation}>
        {/* Enhanced door frame */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[2, 3, 0.2]} />
          <meshStandardMaterial {...getDoorMaterial()} />
        </mesh>

        {/* Door panel with state-based styling and animation */}
        <mesh ref={panelRef} position={[0, 1.5, 0.1]} castShadow>
          <boxGeometry args={[1.8, 2.8, 0.05]} />
          <meshStandardMaterial {...getDoorMaterial()} />
        </mesh>

        {/* Lock indicator */}
        {currentState === "locked" && (
          <mesh position={[0.6, 1.5, 0.15]}>
            <boxGeometry args={[0.2, 0.3, 0.1]} />
            <meshStandardMaterial
              color="#FFD700"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        )}

        {/* Broken door indicator */}
        {currentState === "broken" && (
          <mesh position={[0, 1.5, 0.12]}>
            <boxGeometry args={[0.1, 2.8, 0.02]} />
            <meshStandardMaterial color="#8B0000" />
          </mesh>
        )}

        {/* Secret door glow effect with pulsing animation */}
        {type === "secret" && glowEffect && (
          <mesh position={[0, 1.5, 0.2]}>
            <planeGeometry args={[2.2, 3.2]} />
            <meshBasicMaterial
              color="#00FFFF"
              transparent
              opacity={0.2 + Math.sin(Date.now() * 0.005) * 0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Animation state indicators */}
        {(currentState === "opening" || currentState === "closing") && (
          <mesh position={[0, 1.5, 0.25]}>
            <planeGeometry args={[2.2, 3.2]} />
            <meshBasicMaterial
              color={currentState === "opening" ? "#00FF00" : "#FFA500"}
              transparent
              opacity={0.2 + Math.sin(Date.now() * 0.01) * 0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Clickable area */}
        <RigidBody type="fixed" sensor>
          <mesh
            position={[0, 1.5, 0.1]}
            onPointerDown={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            <boxGeometry args={[2.2, 3.2, 0.1]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </RigidBody>

        {/* Door label */}
        {doorLabel && (
          <group position={[0, 2.5, 0]}>
            <Text
              position={[0, 0, 0.8]}
              fontSize={0.25}
              color="#FFFF00"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.03}
              outlineColor="#000000"
              maxWidth={5}
            >
              {doorLabel}
            </Text>
            {/* Background panel for better readability */}
            <mesh position={[0, 0, 0.7]}>
              <planeGeometry args={[3, 1]} />
              <meshBasicMaterial
                color="#000000"
                transparent
                opacity={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Directional arrow indicator */}
            <mesh position={[0, 0, 0.9]}>
              <coneGeometry args={[0.1, 0.3, 8]} />
              <meshBasicMaterial color="#FFFF00" />
            </mesh>
          </group>
        )}
      </group>
    );
  }
);

Door.displayName = "Door";

export default Door;
